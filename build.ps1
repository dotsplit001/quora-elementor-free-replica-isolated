param(
    [string]$WordPressAssetBase = "/wp-content/uploads/quora-replica/",
    [string]$WordPressSiteBase = "/"
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceRoot = Join-Path $packageRoot "source"
$pagesRoot = Join-Path $sourceRoot "pages"
$previewRoot = Join-Path $packageRoot "preview"
$elementorRoot = Join-Path $packageRoot "elementor"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$emDash = [char]0x2014
$imageDimensions = @{}
$imageDimensionData = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "image-dimensions.json")) | ConvertFrom-Json
foreach ($property in $imageDimensionData.PSObject.Properties) {
    $imageDimensions[$property.Name] = @([int]$property.Value[0], [int]$property.Value[1])
}

if (-not $WordPressAssetBase.EndsWith("/")) { $WordPressAssetBase += "/" }
if (-not $WordPressSiteBase.EndsWith("/")) { $WordPressSiteBase += "/" }

$fontLinks = @"
<link rel="preconnect" href="https://framerusercontent.com" crossorigin>
"@

function Split-TopLevelHtml {
    param([string]$Html)

    $voidElements = @("area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr")
    $tokens = [regex]::Matches($Html, '<!--[\s\S]*?-->|<![^>]*>|</?([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*?)?/?>')
    $chunks = [System.Collections.Generic.List[string]]::new()
    $depth = 0
    $segmentStart = -1

    foreach ($token in $tokens) {
        if (-not $token.Groups[1].Success) { continue }
        $name = $token.Groups[1].Value.ToLowerInvariant()
        $isClosing = $token.Value.StartsWith("</", [StringComparison]::Ordinal)
        $isVoid = $token.Value.EndsWith("/>", [StringComparison]::Ordinal) -or $voidElements.Contains($name)

        if ($isClosing) {
            $depth -= 1
            if ($depth -eq 0 -and $segmentStart -ge 0) {
                $length = ($token.Index + $token.Length) - $segmentStart
                $chunks.Add($Html.Substring($segmentStart, $length).Trim())
                $segmentStart = -1
            }
            continue
        }

        if ($depth -eq 0) { $segmentStart = $token.Index }
        if (-not $isVoid) { $depth += 1 }
        if ($isVoid -and $depth -eq 0 -and $segmentStart -ge 0) {
            $length = ($token.Index + $token.Length) - $segmentStart
            $chunks.Add($Html.Substring($segmentStart, $length).Trim())
            $segmentStart = -1
        }
    }

    return @($chunks)
}

function New-ElementorContent {
    param(
        [string]$WidgetHtml,
        [string]$ContainerId,
        [string]$WidgetId
    )

    $styleEnd = $WidgetHtml.IndexOf("</style>", [StringComparison]::OrdinalIgnoreCase)
    $scriptStart = $WidgetHtml.LastIndexOf("<script>", [StringComparison]::OrdinalIgnoreCase)
    $widgetElements = [System.Collections.Generic.List[object]]::new()
    $rootClasses = ""

    if ($styleEnd -ge 0 -and $scriptStart -gt $styleEnd) {
        $styleEnd += "</style>".Length
        $numericId = $WidgetId.Substring(3)
        $styleWidget = [ordered]@{
            id = "qis$numericId"
            elType = "widget"
            widgetType = "html"
            settings = [ordered]@{ html = $WidgetHtml.Substring(0, $styleEnd).Trim() }
            elements = @()
        }
        $widgetElements.Add($styleWidget)

        $markup = $WidgetHtml.Substring($styleEnd, $scriptStart - $styleEnd).Trim()
        $mainOpen = [regex]::Match($markup, '(?is)<main\b[^>]*class="([^"]+)"[^>]*>')
        $mainClose = $markup.LastIndexOf("</main>", [StringComparison]::OrdinalIgnoreCase)

        if ($mainOpen.Success -and $mainClose -gt ($mainOpen.Index + $mainOpen.Length)) {
            $rootClasses = $mainOpen.Groups[1].Value.Trim()
            $innerMarkup = $markup.Substring(
                $mainOpen.Index + $mainOpen.Length,
                $mainClose - ($mainOpen.Index + $mainOpen.Length)
            )
            $chunks = @(Split-TopLevelHtml -Html $innerMarkup)
            $sectionIndex = 0

            foreach ($chunk in $chunks) {
                $sectionIndex += 1
                $suffix = "{0:d2}" -f $sectionIndex
                $shortNumeric = $numericId.Substring(0, 4)
                $sectionWidget = [ordered]@{
                    id = "qw$shortNumeric$suffix"
                    elType = "widget"
                    widgetType = "html"
                    settings = [ordered]@{ html = $chunk }
                    elements = @()
                }
                $sectionContainer = [ordered]@{
                    id = "qs$shortNumeric$suffix"
                    elType = "container"
                    settings = [ordered]@{
                        content_width = "full"
                        width = [ordered]@{ unit = "%"; size = 100; sizes = @() }
                        padding = [ordered]@{ unit = "px"; top = "0"; right = "0"; bottom = "0"; left = "0"; isLinked = $true }
                        margin = [ordered]@{ unit = "px"; top = "0"; right = "0"; bottom = "0"; left = "0"; isLinked = $true }
                    }
                    elements = @($sectionWidget)
                }
                $widgetElements.Add($sectionContainer)
            }
        } else {
            $widgetElements.Add([ordered]@{
                id = $WidgetId
                elType = "widget"
                widgetType = "html"
                settings = [ordered]@{ html = $markup }
                elements = @()
            })
        }

        $scriptWidget = [ordered]@{
            id = "qij$numericId"
            elType = "widget"
            widgetType = "html"
            settings = [ordered]@{ html = $WidgetHtml.Substring($scriptStart).Trim() }
            elements = @()
        }
        $widgetElements.Add($scriptWidget)
    } else {
        $widgetElements.Add([ordered]@{
            id = $WidgetId
            elType = "widget"
            widgetType = "html"
            settings = [ordered]@{ html = $WidgetHtml }
            elements = @()
        })
    }

    $containerSettings = [ordered]@{
        content_width = "full"
        width = [ordered]@{ unit = "%"; size = 100; sizes = @() }
        padding = [ordered]@{
            unit = "px"
            top = "0"
            right = "0"
            bottom = "0"
            left = "0"
            isLinked = $true
        }
        margin = [ordered]@{
            unit = "px"
            top = "0"
            right = "0"
            bottom = "0"
            left = "0"
            isLinked = $true
        }
    }
    if ($rootClasses) {
        $containerSettings["_css_classes"] = $rootClasses
        $containerSettings["css_classes"] = $rootClasses
    }

    return @(
        [ordered]@{
            id = $ContainerId
            elType = "container"
            settings = $containerSettings
            elements = @($widgetElements)
        }
    )
}

function Write-TextFile {
    param([string]$Path, [string]$Content)
    $directory = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Convert-PreviewLinksToFiles {
    param([string]$Html)

    return [regex]::Replace(
        $Html,
        'href="([^"]*/)"',
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($match)
            $link = $match.Groups[1].Value
            if ($link -match '^(?:https?:|mailto:|tel:|javascript:|#)') {
                return $match.Value
            }
            return 'href="' + $link + 'index.html"'
        }
    )
}

function Add-ImagePerformanceHints {
    param(
        [string]$Html,
        [string[]]$HighPriorityImages = @()
    )

    return [regex]::Replace(
        $Html,
        '<img\b[^>]*>',
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($match)

            $tag = $match.Value
            $sourceMatch = [regex]::Match($tag, '\bsrc="([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if (-not $sourceMatch.Success) { return $tag }

            $imageName = [System.IO.Path]::GetFileName($sourceMatch.Groups[1].Value)
            if (-not $imageDimensions.ContainsKey($imageName)) { return $tag }

            $attributes = ""
            $dimensions = $imageDimensions[$imageName]
            if ($tag -notmatch '\bwidth\s*=') {
                $attributes += ' width="' + $dimensions[0] + '"'
            }
            if ($tag -notmatch '\bheight\s*=') {
                $attributes += ' height="' + $dimensions[1] + '"'
            }
            if ($HighPriorityImages -contains $imageName -and $tag -notmatch '\bfetchpriority\s*=') {
                $attributes += ' fetchpriority="high"'
            }

            if (-not $attributes) { return $tag }
            if ($tag.EndsWith("/>", [StringComparison]::Ordinal)) {
                return $tag.Substring(0, $tag.Length - 2) + $attributes + "/>"
            }
            return $tag.Substring(0, $tag.Length - 1) + $attributes + ">"
        }
    )
}

$previewNavigationGuard = @'
(function () {
  "use strict";

  if (window.location.protocol !== "file:") return;

  function resolveLocalPreviewUrl(anchor) {
    if (!anchor || anchor.hasAttribute("download")) return null;

    var rawHref = anchor.getAttribute("href") || "";
    if (
      !rawHref ||
      rawHref.charAt(0) === "#" ||
      /^(?:https?:|mailto:|tel:|javascript:)/i.test(rawHref)
    ) return null;

    try {
      var url = new URL(rawHref, document.baseURI);
      if (url.protocol !== "file:") return null;
      if (/\/$/.test(url.pathname)) url.pathname += "index.html";
      if (!/\.html$/i.test(url.pathname)) return null;
      return url;
    } catch (error) {
      /* Leave malformed or unsupported links untouched. */
      return null;
    }
  }

  document.querySelectorAll("a[href]").forEach(function (anchor) {
    var url = resolveLocalPreviewUrl(anchor);
    if (url) anchor.href = url.href;
  });

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest && event.target.closest("a[href]");

    if (
      !anchor ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    ) return;

    var url = resolveLocalPreviewUrl(anchor);
    if (!url) return;

    /*
     * Native file navigation varies between browsers and can expose a
     * directory listing instead of its index file. Resolve and navigate to
     * every internal HTML document explicitly in the capture phase.
     */
    event.preventDefault();
    window.location.assign(url.href);
  }, true);
})();
'@

function Write-ElementorArtifacts {
    param(
        [string]$BaseName,
        [string]$Title,
        [string]$WidgetHtml,
        [string]$ContainerId,
        [string]$WidgetId
    )

    $content = @(New-ElementorContent -WidgetHtml $WidgetHtml -ContainerId $ContainerId -WidgetId $WidgetId)
    $templateExport = [ordered]@{
        version = "0.4"
        title = $Title
        type = "page"
        page_settings = @()
        content = $content
    }

    Write-TextFile -Path (Join-Path $elementorRoot "$BaseName-html-widget.html") -Content $WidgetHtml
    Write-TextFile -Path (Join-Path $elementorRoot "$BaseName-elementor-data.json") -Content ($content | ConvertTo-Json -Depth 20 -Compress)
    Write-TextFile -Path (Join-Path $elementorRoot "$BaseName-template.json") -Content ($templateExport | ConvertTo-Json -Depth 20)
}

$preorderModal = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "preorder-modal.html"))
$preorderCss = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "preorder-modal.css"))
$preorderJs = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "preorder-modal.js"))
$fontCss = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "fonts.css"))

$homeBody = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "body.html")).
    Replace("__QUORA_PREORDER_MODAL__", $preorderModal)
$homeCss = $fontCss + [Environment]::NewLine + [System.IO.File]::ReadAllText((Join-Path $sourceRoot "styles.css"))
$homeJs = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "script.js"))

$homePreviewBody = $homeBody.
    Replace("__QUORA_ASSET_BASE__", "../assets/images/").
    Replace("__QUORA_SITE_BASE__", "")
$homePreviewBody = Convert-PreviewLinksToFiles -Html $homePreviewBody
$homePreviewBody = Add-ImagePerformanceHints -Html $homePreviewBody -HighPriorityImages @("hero-device.webp")

$homePreviewHtml = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quora $emDash Smart Home</title>
  <meta name="description" content="High-fidelity local preview for the isolated Quora Elementor Free recreation.">
  $fontLinks
  <style>
    html { scroll-behavior: smooth; }
    body { margin: 0; background: #fff; }
$homeCss
$preorderCss
  </style>
</head>
<body>
$homePreviewBody
<script>
$previewNavigationGuard
</script>
<script>
$homeJs
</script>
<script>
$preorderJs
</script>
</body>
</html>
"@

$homeWidgetBody = $homeBody.
    Replace("__QUORA_ASSET_BASE__", $WordPressAssetBase).
    Replace("__QUORA_SITE_BASE__", $WordPressSiteBase)
$homeWidgetBody = Add-ImagePerformanceHints -Html $homeWidgetBody -HighPriorityImages @("hero-device.webp")

$homeWidgetHtml = @"
$fontLinks
<style>
$homeCss
$preorderCss
</style>
$homeWidgetBody
<script>
$homeJs
</script>
<script>
$preorderJs
</script>
"@

Write-TextFile -Path (Join-Path $previewRoot "index.html") -Content $homePreviewHtml
Write-ElementorArtifacts -BaseName "quora-home" -Title "Quora Replica $emDash Home $emDash Elementor Free" -WidgetHtml $homeWidgetHtml -ContainerId "quorae01" -WidgetId "quorae02"

$innerHeader = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "inner-header.html"))
$innerFooter = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "inner-footer.html"))
$innerCss = $fontCss + [Environment]::NewLine + [System.IO.File]::ReadAllText((Join-Path $sourceRoot "inner-styles.css"))
$innerJs = [System.IO.File]::ReadAllText((Join-Path $sourceRoot "inner-script.js"))

$pages = @(
    [ordered]@{ Source = "product.html"; Preview = "product/index.html"; PreviewBase = "../"; BaseName = "quora-product"; Title = "Quora Replica $emDash Product"; Description = "Quora portable audio product collection."; HighPriorityImage = "smart-speakers.webp" },
    [ordered]@{ Source = "about-us.html"; Preview = "about-us/index.html"; PreviewBase = "../"; BaseName = "quora-about-us"; Title = "Quora Replica $emDash About us"; Description = "About Quora and the values behind its audio products."; HighPriorityImage = "audio-listener.webp" },
    [ordered]@{ Source = "blogs.html"; Preview = "blogs/index.html"; PreviewBase = "../"; BaseName = "quora-blogs"; Title = "Quora Replica $emDash Insights"; Description = "Quora smart home insights and product stories." },
    [ordered]@{ Source = "contact.html"; Preview = "contact/index.html"; PreviewBase = "../"; BaseName = "quora-contact"; Title = "Quora Replica $emDash Contact"; Description = "Contact the Quora support team."; HighPriorityImage = "contact-headphones.jpeg" },
    [ordered]@{ Source = "legal-terms-conditions.html"; Preview = "legal/terms-conditions/index.html"; PreviewBase = "../../"; BaseName = "quora-terms-conditions"; Title = "Quora Replica $emDash Terms & Conditions"; Description = "Quora terms and conditions." },
    [ordered]@{ Source = "legal-privacy-policy.html"; Preview = "legal/privacy-policy/index.html"; PreviewBase = "../../"; BaseName = "quora-privacy-policy"; Title = "Quora Replica $emDash Privacy Policy"; Description = "Quora privacy policy." },
    [ordered]@{ Source = "legal-refund-policy.html"; Preview = "legal/refund-policy/index.html"; PreviewBase = "../../"; BaseName = "quora-refund-policy"; Title = "Quora Replica $emDash Refund Policy"; Description = "Quora refund policy." },
    [ordered]@{ Source = "404.html"; Preview = "404/index.html"; PreviewBase = "../"; BaseName = "quora-404"; Title = "Quora Replica $emDash Page Not Found"; Description = "Quora page not found template." },
    [ordered]@{ Source = "blog-focus-mode-but-for-your-house.html"; Preview = "blogs/focus-mode-but-for-your-house/index.html"; PreviewBase = "../../"; BaseName = "quora-blog-focus-mode"; Title = "Quora Replica $emDash Focus Mode"; Description = "How a whole-house focus mode can support intentional living."; HighPriorityImage = "focus-controls.webp" },
    [ordered]@{ Source = "blog-smarter-mornings-start-here.html"; Preview = "blogs/smarter-mornings-start-here/index.html"; PreviewBase = "../../"; BaseName = "quora-blog-smarter-mornings"; Title = "Quora Replica $emDash Smarter Mornings"; Description = "Build a calmer smart-home morning routine."; HighPriorityImage = "smart-home-phone.webp" },
    [ordered]@{ Source = "blog-home-but-smarter.html"; Preview = "blogs/home-but-smarter/index.html"; PreviewBase = "../../"; BaseName = "quora-blog-home-but-smarter"; Title = "Quora Replica $emDash Home, But Smarter"; Description = "Build a considered connected-home ecosystem."; HighPriorityImage = "smart-lamp.webp" },
    [ordered]@{ Source = "blog-designed-for-real-routines.html"; Preview = "blogs/designed-for-real-routines/index.html"; PreviewBase = "../../"; BaseName = "quora-blog-real-routines"; Title = "Quora Replica $emDash Designed for Real Routines"; Description = "Design smart-home technology around real life."; HighPriorityImage = "blog-routines.png" },
    [ordered]@{ Source = "blog-one-device-limitless-calm.html"; Preview = "blogs/one-device-limitless-calm/index.html"; PreviewBase = "../../"; BaseName = "quora-blog-limitless-calm"; Title = "Quora Replica $emDash One Device, Limitless Calm"; Description = "Create a calmer connected-home experience."; HighPriorityImage = "blog-limitless-calm.jpg" },
    [ordered]@{ Source = "blog-the-power-of-presence.html"; Preview = "blogs/the-power-of-presence/index.html"; PreviewBase = "../../"; BaseName = "quora-blog-power-of-presence"; Title = "Quora Replica $emDash The Power of Presence"; Description = "Explore presence-aware smart-home technology."; HighPriorityImage = "blog-presence.png" }
)

$pageIndex = 0
foreach ($page in $pages) {
    $pageIndex += 1
    $rawBody = [System.IO.File]::ReadAllText((Join-Path $pagesRoot $page.Source))
    $composedBody = $rawBody.
        Replace("__QUORA_HEADER__", $innerHeader).
        Replace("__QUORA_FOOTER__", $innerFooter).
        Replace("__QUORA_PREORDER_MODAL__", $preorderModal)

    $previewBody = $composedBody.
        Replace("__QUORA_ASSET_BASE__", "$($page.PreviewBase)../assets/images/").
        Replace("__QUORA_SITE_BASE__", $page.PreviewBase).
        Replace("__QUORA_CONTACT_ENDPOINT__", "").
        Replace("__QUORA_NEWSLETTER_ENDPOINT__", "")
    $previewBody = Convert-PreviewLinksToFiles -Html $previewBody
    $previewBody = Add-ImagePerformanceHints -Html $previewBody -HighPriorityImages @($page.HighPriorityImage)

    $previewHtml = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$($page.Title)</title>
  <meta name="description" content="$($page.Description)">
  $fontLinks
  <style>
    body { margin: 0; background: #fff; }
$innerCss
$preorderCss
  </style>
</head>
<body>
$previewBody
<script>
$previewNavigationGuard
</script>
<script>
$innerJs
</script>
<script>
$preorderJs
</script>
</body>
</html>
"@

    $widgetBody = $composedBody.
        Replace("__QUORA_ASSET_BASE__", $WordPressAssetBase).
        Replace("__QUORA_SITE_BASE__", $WordPressSiteBase).
        Replace("__QUORA_CONTACT_ENDPOINT__", ($WordPressSiteBase + "wp-json/quora-replica/v1/contact")).
        Replace("__QUORA_NEWSLETTER_ENDPOINT__", ($WordPressSiteBase + "wp-json/quora-replica/v1/newsletter"))
    $widgetBody = Add-ImagePerformanceHints -Html $widgetBody -HighPriorityImages @($page.HighPriorityImage)
    $widgetHtml = @"
$fontLinks
<style>
$innerCss
$preorderCss
</style>
$widgetBody
<script>
$innerJs
</script>
<script>
$preorderJs
</script>
"@

    $containerId = "qic{0:d5}" -f $pageIndex
    $widgetId = "qiw{0:d5}" -f $pageIndex
    Write-TextFile -Path (Join-Path $previewRoot $page.Preview) -Content $previewHtml
    Write-ElementorArtifacts -BaseName $page.BaseName -Title "$($page.Title) $emDash Elementor Free" -WidgetHtml $widgetHtml -ContainerId $containerId -WidgetId $widgetId
}

Write-Host "Built isolated Quora package:"
Write-Host " - 15 local preview pages under $previewRoot"
Write-Host " - 15 Elementor Free page templates under $elementorRoot"
Write-Host " - WordPress asset base: $WordPressAssetBase"
Write-Host " - WordPress site base: $WordPressSiteBase"

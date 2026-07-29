# Quora Replica — Elementor Free

This is a self-contained recreation of:

`https://generic-turnip-711628.framer.app/`

The package is strictly isolated inside `quora-elementor-free-replica-isolated`. It does not overwrite, import into, or depend on the existing AMS homepage or any earlier replica version.

## Local preview

Open `preview/index.html` directly. When using a `file://` preview, do not open a route folder such as `preview/about-us/`; file browsers may show a directory listing instead of loading that folder's page. All generated navigation links point to the corresponding explicit `index.html` file.

## Included pages

The package contains 15 responsive pages:

| Local route | Elementor template |
| --- | --- |
| `/preview/` | `quora-home-template.json` |
| `/preview/product/` | `quora-product-template.json` |
| `/preview/about-us/` | `quora-about-us-template.json` |
| `/preview/blogs/` | `quora-blogs-template.json` |
| `/preview/contact/` | `quora-contact-template.json` |
| `/preview/404/` | `quora-404-template.json` |
| `/preview/legal/terms-conditions/` | `quora-terms-conditions-template.json` |
| `/preview/legal/privacy-policy/` | `quora-privacy-policy-template.json` |
| `/preview/legal/refund-policy/` | `quora-refund-policy-template.json` |
| `/preview/blogs/focus-mode-but-for-your-house/` | `quora-blog-focus-mode-template.json` |
| `/preview/blogs/smarter-mornings-start-here/` | `quora-blog-smarter-mornings-template.json` |
| `/preview/blogs/home-but-smarter/` | `quora-blog-home-but-smarter-template.json` |
| `/preview/blogs/designed-for-real-routines/` | `quora-blog-real-routines-template.json` |
| `/preview/blogs/one-device-limitless-calm/` | `quora-blog-limitless-calm-template.json` |
| `/preview/blogs/the-power-of-presence/` | `quora-blog-power-of-presence-template.json` |

Each page has three generated files under `elementor/`:

- `*-template.json` — importable Elementor page template
- `*-elementor-data.json` — raw Elementor content array
- `*-html-widget.html` — fallback content for an Elementor Free HTML widget

Imported templates place each major page region in its own Elementor container and HTML widget, with separate style/font and interaction widgets. This makes sections independently selectable and editable in Elementor Free while preserving the reference motion system without Elementor Pro.

Source files live under `source/`; local images live under `assets/images/`. Edit source files, then rebuild—generated `preview/` and `elementor/` files are overwritten.

## WordPress / Elementor Free installation

1. Create new WordPress pages for the required routes. Do not replace the AMS homepage.
2. Set each page layout to **Elementor Canvas**.
3. Upload `assets/images/` to `/wp-content/uploads/quora-replica/`.
4. Import the matching `*-template.json` file from **Templates → Saved Templates → Import Templates**.
5. Insert each template into its matching page.
6. Use `quora-404-template.json` as the site’s 404 template through a free theme or 404-routing plugin that supports Elementor templates.
7. Copy `wordpress/quora-replica-forms/` to `wp-content/plugins/`, activate **Quora Replica Forms**, and verify WordPress email delivery on a private staging URL before publishing.

If template import is unavailable, add an Elementor Free HTML widget and paste the matching `*-html-widget.html` file.

## Rebuild

From this isolated directory:

`powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1`

Custom paths:

`powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1 -WordPressAssetBase "/wp-content/uploads/my-quora/" -WordPressSiteBase "/quora/"`

## Compatibility and behavior

- Elementor Free only; no paid add-on dependency
- Vanilla HTML, CSS and JavaScript
- Dedicated desktop, tablet and mobile layouts
- Compact expanding navigation, staged reveals, parallax, counters and marquees
- Single-open FAQ accordions, initially closed
- Contact and newsletter validation with same-origin WordPress REST delivery, honeypot protection and request throttling
- Local Contact previews simulate the reference loading/success animation without transmitting form data; the newsletter mirrors the reference form’s validation shake and otherwise remains visually unchanged
- Reduced-motion preferences are respected
- All images are local to this package

The build automatically points imported Elementor templates to the bundled plugin’s REST routes. WordPress must be able to send mail (normally through a configured SMTP provider) for contact email delivery.

## Validation targets

- 15 local preview routes
- 30 valid Elementor JSON files
- No unresolved build placeholders
- All local image references present
- No source encoding corruption
- Homepage, product, about, blogs, contact, article, legal and 404 layouts covered

## Rights and publishing note

The reference project exposes a public “Remix for free” link. Before public deployment, confirm that your intended use of its brand name, copy, imagery and trademarks is permitted.

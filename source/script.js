(function () {
  "use strict";

  var root = document.querySelector("[data-quora-replica], .quora-replica");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var timers = [];
  var homeMenu = root.querySelector("[data-home-menu]");
  var homeMenuTrigger = homeMenu && homeMenu.querySelector(".q-menu-trigger");
  var homeMenuLinks = homeMenu && homeMenu.querySelector(".q-menu-links");
  var homeMenuItems = homeMenuLinks ?
    Array.prototype.slice.call(homeMenuLinks.querySelectorAll("a")) : [];
  var homeMenuIconTimer = 0;
  var menuStorageKey = "quora-reference-menu-open";
  var desktopMenuQuery = window.matchMedia ?
    window.matchMedia("(min-width: 1440px)") : { matches: false };

  function readStoredMenuState() {
    if (desktopMenuQuery.matches) return false;
    try {
      return window.sessionStorage.getItem(menuStorageKey) === "true";
    } catch (error) {
      return false;
    }
  }

  function writeStoredMenuState(open) {
    try {
      if (open) window.sessionStorage.setItem(menuStorageKey, "true");
      else window.sessionStorage.removeItem(menuStorageKey);
    } catch (error) {
      /* Storage can be unavailable for hardened local-file previews. */
    }
  }

  function setHomeMenu(open, returnFocus) {
    if (!homeMenu || !homeMenuTrigger || !homeMenuLinks) return;
    window.clearTimeout(homeMenuIconTimer);
    homeMenu.classList.remove("is-icon-opened");
    homeMenu.classList.toggle("is-open", open);
    homeMenuTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    homeMenuTrigger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    homeMenuLinks.setAttribute("aria-hidden", open ? "false" : "true");
    homeMenuItems.forEach(function (link) {
      link.setAttribute("tabindex", open ? "0" : "-1");
    });
    if (open) {
      if (reduceMotion) {
        homeMenu.classList.add("is-icon-opened");
      } else {
        homeMenuIconTimer = window.setTimeout(function () {
          if (homeMenu.classList.contains("is-open")) {
            homeMenu.classList.add("is-icon-opened");
          }
        }, 600);
      }
    }
    if (!open && returnFocus) {
      homeMenuTrigger.focus({ preventScroll: true });
    }
  }

  if (homeMenuTrigger && homeMenuLinks) {
    setHomeMenu(readStoredMenuState(), false);
    homeMenuTrigger.addEventListener("click", function (event) {
      if (desktopMenuQuery.matches) return;
      var shouldOpen = !homeMenu.classList.contains("is-open");
      setHomeMenu(shouldOpen, false);
      writeStoredMenuState(shouldOpen);
      if (shouldOpen && event.detail === 0 && homeMenuItems[0]) {
        homeMenuItems[0].focus({ preventScroll: true });
      }
    });
    homeMenuLinks.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      if (!link) return;
      if (!desktopMenuQuery.matches) writeStoredMenuState(true);
    });
    homeMenu.addEventListener("mouseenter", function () {
      if (desktopMenuQuery.matches) setHomeMenu(true, false);
    });
    homeMenu.addEventListener("mouseleave", function () {
      if (desktopMenuQuery.matches) setHomeMenu(false, false);
    });
    if (typeof desktopMenuQuery.addEventListener === "function") {
      desktopMenuQuery.addEventListener("change", function () {
        setHomeMenu(readStoredMenuState(), false);
      });
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function observeOnce(nodes, options) {
    var items = Array.prototype.slice.call(nodes || []);
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, options || { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  var pageReveals = Array.prototype.slice.call(
    root.querySelectorAll("[data-reveal]")
  );
  observeOnce(pageReveals.filter(function (item) {
    return item.getAttribute("data-reveal-threshold") === "0";
  }), {
    threshold: 0,
    rootMargin: "0px"
  });
  observeOnce(pageReveals.filter(function (item) {
    return item.getAttribute("data-reveal-threshold") !== "0";
  }), {
    threshold: 0.5,
    rootMargin: "0px"
  });
  observeOnce(root.querySelectorAll("[data-product-reveal]"), {
    threshold: 0.5,
    rootMargin: "0px"
  });
  observeOnce(root.querySelectorAll("[data-insight-reveal]"), {
    threshold: 0.5,
    rootMargin: "0px"
  });
  observeOnce(root.querySelectorAll("[data-speech-reveal]"), {
    threshold: 0.5,
    rootMargin: "0px"
  });
  observeOnce(root.querySelectorAll("[data-story-reveal]"), {
    threshold: 0.5,
    rootMargin: "0px"
  });

  function tokenizeModeText(node, startDelay) {
    if (!node || node.dataset.motionTokenized === "true") return;
    var text = node.textContent.trim();
    var words = text.split(/\s+/);
    var characterIndex = 0;

    node.textContent = "";
    node.classList.add("q-mode-text");
    node.setAttribute("aria-label", text);

    words.forEach(function (word, wordIndex) {
      var wordNode = document.createElement("span");
      wordNode.className = "q-mode-word";
      wordNode.setAttribute("aria-hidden", "true");

      Array.from(word).forEach(function (character) {
        var characterNode = document.createElement("span");
        characterNode.className = "q-mode-char";
        characterNode.style.setProperty(
          "--q-mode-char-delay",
          (startDelay + characterIndex * 30) + "ms"
        );
        characterNode.textContent = character;
        wordNode.appendChild(characterNode);
        characterIndex += 1;
      });

      node.appendChild(wordNode);
      if (wordIndex < words.length - 1) {
        node.appendChild(document.createTextNode(" "));
      }
    });

    node.dataset.motionTokenized = "true";
  }

  var modeContent = root.querySelector(".q-mode-content");
  if (modeContent) {
    tokenizeModeText(modeContent.querySelector(":scope > h1"), 500);
    modeContent.querySelectorAll("h4").forEach(function (heading) {
      tokenizeModeText(heading, 50);
    });
    observeOnce([modeContent], {
      threshold: 0,
      rootMargin: "0px"
    });
  }

  var featureItems = Array.prototype.slice.call(
    root.querySelectorAll(".q-hero__features > p")
  );
  var featureIndex = Math.max(0, featureItems.findIndex(function (item) {
    return item.classList.contains("is-active");
  }));
  var featureTimer = 0;

  function setFeature(index) {
    if (!featureItems.length) return;
    featureIndex = (index + featureItems.length) % featureItems.length;
    featureItems.forEach(function (item, itemIndex) {
      item.classList.toggle("is-active", itemIndex === featureIndex);
    });
  }

  function startFeatureCycle() {
    if (reduceMotion || featureItems.length < 2 || featureTimer) return;
    featureTimer = window.setInterval(function () {
      if (!document.hidden) setFeature(featureIndex + 1);
    }, 3000);
    timers.push(featureTimer);
  }

  startFeatureCycle();

  var hero = root.querySelector(".q-hero");
  var heroScrollFrame = 0;
  var heroResizeObserver = null;

  function updateHeroScrollMotion() {
    heroScrollFrame = 0;
    if (!hero || reduceMotion) return;

    var scrollTop = window.scrollY || window.pageYOffset || 0;
    var heroProgress = clamp(
      scrollTop / Math.max(hero.offsetHeight, 1),
      0,
      1
    );

    hero.style.setProperty(
      "--q-hero-page-scale",
      (1 - heroProgress * 0.008).toFixed(6)
    );
    hero.style.setProperty(
      "--q-hero-device-y",
      (scrollTop * 0.15).toFixed(3) + "px"
    );
    hero.style.setProperty(
      "--q-hero-text-y",
      (-scrollTop * 0.05).toFixed(3) + "px"
    );
  }

  function requestHeroScrollMotion() {
    if (!hero || reduceMotion || heroScrollFrame) return;
    heroScrollFrame = window.requestAnimationFrame(updateHeroScrollMotion);
  }

  if (hero && !reduceMotion) {
    updateHeroScrollMotion();
    window.addEventListener("scroll", requestHeroScrollMotion, { passive: true });
    window.addEventListener("resize", requestHeroScrollMotion);
    if ("ResizeObserver" in window) {
      heroResizeObserver = new ResizeObserver(requestHeroScrollMotion);
      heroResizeObserver.observe(document.documentElement);
    }
  }

  var count = root.querySelector(".q-count");
  var countFrame = 0;
  var countRunning = false;

  function resetCount() {
    if (!count) return;
    if (countFrame) window.cancelAnimationFrame(countFrame);
    countFrame = 0;
    countRunning = false;
    count.textContent = "0K";
  }

  function animateCount() {
    if (!count || countRunning) return;
    var target = Number(count.dataset.count || 0);
    if (reduceMotion) {
      count.textContent = target + "K";
      return;
    }

    countRunning = true;
    var start = performance.now();
    var duration = 1000;

    function tick(now) {
      var progress = clamp((now - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      count.textContent = Math.round(target * eased) + "K";
      if (progress < 1) {
        countFrame = window.requestAnimationFrame(tick);
      } else {
        countRunning = false;
        countFrame = 0;
      }
    }

    countFrame = window.requestAnimationFrame(tick);
  }

  if (count) {
    resetCount();
    if (reduceMotion || !("IntersectionObserver" in window)) {
      animateCount();
    } else {
      new IntersectionObserver(function (entries) {
        var entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          animateCount();
        } else if (!entry.isIntersecting) {
          resetCount();
        }
      }, { threshold: [0, 0.3, 0.55] }).observe(count);
    }
  }

  function normalizeRepeatingTrack(track, originalCount, setCount) {
    if (!track || track.dataset.normalized === "true") return;
    var children = Array.prototype.slice.call(track.children);
    var originals = children.filter(function (child) {
      return child.getAttribute("aria-hidden") !== "true";
    }).slice(0, originalCount);
    if (originals.length !== originalCount) {
      originals = children.slice(0, originalCount);
    }
    if (!originals.length) return;

    track.textContent = "";
    for (var setIndex = 0; setIndex < setCount; setIndex += 1) {
      originals.forEach(function (original) {
        var item = setIndex === 0 ? original : original.cloneNode(true);
        if (setIndex > 0) {
          item.setAttribute("aria-hidden", "true");
          item.querySelectorAll("[id]").forEach(function (node) {
            node.removeAttribute("id");
          });
        }
        track.appendChild(item);
      });
    }
    track.dataset.normalized = "true";
  }

  function observePlayback(element) {
    if (!element) return;
    if (reduceMotion) return;
    if (!("IntersectionObserver" in window)) {
      element.classList.add("is-running");
      return;
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-running", entry.isIntersecting);
      });
    }, { threshold: 0.04 }).observe(element);
  }

  var logoTrack = root.querySelector(".q-logo-track");
  normalizeRepeatingTrack(logoTrack, 6, 4);
  observePlayback(logoTrack);

  var storyTrack = root.querySelector(".q-story-track");
  normalizeRepeatingTrack(storyTrack, 6, 3);
  observePlayback(storyTrack);

  var timeNode = root.querySelector("[data-live-time]");

  function updateTime() {
    if (!timeNode) return;
    timeNode.textContent = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
  }

  updateTime();
  var clockTimer = window.setInterval(updateTime, 1000);
  timers.push(clockTimer);

  var faqItems = Array.prototype.slice.call(root.querySelectorAll(".q-faq-item"));

  function setFaqItemState(item, open, animate) {
    var button = item.querySelector("button");
    var answer = item.querySelector(".q-faq-answer");
    if (!button || !answer) return;

    if (answer._qFaqAnimation) {
      answer._qFaqAnimation.cancel();
      answer._qFaqAnimation = null;
    }

    var startHeight = answer.getBoundingClientRect().height;
    item.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    var endHeight = open ? answer.scrollHeight : 0;

    if (!animate || reduceMotion || typeof answer.animate !== "function") {
      answer.style.height = open ? "auto" : "0px";
      return;
    }

    answer.style.height = startHeight + "px";
    var animation = answer.animate(
      [
        { height: startHeight + "px" },
        { height: endHeight + "px" }
      ],
      {
        duration: 500,
        easing: "cubic-bezier(.34, 0, 0, 1)",
        fill: "forwards"
      }
    );
    answer._qFaqAnimation = animation;
    animation.addEventListener("finish", function () {
      if (answer._qFaqAnimation !== animation) return;
      answer._qFaqAnimation = null;
      answer.style.height = open ? "auto" : "0px";
      animation.cancel();
    }, { once: true });
  }

  faqItems.forEach(function (item) {
    var button = item.querySelector("button");
    if (!button) return;
    setFaqItemState(item, false, false);
    button.addEventListener("click", function () {
      var willOpen = !item.classList.contains("is-open");
      faqItems.forEach(function (other) {
        if (other !== item && other.classList.contains("is-open")) {
          setFaqItemState(other, false, true);
        }
      });
      setFaqItemState(item, willOpen, true);
    });
  });

  var brandCopy = root.querySelector(".q-brand-copy");
  observeOnce(brandCopy ? [brandCopy] : [], {
    threshold: 0.5,
    rootMargin: "0px"
  });

  var brandFloats = Array.prototype.slice.call(
    root.querySelectorAll(".q-brand-float")
  );
  var brandMain = root.querySelector(".q-brand-main");
  var brandGallery = brandMain ? brandMain.closest(".q-brand-gallery") : null;

  function measureExpandedBrandGallery() {
    if (!brandGallery) return;
    var fixedRows = window.innerWidth <= 809.98 ? 620 : 1151;
    var finalImageHeight = brandGallery.getBoundingClientRect().width /
      1.5398230088495575;
    brandGallery.style.setProperty(
      "--q-brand-expanded-height",
      (fixedRows + finalImageHeight).toFixed(3) + "px"
    );
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    brandFloats.forEach(function (item) {
      item.classList.add("is-inview");
    });
    if (brandMain) {
      measureExpandedBrandGallery();
      if (brandGallery) brandGallery.classList.add("is-main-expanding");
      brandMain.classList.add("is-inview");
    }
  } else {
    var brandFloatObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-inview", entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: "0px" });
    brandFloats.forEach(function (item) {
      brandFloatObserver.observe(item);
    });

    if (brandMain) {
      var brandMainObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          measureExpandedBrandGallery();
          if (brandGallery) brandGallery.classList.add("is-main-expanding");
          entry.target.classList.add("is-inview");
          brandMainObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5, rootMargin: "0px" });
      brandMainObserver.observe(brandMain);
    }
  }

  if (brandGallery) {
    window.addEventListener("resize", measureExpandedBrandGallery);
  }

  var footer = root.querySelector(".q-footer");
  var footerBackdrop = root.querySelector(".q-footer__backdrop");
  var footerPanel = root.querySelector(".q-footer__panel");
  var scrollFrame = 0;
  var footerTarget = 0;
  var footerCurrent = 0;
  var footerLastTime = 0;

  function applyFooterMotion(progress) {
    footerBackdrop.style.setProperty(
      "--q-footer-backdrop-scale",
      (0.9 + progress * 0.1).toFixed(5)
    );
    footerBackdrop.style.setProperty(
      "--q-footer-backdrop-y",
      ((1 - progress) * 60).toFixed(2) + "px"
    );
    footerPanel.style.setProperty("--q-footer-scale", (0.9 + progress * 0.1).toFixed(5));
    footerPanel.style.setProperty("--q-footer-y", ((1 - progress) * 170).toFixed(2) + "px");
    footer.classList.toggle("is-footer-complete", progress >= 0.97);
  }

  function updateFooterMotion(now) {
    scrollFrame = 0;
    if (!footer || !footerBackdrop || !footerPanel || reduceMotion) return;
    if (!footerLastTime) footerLastTime = now - 16.67;
    var deltaTime = clamp((now - footerLastTime) / 1000, 0, 0.05);
    footerLastTime = now;
    var smoothing = 1 - Math.exp(-deltaTime * 7);
    footerCurrent += (footerTarget - footerCurrent) * smoothing;

    if (Math.abs(footerTarget - footerCurrent) < 0.0005) {
      footerCurrent = footerTarget;
    }

    applyFooterMotion(footerCurrent);
    if (footerCurrent !== footerTarget) {
      scrollFrame = window.requestAnimationFrame(updateFooterMotion);
    } else {
      footerLastTime = 0;
    }
  }

  function measureFooterMotion() {
    if (!footer || !footerBackdrop || !footerPanel || reduceMotion) return;
    var rect = footer.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    footerTarget = clamp((viewportHeight - rect.top) / Math.max(rect.height, 1), 0, 1);
    requestFooterMotion();
  }

  function requestFooterMotion() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateFooterMotion);
  }

  if (reduceMotion) {
    if (footer) footer.classList.add("is-footer-complete");
  } else {
    measureFooterMotion();
    window.addEventListener("scroll", measureFooterMotion, { passive: true });
    window.addEventListener("resize", measureFooterMotion);
  }

  window.addEventListener("pagehide", function () {
    timers.forEach(function (timer) {
      window.clearInterval(timer);
      window.clearTimeout(timer);
    });
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    if (heroScrollFrame) window.cancelAnimationFrame(heroScrollFrame);
    if (heroResizeObserver) heroResizeObserver.disconnect();
    if (countFrame) window.cancelAnimationFrame(countFrame);
  });
})();

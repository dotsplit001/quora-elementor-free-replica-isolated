(function () {
  "use strict";

  document.querySelectorAll("[data-quora-inner], .quora-inner").forEach(function (root) {
    if (root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var page = root.dataset.page || (
      root.classList.contains("qi-page-about") ? "about" :
      root.classList.contains("qi-page-product") ? "product" :
      root.classList.contains("qi-page-legal") ? "legal" :
      root.classList.contains("qi-page-article") ? "article" :
      root.classList.contains("qi-page-contact") ? "contact" :
      root.classList.contains("qi-page-blogs") ? "blogs" :
      root.classList.contains("qi-page-404") ? "404" : ""
    );
    var menu = root.querySelector("[data-inner-menu], .qi-menu");
    var trigger = root.querySelector(".qi-menu-trigger");
    var menuLinks = menu && menu.querySelector(".qi-menu-links");
    var menuItems = menuLinks ?
      Array.prototype.slice.call(menuLinks.querySelectorAll("a")) : [];
    var menuIconTimer = 0;
    var menuStorageKey = "quora-reference-menu-open";
    var desktopMenuQuery = window.matchMedia ?
      window.matchMedia("(min-width: 1440px)") : { matches: false };

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

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

    function setMenu(open, returnFocus) {
      if (!menu || !trigger || !menuLinks) return;
      window.clearTimeout(menuIconTimer);
      menu.classList.remove("is-icon-opened");
      menu.classList.toggle("is-open", open);
      menuLinks.setAttribute("aria-hidden", open ? "false" : "true");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      trigger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menuItems.forEach(function (link) {
        link.setAttribute("tabindex", open ? "0" : "-1");
      });
      if (open) {
        if (reducedMotion) {
          menu.classList.add("is-icon-opened");
        } else {
          menuIconTimer = window.setTimeout(function () {
            if (menu.classList.contains("is-open")) {
              menu.classList.add("is-icon-opened");
            }
          }, 600);
        }
      }
      if (!open && returnFocus) trigger.focus({ preventScroll: true });
    }

    if (trigger && menuLinks) {
      setMenu(readStoredMenuState(), false);
      trigger.addEventListener("click", function (event) {
        if (desktopMenuQuery.matches) return;
        var shouldOpen = !menu.classList.contains("is-open");
        setMenu(shouldOpen, false);
        writeStoredMenuState(shouldOpen);
        if (shouldOpen && event.detail === 0 && menuItems[0]) {
          menuItems[0].focus({ preventScroll: true });
        }
      });
      menuLinks.addEventListener("click", function (event) {
        var link = event.target.closest("a[href]");
        if (!link) return;
        if (!desktopMenuQuery.matches) writeStoredMenuState(true);
      });
      menu.addEventListener("mouseenter", function () {
        if (desktopMenuQuery.matches) setMenu(true, false);
      });
      menu.addEventListener("mouseleave", function () {
        if (desktopMenuQuery.matches) setMenu(false, false);
      });
      if (typeof desktopMenuQuery.addEventListener === "function") {
        desktopMenuQuery.addEventListener("change", function () {
          setMenu(readStoredMenuState(), false);
        });
      }
    }

    function letterizeProductText(node) {
      if (!node || node.dataset.productLettered === "true") return;
      var text = node.textContent.trim();
      var words = text.split(/\s+/);
      var letterIndex = 0;
      var wordNodes = [];
      var isHeading = node.tagName === "H2";

      node.textContent = "";
      node.setAttribute("aria-label", text);
      words.forEach(function (word, wordIndex) {
        var wordNode = document.createElement("span");
        wordNode.className = "qi-product-letter-word";
        wordNode.setAttribute("aria-hidden", "true");
        wordNodes.push(wordNode);

        Array.from(word).forEach(function (letter) {
          var letterNode = document.createElement("span");
          letterNode.className = "qi-product-letter";
          letterNode.style.setProperty("--qi-letter-index", String(letterIndex));
          letterNode.style.setProperty(
            "--qi-letter-delay",
            (isHeading ? 50 + letterIndex * 30 : 50) + "ms"
          );
          letterNode.textContent = letter;
          wordNode.appendChild(letterNode);
          letterIndex += 1;
        });

        node.appendChild(wordNode);
        if (wordIndex < words.length - 1) node.appendChild(document.createTextNode(" "));
      });

      if (!isHeading) {
        var lineTops = [];
        wordNodes.forEach(function (wordNode) {
          var top = Math.round(wordNode.getBoundingClientRect().top * 10) / 10;
          var lineIndex = lineTops.indexOf(top);
          if (lineIndex === -1) {
            lineIndex = lineTops.length;
            lineTops.push(top);
          }
          wordNode.querySelectorAll(".qi-product-letter").forEach(function (letterNode) {
            letterNode.style.setProperty("--qi-letter-delay", (50 + lineIndex * 30) + "ms");
          });
        });
      }

      node.dataset.productLettered = "true";
    }

    if (page === "product") {
      root.querySelectorAll("[data-product-letter]").forEach(letterizeProductText);
    }

    function tokenizeAboutText(node) {
      if (!node || node.dataset.aboutTokenized === "true") return;
      var text = node.textContent.trim();
      var words = text.split(/\s+/);
      var wordNodes = [];
      var isSpring = node.dataset.aboutTextEffect === "spring";

      node.textContent = "";
      node.setAttribute("aria-label", text);
      words.forEach(function (word, wordIndex) {
        var wordNode = document.createElement("span");
        wordNode.className = "qi-about-token-word qi-about-token";
        wordNode.setAttribute("aria-hidden", "true");
        wordNode.textContent = word;
        wordNodes.push(wordNode);
        node.appendChild(wordNode);
        if (wordIndex < words.length - 1) {
          node.appendChild(document.createTextNode(" "));
        }
      });

      var lineTops = [];
      wordNodes.forEach(function (wordNode) {
        var top = Math.round(wordNode.getBoundingClientRect().top * 10) / 10;
        var lineIndex = lineTops.indexOf(top);
        if (lineIndex === -1) {
          lineIndex = lineTops.length;
          lineTops.push(top);
        }
        wordNode.style.setProperty(
          "--qi-about-token-delay",
          ((isSpring ? 50 : 550) + lineIndex * 30) + "ms"
        );
      });

      node.dataset.aboutTokenized = "true";
    }

    if (page === "about") {
      var aboutTextEffects = Array.prototype.slice.call(
        root.querySelectorAll("[data-about-text-effect]")
      );
      aboutTextEffects.forEach(tokenizeAboutText);
      if (reducedMotion || !("IntersectionObserver" in window)) {
        aboutTextEffects.forEach(function (node) {
          node.classList.add("is-effect-visible");
        });
      } else {
        var aboutTextObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-effect-visible");
            aboutTextObserver.unobserve(entry.target);
          });
        }, { rootMargin: "0px", threshold: 0 });
        aboutTextEffects.forEach(function (node) {
          aboutTextObserver.observe(node);
        });
      }
    }

    if (page === "404") {
      if (reducedMotion) {
        root.classList.add("is-not-found-visible");
      } else {
        window.requestAnimationFrame(function () {
          root.classList.add("is-not-found-visible");
        });
      }
    }

    var reveals = Array.prototype.slice.call(root.querySelectorAll(".qi-reveal"));
    if (page === "legal" || reducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(function (node) { node.classList.add("is-visible"); });
    } else {
      function observeReveals(nodes, options) {
        if (!nodes.length) return;
        var pendingReveals = new Set(nodes);
        var revealFallbackFrame = 0;

        function stopRevealFallbackAudit() {
          if (pendingReveals.size) return;
          window.removeEventListener("scroll", queueRevealFallbackAudit);
          window.removeEventListener("resize", queueRevealFallbackAudit);
        }

        function showReveal(node) {
          if (!pendingReveals.has(node)) return;
          node.classList.add("is-visible");
          pendingReveals.delete(node);
          revealObserver.unobserve(node);
          stopRevealFallbackAudit();
        }

        function auditPassedReveals() {
          revealFallbackFrame = 0;
          var activationLine = window.innerHeight * 0.5;
          pendingReveals.forEach(function (node) {
            var rect = node.getBoundingClientRect();
            if (rect.bottom <= 0 || (rect.bottom > 0 && rect.top < activationLine)) {
              showReveal(node);
            }
          });
        }

        function queueRevealFallbackAudit() {
          if (revealFallbackFrame || !pendingReveals.size) return;
          revealFallbackFrame = window.requestAnimationFrame(auditPassedReveals);
        }

        var revealObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            showReveal(entry.target);
          });
        }, options);
        nodes.forEach(function (node) {
          revealObserver.observe(node);
        });
        window.addEventListener("scroll", queueRevealFallbackAudit, { passive: true });
        window.addEventListener("resize", queueRevealFallbackAudit);
        queueRevealFallbackAudit();
      }

      reveals.forEach(function (node, index) {
        if (!node.style.getPropertyValue("--qi-delay")) {
          node.style.setProperty("--qi-delay", Math.min(index % 4, 3) * 55 + "ms");
        }
      });

      if (page === "about") {
        [0, 0.5].forEach(function (threshold) {
          observeReveals(reveals.filter(function (node) {
            return Number(node.dataset.qiThreshold || 0) === threshold;
          }), { rootMargin: "0px", threshold: threshold });
        });
      } else if (page === "article") {
        [0, 0.5].forEach(function (threshold) {
          observeReveals(reveals.filter(function (node) {
            return Number(node.dataset.qiThreshold || 0) === threshold;
          }), { rootMargin: "0px", threshold: threshold });
        });
      } else if (page === "contact") {
        var contactMountReveals = reveals.filter(function (node) {
          return node.classList.contains("qi-contact-heading") ||
            node.classList.contains("qi-contact-preorder");
        });
        window.requestAnimationFrame(function () {
          contactMountReveals.forEach(function (node) {
            node.classList.add("is-visible");
          });
        });
        observeReveals(reveals.filter(function (node) {
          return contactMountReveals.indexOf(node) === -1;
        }), { rootMargin: "0px", threshold: 0.5 });
      } else {
        observeReveals(
          reveals,
          page === "product" || page === "blogs" ?
            { rootMargin: "0px", threshold: 0.5 } :
            { rootMargin: "0px 0px -7% 0px", threshold: 0.08 }
        );
      }
    }

    var faqItems = Array.prototype.slice.call(root.querySelectorAll(".qi-faq-item"));

    function setFaqItemState(item, open, animate) {
      var button = item.querySelector("button");
      var answer = item.querySelector(".qi-faq-answer");
      if (!button || !answer) return;

      if (answer._qiFaqAnimation) {
        answer._qiFaqAnimation.cancel();
        answer._qiFaqAnimation = null;
      }

      var startHeight = answer.getBoundingClientRect().height;
      item.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      var endHeight = open ? answer.scrollHeight : 0;

      if (!animate || reducedMotion || typeof answer.animate !== "function") {
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
      answer._qiFaqAnimation = animation;
      animation.addEventListener("finish", function () {
        if (answer._qiFaqAnimation !== animation) return;
        answer._qiFaqAnimation = null;
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

    function setFormState(form, state, message) {
      var status = form.querySelector(".qi-form-status");
      var button = form.querySelector('button[type="submit"]');
      form.dataset.state = state;
      if (button) {
        button.disabled = state === "submitting" || state === "success";
        button.toggleAttribute("aria-busy", state === "submitting");
      }
      if (status) {
        status.hidden = !message;
        status.textContent = message || "";
      }
    }

    function simulateLocalSubmission(form, kind) {
      setFormState(form, "submitting", "Sending…");
      window.setTimeout(function () {
        form.reset();
        setFormState(
          form,
          "success",
          kind === "newsletter" ?
            "You’re on the list." :
            "Got your request! We’ll get back to you soon."
        );
      }, reducedMotion ? 0 : 700);
    }

    function wireForm(form, kind) {
      if (!form) return;
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (kind === "newsletter") {
          var email = form.querySelector('input[type="email"]');
          var value = email ? email.value.trim() : "";
          var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

          if (!value || !isEmail) {
            form.classList.remove("is-error");
            void form.offsetWidth;
            form.classList.add("is-error");
            window.setTimeout(function () {
              form.classList.remove("is-error");
            }, 200);
            return;
          }

          var newsletterEndpoint = form.getAttribute("data-endpoint");
          if (!newsletterEndpoint) return;

          window.fetch(newsletterEndpoint, {
            method: form.getAttribute("method") || "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" }
          }).catch(function () {
            form.classList.remove("is-error");
            void form.offsetWidth;
            form.classList.add("is-error");
            window.setTimeout(function () {
              form.classList.remove("is-error");
            }, 200);
          });
          return;
        }

        setFormState(form, "idle", "");
        if (!form.checkValidity()) {
          form.reportValidity();
          setFormState(form, "idle", "Please complete the required fields.");
          return;
        }
        var trap = form.querySelector('[name="Website"]');
        if (trap && trap.value) return;
        var endpoint = form.getAttribute("data-endpoint");
        if (!endpoint) {
          simulateLocalSubmission(form, kind);
          return;
        }
        setFormState(form, "submitting", "Sending…");
        window.fetch(endpoint, {
          method: form.getAttribute("method") || "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" }
        }).then(function (response) {
          if (!response.ok) throw new Error("Request failed");
          form.reset();
          setFormState(
            form,
            "success",
            kind === "newsletter" ?
              "You’re on the list." :
              "Got your request! We’ll get back to you soon."
          );
        }).catch(function () {
          setFormState(form, "error", "Something went wrong");
        });
      });
    }

    wireForm(root.querySelector(".qi-contact-form"), "contact");
    wireForm(root.querySelector(".qi-newsletter-form"), "newsletter");

    var hero = root.querySelector(".qi-image-hero");
    var heroImage = hero ? (
      page === "about" ?
        hero.querySelector(".qi-about-hero-media > img") :
        page === "product" ?
          hero.querySelector(".qi-product-hero-media > img") :
          hero.querySelector(":scope > img")
    ) : null;
    var heroMotionNode = page === "product" && heroImage ?
      heroImage.closest(".qi-product-hero-media") :
      heroImage;
    var footer = root.querySelector(".qi-footer");
    var footerBackdrop = root.querySelector(".qi-footer-backdrop");
    var footerPanel = root.querySelector(".qi-footer-panel");
    var frame = 0;
    var footerFrame = 0;
    var footerTarget = 0;
    var footerCurrent = 0;
    var footerLastTime = 0;
    var heroBaseScale = 1;

    if (heroMotionNode) {
      heroMotionNode.style.setProperty("--qi-hero-scale", heroBaseScale.toFixed(4));
    }

    function updateMotion() {
      frame = 0;
      if (reducedMotion) return;
      var scrollY = window.scrollY || window.pageYOffset;
      if (hero && heroImage && heroMotionNode) {
        var travel = clamp(scrollY - hero.offsetTop, 0, hero.offsetHeight);
        var heroProgress = travel / Math.max(hero.offsetHeight, 1);
        if (page === "about") {
          var aboutTravel = Math.max(0, scrollY - hero.offsetTop);
          var aboutHeroProgress = clamp(
            aboutTravel / Math.max(hero.offsetHeight, 1),
            0,
            1
          );
          hero.style.setProperty(
            "--qi-about-page-scale",
            (1 - aboutHeroProgress * 0.02).toFixed(6)
          );
          heroMotionNode.style.setProperty("--qi-hero-y", (-aboutTravel * 0.2).toFixed(2) + "px");
          heroMotionNode.style.setProperty("--qi-hero-scale", "1");
        } else if (page === "product") {
          var productTravel = Math.max(0, scrollY - hero.offsetTop);
          heroMotionNode.style.setProperty("--qi-hero-y", (-productTravel * 0.1).toFixed(2) + "px");
          heroMotionNode.style.setProperty("--qi-hero-scale", "1");
        } else {
          heroMotionNode.style.setProperty("--qi-hero-y", (-travel * 0.06).toFixed(2) + "px");
          heroMotionNode.style.setProperty("--qi-hero-scale", (heroBaseScale + heroProgress * 0.025).toFixed(4));
        }
      }
    }

    function requestMotion() {
      if (!frame) frame = window.requestAnimationFrame(updateMotion);
    }

    function applyFooterMotion(progress) {
      if (!footerBackdrop || !footerPanel) return;
      footerBackdrop.style.setProperty(
        "--qi-footer-backdrop-scale",
        (0.9 + progress * 0.1).toFixed(5)
      );
      footerBackdrop.style.setProperty(
        "--qi-footer-backdrop-y",
        ((1 - progress) * 60).toFixed(2) + "px"
      );
      footerPanel.style.setProperty("--qi-footer-scale", (0.9 + progress * 0.1).toFixed(5));
      footerPanel.style.setProperty("--qi-footer-y", ((1 - progress) * 170).toFixed(2) + "px");
    }

    function updateFooterMotion(now) {
      footerFrame = 0;
      if (!footer || !footerBackdrop || !footerPanel || reducedMotion) return;
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
        footerFrame = window.requestAnimationFrame(updateFooterMotion);
      } else {
        footerLastTime = 0;
      }
    }

    function requestFooterMotion() {
      if (!footerFrame) footerFrame = window.requestAnimationFrame(updateFooterMotion);
    }

    function measureFooterMotion() {
      if (!footer || !footerBackdrop || !footerPanel || reducedMotion) return;
      var rect = footer.getBoundingClientRect();
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      footerTarget = clamp((viewportHeight - rect.top) / Math.max(rect.height, 1), 0, 1);
      requestFooterMotion();
    }

    if (!reducedMotion) {
      updateMotion();
      window.addEventListener("scroll", requestMotion, { passive: true });
      window.addEventListener("resize", requestMotion);
      measureFooterMotion();
      window.addEventListener("scroll", measureFooterMotion, { passive: true });
      window.addEventListener("resize", measureFooterMotion);
    } else {
      applyFooterMotion(1);
    }

    window.addEventListener("pagehide", function () {
      if (frame) window.cancelAnimationFrame(frame);
      if (footerFrame) window.cancelAnimationFrame(footerFrame);
    });
  });
})();

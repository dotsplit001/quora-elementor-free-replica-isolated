(function () {
  "use strict";

  document.querySelectorAll("[data-preorder-modal]").forEach(function (modal) {
    if (modal.dataset.initialized === "true") return;
    modal.dataset.initialized = "true";

    var dialog = modal.querySelector(".q-preorder-dialog");
    var closeButton = modal.querySelector("[data-preorder-close]");
    var form = modal.querySelector("[data-preorder-form]");
    var submitButton = form && form.querySelector('button[type="submit"]');
    var submitLabel = form && form.querySelector("[data-preorder-submit-label]");
    var lastActive = null;
    var closeTimer = 0;
    var previousHtmlOverflow = "";
    var previousBodyOverflow = "";

    function preorderButtons() {
      return Array.prototype.slice.call(document.querySelectorAll(
        ".q-button, .qi-button"
      )).filter(function (button) {
        var label = button.querySelector(".q-button__label, .qi-button-label");
        return label && label.textContent.trim() === "Pre-order";
      });
    }

    function openModal(trigger) {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
      lastActive = trigger || document.activeElement;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      window.requestAnimationFrame(function () {
        modal.classList.add("is-open");
        if (dialog) dialog.focus({ preventScroll: true });
      });
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      closeTimer = window.setTimeout(function () {
        modal.hidden = true;
        closeTimer = 0;
      }, 220);
      if (lastActive && typeof lastActive.focus === "function") {
        lastActive.focus({ preventScroll: true });
      }
    }

    preorderButtons().forEach(function (button) {
      button.setAttribute("aria-haspopup", "dialog");
      button.addEventListener("click", function () {
        openModal(button);
      });
    });

    if (closeButton) closeButton.addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) {
      if (event.target.matches("[data-preorder-dismiss]")) closeModal();
    });

    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      var focusable = Array.prototype.slice.call(dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(function (node) {
        return node.offsetParent !== null;
      });
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.setAttribute("aria-busy", "true");
        }
        if (submitLabel) submitLabel.textContent = "Loading";
        window.setTimeout(function () {
          form.classList.add("is-success");
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
          }
          if (submitLabel) submitLabel.textContent = "Got your order!";
        }, 650);
      });
    }
  });
})();

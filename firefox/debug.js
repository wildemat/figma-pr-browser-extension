/**
 * Debug helper for Figma PR Extension
 * Add this to help troubleshoot issues
 */

// Add debugging to content script
(function () {
  console.log("=== Figma PR Extension Debug Info ===");
  console.log("URL:", window.location.href);
  console.log("Page title:", document.title);
  console.log("User agent:", navigator.userAgent);

  // Check if we're on a GitHub PR page
  const isPRPage =
    window.location.href.includes("/pull/") ||
    window.location.href.includes("/compare/");
  console.log("Is PR page:", isPRPage);

  // Check for common selectors
  const selectors = [
    "#pull_request_body",
    'textarea[name="pull_request[body]"]',
    ".js-comment-field",
    ".timeline-comment-actions",
    ".edit-comment-hide .form-actions",
    ".comment-form-actions",
    ".form-actions",
  ];

  selectors.forEach((selector) => {
    const element = document.querySelector(selector);
    console.log(`${selector}:`, element ? "FOUND" : "NOT FOUND");
  });

  // Check extension permissions
  if (typeof browser !== "undefined") {
    console.log("Browser API available");
    browser.storage.sync
      .get(["figmaToken"])
      .then((result) => {
        console.log("Token configured:", !!result.figmaToken);
        if (result.figmaToken) {
          console.log(
            "Token starts with:",
            result.figmaToken.substring(0, 10) + "...",
          );
        }
      })
      .catch((err) => {
        console.error("Storage error:", err);
      });
  } else {
    console.error("Browser API not available");
  }

  // Watch for button creation
  const observer = new MutationObserver(() => {
    const button = document.querySelector("#figma-process-btn");
    if (button && !button.hasAttribute("data-debug-logged")) {
      console.log("Figma button found!", button);
      button.setAttribute("data-debug-logged", "true");
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

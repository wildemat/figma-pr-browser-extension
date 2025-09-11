/**
 * Content script for GitHub PR pages
 * Processes Figma links in PR descriptions
 */

class FigmaPRProcessor {
  constructor() {
    this.figmaToken = null;
    this.isProcessing = false;
    this.init();
  }

  async init() {
    // Get Figma token from storage
    const result = await chrome.storage.sync.get(["figmaToken"]);
    this.figmaToken = result.figmaToken;

    this.addProcessButton();
    this.observePageChanges();
    this.startPeriodicCheck();
  }

  addProcessButton() {
    // Remove existing button first
    const existingButton = document.querySelector("#figma-process-btn");
    if (existingButton) {
      existingButton.remove();
    }

    // Only add button if we're in PR description edit mode and Write tab is selected
    const prDescriptionTextarea =
      document.querySelector("#pull_request_body") ||
      document.querySelector('textarea[name="pull_request[body]"]');

    // Check if we're actually in edit mode (not just viewing)
    // Edit mode is determined by visibility of Cancel and Update buttons within first .js-comment-update container
    const firstCommentUpdateContainer =
      document.querySelector(".js-comment-update");
    let isInEditMode = false;

    if (firstCommentUpdateContainer) {
      const cancelButton = firstCommentUpdateContainer.querySelector(
        ".js-comment-cancel-button",
      );

      // Look for update/submit button with multiple selectors
      const updateButton =
        firstCommentUpdateContainer.querySelector(
          'button[type="submit"]:not(.js-comment-cancel-button)',
        ) ||
        firstCommentUpdateContainer.querySelector("button.Button--primary") ||
        firstCommentUpdateContainer.querySelector(
          "button:has(.Button-label)",
        ) ||
        firstCommentUpdateContainer.querySelector('input[type="submit"]');

      // Edit mode only if both buttons exist and are visible within the first .js-comment-update container
      isInEditMode =
        cancelButton &&
        updateButton &&
        cancelButton.offsetParent !== null &&
        updateButton.offsetParent !== null;
    }

    // Debug: Check tab states
    const writeTab =
      document.querySelector(".write-tab.selected") ||
      document.querySelector('.js-write-tab[aria-selected="true"]');
    const previewTab =
      document.querySelector(".preview-tab.selected") ||
      document.querySelector('.js-preview-tab[aria-selected="true"]');

    // Enhanced tab detection - look for any write/preview tabs and their states
    const allWriteTabs = document.querySelectorAll(".write-tab, .js-write-tab");
    const allPreviewTabs = document.querySelectorAll(
      ".preview-tab, .js-preview-tab",
    );

    // More robust tab checking
    const isWriteTabActive = Array.from(allWriteTabs).some(
      (tab) =>
        tab.classList.contains("selected") ||
        tab.getAttribute("aria-selected") === "true",
    );
    const isPreviewTabActive = Array.from(allPreviewTabs).some(
      (tab) =>
        tab.classList.contains("selected") ||
        tab.getAttribute("aria-selected") === "true",
    );

    // Must have PR description textarea, be in edit mode, and Write tab active (not Preview)
    // If Preview tab is active, always hide button regardless of Write tab state
    if (
      !prDescriptionTextarea ||
      !isInEditMode ||
      isPreviewTabActive ||
      !isWriteTabActive
    ) {
      return;
    }

    // Create process button
    const button = document.createElement("button");
    button.id = "figma-process-btn";
    button.className = "btn btn-sm btn-outline";
    button.textContent = "🎨 Process Figma Links";
    button.style.marginLeft = "8px";

    // Try edit mode specific locations first
    const editModeLocations = [
      ".timeline-comment-actions", // Edit mode actions
      ".edit-comment-hide .form-actions", // Edit mode form actions
      ".comment-form-actions", // Comment form actions
    ];

    // Try general form locations
    const generalLocations = [
      ".form-actions", // General form actions
      ".new-pr-form .form-actions", // New PR form
      ".js-write-bucket", // Write tab area
    ];

    let buttonAdded = false;

    // Try edit mode locations first
    for (const selector of editModeLocations) {
      const container = document.querySelector(selector);
      if (container && !buttonAdded) {
        container.appendChild(button);
        button.addEventListener("click", () => this.processCurrentPR());
        buttonAdded = true;
        break;
      }
    }

    // If not found in edit mode, try general locations
    if (!buttonAdded) {
      for (const selector of generalLocations) {
        const container = document.querySelector(selector);
        if (container && !buttonAdded) {
          container.appendChild(button);
          button.addEventListener("click", () => this.processCurrentPR());
          buttonAdded = true;
          break;
        }
      }
    }

    // Last resort: add to form if textarea is present
    if (!buttonAdded && textarea) {
      const form = textarea.closest("form");
      if (form) {
        form.appendChild(button);
        button.addEventListener("click", () => this.processCurrentPR());
      }
    }
  }

  observePageChanges() {
    // Add click listeners for tab switching
    this.addTabClickListeners();

    // Watch for GitHub's dynamic page updates
    const observer = new MutationObserver((mutations) => {
      let shouldUpdateButton = false;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          // Check if this is a relevant change (not our own button addition)
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          // Skip if we just added/removed our own button
          const isOurButtonChange =
            addedNodes.some(
              (node) =>
                node.id === "figma-process-btn" ||
                (node.nodeType === Node.ELEMENT_NODE &&
                  node.querySelector("#figma-process-btn")),
            ) ||
            removedNodes.some(
              (node) =>
                node.id === "figma-process-btn" ||
                (node.nodeType === Node.ELEMENT_NODE &&
                  node.querySelector("#figma-process-btn")),
            );

          if (!isOurButtonChange) {
            // Check if relevant elements changed (tabs, forms, edit areas)
            const relevantChange =
              addedNodes.some((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                return (
                  node.matches &&
                  (node.matches(".tabnav-tab") ||
                    node.matches(".timeline-comment-actions") ||
                    node.matches(".edit-comment-hide") ||
                    node.matches(".js-comment-update") ||
                    node.matches(".comment-form-head") ||
                    node.matches("textarea") ||
                    node.querySelector(
                      ".tabnav-tab, .timeline-comment-actions, .edit-comment-hide, .js-comment-update, .comment-form-head, textarea",
                    ))
                );
              }) ||
              removedNodes.some((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                return (
                  node.matches &&
                  (node.matches(".tabnav-tab") ||
                    node.matches(".timeline-comment-actions") ||
                    node.matches(".edit-comment-hide") ||
                    node.matches(".js-comment-update") ||
                    node.matches(".comment-form-head") ||
                    node.matches("textarea") ||
                    // Check for button removal (could indicate edit mode exit)
                    node.matches('button[data-cancel-text="Cancel"]') ||
                    node.matches(".js-comment-cancel-button") ||
                    node.querySelector(
                      'button[data-cancel-text="Cancel"], .js-comment-cancel-button',
                    ))
                );
              });

            if (relevantChange) {
              shouldUpdateButton = true;
            }
          }
        }
      });

      if (shouldUpdateButton) {
        // Debounce button updates
        clearTimeout(this.buttonUpdateTimeout);
        this.buttonUpdateTimeout = setTimeout(
          () => this.addProcessButton(),
          100,
        );
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  startPeriodicCheck() {
    // Periodically check button state to catch missed events
    setInterval(() => {
      // Only check if we're not currently processing and button exists
      if (!this.isProcessing && document.querySelector("#figma-process-btn")) {
        const shouldButtonBeVisible = this.shouldButtonBeVisible();
        const buttonExists =
          document.querySelector("#figma-process-btn") !== null;

        // If button should not be visible but exists, or should be visible but doesn't exist
        if (shouldButtonBeVisible !== buttonExists) {
          this.addProcessButton();
        }
      }
    }, 2000); // Check every 2 seconds
  }

  shouldButtonBeVisible() {
    // Same logic as in addProcessButton but returns boolean
    const prDescriptionTextarea =
      document.querySelector("#pull_request_body") ||
      document.querySelector('textarea[name="pull_request[body]"]');

    const firstCommentUpdateContainer =
      document.querySelector(".js-comment-update");
    let isInEditMode = false;

    if (firstCommentUpdateContainer) {
      const cancelButton = firstCommentUpdateContainer.querySelector(
        ".js-comment-cancel-button",
      );
      const updateButton =
        firstCommentUpdateContainer.querySelector(
          'button[type="submit"]:not(.js-comment-cancel-button)',
        ) ||
        firstCommentUpdateContainer.querySelector("button.Button--primary") ||
        firstCommentUpdateContainer.querySelector(
          "button:has(.Button-label)",
        ) ||
        firstCommentUpdateContainer.querySelector('input[type="submit"]');

      isInEditMode =
        cancelButton &&
        updateButton &&
        cancelButton.offsetParent !== null &&
        updateButton.offsetParent !== null;
    }

    const allWriteTabs = document.querySelectorAll(".write-tab, .js-write-tab");
    const allPreviewTabs = document.querySelectorAll(
      ".preview-tab, .js-preview-tab",
    );

    const isWriteTabActive = Array.from(allWriteTabs).some(
      (tab) =>
        tab.classList.contains("selected") ||
        tab.getAttribute("aria-selected") === "true",
    );
    const isPreviewTabActive = Array.from(allPreviewTabs).some(
      (tab) =>
        tab.classList.contains("selected") ||
        tab.getAttribute("aria-selected") === "true",
    );

    return (
      prDescriptionTextarea &&
      isInEditMode &&
      !isPreviewTabActive &&
      isWriteTabActive
    );
  }

  addTabClickListeners() {
    // Listen for clicks on Write/Preview tabs, Cancel buttons, and Edit buttons
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;

        // Check if clicked element is a write or preview tab
        if (
          target &&
          (target.classList.contains("write-tab") ||
            target.classList.contains("preview-tab") ||
            target.classList.contains("js-write-tab") ||
            target.classList.contains("js-preview-tab"))
        ) {
          // Delay to allow GitHub to update the tab states
          setTimeout(() => {
            this.addProcessButton();
          }, 100);
        }

        // Check if clicked element is a cancel button (more robust detection)
        if (
          target &&
          (target.classList.contains("js-comment-cancel-button") ||
            target.textContent?.trim().toLowerCase() === "cancel" ||
            target.getAttribute("data-cancel-text") === "Cancel" ||
            target.closest('button[data-cancel-text="Cancel"]') ||
            target.closest(".js-comment-cancel-button"))
        ) {
          // Delay to allow GitHub to exit edit mode
          setTimeout(() => {
            this.addProcessButton();
          }, 150); // Slightly longer delay
        }

        // Check if clicked element is an edit button
        if (target && target.classList.contains("js-comment-edit-button")) {
          // Delay to allow GitHub to enter edit mode, then check if button is needed
          setTimeout(() => {
            // Only update if button doesn't already exist (check inside timeout)
            if (!document.querySelector("#figma-process-btn")) {
              this.addProcessButton();
            }
          }, 200); // Slightly longer delay for edit mode to fully load
        }
      },
      true,
    ); // Use capture phase to catch the event early
  }

  async processCurrentPR() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const button = document.querySelector("#figma-process-btn");
    if (button) {
      button.disabled = true;
      button.textContent = "⏳ Processing...";
    }

    try {
      // Get settings first
      const settings = await this.getSettings();

      if (!settings.figmaToken) {
        this.showTokenPrompt();
        return;
      }

      // Get PR description textarea (not comment field)
      const textarea =
        document.querySelector("#pull_request_body") ||
        document.querySelector('textarea[name="pull_request[body]"]');

      if (!textarea) {
        throw new Error("Could not find PR description textarea");
      }

      const originalText = textarea.value;
      const processedText = await this.processFigmaLinks(
        originalText,
        settings,
      );

      if (processedText === originalText) {
        this.showInfo("No Figma links found to process.");
        return;
      }

      // Handle diff approval if enabled
      if (settings.diffApprovalEnabled) {
        this.showDiffPreview(
          originalText,
          processedText,
          settings,
          (approvedText) => {
            textarea.value = approvedText;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            this.showSuccess("Changes applied successfully!");
          },
        );
      } else {
        // Apply changes directly
        textarea.value = processedText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        this.showSuccess("Figma links processed successfully!");
      }
    } catch (error) {
      console.error("Figma PR Links error:", error);
      this.showError(`Error: ${error.message}`);
    } finally {
      this.isProcessing = false;
      if (button) {
        button.disabled = false;
        button.textContent = "🎨 Process Figma Links";
      }
    }
  }

  async getSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(
        ["figmaToken", "specHeading", "diffApprovalEnabled"],
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve({
              figmaToken: result.figmaToken || null,
              specHeading: result.specHeading || "Design Specs",
              diffApprovalEnabled: result.diffApprovalEnabled || false,
            });
          }
        },
      );
    });
  }

  async processFigmaLinks(text, settings) {
    // Find all Figma links
    const figmaLinks = this.findFigmaLinks(text);

    if (figmaLinks.length === 0) {
      return text;
    }

    let processedText = text;
    const designSpecs = [];
    let specCounter = this.getNextSpecNumber(text);

    // Track existing specs by node ID and version to handle duplicates
    const existingSpecs = this.getExistingSpecsByNodeId(text);
    const nodeVersionToSpecNumber = new Map();

    // Process each link
    for (const link of figmaLinks) {
      try {
        const parsed = parseFigmaUrl(link.url);
        if (!parsed) continue;

        // Get version info first to determine the full key
        let version;
        if (parsed.versionId) {
          version = createVersionFromId(parsed.versionId);
        } else {
          version = await fetchLatestVersion(
            parsed.fileId,
            settings.figmaToken,
          );
        }

        const nodeVersionKey = `${parsed.fileId}:${parsed.nodeId}:${version.id}`;

        // Check if this node ID + version already exists in existing specs
        if (existingSpecs[nodeVersionKey]) {
          const existingSpecNumber = existingSpecs[nodeVersionKey];
          const existingSpecId = `design-spec-${existingSpecNumber}`;

          // Replace with reference to existing spec
          const referenceText = createReferenceText(
            link.isMarkdownLink,
            link.linkText,
            existingSpecNumber,
            existingSpecId,
          );

          processedText = processedText.replace(link.fullMatch, referenceText);
          continue;
        }

        // Check if this node ID + version was already processed in this run
        if (nodeVersionToSpecNumber.has(nodeVersionKey)) {
          const existingSpecNumber =
            nodeVersionToSpecNumber.get(nodeVersionKey);
          const existingSpecId = `design-spec-${existingSpecNumber}`;

          // Replace with reference to spec being created in this run
          const referenceText = createReferenceText(
            link.isMarkdownLink,
            link.linkText,
            existingSpecNumber,
            existingSpecId,
          );

          processedText = processedText.replace(link.fullMatch, referenceText);
          continue;
        }

        // Mark this node ID + version as processed with current spec number
        nodeVersionToSpecNumber.set(nodeVersionKey, specCounter);

        // Get image URL
        const imageUrl = await fetchNodeImageUrl(
          parsed.fileId,
          parsed.nodeId,
          settings.figmaToken,
        );

        // Create spec
        const specId = `design-spec-${specCounter}`;
        const cleanUrl = createCleanFigmaUrl(
          parsed.fileId,
          parsed.nodeId,
          version.id,
        );
        const expirationDate = calculateImageExpirationDate();

        const designSpec = createDesignSpecSnippet(
          specCounter,
          specId,
          imageUrl,
          cleanUrl,
          version.id,
          version.created_at,
          expirationDate,
        );

        designSpecs.push(designSpec);

        // Replace original link with reference
        const referenceText = createReferenceText(
          link.isMarkdownLink,
          link.linkText,
          specCounter,
          specId,
        );

        processedText = processedText.replace(link.fullMatch, referenceText);
        specCounter++;
      } catch (error) {
        console.error(`Error processing link ${link.url}:`, error);
        this.showError(`Error processing link: ${error.message}`);
      }
    }

    // Add design specs section
    if (designSpecs.length > 0) {
      processedText = this.addDesignSpecsSection(
        processedText,
        designSpecs,
        settings.specHeading,
      );
    }

    return processedText;
  }

  findFigmaLinks(text) {
    const links = [];

    // Remove all content between spec markers to avoid processing already processed links
    let cleanText = text;
    const specRegex = /<!-- START_SPEC_\d+ -->[\s\S]*?<!-- END_SPEC_\d+ -->/g;
    cleanText = cleanText.replace(specRegex, "");

    // Regex for standalone Figma URLs
    const standaloneRegex = /https:\/\/www\.figma\.com\/design\/[^)\s]+/g;

    // Regex for markdown links with Figma URLs
    const markdownRegex =
      /\[([^\]]+)\]\((https:\/\/www\.figma\.com\/design\/[^)]+)\)/g;

    // Find markdown links first
    let match;
    while ((match = markdownRegex.exec(cleanText)) !== null) {
      links.push({
        url: match[2],
        fullMatch: match[0],
        isMarkdownLink: true,
        linkText: match[1],
      });
    }

    // Find standalone URLs (that aren't part of markdown links)
    const textWithoutMarkdown = cleanText.replace(markdownRegex, "");
    while ((match = standaloneRegex.exec(textWithoutMarkdown)) !== null) {
      links.push({
        url: match[0],
        fullMatch: match[0],
        isMarkdownLink: false,
        linkText: null,
      });
    }

    return links;
  }

  getNextSpecNumber(text) {
    const specRegex = /<!-- START_SPEC_(\d+) -->/g;
    let maxNumber = 0;
    let match;

    while ((match = specRegex.exec(text)) !== null) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }

    return maxNumber + 1;
  }

  getExistingSpecsByNodeId(text) {
    const existingSpecs = {};
    const specRegex =
      /<!-- START_SPEC_(\d+) -->[\s\S]*?\*\*Design Link:\*\* \[View in Figma\]\(https:\/\/www\.figma\.com\/design\/([^/]+)\/\?node-id=([^&]+)&[^)]*version-id=([^&)]+)/g;
    let match;

    while ((match = specRegex.exec(text)) !== null) {
      const specNumber = parseInt(match[1], 10);
      const fileId = match[2];
      const nodeId = match[3].replace("-", ":");
      const versionId = match[4];
      const nodeVersionKey = `${fileId}:${nodeId}:${versionId}`;
      existingSpecs[nodeVersionKey] = specNumber;
    }

    return existingSpecs;
  }

  addDesignSpecsSection(text, designSpecs, customHeading = "Design Specs") {
    const startMarker = `<!-- START_FIGMA_SECTION -->`;
    const endMarker = `<!-- END_FIGMA_SECTION - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->`;

    // First, check if START_FIGMA_SECTION marker exists
    const startMarkerIndex = text.indexOf(startMarker);
    const endMarkerIndex = text.indexOf(endMarker);

    if (startMarkerIndex > -1 && endMarkerIndex > startMarkerIndex) {
      // Markers exist, insert before end marker
      const beforeEnd = text.substring(0, endMarkerIndex);
      const afterEnd = text.substring(endMarkerIndex);
      return beforeEnd + designSpecs.join("\n") + "\n" + afterEnd;
    } else if (startMarkerIndex > -1) {
      // Start marker exists but no end marker, add end marker
      const afterStart = text.substring(startMarkerIndex);
      const beforeStart = text.substring(0, startMarkerIndex);
      return (
        beforeStart +
        startMarker +
        "\n\n## " +
        customHeading +
        "\n\n" +
        designSpecs.join("\n") +
        "\n\n" +
        endMarker +
        afterStart.substring(startMarker.length)
      );
    } else {
      // No markers exist, check if custom heading section exists
      const escapedHeading = customHeading.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const designSpecsRegex = new RegExp(
        `^#{1,6}\\s*${escapedHeading}\\s*$`,
        "im",
      );
      const headingMatch = text.match(designSpecsRegex);

      if (headingMatch) {
        // Heading exists, add start marker before it
        const headingIndex = text.indexOf(headingMatch[0]);
        const before = text.substring(0, headingIndex);
        const after = text.substring(headingIndex);
        return (
          before +
          startMarker +
          "\n" +
          after.substring(
            0,
            after.indexOf(headingMatch[0]) + headingMatch[0].length,
          ) +
          "\n\n" +
          designSpecs.join("\n") +
          "\n\n" +
          endMarker +
          after.substring(
            after.indexOf(headingMatch[0]) + headingMatch[0].length,
          )
        );
      } else {
        // Create new section with markers at the end
        return (
          text +
          `\n\n${startMarker}\n## ${customHeading}\n\n` +
          designSpecs.join("\n") +
          "\n\n" +
          endMarker
        );
      }
    }
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showInfo(message) {
    this.showNotification(message, "info");
  }

  showTokenPrompt() {
    // Create a more prominent modal-style prompt
    const overlay = document.createElement("div");
    overlay.className = "figma-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "figma-token-modal";

    // Create modal content using DOM methods for security
    const iconDiv = document.createElement("div");
    iconDiv.className = "icon";

    const iconImg = document.createElement("img");
    iconImg.id = "extension-icon";
    iconImg.alt = "Figma PR Links";
    iconDiv.appendChild(iconImg);

    const heading = document.createElement("h3");
    heading.textContent = "Figma Token Required";

    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Please configure your Figma API token to process Figma links.";

    const buttonDiv = document.createElement("div");
    buttonDiv.className = "buttons";

    const configBtn = document.createElement("button");
    configBtn.id = "config-token-btn";
    configBtn.className = "figma-config-btn";
    configBtn.textContent = "Configure Token";

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancel-token-btn";
    cancelBtn.className = "figma-cancel-btn";
    cancelBtn.textContent = "Cancel";

    buttonDiv.appendChild(configBtn);
    buttonDiv.appendChild(cancelBtn);

    modal.appendChild(iconDiv);
    modal.appendChild(heading);
    modal.appendChild(paragraph);
    modal.appendChild(buttonDiv);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Set the extension icon dynamically based on browser
    const extensionIcon = modal.querySelector("#extension-icon");

    // Try to get extension ID and set icon URL
    try {
      const extensionId =
        typeof chrome !== "undefined" && chrome.runtime
          ? chrome.runtime.id
          : typeof browser !== "undefined" && browser.runtime
            ? browser.runtime.id
            : null;

      if (extensionId) {
        const iconUrl =
          typeof chrome !== "undefined"
            ? `chrome-extension://${extensionId}/icons/icon-48.png`
            : `moz-extension://${extensionId}/icons/icon-48.png`;

        // Test if icon loads, fallback to emoji if not
        extensionIcon.onerror = () => {
          console.warn("Extension icon failed to load, using fallback");
          extensionIcon.style.display = "none";
          const fallbackDiv = document.createElement("div");
          fallbackDiv.className = "figma-fallback-icon";
          fallbackDiv.textContent = "🎨";
          extensionIcon.parentElement.replaceChild(fallbackDiv, extensionIcon);
        };

        extensionIcon.src = iconUrl;
      } else {
        throw new Error("Extension ID not available");
      }
    } catch (error) {
      console.warn("Could not load extension icon:", error);
      // Fallback to emoji if extension URL not available
      extensionIcon.style.display = "none";
      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "figma-fallback-icon";
      fallbackDiv.textContent = "🎨";
      extensionIcon.parentElement.replaceChild(fallbackDiv, extensionIcon);
    }

    // Handle button clicks
    modal.querySelector("#config-token-btn").addEventListener("click", () => {
      // Open extension popup (not possible in all browsers)
      // Instead, show instructions
      // Clear modal and rebuild with DOM methods
      while (modal.firstChild) {
        modal.removeChild(modal.firstChild);
      }

      const emojiDiv = document.createElement("div");
      emojiDiv.className = "figma-emoji-icon";
      emojiDiv.textContent = "🔧";

      const title = document.createElement("h3");
      title.textContent = "Configure Token";

      const instructions = document.createElement("div");
      instructions.className = "figma-instructions";

      const instructionsText = document.createElement("p");
      instructionsText.textContent = "To configure your Figma API token:";

      const instructionsList = document.createElement("ol");

      const steps = [
        "Click the extension icon in your browser toolbar",
        "Get a token from Figma Settings",
        "Paste it in the extension popup",
        "Click Save Settings",
        "Return here and try again",
      ];

      steps.forEach((stepText, index) => {
        const listItem = document.createElement("li");
        if (index === 1) {
          // Add link to step 2
          listItem.textContent = "Get a token from ";
          const link = document.createElement("a");
          link.href = "https://www.figma.com/settings";
          link.target = "_blank";
          link.textContent = "Figma Settings";
          listItem.appendChild(link);
        } else {
          listItem.textContent = stepText;
        }
        instructionsList.appendChild(listItem);
      });

      instructions.appendChild(instructionsText);
      instructions.appendChild(instructionsList);

      const closeBtn = document.createElement("button");
      closeBtn.id = "close-instructions-btn";
      closeBtn.className = "figma-close-btn";
      closeBtn.textContent = "Got it!";

      modal.appendChild(emojiDiv);
      modal.appendChild(title);
      modal.appendChild(instructions);
      modal.appendChild(closeBtn);

      modal
        .querySelector("#close-instructions-btn")
        .addEventListener("click", () => {
          document.body.removeChild(overlay);
        });
    });

    modal.querySelector("#cancel-token-btn").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `figma-notification ${type || "info"}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  showDiffPreview(originalText, newText, settings, onApprove) {
    const modal = createDiffPreviewModal(
      originalText,
      newText,
      onApprove,
      this,
    );
    document.body.appendChild(modal);
  }

  createDiffPreviewModal(originalText, newText, onApprove) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "figma-diff-overlay";

    // Create modal content
    const modal = document.createElement("div");
    modal.className = "figma-diff-modal";

    // Create header
    const header = document.createElement("div");
    header.className = "figma-diff-header";
    const headerTitle = document.createElement("h3");
    headerTitle.textContent = "Review Changes";
    header.appendChild(headerTitle);

    // Create split pane container
    const splitContainer = document.createElement("div");
    splitContainer.className = "figma-diff-split-container";

    // Create left pane (original content)
    const leftPane = document.createElement("div");
    leftPane.className = "figma-diff-left-pane";

    const leftHeader = document.createElement("div");
    leftHeader.className = "figma-diff-left-header";
    leftHeader.textContent = "Original Content";

    const leftContent = document.createElement("textarea");
    leftContent.className = "figma-diff-left-content";
    leftContent.value = originalText;
    leftContent.readOnly = true;

    leftPane.appendChild(leftHeader);
    leftPane.appendChild(leftContent);

    // Create resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "figma-diff-resize-handle";

    // Create right pane (new content - editable)
    const rightPane = document.createElement("div");
    rightPane.className = "figma-diff-right-pane";

    // Create tab header for right pane
    const rightHeader = document.createElement("div");
    rightHeader.className = "figma-diff-right-header";

    // Create tab navigation
    const tabNav = document.createElement("div");
    tabNav.className = "figma-diff-tab-nav";

    const editTab = document.createElement("button");
    editTab.textContent = "Edit";
    editTab.className = "figma-diff-tab active";

    const previewTab = document.createElement("button");
    previewTab.textContent = "Preview";
    previewTab.className = "figma-diff-tab";

    tabNav.appendChild(editTab);
    tabNav.appendChild(previewTab);
    rightHeader.appendChild(tabNav);

    // Create content container for tabs
    const rightContentContainer = document.createElement("div");
    rightContentContainer.className = "figma-diff-right-content-container";

    const rightContent = document.createElement("textarea");
    rightContent.className = "figma-diff-right-content";
    rightContent.value = newText;

    // Create preview content container
    const previewContent = document.createElement("div");
    previewContent.className = "figma-diff-preview-content";
    this.safeSetHTML(previewContent, this.renderMarkdown(newText));

    rightContentContainer.appendChild(rightContent);
    rightContentContainer.appendChild(previewContent);

    // Tab switching logic
    editTab.addEventListener("click", () => {
      editTab.className = "figma-diff-tab active";
      previewTab.className = "figma-diff-tab";
      rightContent.style.display = "block";
      previewContent.style.display = "none";
    });

    previewTab.addEventListener("click", () => {
      previewTab.className = "figma-diff-tab active";
      editTab.className = "figma-diff-tab";
      rightContent.style.display = "none";
      previewContent.style.display = "block";
      // Update preview content when switching to preview tab
      this.safeSetHTML(previewContent, this.renderMarkdown(rightContent.value));
    });

    // Update preview when content changes in edit mode
    rightContent.addEventListener("input", () => {
      if (previewContent.style.display === "block") {
        this.safeSetHTML(
          previewContent,
          this.renderMarkdown(rightContent.value),
        );
      }
    });

    // Create copy buttons container (below right pane)
    const copyButtonsContainer = document.createElement("div");
    copyButtonsContainer.className = "figma-diff-copy-buttons";

    // Create copy buttons
    const copyFullBtn = this.createStyledButton("Copy Full Content", "copy");
    const copySpecsBtn = this.createStyledButton("Copy Figma Section", "copy");

    copyButtonsContainer.appendChild(copyFullBtn);
    copyButtonsContainer.appendChild(copySpecsBtn);

    rightPane.appendChild(rightHeader);
    rightPane.appendChild(rightContentContainer);
    rightPane.appendChild(copyButtonsContainer);

    // Add resize functionality
    let isResizing = false;
    let startX = 0;
    let startLeftWidth = 0;

    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startLeftWidth = leftPane.offsetWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const containerWidth = splitContainer.offsetWidth;
      const newLeftWidth = startLeftWidth + deltaX;
      const leftPercentage = Math.max(
        20,
        Math.min(80, (newLeftWidth / containerWidth) * 100),
      );

      leftPane.style.width = `${leftPercentage}%`;
      rightPane.style.width = `${100 - leftPercentage}%`;
      resizeHandle.style.left = `${leftPercentage}%`;
    });

    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });

    splitContainer.appendChild(leftPane);
    splitContainer.appendChild(resizeHandle);
    splitContainer.appendChild(rightPane);

    // Create footer with action buttons
    const footer = document.createElement("div");
    footer.className = "figma-diff-footer";

    const cancelBtn = this.createStyledButton("Cancel", "cancel");
    const approveBtn = this.createStyledButton("Approve & Apply", "approve");

    footer.appendChild(cancelBtn);
    footer.appendChild(approveBtn);

    // Add event listeners
    copyFullBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(rightContent.value);
      this.showButtonFeedback(copyFullBtn, "Copied!");
    });

    copySpecsBtn.addEventListener("click", () => {
      const currentText = rightContent.value;
      const specsSection = this.extractSpecsSection(currentText);

      if (specsSection) {
        navigator.clipboard.writeText(specsSection);
        this.showButtonFeedback(copySpecsBtn, "Copied!");
      } else {
        this.showError("No specs section found");
      }
    });

    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      this.showInfo("Changes cancelled");
    });

    approveBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      onApprove(rightContent.value);
    });

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(splitContainer);
    modal.appendChild(footer);

    overlay.appendChild(modal);

    return overlay;
  }

  createStyledButton(text, type) {
    const button = document.createElement("button");
    button.textContent = text;

    switch (type) {
      case "copy":
        button.className = "figma-copy-btn";
        break;
      case "cancel":
        button.className = "figma-cancel-footer-btn";
        break;
      case "approve":
        button.className = "figma-approve-btn";
        break;
    }

    return button;
  }

  showButtonFeedback(button, message) {
    const originalText = button.textContent;
    button.textContent = message;
    button.style.background = "#1f883d";
    button.style.color = "white";
    button.style.borderColor = "#1f883d";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "white";
      button.style.color = "#24292e";
      button.style.borderColor = "#d0d7de";
    }, 1500);
  }

  extractSpecsSection(text) {
    const startMarker = `<!-- START_FIGMA_SECTION -->`;
    const endMarker = `<!-- END_FIGMA_SECTION`;

    const startIndex = text.indexOf(startMarker);
    const endMarkerIndex = text.indexOf(endMarker);

    if (startIndex > -1 && endMarkerIndex > startIndex) {
      const endPos =
        endMarkerIndex + text.substring(endMarkerIndex).indexOf("-->") + 3;
      return text.substring(startIndex, endPos);
    }

    return null;
  }

  renderMarkdown(text) {
    // Use Snarkdown library for markdown rendering
    const html = snarkdown(text);

    return `<div class="figma-markdown-content">${html}</div>`;
  }

  safeSetHTML(element, htmlContent) {
    // For markdown content, we use DOMParser for safer HTML parsing
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // Clear existing content
      element.textContent = "";

      // Move all child nodes from body to the target element
      while (doc.body.firstChild) {
        element.appendChild(doc.body.firstChild);
      }
    } catch (error) {
      // Fallback to text content if parsing fails
      element.textContent = "Error rendering content";
    }
  }
}

// Include the shared modal functions directly in the content script
// (since we can't use imports in content scripts)

function safeSetHTML(element, htmlContent) {
  // For markdown content, we use DOMParser for safer HTML parsing
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Clear existing content
    element.textContent = "";

    // Move all child nodes from body to the target element
    while (doc.body.firstChild) {
      element.appendChild(doc.body.firstChild);
    }
  } catch (error) {
    // Fallback to text content if parsing fails
    element.textContent = "Error rendering content";
  }
}

function createDiffPreviewModal(originalText, newText, onApprove, context) {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "figma-diff-overlay";

  // Create modal content
  const modal = document.createElement("div");
  modal.className = "figma-diff-modal";

  // Create header
  const header = document.createElement("div");
  header.className = "figma-diff-header";
  const headerTitle = document.createElement("h3");
  headerTitle.textContent = "Review Changes";
  header.appendChild(headerTitle);

  // Create split pane container
  const splitContainer = document.createElement("div");
  splitContainer.className = "figma-diff-split-container";

  // Create left pane (original content)
  const leftPane = document.createElement("div");
  leftPane.className = "figma-diff-left-pane";

  const leftHeader = document.createElement("div");
  leftHeader.className = "figma-diff-left-header";
  leftHeader.textContent = "Original Content";

  const leftContent = document.createElement("textarea");
  leftContent.className = "figma-diff-left-content";
  leftContent.value = originalText;
  leftContent.readOnly = true;

  leftPane.appendChild(leftHeader);
  leftPane.appendChild(leftContent);

  // Create resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "figma-diff-resize-handle";

  // Create right pane (new content - editable)
  const rightPane = document.createElement("div");
  rightPane.className = "figma-diff-right-pane";

  // Create tab header for right pane
  const rightHeader = document.createElement("div");
  rightHeader.className = "figma-diff-right-header";

  // Create tab navigation
  const tabNav = document.createElement("div");
  tabNav.className = "figma-diff-tab-nav";

  const editTab = document.createElement("button");
  editTab.textContent = "Edit";
  editTab.className = "figma-diff-tab active";

  const previewTab = document.createElement("button");
  previewTab.textContent = "Preview";
  previewTab.className = "figma-diff-tab";

  tabNav.appendChild(editTab);
  tabNav.appendChild(previewTab);
  rightHeader.appendChild(tabNav);

  // Create content container for tabs
  const rightContentContainer = document.createElement("div");
  rightContentContainer.className = "figma-diff-right-content-container";

  const rightContent = document.createElement("textarea");
  rightContent.className = "figma-diff-right-content";
  rightContent.value = newText;

  // Create preview content container
  const previewContent = document.createElement("div");
  previewContent.className = "figma-diff-preview-content";
  safeSetHTML(previewContent, context.renderMarkdown(newText));

  rightContentContainer.appendChild(rightContent);
  rightContentContainer.appendChild(previewContent);

  // Tab switching logic
  editTab.addEventListener("click", () => {
    editTab.className = "figma-diff-tab active";
    previewTab.className = "figma-diff-tab";
    rightContent.style.display = "block";
    previewContent.style.display = "none";
  });

  previewTab.addEventListener("click", () => {
    previewTab.className = "figma-diff-tab active";
    editTab.className = "figma-diff-tab";
    rightContent.style.display = "none";
    previewContent.style.display = "block";
    // Update preview content when switching to preview tab
    safeSetHTML(previewContent, context.renderMarkdown(rightContent.value));
  });

  // Update preview when content changes in edit mode
  rightContent.addEventListener("input", () => {
    if (previewContent.style.display === "block") {
      safeSetHTML(previewContent, context.renderMarkdown(rightContent.value));
    }
  });

  // Create copy buttons container (below right pane)
  const copyButtonsContainer = document.createElement("div");
  copyButtonsContainer.className = "figma-diff-copy-buttons";

  // Create copy buttons
  const copyFullBtn = createStyledButton("Copy Full Content", "copy");
  const copySpecsBtn = createStyledButton("Copy Figma Section", "copy");

  copyButtonsContainer.appendChild(copyFullBtn);
  copyButtonsContainer.appendChild(copySpecsBtn);

  rightPane.appendChild(rightHeader);
  rightPane.appendChild(rightContentContainer);
  rightPane.appendChild(copyButtonsContainer);

  // Add resize functionality
  let isResizing = false;
  let startX = 0;
  let startLeftWidth = 0;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startLeftWidth = leftPane.offsetWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const containerWidth = splitContainer.offsetWidth;
    const newLeftWidth = startLeftWidth + deltaX;
    const leftPercentage = Math.max(
      20,
      Math.min(80, (newLeftWidth / containerWidth) * 100),
    );

    leftPane.style.width = `${leftPercentage}%`;
    rightPane.style.width = `${100 - leftPercentage}%`;
    resizeHandle.style.left = `${leftPercentage}%`;
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });

  splitContainer.appendChild(leftPane);
  splitContainer.appendChild(resizeHandle);
  splitContainer.appendChild(rightPane);

  // Create footer with action buttons
  const footer = document.createElement("div");
  footer.className = "figma-diff-footer";

  const cancelBtn = createStyledButton("Cancel", "cancel");
  const approveBtn = createStyledButton("Approve & Apply", "approve");

  footer.appendChild(cancelBtn);
  footer.appendChild(approveBtn);

  // Add event listeners
  copyFullBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(rightContent.value);
    showButtonFeedback(copyFullBtn, "Copied!");
  });

  copySpecsBtn.addEventListener("click", () => {
    const currentText = rightContent.value;
    const specsSection = context.extractSpecsSection(currentText);

    if (specsSection) {
      navigator.clipboard.writeText(specsSection);
      showButtonFeedback(copySpecsBtn, "Copied!");
    } else {
      context.showError("No specs section found");
    }
  });

  cancelBtn.addEventListener("click", () => {
    if (overlay.cleanup) overlay.cleanup();
    if (overlay.removeEventListeners) overlay.removeEventListeners();
    document.body.removeChild(overlay);
    context.showInfo("Changes cancelled");
  });

  approveBtn.addEventListener("click", () => {
    if (overlay.cleanup) overlay.cleanup();
    if (overlay.removeEventListeners) overlay.removeEventListeners();
    document.body.removeChild(overlay);
    onApprove(rightContent.value);
  });

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(splitContainer);
  modal.appendChild(footer);

  overlay.appendChild(modal);

  // Add scroll isolation when modal is shown
  const originalBodyOverflow = document.body.style.overflow;
  const originalBodyHeight = document.body.style.height;

  // Lock background scroll
  document.body.style.overflow = "hidden";
  document.body.style.height = "100%";

  // Prevent scroll events from propagating to the background
  modal.addEventListener("wheel", (e) => {
    e.stopPropagation();
  });

  modal.addEventListener("touchmove", (e) => {
    e.stopPropagation();
  });

  // Store cleanup functions in overlay for later use
  overlay.cleanup = () => {
    document.body.style.overflow = originalBodyOverflow;
    document.body.style.height = originalBodyHeight;
  };

  // Handle escape key and overlay clicks
  const handleClose = (e) => {
    if (e.key === "Escape" || e.target === overlay) {
      if (overlay.cleanup) overlay.cleanup();
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleClose);
      context.showInfo("Changes cancelled");
    }
  };

  // Store event cleanup function
  overlay.removeEventListeners = () => {
    document.removeEventListener("keydown", handleClose);
  };

  // Add event listeners for escape key and overlay click
  document.addEventListener("keydown", handleClose);
  overlay.addEventListener("click", handleClose);

  return overlay;
}

function createStyledButton(text, type) {
  const button = document.createElement("button");
  button.textContent = text;

  switch (type) {
    case "copy":
      button.className = "figma-copy-btn";
      break;
    case "cancel":
      button.className = "figma-cancel-footer-btn";
      break;
    case "approve":
      button.className = "figma-approve-btn";
      break;
  }

  return button;
}

function showButtonFeedback(button, message) {
  const originalText = button.textContent;
  button.textContent = message;
  button.style.background = "#1f883d";
  button.style.color = "white";
  button.style.borderColor = "#1f883d";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "";
    button.style.color = "";
    button.style.borderColor = "";
  }, 1500);
}

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new FigmaPRProcessor());
} else {
  new FigmaPRProcessor();
}

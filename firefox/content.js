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
    // Get Figma token from storage - Firefox compatibility
    const result = await browser.storage.sync.get(["figmaToken"]);
    this.figmaToken = result.figmaToken;

    if (!this.figmaToken) {
      console.log(
        "Figma PR Extension: No token found. Please configure in extension popup."
      );
    }

    // Always add the button - we'll check token when it's clicked
    this.addProcessButton();
    this.observePageChanges();
  }

  addProcessButton() {
    // Remove existing button first
    const existingButton = document.querySelector("#figma-process-btn");
    if (existingButton) {
      console.log("Removing existing button");
      existingButton.remove();
    }

    // Only add button if we're in PR description edit mode and Write tab is selected
    const prDescriptionTextarea = document.querySelector("#pull_request_body") ||
                                 document.querySelector('textarea[name="pull_request[body]"]');
    
    // Debug: Check tab states
    const writeTab = document.querySelector(".write-tab.selected") ||
                    document.querySelector('.js-write-tab[aria-selected="true"]');
    const previewTab = document.querySelector(".preview-tab.selected") ||
                      document.querySelector('.js-preview-tab[aria-selected="true"]');
    
    // Enhanced tab detection - look for any write/preview tabs and their states
    const allWriteTabs = document.querySelectorAll('.write-tab, .js-write-tab');
    const allPreviewTabs = document.querySelectorAll('.preview-tab, .js-preview-tab');
    
    console.log("Tab debug:", {
      writeTab: writeTab,
      previewTab: previewTab,
      allWriteTabs: allWriteTabs.length,
      allPreviewTabs: allPreviewTabs.length,
      writeTabSelected: allWriteTabs.length > 0 ? Array.from(allWriteTabs).map(tab => ({
        classes: tab.className,
        ariaSelected: tab.getAttribute('aria-selected'),
        selected: tab.classList.contains('selected')
      })) : [],
      previewTabSelected: allPreviewTabs.length > 0 ? Array.from(allPreviewTabs).map(tab => ({
        classes: tab.className,
        ariaSelected: tab.getAttribute('aria-selected'),
        selected: tab.classList.contains('selected')
      })) : []
    });
    
    // More robust tab checking
    const isWriteTabActive = Array.from(allWriteTabs).some(tab => 
      tab.classList.contains('selected') || tab.getAttribute('aria-selected') === 'true'
    );
    const isPreviewTabActive = Array.from(allPreviewTabs).some(tab => 
      tab.classList.contains('selected') || tab.getAttribute('aria-selected') === 'true'
    );
    
    console.log("Tab states:", { isWriteTabActive, isPreviewTabActive });
    
    // Must have PR description textarea and Write tab active (not Preview)
    // If Preview tab is active, always hide button regardless of Write tab state
    if (!prDescriptionTextarea || !prDescriptionTextarea.offsetParent || isPreviewTabActive || !isWriteTabActive) {
      console.log("Button hidden - textarea:", !!prDescriptionTextarea, "visible:", !!(prDescriptionTextarea?.offsetParent), "writeActive:", isWriteTabActive, "previewActive:", isPreviewTabActive);
      return;
    }

    // Create process button
    console.log("Creating new button");
    const button = document.createElement("button");
    button.id = "figma-process-btn";
    button.className = "btn btn-sm btn-outline";
    button.innerHTML = "🎨 Process Figma Links";
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
        console.log("Figma PR Extension: Button added to edit mode location", selector);
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
          console.log("Figma PR Extension: Button added to general location", selector);
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
        console.log("Figma PR Extension: Button added to form as fallback");
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
          const isOurButtonChange = addedNodes.some(node => 
            node.id === 'figma-process-btn' || 
            (node.nodeType === Node.ELEMENT_NODE && node.querySelector('#figma-process-btn'))
          ) || removedNodes.some(node => 
            node.id === 'figma-process-btn' || 
            (node.nodeType === Node.ELEMENT_NODE && node.querySelector('#figma-process-btn'))
          );
          
          if (!isOurButtonChange) {
            // Check if relevant elements changed (tabs, forms, edit areas)
            const relevantChange = addedNodes.some(node => {
              if (node.nodeType !== Node.ELEMENT_NODE) return false;
              return node.matches && (
                node.matches('.tabnav-tab') ||
                node.matches('.timeline-comment-actions') ||
                node.matches('.edit-comment-hide') ||
                node.matches('textarea') ||
                node.querySelector('.tabnav-tab, .timeline-comment-actions, .edit-comment-hide, textarea')
              );
            }) || removedNodes.some(node => {
              if (node.nodeType !== Node.ELEMENT_NODE) return false;
              return node.matches && (
                node.matches('.tabnav-tab') ||
                node.matches('.timeline-comment-actions') ||
                node.matches('.edit-comment-hide') ||
                node.matches('textarea')
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
        this.buttonUpdateTimeout = setTimeout(() => this.addProcessButton(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  addTabClickListeners() {
    // Listen for clicks on Write/Preview tabs
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      // Check if clicked element is a write or preview tab
      if (target && (
        target.classList.contains('write-tab') ||
        target.classList.contains('preview-tab') ||
        target.classList.contains('js-write-tab') ||
        target.classList.contains('js-preview-tab')
      )) {
        console.log('Tab clicked:', target.className);
        
        // Delay to allow GitHub to update the tab states
        setTimeout(() => {
          console.log('Updating button after tab click');
          this.addProcessButton();
        }, 100);
      }
    }, true); // Use capture phase to catch the event early
  }

  async processCurrentPR() {
    if (this.isProcessing) return;

    // Check token first
    const result = await browser.storage.sync.get(["figmaToken"]);
    this.figmaToken = result.figmaToken;

    if (!this.figmaToken) {
      this.showError(
        "Please configure your Figma API token in the extension popup first."
      );
      return;
    }

    this.isProcessing = true;
    const button = document.querySelector("#figma-process-btn");
    if (button) {
      button.disabled = true;
      button.innerHTML = "⏳ Processing...";
    }

    try {
      // Get PR description textarea (not comment field)
      const textarea = document.querySelector("#pull_request_body") ||
                      document.querySelector('textarea[name="pull_request[body]"]');

      if (!textarea) {
        throw new Error("Could not find PR description textarea");
      }

      console.log("Figma PR Extension: Found textarea for PR body", textarea);

      const originalText = textarea.value;
      const processedText = await this.processFigmaLinks(originalText);

      console.log("Figma PR Extension: Processing complete", processedText);

      if (processedText !== originalText) {
        textarea.value = processedText;

        // Trigger input event to notify GitHub of the change
        textarea.dispatchEvent(new Event("input", { bubbles: true }));

        this.showSuccess("Figma links processed successfully!");
      } else {
        this.showInfo("No Figma links found to process.");
      }
    } catch (error) {
      console.error("Figma PR Extension error:", error);
      this.showError(`Error: ${error.message}`);
    } finally {
      this.isProcessing = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = "🎨 Process Figma Links";
      }
    }
  }

  async processFigmaLinks(text) {
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
          version = await fetchLatestVersion(parsed.fileId, this.figmaToken);
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
            existingSpecId
          );
          
          processedText = processedText.replace(link.fullMatch, referenceText);
          continue;
        }
        
        // Check if this node ID + version was already processed in this run
        if (nodeVersionToSpecNumber.has(nodeVersionKey)) {
          const existingSpecNumber = nodeVersionToSpecNumber.get(nodeVersionKey);
          const existingSpecId = `design-spec-${existingSpecNumber}`;
          
          // Replace with reference to spec being created in this run
          const referenceText = createReferenceText(
            link.isMarkdownLink,
            link.linkText,
            existingSpecNumber,
            existingSpecId
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
          this.figmaToken
        );

        // Create spec
        const specId = `design-spec-${specCounter}`;
        const cleanUrl = createCleanFigmaUrl(
          parsed.fileId,
          parsed.nodeId,
          version.id
        );
        const expirationDate = calculateImageExpirationDate();

        const designSpec = createDesignSpecSnippet(
          specCounter,
          specId,
          imageUrl,
          cleanUrl,
          version.id,
          version.created_at,
          expirationDate
        );

        designSpecs.push(designSpec);

        // Replace original link with reference
        const referenceText = createReferenceText(
          link.isMarkdownLink,
          link.linkText,
          specCounter,
          specId
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
      processedText = this.addDesignSpecsSection(processedText, designSpecs);
    }

    return processedText;
  }

  findFigmaLinks(text) {
    const links = [];

    // Remove all content between spec markers to avoid processing already processed links
    let cleanText = text;
    const specRegex = /<!-- START_SPEC_\d+ -->[\s\S]*?<!-- END_SPEC_\d+ -->/g;
    cleanText = cleanText.replace(specRegex, '');

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
    const specRegex = /<!-- START_SPEC_(\d+) -->[\s\S]*?\*\*Design Link:\*\* \[View in Figma\]\(https:\/\/www\.figma\.com\/design\/([^/]+)\/\?node-id=([^&]+)&[^)]*version-id=([^&)]+)/g;
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

  addDesignSpecsSection(text, designSpecs) {
    // Check if Design Specs section exists
    const designSpecsRegex = /^#{1,6}\s*design\s+specs\s*$/im;
    const match = text.match(designSpecsRegex);

    if (match) {
      // Find end of existing section
      const endMarker = getDesignSpecsEndMarker();
      const endIndex = text.indexOf(endMarker);

      if (endIndex > -1) {
        // Insert before end marker
        const beforeEnd = text.substring(0, endIndex);
        const afterEnd = text.substring(endIndex);
        return beforeEnd + designSpecs.join("\n") + "\n" + afterEnd;
      } else {
        // Add end marker and specs after the section
        const sectionIndex = text.indexOf(match[0]) + match[0].length;
        const before = text.substring(0, sectionIndex);
        const after = text.substring(sectionIndex);
        return (
          before + "\n\n" + designSpecs.join("\n") + "\n\n" + endMarker + after
        );
      }
    } else {
      // Create new section at the end
      const endMarker = getDesignSpecsEndMarker();
      return (
        text +
        "\n\n## Design Specs\n\n" +
        designSpecs.join("\n") +
        "\n\n" +
        endMarker
      );
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

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    `;

    const colors = {
      success: "#28a745",
      error: "#dc3545",
      info: "#17a2b8",
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Include the utility functions directly in the content script
// (since we can't use imports in content scripts)

// Figma API functions
function parseFigmaUrl(url) {
  const fileIdMatch = url.match(/\/design\/([^/]+)\//);
  const nodeIdMatch = url.match(/node-id=([^&\s)]+)/);
  const versionMatch = url.match(/version-id=([^&\s)]+)/);

  if (fileIdMatch && nodeIdMatch) {
    return {
      fileId: fileIdMatch[1],
      nodeId: nodeIdMatch[1].replace("-", ":"),
      versionId: versionMatch ? versionMatch[1] : null,
    };
  }
  return null;
}

async function fetchLatestVersion(fileId, figmaToken) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileId}/versions`,
    { headers: { "X-Figma-Token": figmaToken } }
  );
  if (!response.ok) throw new Error(`Figma API error: ${response.status}`);
  const data = await response.json();
  return data.versions[0];
}

async function fetchNodeImageUrl(fileId, nodeId, figmaToken) {
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileId}?ids=${nodeId}&format=png`,
    { headers: { "X-Figma-Token": figmaToken } }
  );
  if (!response.ok) throw new Error(`Figma API error: ${response.status}`);
  const data = await response.json();
  const imageUrl = data.images[nodeId];
  if (!imageUrl) throw new Error(`Could not get image for node ${nodeId}`);
  return imageUrl;
}

function createVersionFromId(versionId) {
  return {
    id: versionId,
    created_at: new Date().toISOString(),
  };
}

// Utility functions
function calculateImageExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  return expirationDate.toISOString().split("T")[0];
}

function createCleanFigmaUrl(fileId, nodeId, versionId) {
  const dashNodeId = nodeId.replace(":", "-");
  return `https://www.figma.com/design/${fileId}/?node-id=${dashNodeId}&version-id=${versionId}&m=dev`;
}

function createDesignSpecSnippet(
  specNumber,
  specId,
  attachmentUrl,
  cleanUrl,
  versionId,
  snapshotTimestamp,
  expirationString
) {
  return `
<!-- START_SPEC_${specNumber} -->

<a id="${specId}"></a>

<details>
<summary><strong>🎨 Design Spec ${specNumber}</strong> <a href="#${specId}">#</a></summary>

<br>

<kbd><img alt="Figma Design Preview" src="${attachmentUrl}" /></kbd>

<details>
<summary>📋 Spec Details</summary>

**Design Link:** [View in Figma](${cleanUrl}) (Cmd+Click to open in new tab)

**Version:** ${versionId}

**Snapshot Timestamp:** ${snapshotTimestamp}

**Image Expires:** ${expirationString}

**Description: (enter description here)**

</details>

</details>

---

<!-- END_SPEC_${specNumber} -->

`;
}

function createReferenceText(isMarkdownLink, linkText, specNumber, specId) {
  if (isMarkdownLink && linkText) {
    return `${linkText} ([Refer to Design Spec ${specNumber} below](#${specId}))`;
  } else {
    return `[Refer to Design Spec ${specNumber} below](#${specId})`;
  }
}

function getDesignSpecsEndMarker() {
  return "<!-- END_DESIGN_SPECS - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->";
}

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new FigmaPRProcessor());
} else {
  new FigmaPRProcessor();
}

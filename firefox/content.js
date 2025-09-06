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
    const result = await chrome.storage.sync.get(['figmaToken']);
    this.figmaToken = result.figmaToken;

    if (!this.figmaToken) {
      console.log('Figma PR Extension: No token found. Please configure in extension popup.');
      return;
    }

    this.addProcessButton();
    this.observePageChanges();
  }

  addProcessButton() {
    // Remove existing button first
    const existingButton = document.querySelector('#figma-process-btn');
    if (existingButton) {
      console.log('Removing existing button');
      existingButton.remove();
    }

    // Only add button if we're in PR description edit mode and Write tab is selected
    const prDescriptionTextarea = document.querySelector('#pull_request_body') ||
                                 document.querySelector('textarea[name="pull_request[body]"]');
    
    // Debug: Check tab states
    const writeTab = document.querySelector('.write-tab.selected') ||
                    document.querySelector('.js-write-tab[aria-selected="true"]');
    const previewTab = document.querySelector('.preview-tab.selected') ||
                      document.querySelector('.js-preview-tab[aria-selected="true"]');
    
    // Enhanced tab detection - look for any write/preview tabs and their states
    const allWriteTabs = document.querySelectorAll('.write-tab, .js-write-tab');
    const allPreviewTabs = document.querySelectorAll('.preview-tab, .js-preview-tab');
    
    console.log('Tab debug:', {
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
    
    console.log('Tab states:', { isWriteTabActive, isPreviewTabActive });
    
    // Must have PR description textarea and Write tab active (not Preview)
    // If Preview tab is active, always hide button regardless of Write tab state
    if (!prDescriptionTextarea || !prDescriptionTextarea.offsetParent || isPreviewTabActive || !isWriteTabActive) {
      console.log('Button hidden - textarea:', !!prDescriptionTextarea, 'visible:', !!(prDescriptionTextarea?.offsetParent), 'writeActive:', isWriteTabActive, 'previewActive:', isPreviewTabActive);
      return;
    }

    // Create process button
    console.log('Creating new button');
    const button = document.createElement('button');
    button.id = 'figma-process-btn';
    button.className = 'btn btn-sm btn-outline';
    button.innerHTML = '🎨 Process Figma Links';
    button.style.marginLeft = '8px';

    // Try edit mode specific locations first
    const editModeLocations = [
      '.timeline-comment-actions', // Edit mode actions
      '.edit-comment-hide .form-actions', // Edit mode form actions
      '.comment-form-actions', // Comment form actions
    ];

    // Try general form locations
    const generalLocations = [
      '.form-actions', // General form actions
      '.new-pr-form .form-actions', // New PR form
      '.js-write-bucket', // Write tab area
    ];

    let buttonAdded = false;
    
    // Try edit mode locations first
    for (const selector of editModeLocations) {
      const container = document.querySelector(selector);
      if (container && !buttonAdded) {
        container.appendChild(button);
        button.addEventListener('click', () => this.processCurrentPR());
        buttonAdded = true;
        console.log('Figma PR Extension: Button added to edit mode location', selector);
        break;
      }
    }

    // If not found in edit mode, try general locations
    if (!buttonAdded) {
      for (const selector of generalLocations) {
        const container = document.querySelector(selector);
        if (container && !buttonAdded) {
          container.appendChild(button);
          button.addEventListener('click', () => this.processCurrentPR());
          buttonAdded = true;
          console.log('Figma PR Extension: Button added to general location', selector);
          break;
        }
      }
    }

    // Last resort: add to form if textarea is present
    if (!buttonAdded && textarea) {
      const form = textarea.closest('form');
      if (form) {
        form.appendChild(button);
        button.addEventListener('click', () => this.processCurrentPR());
        console.log('Figma PR Extension: Button added to form as fallback');
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
        if (mutation.type === 'childList') {
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
      subtree: true
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
    
    this.isProcessing = true;
    const button = document.querySelector('#figma-process-btn');
    if (button) {
      button.disabled = true;
      button.innerHTML = '⏳ Processing...';
    }

    try {
      // Get settings first
      const settings = await this.getSettings();
      
      if (!settings.figmaToken) {
        throw new Error('Please configure your Figma API token in the extension popup first.');
      }

      // Get PR description textarea (not comment field)
      const textarea = document.querySelector('#pull_request_body') ||
                      document.querySelector('textarea[name="pull_request[body]"]');
      
      if (!textarea) {
        throw new Error('Could not find PR description textarea');
      }

      const originalText = textarea.value;
      const processedText = await this.processFigmaLinks(originalText, settings);
      
      if (processedText === originalText) {
        this.showInfo('No Figma links found to process.');
        return;
      }

      // Handle diff approval if enabled
      if (settings.diffApprovalEnabled) {
        this.showDiffPreview(originalText, processedText, settings, (approvedText) => {
          textarea.value = approvedText;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          this.showSuccess('Changes applied successfully!');
        });
      } else {
        // Apply changes directly
        textarea.value = processedText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        this.showSuccess('Figma links processed successfully!');
      }
      
    } catch (error) {
      console.error('Figma PR Extension error:', error);
      this.showError(`Error: ${error.message}`);
    } finally {
      this.isProcessing = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = '🎨 Process Figma Links';
      }
    }
  }

  async getSettings() {
    return new Promise((resolve, reject) => {
      browser.storage.sync.get(['figmaToken', 'specHeading', 'diffApprovalEnabled'], (result) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else {
          resolve({
            figmaToken: result.figmaToken || null,
            specHeading: result.specHeading || 'Design Specs',
            diffApprovalEnabled: result.diffApprovalEnabled || false,
          });
        }
      });
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
          version = await fetchLatestVersion(parsed.fileId, settings.figmaToken);
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
        const imageUrl = await fetchNodeImageUrl(parsed.fileId, parsed.nodeId, settings.figmaToken);
        
        // Create spec
        const specId = `design-spec-${specCounter}`;
        const cleanUrl = createCleanFigmaUrl(parsed.fileId, parsed.nodeId, version.id);
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
      processedText = this.addDesignSpecsSection(processedText, designSpecs, settings.specHeading);
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
    const markdownRegex = /\[([^\]]+)\]\((https:\/\/www\.figma\.com\/design\/[^)]+)\)/g;

    // Find markdown links first
    let match;
    while ((match = markdownRegex.exec(cleanText)) !== null) {
      links.push({
        url: match[2],
        fullMatch: match[0],
        isMarkdownLink: true,
        linkText: match[1]
      });
    }

    // Find standalone URLs (that aren't part of markdown links)
    const textWithoutMarkdown = cleanText.replace(markdownRegex, '');
    while ((match = standaloneRegex.exec(textWithoutMarkdown)) !== null) {
      links.push({
        url: match[0],
        fullMatch: match[0],
        isMarkdownLink: false,
        linkText: null
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

  addDesignSpecsSection(text, designSpecs, customHeading = 'Design Specs') {
    // Check if custom heading section exists
    const escapedHeading = customHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const designSpecsRegex = new RegExp(`^#{1,6}\\s*${escapedHeading}\\s*$`, 'im');
    const match = text.match(designSpecsRegex);
    
    const endMarker = `<!-- END_${customHeading.toUpperCase().replace(/\s+/g, '_')}_SPECS - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->`;
    
    if (match) {
      // Find end of existing section
      const endIndex = text.indexOf(endMarker);
      
      if (endIndex > -1) {
        // Insert before end marker
        const beforeEnd = text.substring(0, endIndex);
        const afterEnd = text.substring(endIndex);
        return beforeEnd + designSpecs.join('\n') + '\n' + afterEnd;
      } else {
        // Add end marker and specs after the section
        const sectionIndex = text.indexOf(match[0]) + match[0].length;
        const before = text.substring(0, sectionIndex);
        const after = text.substring(sectionIndex);
        return before + '\n\n' + designSpecs.join('\n') + '\n\n' + endMarker + after;
      }
    } else {
      // Create new section at the end
      return text + `\n\n## ${customHeading}\n\n` + designSpecs.join('\n') + '\n\n' + endMarker;
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
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
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8'
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

  showDiffPreview(originalText, newText, settings, onApprove) {
    const modal = this.createDiffPreviewModal(originalText, newText, onApprove);
    document.body.appendChild(modal);
  }

  createDiffPreviewModal(originalText, newText, onApprove) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 24px;
      border-bottom: 1px solid #e1e4e8;
      background: #f6f8fa;
    `;
    header.innerHTML = '<h3 style="margin: 0; color: #24292e;">Review Changes</h3>';
    
    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 24px;
    `;
    
    // Create diff content
    const diffContent = document.createElement('pre');
    diffContent.style.cssText = `
      background: #f8f8f8;
      padding: 16px;
      border-radius: 4px;
      overflow: auto;
      max-height: 400px;
      white-space: pre-wrap;
      font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
    `;
    
    diffContent.textContent = `Original length: ${originalText.length} characters\nNew length: ${newText.length} characters\n\n--- Preview of changes ---\n${newText}`;
    
    content.appendChild(diffContent);
    
    // Create footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e1e4e8;
      background: #f6f8fa;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;
    
    // Create buttons
    const copySpecsBtn = document.createElement('button');
    copySpecsBtn.textContent = 'Copy Figma Section';
    copySpecsBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      margin-right: auto;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: white;
      cursor: pointer;
    `;
    
    const copyFullBtn = document.createElement('button');
    copyFullBtn.textContent = 'Copy Full Content';
    copyFullBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: white;
      cursor: pointer;
    `;
    
    const approveBtn = document.createElement('button');
    approveBtn.textContent = 'Approve & Apply';
    approveBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #1f883d;
      border-radius: 6px;
      background: #1f883d;
      color: white;
      cursor: pointer;
    `;
    
    // Add event listeners
    copySpecsBtn.addEventListener('click', () => {
      // Extract specs section using custom heading pattern
      let specsSection = null;
      const headingPatterns = ['Design Specs', 'Screenshots', 'Design Pics'];
      
      for (const heading of headingPatterns) {
        const specStart = newText.indexOf(`## ${heading}`);
        const endMarker = newText.indexOf(`<!-- END_${heading.toUpperCase().replace(/\s+/g, '_')}_SPECS`);
        
        if (specStart > -1 && endMarker > -1) {
          const endPos = endMarker + newText.substring(endMarker).indexOf('-->') + 3;
          specsSection = newText.substring(specStart, endPos);
          break;
        }
      }
      
      if (specsSection) {
        navigator.clipboard.writeText(specsSection);
        this.showSuccess('Figma section copied to clipboard');
      } else {
        this.showError('No specs section found');
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.showInfo('Changes cancelled');
    });
    
    copyFullBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(newText);
      this.showSuccess('Full content copied to clipboard');
    });
    
    approveBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      onApprove(newText);
    });
    
    // Assemble modal
    footer.appendChild(copySpecsBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(copyFullBtn);
    footer.appendChild(approveBtn);
    
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    
    overlay.appendChild(modal);
    
    return overlay;
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
      versionId: versionMatch ? versionMatch[1] : null
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

function createDesignSpecSnippet(specNumber, specId, attachmentUrl, cleanUrl, versionId, snapshotTimestamp, expirationString) {
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new FigmaPRProcessor());
} else {
  new FigmaPRProcessor();
}
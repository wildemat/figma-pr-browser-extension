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
    const result = await browser.storage.sync.get(['figmaToken']);
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
    const startMarker = `<!-- START_FIGMA_SECTION -->`;
    const endMarker = `<!-- END_FIGMA_SECTION - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->`;
    
    // First, check if START_FIGMA_SECTION marker exists
    const startMarkerIndex = text.indexOf(startMarker);
    const endMarkerIndex = text.indexOf(endMarker);
    
    if (startMarkerIndex > -1 && endMarkerIndex > startMarkerIndex) {
      // Markers exist, insert before end marker
      const beforeEnd = text.substring(0, endMarkerIndex);
      const afterEnd = text.substring(endMarkerIndex);
      return beforeEnd + designSpecs.join('\n') + '\n' + afterEnd;
    } else if (startMarkerIndex > -1) {
      // Start marker exists but no end marker, add end marker
      const afterStart = text.substring(startMarkerIndex);
      const beforeStart = text.substring(0, startMarkerIndex);
      return beforeStart + startMarker + '\n\n## ' + customHeading + '\n\n' + designSpecs.join('\n') + '\n\n' + endMarker + afterStart.substring(startMarker.length);
    } else {
      // No markers exist, check if custom heading section exists
      const escapedHeading = customHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const designSpecsRegex = new RegExp(`^#{1,6}\\s*${escapedHeading}\\s*$`, 'im');
      const headingMatch = text.match(designSpecsRegex);
      
      if (headingMatch) {
        // Heading exists, add start marker before it
        const headingIndex = text.indexOf(headingMatch[0]);
        const before = text.substring(0, headingIndex);
        const after = text.substring(headingIndex);
        return before + startMarker + '\n' + after.substring(0, after.indexOf(headingMatch[0]) + headingMatch[0].length) + '\n\n' + designSpecs.join('\n') + '\n\n' + endMarker + after.substring(after.indexOf(headingMatch[0]) + headingMatch[0].length);
      } else {
        // Create new section with markers at the end
        return text + `\n\n${startMarker}\n## ${customHeading}\n\n` + designSpecs.join('\n') + '\n\n' + endMarker;
      }
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
    const modal = createDiffPreviewModal(originalText, newText, onApprove, this);
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
      width: 95vw;
      height: 90vh;
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
    
    // Create split pane container
    const splitContainer = document.createElement('div');
    splitContainer.style.cssText = `
      flex: 1;
      display: flex;
      overflow: hidden;
    `;
    
    // Create left pane (original content)
    const leftPane = document.createElement('div');
    leftPane.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #e1e4e8;
    `;
    
    const leftHeader = document.createElement('div');
    leftHeader.style.cssText = `
      padding: 12px 16px;
      background: #f6f8fa;
      border-bottom: 1px solid #e1e4e8;
      font-weight: 600;
      color: #24292e;
      font-size: 14px;
    `;
    leftHeader.textContent = 'Original Content';
    
    const leftContent = document.createElement('textarea');
    leftContent.style.cssText = `
      flex: 1;
      padding: 16px;
      border: none;
      resize: none;
      outline: none;
      font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
      background: #f8f9fa;
      color: #656d76;
    `;
    leftContent.value = originalText;
    leftContent.readOnly = true;
    
    leftPane.appendChild(leftHeader);
    leftPane.appendChild(leftContent);
    
    // Create right pane (new content - editable)
    const rightPane = document.createElement('div');
    rightPane.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
    `;
    
    const rightHeader = document.createElement('div');
    rightHeader.style.cssText = `
      padding: 12px 16px;
      background: #f6f8fa;
      border-bottom: 1px solid #e1e4e8;
      font-weight: 600;
      color: #24292e;
      font-size: 14px;
    `;
    rightHeader.textContent = 'New Content (Editable)';
    
    const rightContent = document.createElement('textarea');
    rightContent.style.cssText = `
      flex: 1;
      padding: 16px;
      border: none;
      resize: none;
      outline: none;
      font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
      background: white;
    `;
    rightContent.value = newText;
    
    // Create copy buttons container (below right pane)
    const copyButtonsContainer = document.createElement('div');
    copyButtonsContainer.style.cssText = `
      padding: 12px 16px;
      border-top: 1px solid #e1e4e8;
      background: #f8f9fa;
      display: flex;
      gap: 8px;
    `;
    
    // Create copy buttons
    const copyFullBtn = this.createStyledButton('Copy Full Content', 'copy');
    const copySpecsBtn = this.createStyledButton('Copy Figma Section', 'copy');
    
    copyButtonsContainer.appendChild(copyFullBtn);
    copyButtonsContainer.appendChild(copySpecsBtn);
    
    rightPane.appendChild(rightHeader);
    rightPane.appendChild(rightContent);
    rightPane.appendChild(copyButtonsContainer);
    
    splitContainer.appendChild(leftPane);
    splitContainer.appendChild(rightPane);
    
    // Create footer with action buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e1e4e8;
      background: #f6f8fa;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;
    
    const cancelBtn = this.createStyledButton('Cancel', 'cancel');
    const approveBtn = this.createStyledButton('Approve & Apply', 'approve');
    
    footer.appendChild(cancelBtn);
    footer.appendChild(approveBtn);
    
    // Add event listeners
    copyFullBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(rightContent.value);
      this.showButtonFeedback(copyFullBtn, 'Copied!');
    });
    
    copySpecsBtn.addEventListener('click', () => {
      const currentText = rightContent.value;
      const specsSection = this.extractSpecsSection(currentText);
      
      if (specsSection) {
        navigator.clipboard.writeText(specsSection);
        this.showButtonFeedback(copySpecsBtn, 'Copied!');
      } else {
        this.showError('No specs section found');
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.showInfo('Changes cancelled');
    });
    
    approveBtn.addEventListener('click', () => {
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


  showButtonFeedback(button, message) {
    const originalText = button.textContent;
    button.textContent = message;
    button.style.background = '#1f883d';
    button.style.color = 'white';
    button.style.borderColor = '#1f883d';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = 'white';
      button.style.color = '#24292e';
      button.style.borderColor = '#d0d7de';
    }, 1500);
  }

  extractSpecsSection(text) {
    const startMarker = `<!-- START_FIGMA_SECTION -->`;
    const endMarker = `<!-- END_FIGMA_SECTION`;
    
    const startIndex = text.indexOf(startMarker);
    const endMarkerIndex = text.indexOf(endMarker);
    
    if (startIndex > -1 && endMarkerIndex > startIndex) {
      const endPos = endMarkerIndex + text.substring(endMarkerIndex).indexOf('-->') + 3;
      return text.substring(startIndex, endPos);
    }
    
    return null;
  }

  renderMarkdown(text) {
    // Use Snarkdown library for markdown rendering
    const html = snarkdown(text);

    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        line-height: 1.6;
        color: #24292e;
      ">
        <style>
          h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
          h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
          h3 { font-size: 1.25em; }
          p { margin-bottom: 16px; }
          code { 
            background: #f6f8fa; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'SFMono-Regular', Consolas, monospace;
            font-size: 85%;
          }
          pre { 
            background: #f6f8fa; 
            padding: 16px; 
            border-radius: 6px; 
            overflow-x: auto;
            margin: 16px 0;
          }
          pre code { background: none; padding: 0; }
          ul { margin: 16px 0; padding-left: 30px; }
          li { margin-bottom: 4px; }
          hr { border: 0; border-top: 1px solid #eaecef; margin: 24px 0; }
          a { color: #0366d6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          strong { font-weight: 600; }
        </style>
        ${html}
      </div>
    `;
  }
}

// Include the shared modal functions directly in the content script
// (since we can't use imports in content scripts)

function createDiffPreviewModal(originalText, newText, onApprove, context) {
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
    width: 95vw;
    height: 90vh;
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
  
  // Create split pane container
  const splitContainer = document.createElement('div');
  splitContainer.style.cssText = `
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  `;
  
  // Create left pane (original content)
  const leftPane = document.createElement('div');
  leftPane.style.cssText = `
    width: 50%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e1e4e8;
  `;
  
  const leftHeader = document.createElement('div');
  leftHeader.style.cssText = `
    padding: 12px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    font-weight: 600;
    color: #24292e;
    font-size: 14px;
  `;
  leftHeader.textContent = 'Original Content';
  
  const leftContent = document.createElement('textarea');
  leftContent.style.cssText = `
    flex: 1;
    padding: 16px;
    border: none;
    resize: none;
    outline: none;
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    background: #f8f9fa;
    color: #656d76;
  `;
  leftContent.value = originalText;
  leftContent.readOnly = true;
  
  leftPane.appendChild(leftHeader);
  leftPane.appendChild(leftContent);
  
  // Create resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = `
    width: 4px;
    background: #e1e4e8;
    cursor: col-resize;
    transition: background-color 0.2s;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-2px);
    z-index: 10;
  `;
  
  resizeHandle.addEventListener('mouseenter', () => {
    resizeHandle.style.background = '#0969da';
  });
  
  resizeHandle.addEventListener('mouseleave', () => {
    resizeHandle.style.background = '#e1e4e8';
  });
  
  // Create right pane (new content - editable)
  const rightPane = document.createElement('div');
  rightPane.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
  `;
  
  // Create tab header for right pane
  const rightHeader = document.createElement('div');
  rightHeader.style.cssText = `
    background: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    display: flex;
    align-items: center;
  `;
  
  // Create tab navigation
  const tabNav = document.createElement('div');
  tabNav.style.cssText = `
    display: flex;
    flex: 1;
  `;
  
  const editTab = document.createElement('button');
  editTab.textContent = 'Edit';
  editTab.style.cssText = `
    padding: 12px 16px;
    background: white;
    border: none;
    border-bottom: 2px solid #fd8c73;
    font-weight: 600;
    color: #24292e;
    font-size: 14px;
    cursor: pointer;
  `;
  editTab.classList.add('active-tab');
  
  const previewTab = document.createElement('button');
  previewTab.textContent = 'Preview';
  previewTab.style.cssText = `
    padding: 12px 16px;
    background: #f6f8fa;
    border: none;
    border-bottom: 2px solid transparent;
    font-weight: 600;
    color: #656d76;
    font-size: 14px;
    cursor: pointer;
  `;
  
  tabNav.appendChild(editTab);
  tabNav.appendChild(previewTab);
  rightHeader.appendChild(tabNav);
  
  // Create content container for tabs
  const rightContentContainer = document.createElement('div');
  rightContentContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
  `;
  
  const rightContent = document.createElement('textarea');
  rightContent.style.cssText = `
    flex: 1;
    padding: 16px;
    border: none;
    resize: none;
    outline: none;
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    background: white;
    display: block;
  `;
  rightContent.value = newText;
  
  // Create preview content container
  const previewContent = document.createElement('div');
  previewContent.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: white;
    display: none;
  `;
  previewContent.innerHTML = context.renderMarkdown(newText);
  
  rightContentContainer.appendChild(rightContent);
  rightContentContainer.appendChild(previewContent);
  
  // Tab switching logic
  editTab.addEventListener('click', () => {
    editTab.style.cssText = `
      padding: 12px 16px;
      background: white;
      border: none;
      border-bottom: 2px solid #fd8c73;
      font-weight: 600;
      color: #24292e;
      font-size: 14px;
      cursor: pointer;
    `;
    previewTab.style.cssText = `
      padding: 12px 16px;
      background: #f6f8fa;
      border: none;
      border-bottom: 2px solid transparent;
      font-weight: 600;
      color: #656d76;
      font-size: 14px;
      cursor: pointer;
    `;
    rightContent.style.display = 'block';
    previewContent.style.display = 'none';
  });
  
  previewTab.addEventListener('click', () => {
    previewTab.style.cssText = `
      padding: 12px 16px;
      background: white;
      border: none;
      border-bottom: 2px solid #fd8c73;
      font-weight: 600;
      color: #24292e;
      font-size: 14px;
      cursor: pointer;
    `;
    editTab.style.cssText = `
      padding: 12px 16px;
      background: #f6f8fa;
      border: none;
      border-bottom: 2px solid transparent;
      font-weight: 600;
      color: #656d76;
      font-size: 14px;
      cursor: pointer;
    `;
    rightContent.style.display = 'none';
    previewContent.style.display = 'block';
    // Update preview content when switching to preview tab
    previewContent.innerHTML = context.renderMarkdown(rightContent.value);
  });
  
  // Update preview when content changes in edit mode
  rightContent.addEventListener('input', () => {
    if (previewContent.style.display === 'block') {
      previewContent.innerHTML = context.renderMarkdown(rightContent.value);
    }
  });
  
  // Create copy buttons container (below right pane)
  const copyButtonsContainer = document.createElement('div');
  copyButtonsContainer.style.cssText = `
    padding: 12px 16px;
    border-top: 1px solid #e1e4e8;
    background: #f8f9fa;
    display: flex;
    gap: 8px;
  `;
  
  // Create copy buttons
  const copyFullBtn = createStyledButton('Copy Full Content', 'copy');
  const copySpecsBtn = createStyledButton('Copy Figma Section', 'copy');
  
  copyButtonsContainer.appendChild(copyFullBtn);
  copyButtonsContainer.appendChild(copySpecsBtn);
  
  rightPane.appendChild(rightHeader);
  rightPane.appendChild(rightContentContainer);
  rightPane.appendChild(copyButtonsContainer);
  
  // Add resize functionality
  let isResizing = false;
  let startX = 0;
  let startLeftWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startLeftWidth = leftPane.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const containerWidth = splitContainer.offsetWidth;
    const newLeftWidth = startLeftWidth + deltaX;
    const leftPercentage = Math.max(20, Math.min(80, (newLeftWidth / containerWidth) * 100));
    
    leftPane.style.width = `${leftPercentage}%`;
    rightPane.style.width = `${100 - leftPercentage}%`;
    resizeHandle.style.left = `${leftPercentage}%`;
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
  
  splitContainer.appendChild(leftPane);
  splitContainer.appendChild(resizeHandle);
  splitContainer.appendChild(rightPane);
  
  // Create footer with action buttons
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 16px 24px;
    border-top: 1px solid #e1e4e8;
    background: #f6f8fa;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `;
  
  const cancelBtn = createStyledButton('Cancel', 'cancel');
  const approveBtn = createStyledButton('Approve & Apply', 'approve');
  
  footer.appendChild(cancelBtn);
  footer.appendChild(approveBtn);
  
  // Add event listeners
  copyFullBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(rightContent.value);
    showButtonFeedback(copyFullBtn, 'Copied!');
  });
  
  copySpecsBtn.addEventListener('click', () => {
    const currentText = rightContent.value;
    const specsSection = context.extractSpecsSection(currentText);
    
    if (specsSection) {
      navigator.clipboard.writeText(specsSection);
      showButtonFeedback(copySpecsBtn, 'Copied!');
    } else {
      context.showError('No specs section found');
    }
  });
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    context.showInfo('Changes cancelled');
  });
  
  approveBtn.addEventListener('click', () => {
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


// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new FigmaPRProcessor());
} else {
  new FigmaPRProcessor();
}
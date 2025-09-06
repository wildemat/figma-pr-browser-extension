/**
 * Main content processor for Figma PR extensions
 */

import { 
  findFigmaLinks, 
  getNextSpecNumber, 
  getExistingSpecsByNodeId,
  createReferenceText,
  createDesignSpecSnippet,
  addDesignSpecsSection,
  extractSpecsSection
} from './content-utils.js';

import {
  parseFigmaUrl,
  fetchLatestVersion,
  fetchNodeImageUrl,
  createVersionFromId,
  calculateImageExpirationDate,
  createCleanFigmaUrl
} from './figma-utils.js';

import {
  getFigmaToken,
  getAllSettings
} from './storage-utils.js';

import {
  showNotification,
  createDiffPreviewModal
} from './ui-utils.js';

export class FigmaContentProcessor {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Process Figma links in the given text
   * @param {string} originalText - Original PR description text
   * @param {Object} options - Processing options
   * @param {Function} onComplete - Callback when processing completes
   * @param {Function} onError - Callback when error occurs
   */
  async processContent(originalText, options = {}, onComplete = null, onError = null) {
    if (this.isProcessing) {
      if (onError) onError(new Error('Processing already in progress'));
      return;
    }

    this.isProcessing = true;

    try {
      // Get settings
      const settings = await getAllSettings();
      
      if (!settings.figmaToken) {
        throw new Error('Please configure your Figma API token in the extension popup first.');
      }

      // Process the content
      const processedText = await this.processFigmaLinks(originalText, settings);

      if (processedText === originalText) {
        showNotification('No Figma links found to process.', 'info');
        if (onComplete) onComplete(originalText);
        return;
      }

      // Handle diff approval if enabled
      if (settings.diffApprovalEnabled) {
        this.showDiffPreview(originalText, processedText, settings, onComplete, onError);
      } else {
        // Apply changes directly
        if (onComplete) onComplete(processedText);
        showNotification('Figma links processed successfully!', 'success');
      }

    } catch (error) {
      console.error('Figma PR Extension error:', error);
      showNotification(`Error: ${error.message}`, 'error');
      if (onError) onError(error);
      
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process Figma links and generate specs
   * @param {string} text - Text to process
   * @param {Object} settings - Extension settings
   * @returns {Promise<string>} - Processed text
   */
  async processFigmaLinks(text, settings) {
    // Find all Figma links
    const figmaLinks = findFigmaLinks(text);
    
    if (figmaLinks.length === 0) {
      return text;
    }

    let processedText = text;
    const designSpecs = [];
    let specCounter = getNextSpecNumber(text);
    
    // Track existing specs by node ID and version to handle duplicates
    const existingSpecs = getExistingSpecsByNodeId(text);
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
        showNotification(`Error processing link: ${error.message}`, 'error');
      }
    }

    // Add design specs section
    if (designSpecs.length > 0) {
      processedText = addDesignSpecsSection(processedText, designSpecs, settings.specHeading);
    }

    return processedText;
  }

  /**
   * Show diff preview modal
   * @param {string} originalText - Original text
   * @param {string} newText - New processed text
   * @param {Object} settings - Extension settings
   * @param {Function} onApprove - Approve callback
   * @param {Function} onCancel - Cancel callback
   */
  showDiffPreview(originalText, newText, settings, onApprove, onCancel) {
    const modal = createDiffPreviewModal(
      originalText,
      newText,
      (approvedText) => {
        showNotification('Changes applied successfully!', 'success');
        if (onApprove) onApprove(approvedText);
      },
      () => {
        showNotification('Changes cancelled', 'info');
        if (onCancel) onCancel();
      }
    );

    // Add copy specs section button
    const footer = modal.querySelector('.modal-footer') || modal.querySelector('[style*="flex-end"]').parentElement;
    
    if (footer) {
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
      
      copySpecsBtn.addEventListener('click', () => {
        const specsSection = extractSpecsSection(newText, settings.specHeading);
        if (specsSection) {
          navigator.clipboard.writeText(specsSection);
          showNotification('Figma section copied to clipboard', 'success');
        } else {
          showNotification('No specs section found', 'error');
        }
      });
      
      footer.insertBefore(copySpecsBtn, footer.firstChild);
    }

    document.body.appendChild(modal);
  }

  /**
   * Check if currently processing
   * @returns {boolean} - True if processing
   */
  getIsProcessing() {
    return this.isProcessing;
  }
}
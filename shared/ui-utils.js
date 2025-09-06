/**
 * Shared UI utilities for browser extensions
 */

import { GITHUB_SELECTORS, BUTTON_CONFIG, NOTIFICATION_STYLES } from './constants.js';

/**
 * Check if Write tab is active
 * @returns {boolean} - True if Write tab is active
 */
export function isWriteTabActive() {
  const allWriteTabs = document.querySelectorAll(GITHUB_SELECTORS.WRITE_TAB.ALL);
  return Array.from(allWriteTabs).some(tab => 
    tab.classList.contains('selected') || tab.getAttribute('aria-selected') === 'true'
  );
}

/**
 * Check if Preview tab is active
 * @returns {boolean} - True if Preview tab is active
 */
export function isPreviewTabActive() {
  const allPreviewTabs = document.querySelectorAll(GITHUB_SELECTORS.PREVIEW_TAB.ALL);
  return Array.from(allPreviewTabs).some(tab => 
    tab.classList.contains('selected') || tab.getAttribute('aria-selected') === 'true'
  );
}

/**
 * Get PR description textarea
 * @returns {HTMLElement|null} - Textarea element or null
 */
export function getPRDescriptionTextarea() {
  return document.querySelector(GITHUB_SELECTORS.PR_DESCRIPTION) ||
         document.querySelector(GITHUB_SELECTORS.PR_DESCRIPTION_ALT);
}

/**
 * Check if element is a tab that should trigger button updates
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if it's a relevant tab
 */
export function isRelevantTab(element) {
  return element && (
    element.classList.contains('write-tab') ||
    element.classList.contains('preview-tab') ||
    element.classList.contains('js-write-tab') ||
    element.classList.contains('js-preview-tab')
  );
}

/**
 * Check if mutation is relevant for button updates
 * @param {MutationRecord} mutation - Mutation to check
 * @returns {boolean} - True if relevant
 */
export function isRelevantMutation(mutation) {
  if (mutation.type !== 'childList') return false;
  
  const addedNodes = Array.from(mutation.addedNodes);
  const removedNodes = Array.from(mutation.removedNodes);
  
  // Skip if we just added/removed our own button
  const isOurButtonChange = addedNodes.some(node => 
    node.id === BUTTON_CONFIG.ID || 
    (node.nodeType === Node.ELEMENT_NODE && node.querySelector(`#${BUTTON_CONFIG.ID}`))
  ) || removedNodes.some(node => 
    node.id === BUTTON_CONFIG.ID || 
    (node.nodeType === Node.ELEMENT_NODE && node.querySelector(`#${BUTTON_CONFIG.ID}`))
  );
  
  if (isOurButtonChange) return false;
  
  // Check if relevant elements changed
  return addedNodes.some(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return node.matches && GITHUB_SELECTORS.MUTATION_TARGETS.some(selector =>
      node.matches(selector) || node.querySelector(selector)
    );
  }) || removedNodes.some(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return node.matches && GITHUB_SELECTORS.MUTATION_TARGETS.some(selector =>
      node.matches(selector)
    );
  });
}

/**
 * Find container for process button
 * @returns {HTMLElement|null} - Container element or null
 */
export function findButtonContainer() {
  // Try edit mode locations first
  for (const selector of GITHUB_SELECTORS.BUTTON_LOCATIONS.EDIT_MODE) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  
  // Try general locations
  for (const selector of GITHUB_SELECTORS.BUTTON_LOCATIONS.GENERAL) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  
  // Last resort: find form containing textarea
  const textarea = getPRDescriptionTextarea();
  if (textarea) {
    const form = textarea.closest('form');
    if (form) return form;
  }
  
  return null;
}

/**
 * Create process button element
 * @param {Function} clickHandler - Click event handler
 * @returns {HTMLElement} - Button element
 */
export function createProcessButton(clickHandler) {
  const button = document.createElement('button');
  button.id = BUTTON_CONFIG.ID;
  button.className = BUTTON_CONFIG.CLASS;
  button.innerHTML = BUTTON_CONFIG.TEXT;
  
  // Apply styles
  Object.entries(BUTTON_CONFIG.STYLES).forEach(([key, value]) => {
    button.style[key] = value;
  });
  
  button.addEventListener('click', clickHandler);
  return button;
}

/**
 * Update button state (processing/normal)
 * @param {boolean} isProcessing - Whether processing is in progress
 */
export function updateButtonState(isProcessing) {
  const button = document.querySelector(`#${BUTTON_CONFIG.ID}`);
  if (!button) return;
  
  button.disabled = isProcessing;
  button.innerHTML = isProcessing ? BUTTON_CONFIG.PROCESSING_TEXT : BUTTON_CONFIG.TEXT;
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info')
 * @param {number} duration - Duration in milliseconds (optional)
 */
export function showNotification(message, type = 'info', duration = NOTIFICATION_STYLES.DURATION) {
  // Create notification element
  const notification = document.createElement('div');
  
  // Apply base styles
  notification.style.cssText = `
    position: ${NOTIFICATION_STYLES.POSITION};
    top: ${NOTIFICATION_STYLES.TOP};
    right: ${NOTIFICATION_STYLES.RIGHT};
    padding: ${NOTIFICATION_STYLES.PADDING};
    border-radius: ${NOTIFICATION_STYLES.BORDER_RADIUS};
    color: ${NOTIFICATION_STYLES.COLOR};
    font-weight: ${NOTIFICATION_STYLES.FONT_WEIGHT};
    z-index: ${NOTIFICATION_STYLES.Z_INDEX};
    max-width: ${NOTIFICATION_STYLES.MAX_WIDTH};
    box-shadow: ${NOTIFICATION_STYLES.BOX_SHADOW};
    background-color: ${NOTIFICATION_STYLES.COLORS[type] || NOTIFICATION_STYLES.COLORS.info};
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto remove
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, duration);
}

/**
 * Create diff preview modal
 * @param {string} originalText - Original text
 * @param {string} newText - New text with processed content
 * @param {Function} onApprove - Callback for approve action
 * @param {Function} onCancel - Callback for cancel action
 * @returns {HTMLElement} - Modal element
 */
export function createDiffPreviewModal(originalText, newText, onApprove, onCancel) {
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
  
  // Create diff content (simplified - would use a proper diff library in production)
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
  
  // Simple diff display (in production, you'd want a proper diff library)
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
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    onCancel();
  });
  
  copyFullBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(newText);
    showNotification('Full content copied to clipboard', 'success');
  });
  
  approveBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    onApprove(newText);
  });
  
  // Assemble modal
  footer.appendChild(cancelBtn);
  footer.appendChild(copyFullBtn);
  footer.appendChild(approveBtn);
  
  modal.appendChild(header);
  modal.appendChild(content);
  modal.appendChild(footer);
  
  overlay.appendChild(modal);
  
  return overlay;
}
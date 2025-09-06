/**
 * Shared storage utilities for browser extensions
 * Abstracts browser differences between Chrome and Firefox
 */

import { STORAGE_KEYS, DEFAULT_CONFIG, VALIDATION } from './constants.js';

// Detect browser API
const browserAPI = (() => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome;
  } else if (typeof browser !== 'undefined' && browser.storage) {
    return browser;
  } else {
    throw new Error('No supported browser storage API found');
  }
})();

/**
 * Get value from storage
 * @param {string|Array<string>} keys - Storage key(s) to retrieve
 * @returns {Promise<Object>} - Storage values
 */
export async function getStorageValue(keys) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.sync.get(keys, (result) => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Set value in storage
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function setStorageValue(items) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.sync.set(items, () => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get Figma API token from storage
 * @returns {Promise<string|null>} - Figma token or null if not found
 */
export async function getFigmaToken() {
  const result = await getStorageValue([STORAGE_KEYS.FIGMA_TOKEN]);
  return result[STORAGE_KEYS.FIGMA_TOKEN] || null;
}

/**
 * Set Figma API token in storage
 * @param {string} token - Figma API token
 * @returns {Promise<void>}
 */
export async function setFigmaToken(token) {
  if (!VALIDATION.FIGMA_TOKEN.test(token)) {
    throw new Error('Invalid Figma token format');
  }
  
  await setStorageValue({
    [STORAGE_KEYS.FIGMA_TOKEN]: token
  });
}

/**
 * Get custom spec heading from storage
 * @returns {Promise<string>} - Custom heading or default
 */
export async function getSpecHeading() {
  const result = await getStorageValue([STORAGE_KEYS.SPEC_HEADING]);
  return result[STORAGE_KEYS.SPEC_HEADING] || DEFAULT_CONFIG.SPEC_HEADING;
}

/**
 * Set custom spec heading in storage
 * @param {string} heading - Custom heading text
 * @returns {Promise<void>}
 */
export async function setSpecHeading(heading) {
  if (!heading || !VALIDATION.HEADING_TEXT.test(heading)) {
    throw new Error('Invalid heading format');
  }
  
  await setStorageValue({
    [STORAGE_KEYS.SPEC_HEADING]: heading.trim()
  });
}

/**
 * Get diff approval setting from storage
 * @returns {Promise<boolean>} - Whether diff approval is enabled
 */
export async function isDiffApprovalEnabled() {
  const result = await getStorageValue([STORAGE_KEYS.DIFF_APPROVAL_ENABLED]);
  return result[STORAGE_KEYS.DIFF_APPROVAL_ENABLED] || false;
}

/**
 * Set diff approval setting in storage
 * @param {boolean} enabled - Whether to enable diff approval
 * @returns {Promise<void>}
 */
export async function setDiffApprovalEnabled(enabled) {
  await setStorageValue({
    [STORAGE_KEYS.DIFF_APPROVAL_ENABLED]: Boolean(enabled)
  });
}

/**
 * Get all extension settings
 * @returns {Promise<Object>} - All settings with defaults
 */
export async function getAllSettings() {
  const result = await getStorageValue([
    STORAGE_KEYS.FIGMA_TOKEN,
    STORAGE_KEYS.SPEC_HEADING,
    STORAGE_KEYS.DIFF_APPROVAL_ENABLED
  ]);
  
  return {
    figmaToken: result[STORAGE_KEYS.FIGMA_TOKEN] || null,
    specHeading: result[STORAGE_KEYS.SPEC_HEADING] || DEFAULT_CONFIG.SPEC_HEADING,
    diffApprovalEnabled: result[STORAGE_KEYS.DIFF_APPROVAL_ENABLED] || false,
  };
}

/**
 * Send message to background script
 * @param {Object} message - Message to send
 * @returns {Promise<Object>} - Response from background script
 */
export function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage(message, (response) => {
      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
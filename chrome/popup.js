/**
 * Shared popup functionality for both Chrome and Firefox extensions
 */

// Storage utilities (inline for compatibility)
const STORAGE_KEYS = {
  FIGMA_TOKEN: 'figmaToken',
  SPEC_HEADING: 'specHeading',
  DIFF_APPROVAL_ENABLED: 'diffApprovalEnabled',
};

const DEFAULT_CONFIG = {
  SPEC_HEADING: 'Design Specs',
};

const VALIDATION = {
  FIGMA_TOKEN: /^figd?_[A-Za-z0-9_-]+$/,
  HEADING_TEXT: /^[a-zA-Z0-9\s\-_]+$/,
};

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

// Storage utilities
async function getStorageValue(keys) {
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

async function setStorageValue(items) {
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

async function getAllSettings() {
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

function sendMessageToBackground(message) {
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

class PopupManager {
  constructor() {
    this.initializeElements();
    this.loadSettings();
    this.setupEventListeners();
  }

  initializeElements() {
    this.form = document.getElementById('settingsForm');
    this.tokenInput = document.getElementById('figmaToken');
    this.specHeadingInput = document.getElementById('specHeading');
    this.diffApprovalCheckbox = document.getElementById('diffApproval');
    this.testBtn = document.getElementById('testBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.status = document.getElementById('status');
  }

  async loadSettings() {
    try {
      const settings = await getAllSettings();
      
      if (settings.figmaToken) {
        this.tokenInput.value = settings.figmaToken;
      }
      
      this.specHeadingInput.value = settings.specHeading;
      this.diffApprovalCheckbox.checked = settings.diffApprovalEnabled;
      
    } catch (error) {
      this.showStatus('Error loading settings: ' + error.message, 'error');
    }
  }

  setupEventListeners() {
    // Save settings
    this.form.addEventListener('submit', (e) => this.handleSave(e));
    
    // Test token
    this.testBtn.addEventListener('click', () => this.handleTestToken());
    
    // Clear token
    this.clearBtn.addEventListener('click', () => this.handleClearToken());
  }

  async handleSave(e) {
    e.preventDefault();

    const token = this.tokenInput.value.trim();
    const specHeading = this.specHeadingInput.value.trim();
    const diffApprovalEnabled = this.diffApprovalCheckbox.checked;

    // Validate inputs
    if (!token) {
      this.showStatus('Please enter a Figma API token', 'error');
      return;
    }

    if (!VALIDATION.FIGMA_TOKEN.test(token)) {
      this.showStatus('Invalid Figma token format', 'error');
      return;
    }

    if (!specHeading) {
      this.showStatus('Please enter a heading for design specs', 'error');
      return;
    }

    if (!VALIDATION.HEADING_TEXT.test(specHeading)) {
      this.showStatus('Invalid heading format. Use only letters, numbers, spaces, hyphens, and underscores.', 'error');
      return;
    }

    try {
      await setStorageValue({
        figmaToken: token,
        specHeading: specHeading,
        diffApprovalEnabled: diffApprovalEnabled
      });
      
      this.showStatus('Settings saved successfully!', 'success');
      
    } catch (error) {
      this.showStatus('Error saving settings: ' + error.message, 'error');
    }
  }

  async handleTestToken() {
    const token = this.tokenInput.value.trim();
    
    if (!token) {
      this.showStatus('Please enter a Figma API token first', 'error');
      return;
    }

    if (!VALIDATION.FIGMA_TOKEN.test(token)) {
      this.showStatus('Invalid Figma token format', 'error');
      return;
    }

    this.testBtn.disabled = true;
    this.testBtn.textContent = 'Testing...';

    try {
      const response = await sendMessageToBackground({
        action: 'testToken',
        token: token
      });

      if (response.success) {
        this.showStatus(`Token is valid! ✅ (${response.user})`, 'success');
      } else {
        this.showStatus('Token test failed: ' + response.error, 'error');
      }
      
    } catch (error) {
      this.showStatus('Token test failed: ' + error.message, 'error');
      
    } finally {
      this.testBtn.disabled = false;
      this.testBtn.textContent = 'Test Token';
    }
  }

  async handleClearToken() {
    if (confirm('Are you sure you want to clear the saved Figma token?')) {
      try {
        // Clear token from storage
        await setStorageValue({ [STORAGE_KEYS.FIGMA_TOKEN]: '' });
        
        // Clear the input field
        this.tokenInput.value = '';
        
        this.showStatus('Token cleared successfully', 'success');
      } catch (error) {
        this.showStatus('Error clearing token: ' + error.message, 'error');
      }
    }
  }

  showStatus(message, type) {
    this.status.textContent = message;
    this.status.className = `status ${type}`;
    this.status.classList.remove('hidden');

    // Hide after 3 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        this.status.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
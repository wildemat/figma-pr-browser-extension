/**
 * Popup script for Figma PR Extension settings
 */

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const tokenInput = document.getElementById('figmaToken');
  const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');

  // Load saved settings
  const result = await chrome.storage.sync.get(['figmaToken']);
  if (result.figmaToken) {
    tokenInput.value = result.figmaToken;
  }

  // Save settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = tokenInput.value.trim();
    if (!token) {
      showStatus('Please enter a Figma API token', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ figmaToken: token });
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  });

  // Test token
  testBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      showStatus('Please enter a Figma API token first', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    try {
      await testFigmaToken(token);
      showStatus('Token is valid! ✅', 'success');
    } catch (error) {
      showStatus('Token test failed: ' + error.message, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Token';
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
      status.classList.add('hidden');
    }, 3000);
  }

  async function testFigmaToken(token) {
    // Test the token by sending message to background script
    console.log("Testing Figma token...");
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "testToken", token: token },
        (response) => {
          if (response.success) {
            console.log("Token test successful for user:", response.user);
            resolve();
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }
});
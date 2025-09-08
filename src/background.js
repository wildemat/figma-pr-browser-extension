/**
 * Background script for Figma PR Extension
 */

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the popup to guide user through setup
    chrome.action.openPopup();
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "testToken") {
    testFigmaToken(message.token)
      .then((user) => {
        sendResponse({ success: true, user: user });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

async function testFigmaToken(token) {
  try {
    const response = await fetch("https://api.figma.com/v1/me", {
      headers: {
        "X-Figma-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Figma API Error:", response.status, errorText);

      if (response.status === 403 || response.status === 401) {
        throw new Error("Invalid token or insufficient permissions");
      } else if (response.status === 429) {
        throw new Error("Rate limited - try again later");
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    if (!data.id) {
      throw new Error("Invalid response from Figma API");
    }

    return data.email || data.handle;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        "Network error - check your internet connection and try again",
      );
    }
    throw error;
  }
}

console.log("Figma PR Extension background script loaded");

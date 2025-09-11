/**
 * Background script for Figma PR Links - Firefox compatible
 */

// Handle extension installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the popup to guide user through setup
    // Note: Firefox doesn't support programmatic popup opening
    console.log(
      "Extension installed. Please click the extension icon to configure.",
    );
  }
});

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

  if (message.type === "RENDER_MARKDOWN") {
    renderMarkdownInBackground(message.text, message.options)
      .then((html) => {
        sendResponse({ success: true, html: html });
      })
      .catch((error) => {
        console.error("Background markdown rendering failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

async function renderMarkdownInBackground(text, options = {}) {
  const { mode = "gfm", context = null, timeout = 10000 } = options;

  try {
    console.log("Background script: Attempting GitHub markdown API request...");

    const response = await fetch("https://api.github.com/markdown", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Figma-PR-Extension/1.0",
      },
      body: JSON.stringify({
        text: text,
        mode: mode,
        ...(context && { context: context }),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API returned ${response.status} (${response.statusText})`,
      );
    }

    const html = await response.text();
    console.log("Background script: GitHub markdown API successful");
    return html;
  } catch (error) {
    console.warn("Background script: GitHub API failed:", error.message);
    throw error;
  }
}

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

console.log("Figma PR Links background script loaded");

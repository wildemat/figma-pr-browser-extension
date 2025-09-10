/**
 * GitHub Markdown Rendering API Integration
 * Uses GitHub's official markdown API for consistent rendering
 */

/**
 * Render markdown using GitHub's API
 * @param {string} text - Raw markdown text
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Rendered HTML
 */
export async function renderMarkdownWithGitHub(text, options = {}) {
  const {
    mode = "gfm", // 'markdown' or 'gfm' (GitHub Flavored Markdown)
    context = null, // Repository context (e.g., 'octocat/Hello-World')
    cache = true,
    timeout = 5000,
  } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `GitHub API returned ${response.status}, falling back to client-side rendering`,
      );
      return renderMarkdownFallback(text);
    }

    const html = await response.text();

    // Cache the result if enabled
    if (cache && typeof localStorage !== "undefined") {
      const cacheKey = `figma-md-cache-${hashString(text)}`;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          html: html,
          timestamp: Date.now(),
        }),
      );
    }

    return html;
  } catch (error) {
    console.warn("GitHub markdown API failed:", error.message);
    return renderMarkdownFallback(text);
  }
}

/**
 * Render markdown with caching
 * @param {string} text - Raw markdown text
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Rendered HTML
 */
export async function renderMarkdownCached(text, options = {}) {
  const { maxAge = 24 * 60 * 60 * 1000 } = options; // 24 hours default

  if (typeof localStorage !== "undefined") {
    const cacheKey = `figma-md-cache-${hashString(text)}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { html, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < maxAge) {
          return html;
        }
      } catch (e) {
        // Invalid cache entry, proceed with fresh render
        localStorage.removeItem(cacheKey);
      }
    }
  }

  return renderMarkdownWithGitHub(text, options);
}

/**
 * Fallback markdown renderer (uses simplified client-side parsing)
 * @param {string} text - Raw markdown text
 * @returns {string} - Basic HTML
 */
function renderMarkdownFallback(text) {
  // Basic markdown patterns for fallback
  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // Headers
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")

    // Bold and italic
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")

    // Code blocks
    .replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>")
    .replace(/`([^`]*)`/gim, "<code>$1</code>")

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')

    // Images
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      '<img alt="$1" src="$2" style="max-width: 100%; height: auto;" />',
    )

    // Line breaks
    .replace(/\n/gim, "<br>");

  return html;
}

/**
 * Simple hash function for caching
 * @param {string} str - String to hash
 * @returns {string} - Hash
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract repository context from current URL
 * @returns {string|null} - Repository context (owner/repo) or null
 */
export function getRepositoryContext() {
  if (typeof window === "undefined") return null;

  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)\/([^\/]+)/);

  if (match && match[1] && match[2]) {
    return `${match[1]}/${match[2]}`;
  }

  return null;
}

/**
 * Clear markdown cache
 */
export function clearMarkdownCache() {
  if (typeof localStorage === "undefined") return;

  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("figma-md-cache-")) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Main render function - auto-detects context and uses caching
 * @param {string} text - Raw markdown text
 * @param {object} options - Rendering options
 * @returns {Promise<string>} - Rendered HTML wrapped in figma-markdown-content div
 */
export async function renderMarkdown(text, options = {}) {
  const context = options.context || getRepositoryContext();

  const html = await renderMarkdownCached(text, {
    mode: "gfm",
    context: context,
    ...options,
  });

  // Wrap in our styling container
  return `<div class="figma-markdown-content">${html}</div>`;
}

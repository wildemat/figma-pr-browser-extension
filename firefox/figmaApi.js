/**
 * Figma API functions for browser extension
 */

/**
 * Creates standard headers for Figma API requests
 * @param {string} figmaToken - Figma API token
 * @returns {Object} Headers object for fetch requests
 */
function getFigmaHeaders(figmaToken) {
  return { 
    "X-Figma-Token": figmaToken,
    "Content-Type": "application/json"
  };
}

/**
 * Fetches the latest version information for a Figma file
 * @param {string} fileId - Figma file ID
 * @param {string} figmaToken - Figma API token
 * @returns {Promise<{id: string, created_at: string}>} Latest version info
 */
async function fetchLatestVersion(fileId, figmaToken) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileId}/versions`,
    { headers: getFigmaHeaders(figmaToken) }
  );
  
  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.versions[0];
}

/**
 * Fetches the image URL for a specific node in a Figma file
 * @param {string} fileId - Figma file ID
 * @param {string} nodeId - Figma node ID (in colon format)
 * @param {string} figmaToken - Figma API token
 * @returns {Promise<string>} Image URL from Figma API
 */
async function fetchNodeImageUrl(fileId, nodeId, figmaToken) {
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileId}?ids=${nodeId}&format=png`,
    { headers: getFigmaHeaders(figmaToken) }
  );
  
  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const imageUrl = data.images[nodeId];
  if (!imageUrl) {
    throw new Error(`Could not get image for node ${nodeId}`);
  }
  
  return imageUrl;
}

/**
 * Creates a version object from existing version ID
 * @param {string} versionId - Existing version ID from URL
 * @returns {{id: string, created_at: string}} Version object
 */
function createVersionFromId(versionId) {
  return {
    id: versionId,
    created_at: new Date().toISOString(), // Use current timestamp as fallback
  };
}

/**
 * Parses a Figma URL to extract all relevant components
 * @param {string} url - Full Figma URL
 * @returns {{fileId: string, nodeId: string, versionId: string|null} | null} Parsed components or null if invalid
 */
function parseFigmaUrl(url) {
  const fileIdMatch = url.match(/\/design\/([^/]+)\//);
  const nodeIdMatch = url.match(/node-id=([^&\s)]+)/);
  const versionMatch = url.match(/version-id=([^&\s)]+)/);
  
  if (fileIdMatch && nodeIdMatch) {
    return {
      fileId: fileIdMatch[1],
      nodeId: nodeIdMatch[1].replace("-", ":"), // Convert to colon format
      versionId: versionMatch ? versionMatch[1] : null
    };
  }
  
  return null;
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getFigmaHeaders,
    fetchLatestVersion,
    fetchNodeImageUrl,
    createVersionFromId,
    parseFigmaUrl
  };
}
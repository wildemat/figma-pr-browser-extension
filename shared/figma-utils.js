/**
 * Shared utilities for Figma API and URL handling
 */

import { FIGMA_REGEX, FIGMA_API, DEFAULT_CONFIG } from "./constants.js";

/**
 * Parse a Figma URL to extract file ID, node ID, and version ID
 * @param {string} url - The Figma URL to parse
 * @returns {Object|null} - Parsed components or null if invalid
 */
export function parseFigmaUrl(url) {
  const fileIdMatch = url.match(FIGMA_REGEX.FILE_ID);
  const nodeIdMatch = url.match(FIGMA_REGEX.NODE_ID);
  const versionMatch = url.match(FIGMA_REGEX.VERSION_ID);

  if (fileIdMatch && nodeIdMatch) {
    return {
      fileId: fileIdMatch[1],
      nodeId: nodeIdMatch[1].replace("-", ":"),
      versionId: versionMatch ? versionMatch[1] : null,
    };
  }
  return null;
}

/**
 * Fetch the latest version of a Figma file
 * @param {string} fileId - Figma file ID
 * @param {string} figmaToken - Figma API token
 * @returns {Promise<Object>} - Latest version information
 */
export async function fetchLatestVersion(fileId, figmaToken) {
  const url = `${FIGMA_API.BASE_URL}${FIGMA_API.ENDPOINTS.FILE_VERSIONS(fileId)}`;

  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": figmaToken,
      ...FIGMA_API.HEADERS,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status}`);
  }

  const data = await response.json();
  return data.versions[0];
}

/**
 * Fetch image URL for a specific node
 * @param {string} fileId - Figma file ID
 * @param {string} nodeId - Node ID
 * @param {string} figmaToken - Figma API token
 * @returns {Promise<string>} - Image URL
 */
export async function fetchNodeImageUrl(fileId, nodeId, figmaToken) {
  const url = `${FIGMA_API.BASE_URL}${FIGMA_API.ENDPOINTS.NODE_IMAGES(fileId)}?ids=${nodeId}&format=${FIGMA_API.IMAGE_FORMAT}`;

  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": figmaToken,
      ...FIGMA_API.HEADERS,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.images[nodeId];

  if (!imageUrl) {
    throw new Error(`Could not get image for node ${nodeId}`);
  }

  return imageUrl;
}

/**
 * Create a version object from a version ID
 * @param {string} versionId - Version ID
 * @returns {Object} - Version object
 */
export function createVersionFromId(versionId) {
  return {
    id: versionId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Calculate image expiration date
 * @param {number} days - Number of days from now (default: 30)
 * @returns {string} - ISO date string
 */
export function calculateImageExpirationDate(
  days = DEFAULT_CONFIG.IMAGE_EXPIRATION_DAYS,
) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate.toISOString().split("T")[0];
}

/**
 * Create a clean Figma URL with specific version
 * @param {string} fileId - File ID
 * @param {string} nodeId - Node ID
 * @param {string} versionId - Version ID
 * @returns {string} - Clean Figma URL
 */
export function createCleanFigmaUrl(fileId, nodeId, versionId) {
  const dashNodeId = nodeId.replace(":", "-");
  return `https://www.figma.com/design/${fileId}/?node-id=${dashNodeId}&version-id=${versionId}&m=dev`;
}

/**
 * Test Figma token validity
 * @param {string} token - Figma API token
 * @returns {Promise<Object>} - User information if valid
 */
export async function testFigmaToken(token) {
  const response = await fetch(
    `${FIGMA_API.BASE_URL}${FIGMA_API.ENDPOINTS.USER}`,
    {
      headers: {
        "X-Figma-Token": token,
        ...FIGMA_API.HEADERS,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Figma API Error:", response.status, errorText);

    if (FIGMA_API.ERROR_CODES.UNAUTHORIZED.includes(response.status)) {
      throw new Error("Invalid token or insufficient permissions");
    } else if (response.status === FIGMA_API.ERROR_CODES.RATE_LIMITED) {
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
}

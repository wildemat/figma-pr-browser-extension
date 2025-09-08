/**
 * Shared utilities for content processing and spec generation
 */

import { FIGMA_REGEX, SPEC_REGEX, DEFAULT_CONFIG } from "./constants.js";

/**
 * Find Figma links in text, excluding already processed content
 * @param {string} text - Text to search
 * @returns {Array<Object>} - Array of link objects
 */
export function findFigmaLinks(text) {
  const links = [];

  // Remove all content between spec markers to avoid processing already processed links
  let cleanText = text;
  cleanText = cleanText.replace(SPEC_REGEX.SPEC_BLOCK, "");

  // Find markdown links first
  let match;
  const markdownRegex = new RegExp(
    FIGMA_REGEX.MARKDOWN_LINK.source,
    FIGMA_REGEX.MARKDOWN_LINK.flags,
  );
  while ((match = markdownRegex.exec(cleanText)) !== null) {
    links.push({
      url: match[2],
      fullMatch: match[0],
      isMarkdownLink: true,
      linkText: match[1],
    });
  }

  // Find standalone URLs (that aren't part of markdown links)
  const textWithoutMarkdown = cleanText.replace(markdownRegex, "");
  const standaloneRegex = new RegExp(
    FIGMA_REGEX.STANDALONE_URL.source,
    FIGMA_REGEX.STANDALONE_URL.flags,
  );
  while ((match = standaloneRegex.exec(textWithoutMarkdown)) !== null) {
    links.push({
      url: match[0],
      fullMatch: match[0],
      isMarkdownLink: false,
      linkText: null,
    });
  }

  return links;
}

/**
 * Get the next spec number based on existing specs
 * @param {string} text - Text to analyze
 * @returns {number} - Next spec number
 */
export function getNextSpecNumber(text) {
  const specRegex = new RegExp(
    SPEC_REGEX.START_SPEC.source,
    SPEC_REGEX.START_SPEC.flags,
  );
  let maxNumber = 0;
  let match;

  while ((match = specRegex.exec(text)) !== null) {
    const number = parseInt(match[1], 10);
    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  return maxNumber + 1;
}

/**
 * Parse existing specs by node ID and version for deduplication
 * @param {string} text - Text to analyze
 * @returns {Object} - Map of nodeVersionKey to spec number
 */
export function getExistingSpecsByNodeId(text) {
  const existingSpecs = {};
  const specRegex = new RegExp(
    SPEC_REGEX.EXISTING_SPEC.source,
    SPEC_REGEX.EXISTING_SPEC.flags,
  );
  let match;

  while ((match = specRegex.exec(text)) !== null) {
    const specNumber = parseInt(match[1], 10);
    const fileId = match[2];
    const nodeId = match[3].replace("-", ":");
    const versionId = match[4];
    const nodeVersionKey = `${fileId}:${nodeId}:${versionId}`;
    existingSpecs[nodeVersionKey] = specNumber;
  }

  return existingSpecs;
}

/**
 * Create reference text for a spec
 * @param {boolean} isMarkdownLink - Whether original was markdown link
 * @param {string|null} linkText - Original link text if markdown
 * @param {number} specNumber - Spec number to reference
 * @param {string} specId - Spec ID
 * @returns {string} - Reference text
 */
export function createReferenceText(
  isMarkdownLink,
  linkText,
  specNumber,
  specId,
) {
  if (isMarkdownLink && linkText) {
    return `${linkText} ([Refer to Design Spec ${specNumber}](#${specId}))`;
  } else {
    return `[Refer to Design Spec ${specNumber}](#${specId})`;
  }
}

/**
 * Create a design spec snippet
 * @param {number} specNumber - Spec number
 * @param {string} specId - Spec ID
 * @param {string} attachmentUrl - Image URL
 * @param {string} cleanUrl - Clean Figma URL
 * @param {string} versionId - Version ID
 * @param {string} snapshotTimestamp - Snapshot timestamp
 * @param {string} expirationString - Expiration date
 * @returns {string} - Design spec HTML
 */
export function createDesignSpecSnippet(
  specNumber,
  specId,
  attachmentUrl,
  cleanUrl,
  versionId,
  snapshotTimestamp,
  expirationString,
) {
  return `
<!-- START_SPEC_${specNumber} -->

<a id="${specId}"></a>

<details>
<summary><strong>🎨 Design Spec ${specNumber}</strong> <a href="#${specId}">#</a></summary>

<br>

<kbd><img alt="Figma Design Preview" src="${attachmentUrl}" /></kbd>

<details>
<summary>📋 Spec Details</summary>

**Design Link:** [View in Figma](${cleanUrl}) (Cmd+Click to open in new tab)

**Version:** ${versionId}

**Snapshot Timestamp:** ${snapshotTimestamp}

**Image Expires:** ${expirationString}

**Description: (enter description here)**

</details>

</details>

---

<!-- END_SPEC_${specNumber} -->

`;
}

/**
 * Get the design specs end marker
 * @param {string} customHeading - Custom heading (optional)
 * @returns {string} - End marker
 */
export function getDesignSpecsEndMarker(customHeading = null) {
  const heading = customHeading || DEFAULT_CONFIG.SPEC_HEADING;
  return `<!-- END_${heading.toUpperCase().replace(/\s+/g, "_")}_SPECS - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->`;
}

/**
 * Create design specs section regex for custom heading
 * @param {string} customHeading - Custom heading (defaults to "Design Specs")
 * @returns {RegExp} - Regex to match the heading
 */
export function createDesignSpecsRegex(
  customHeading = DEFAULT_CONFIG.SPEC_HEADING,
) {
  const escapedHeading = customHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^#{1,6}\\s*${escapedHeading}\\s*$`, "im");
}

/**
 * Add design specs section to text
 * @param {string} text - Original text
 * @param {Array<string>} designSpecs - Array of design spec snippets
 * @param {string} customHeading - Custom heading for specs section
 * @returns {string} - Updated text with design specs
 */
export function addDesignSpecsSection(
  text,
  designSpecs,
  customHeading = DEFAULT_CONFIG.SPEC_HEADING,
) {
  const designSpecsRegex = createDesignSpecsRegex(customHeading);
  const match = text.match(designSpecsRegex);
  const endMarker = getDesignSpecsEndMarker(customHeading);

  if (match) {
    // Find end of existing section
    const endIndex = text.indexOf(endMarker);

    if (endIndex > -1) {
      // Insert before end marker
      const beforeEnd = text.substring(0, endIndex);
      const afterEnd = text.substring(endIndex);
      return beforeEnd + designSpecs.join("\n") + "\n" + afterEnd;
    } else {
      // Add end marker and specs after the section
      const sectionIndex = text.indexOf(match[0]) + match[0].length;
      const before = text.substring(0, sectionIndex);
      const after = text.substring(sectionIndex);
      return (
        before + "\n\n" + designSpecs.join("\n") + "\n\n" + endMarker + after
      );
    }
  } else {
    // Create new section at the end
    return (
      text +
      `\n\n## ${customHeading}\n\n` +
      designSpecs.join("\n") +
      "\n\n" +
      endMarker
    );
  }
}

/**
 * Extract content between spec heading and end marker
 * @param {string} text - Text to extract from
 * @param {string} customHeading - Custom heading for specs section
 * @returns {string|null} - Extracted specs section or null if not found
 */
export function extractSpecsSection(
  text,
  customHeading = DEFAULT_CONFIG.SPEC_HEADING,
) {
  const designSpecsRegex = createDesignSpecsRegex(customHeading);
  const match = text.match(designSpecsRegex);
  const endMarker = getDesignSpecsEndMarker(customHeading);

  if (!match) return null;

  const sectionStart = text.indexOf(match[0]);
  const endMarkerIndex = text.indexOf(endMarker);

  if (endMarkerIndex === -1) return null;

  return text.substring(sectionStart, endMarkerIndex + endMarker.length);
}

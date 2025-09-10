// Shared utility functions for browser extensions
// These functions are used by both Chrome and Firefox content scripts

// Figma API utilities
function parseFigmaUrl(url) {
  const fileIdMatch = url.match(/\/design\/([^/]+)\//);
  const nodeIdMatch = url.match(/node-id=([^&\s)]+)/);
  const versionMatch = url.match(/version-id=([^&\s)]+)/);

  if (fileIdMatch && nodeIdMatch) {
    return {
      fileId: fileIdMatch[1],
      nodeId: nodeIdMatch[1].replace("-", ":"),
      versionId: versionMatch ? versionMatch[1] : null,
    };
  }
  return null;
}

async function fetchLatestVersion(fileId, figmaToken) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileId}/versions`,
    {
      headers: { "X-Figma-Token": figmaToken },
    },
  );
  const data = await response.json();
  return data.versions[0];
}

async function fetchNodeImageUrl(fileId, nodeId, figmaToken) {
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileId}?ids=${nodeId}&format=jpg&scale=2&use_absolute_bounds=true`,
    {
      headers: { "X-Figma-Token": figmaToken },
    },
  );
  const data = await response.json();
  const imageUrl = data.images[nodeId];
  if (!imageUrl) throw new Error(`Could not get image for node ${nodeId}`);
  return imageUrl;
}

function createVersionFromId(versionId) {
  return {
    id: versionId,
    created_at: new Date().toISOString(),
  };
}

// Utility functions
function calculateImageExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  return expirationDate.toISOString().split("T")[0];
}

function createCleanFigmaUrl(fileId, nodeId, versionId) {
  const dashNodeId = nodeId.replace(":", "-");
  return `https://www.figma.com/design/${fileId}/?node-id=${dashNodeId}&version-id=${versionId}&m=dev`;
}

function createDesignSpecSnippet(
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

function createReferenceText(isMarkdownLink, linkText, specNumber, specId) {
  if (isMarkdownLink) {
    return `[${linkText}](#${specId}) (→ Design Spec ${specNumber})`;
  } else {
    return `[Refer to Design Spec ${specNumber}](#${specId})`;
  }
}

function getDesignSpecsEndMarker() {
  return "<!-- END_DESIGN_SPECS - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->";
}

// Shared styling functions
function createStyledButton(text, type) {
  const button = document.createElement("button");
  button.textContent = text;
  button.type = "button";

  const baseStyles = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    line-height: 1.2857142857;
    vertical-align: middle;
    user-select: none;
    -webkit-appearance: none;
    appearance: none;
    margin-right: 8px;
  `;

  let hoverStyles;

  switch (type) {
    case "primary":
      button.style.cssText =
        baseStyles +
        `
        color: #fff;
        background: #2da44e;
        border-color: #2da44e;
      `;
      hoverStyles = "background: #2c974b; border-color: #2c974b;";
      break;
    case "danger":
      button.style.cssText =
        baseStyles +
        `
        color: #fff;
        background: #da3633;
        border-color: #da3633;
      `;
      hoverStyles = "background: #c93c37; border-color: #c93c37;";
      break;
    case "secondary":
    default:
      button.style.cssText =
        baseStyles +
        `
        color: #24292e;
        background: #f6f8fa;
        border-color: #d0d7de;
      `;
      hoverStyles = "background: #f3f4f6; border-color: #d0d7de;";
      break;
    case "success":
      button.style.cssText =
        baseStyles +
        `
        color: #fff;
        background: #2da44e;
        border-color: #2da44e;
      `;
      hoverStyles = "background: #1a7f37; border-color: #1a7f37;";
      break;
  }

  button.style.cssText = baseStyles;

  button.addEventListener("mouseenter", () => {
    button.style.cssText += hoverStyles;
  });

  button.addEventListener("mouseleave", () => {
    button.style.cssText = baseStyles;
  });

  return button;
}

function showButtonFeedback(button, message) {
  const originalText = button.innerHTML;
  const originalColor = button.style.color;
  const originalBg = button.style.background;
  const originalBorder = button.style.borderColor;

  button.innerHTML = message;
  button.style.color = "#fff";
  button.style.background = "#2da44e";
  button.style.borderColor = "#2da44e";

  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.color = "#24292e";
    button.style.background = "#f6f8fa";
    button.style.borderColor = "#d0d7de";
  }, 1500);
}

/**
 * Shared modal utility functions for both Chrome and Firefox extensions
 */

function createDiffPreviewModal(originalText, newText, onApprove, context) {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create modal content
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    width: 95vw;
    height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  // Create header
  const header = document.createElement("div");
  header.style.cssText = `
    padding: 16px 24px;
    border-bottom: 1px solid #e1e4e8;
    background: #f6f8fa;
  `;
  header.innerHTML =
    '<h3 style="margin: 0; color: #24292e;">Review Changes</h3>';

  // Create split pane container
  const splitContainer = document.createElement("div");
  splitContainer.style.cssText = `
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  `;

  // Create left pane (original content)
  const leftPane = document.createElement("div");
  leftPane.style.cssText = `
    width: 50%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e1e4e8;
  `;

  const leftHeader = document.createElement("div");
  leftHeader.style.cssText = `
    padding: 12px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    font-weight: 600;
    color: #24292e;
    font-size: 14px;
  `;
  leftHeader.textContent = "Original Content";

  const leftContent = document.createElement("textarea");
  leftContent.style.cssText = `
    flex: 1;
    padding: 16px;
    border: none;
    resize: none;
    outline: none;
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    background: #f8f9fa;
    color: #656d76;
  `;
  leftContent.value = originalText;
  leftContent.readOnly = true;

  leftPane.appendChild(leftHeader);
  leftPane.appendChild(leftContent);

  // Create resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.style.cssText = `
    width: 4px;
    background: #e1e4e8;
    cursor: col-resize;
    transition: background-color 0.2s;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-2px);
    z-index: 10;
  `;

  resizeHandle.addEventListener("mouseenter", () => {
    resizeHandle.style.background = "#0969da";
  });

  resizeHandle.addEventListener("mouseleave", () => {
    resizeHandle.style.background = "#e1e4e8";
  });

  // Create right pane (new content - editable)
  const rightPane = document.createElement("div");
  rightPane.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
  `;

  // Create tab header for right pane
  const rightHeader = document.createElement("div");
  rightHeader.style.cssText = `
    background: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    display: flex;
    align-items: center;
  `;

  // Create tab navigation
  const tabNav = document.createElement("div");
  tabNav.style.cssText = `
    display: flex;
    flex: 1;
  `;

  const editTab = document.createElement("button");
  editTab.textContent = "Edit";
  editTab.style.cssText = `
    padding: 12px 16px;
    background: white;
    border: none;
    border-bottom: 2px solid #fd8c73;
    font-weight: 600;
    color: #24292e;
    font-size: 14px;
    cursor: pointer;
  `;
  editTab.classList.add("active-tab");

  const previewTab = document.createElement("button");
  previewTab.textContent = "Preview";
  previewTab.style.cssText = `
    padding: 12px 16px;
    background: #f6f8fa;
    border: none;
    border-bottom: 2px solid transparent;
    font-weight: 600;
    color: #656d76;
    font-size: 14px;
    cursor: pointer;
  `;

  tabNav.appendChild(editTab);
  tabNav.appendChild(previewTab);
  rightHeader.appendChild(tabNav);

  // Create content container for tabs
  const rightContentContainer = document.createElement("div");
  rightContentContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
  `;

  const rightContent = document.createElement("textarea");
  rightContent.style.cssText = `
    flex: 1;
    padding: 16px;
    border: none;
    resize: none;
    outline: none;
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    font-size: 12px;
    line-height: 1.4;
    background: white;
    display: block;
  `;
  rightContent.value = newText;

  // Create preview content container
  const previewContent = document.createElement("div");
  previewContent.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: white;
    display: none;
  `;
  previewContent.innerHTML = context.renderMarkdown(newText);

  rightContentContainer.appendChild(rightContent);
  rightContentContainer.appendChild(previewContent);

  // Tab switching logic
  editTab.addEventListener("click", () => {
    editTab.style.cssText = `
      padding: 12px 16px;
      background: white;
      border: none;
      border-bottom: 2px solid #fd8c73;
      font-weight: 600;
      color: #24292e;
      font-size: 14px;
      cursor: pointer;
    `;
    previewTab.style.cssText = `
      padding: 12px 16px;
      background: #f6f8fa;
      border: none;
      border-bottom: 2px solid transparent;
      font-weight: 600;
      color: #656d76;
      font-size: 14px;
      cursor: pointer;
    `;
    rightContent.style.display = "block";
    previewContent.style.display = "none";
  });

  previewTab.addEventListener("click", () => {
    previewTab.style.cssText = `
      padding: 12px 16px;
      background: white;
      border: none;
      border-bottom: 2px solid #fd8c73;
      font-weight: 600;
      color: #24292e;
      font-size: 14px;
      cursor: pointer;
    `;
    editTab.style.cssText = `
      padding: 12px 16px;
      background: #f6f8fa;
      border: none;
      border-bottom: 2px solid transparent;
      font-weight: 600;
      color: #656d76;
      font-size: 14px;
      cursor: pointer;
    `;
    rightContent.style.display = "none";
    previewContent.style.display = "block";
    // Update preview content when switching to preview tab
    previewContent.innerHTML = context.renderMarkdown(rightContent.value);
  });

  // Update preview when content changes in edit mode
  rightContent.addEventListener("input", () => {
    if (previewContent.style.display === "block") {
      previewContent.innerHTML = context.renderMarkdown(rightContent.value);
    }
  });

  // Create copy buttons container (below right pane)
  const copyButtonsContainer = document.createElement("div");
  copyButtonsContainer.style.cssText = `
    padding: 12px 16px;
    border-top: 1px solid #e1e4e8;
    background: #f8f9fa;
    display: flex;
    gap: 8px;
  `;

  // Create copy buttons
  const copyFullBtn = createStyledButton("Copy Full Content", "copy");
  const copySpecsBtn = createStyledButton("Copy Figma Section", "copy");

  copyButtonsContainer.appendChild(copyFullBtn);
  copyButtonsContainer.appendChild(copySpecsBtn);

  rightPane.appendChild(rightHeader);
  rightPane.appendChild(rightContentContainer);
  rightPane.appendChild(copyButtonsContainer);

  // Add resize functionality
  let isResizing = false;
  let startX = 0;
  let startLeftWidth = 0;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startLeftWidth = leftPane.offsetWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const containerWidth = splitContainer.offsetWidth;
    const newLeftWidth = startLeftWidth + deltaX;
    const leftPercentage = Math.max(
      20,
      Math.min(80, (newLeftWidth / containerWidth) * 100),
    );

    leftPane.style.width = `${leftPercentage}%`;
    rightPane.style.width = `${100 - leftPercentage}%`;
    resizeHandle.style.left = `${leftPercentage}%`;
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });

  splitContainer.appendChild(leftPane);
  splitContainer.appendChild(resizeHandle);
  splitContainer.appendChild(rightPane);

  // Create footer with action buttons
  const footer = document.createElement("div");
  footer.style.cssText = `
    padding: 16px 24px;
    border-top: 1px solid #e1e4e8;
    background: #f6f8fa;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `;

  const cancelBtn = createStyledButton("Cancel", "cancel");
  const approveBtn = createStyledButton("Approve & Apply", "approve");

  footer.appendChild(cancelBtn);
  footer.appendChild(approveBtn);

  // Add event listeners
  copyFullBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(rightContent.value);
    showButtonFeedback(copyFullBtn, "Copied!");
  });

  copySpecsBtn.addEventListener("click", () => {
    const currentText = rightContent.value;
    const specsSection = context.extractSpecsSection(currentText);

    if (specsSection) {
      navigator.clipboard.writeText(specsSection);
      showButtonFeedback(copySpecsBtn, "Copied!");
    } else {
      context.showError("No specs section found");
    }
  });

  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    context.showInfo("Changes cancelled");
  });

  approveBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    onApprove(rightContent.value);
  });

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(splitContainer);
  modal.appendChild(footer);

  overlay.appendChild(modal);

  return overlay;
}

function createStyledButton(text, type) {
  const button = document.createElement("button");
  button.textContent = text;

  let baseStyles, hoverStyles;

  switch (type) {
    case "copy":
      baseStyles = `
        padding: 6px 12px;
        border: 1px solid #d0d7de;
        border-radius: 6px;
        background: white;
        color: #24292e;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      `;
      hoverStyles = "background: #f6f8fa; border-color: #8c959f;";
      break;

    case "cancel":
      baseStyles = `
        padding: 8px 16px;
        border: 1px solid #da3633;
        border-radius: 6px;
        background: white;
        color: #da3633;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      `;
      hoverStyles = "background: #da3633; color: white;";
      break;

    case "approve":
      baseStyles = `
        padding: 8px 16px;
        border: 1px solid #1f883d;
        border-radius: 6px;
        background: #1f883d;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      `;
      hoverStyles = "background: #1a7f37; border-color: #1a7f37;";
      break;
  }

  button.style.cssText = baseStyles;

  button.addEventListener("mouseenter", () => {
    button.style.cssText = baseStyles + hoverStyles;
  });

  button.addEventListener("mouseleave", () => {
    button.style.cssText = baseStyles;
  });

  return button;
}

function showButtonFeedback(button, message) {
  const originalText = button.textContent;
  button.textContent = message;
  button.style.background = "#1f883d";
  button.style.color = "white";
  button.style.borderColor = "#1f883d";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "white";
    button.style.color = "#24292e";
    button.style.borderColor = "#d0d7de";
  }, 1500);
}

function renderMarkdown(text) {
  // Use Snarkdown library for markdown rendering
  // Note: This requires snarkdown to be loaded globally
  const html = typeof snarkdown !== "undefined" ? snarkdown(text) : text;

  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #24292e;
    ">
      <style>
        h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
        h3 { font-size: 1.25em; }
        p { margin-bottom: 16px; }
        code { 
          background: #f6f8fa; 
          padding: 2px 4px; 
          border-radius: 3px; 
          font-family: 'SFMono-Regular', Consolas, monospace;
          font-size: 85%;
        }
        pre { 
          background: #f6f8fa; 
          padding: 16px; 
          border-radius: 6px; 
          overflow-x: auto;
          margin: 16px 0;
        }
        pre code { background: none; padding: 0; }
        ul { margin: 16px 0; padding-left: 30px; }
        li { margin-bottom: 4px; }
        hr { border: 0; border-top: 1px solid #eaecef; margin: 24px 0; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        strong { font-weight: 600; }
      </style>
      ${html}
    </div>
  `;
}

function extractSpecsSection(text) {
  const startMarker = `<!-- START_FIGMA_SECTION -->`;
  const endMarker = `<!-- END_FIGMA_SECTION`;

  const startIndex = text.indexOf(startMarker);
  const endMarkerIndex = text.indexOf(endMarker);

  if (startIndex > -1 && endMarkerIndex > startIndex) {
    const endPos =
      endMarkerIndex + text.substring(endMarkerIndex).indexOf("-->") + 3;
    return text.substring(startIndex, endPos);
  }

  return null;
}

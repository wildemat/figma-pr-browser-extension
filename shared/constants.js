/**
 * Constants and regular expressions for Figma PR Extension
 */

// Figma URL patterns
export const FIGMA_REGEX = {
  // Regex for standalone Figma URLs
  STANDALONE_URL: /https:\/\/www\.figma\.com\/design\/[^)\s]+/g,

  // Regex for markdown links with Figma URLs
  MARKDOWN_LINK: /\[([^\]]+)\]\((https:\/\/www\.figma\.com\/design\/[^)]+)\)/g,

  // Parse Figma URL components
  FILE_ID: /\/design\/([^/]+)\//,
  NODE_ID: /node-id=([^&\s)]+)/,
  VERSION_ID: /version-id=([^&\s)]+)/,
};

// Spec detection patterns
export const SPEC_REGEX = {
  // Find existing spec markers
  START_SPEC: /<!-- START_SPEC_(\d+) -->/g,
  END_SPEC: /<!-- END_SPEC_(\d+) -->/g,
  SPEC_BLOCK: /<!-- START_SPEC_\d+ -->[\s\S]*?<!-- END_SPEC_\d+ -->/g,

  // Parse existing specs for deduplication
  EXISTING_SPEC:
    /<!-- START_SPEC_(\d+) -->[\s\S]*?\*\*Design Link:\*\* \[View in Figma\]\(https:\/\/www\.figma\.com\/design\/([^/]+)\/\?node-id=([^&]+)&[^)]*version-id=([^&)]+)/g,
};

// Default configuration
export const DEFAULT_CONFIG = {
  // Default heading for design specs section
  SPEC_HEADING: "Design Specs",

  // End marker for design specs section
  END_MARKER:
    "<!-- END_DESIGN_SPECS - WILL NOT DETECT FIGMA LINKS BELOW THIS LINE -->",

  // Image expiration days
  IMAGE_EXPIRATION_DAYS: 30,
};

// UI selectors for GitHub
export const GITHUB_SELECTORS = {
  // Textareas
  PR_DESCRIPTION: "#pull_request_body",
  PR_DESCRIPTION_ALT: 'textarea[name="pull_request[body]"]',

  // Tabs
  WRITE_TAB: {
    SELECTED: ".write-tab.selected",
    ARIA_SELECTED: '.js-write-tab[aria-selected="true"]',
    ALL: ".write-tab, .js-write-tab",
  },

  PREVIEW_TAB: {
    SELECTED: ".preview-tab.selected",
    ARIA_SELECTED: '.js-preview-tab[aria-selected="true"]',
    ALL: ".preview-tab, .js-preview-tab",
  },

  // Button container locations (in priority order)
  BUTTON_LOCATIONS: {
    EDIT_MODE: [
      ".timeline-comment-actions",
      ".edit-comment-hide .form-actions",
      ".comment-form-actions",
    ],
    GENERAL: [
      ".form-actions",
      ".new-pr-form .form-actions",
      ".js-write-bucket",
    ],
  },

  // Elements to watch for changes
  MUTATION_TARGETS: [
    ".tabnav-tab",
    ".timeline-comment-actions",
    ".edit-comment-hide",
    "textarea",
  ],
};

// Button configuration
export const BUTTON_CONFIG = {
  ID: "figma-process-btn",
  CLASS: "btn btn-sm btn-outline",
  TEXT: "🎨 Process Figma Links",
  PROCESSING_TEXT: "⏳ Processing...",
  STYLES: {
    marginLeft: "8px",
  },
};

// Notification styles
export const NOTIFICATION_STYLES = {
  POSITION: "fixed",
  TOP: "20px",
  RIGHT: "20px",
  PADDING: "12px 16px",
  BORDER_RADIUS: "6px",
  COLOR: "white",
  FONT_WEIGHT: "500",
  Z_INDEX: "10000",
  MAX_WIDTH: "400px",
  BOX_SHADOW: "0 8px 32px rgba(0,0,0,0.12)",

  COLORS: {
    success: "#28a745",
    error: "#dc3545",
    info: "#17a2b8",
  },

  DURATION: 5000, // milliseconds
};

// Figma API configuration
export const FIGMA_API = {
  BASE_URL: "https://api.figma.com/v1",

  ENDPOINTS: {
    USER: "/me",
    FILE_VERSIONS: (fileId) => `/files/${fileId}/versions`,
    NODE_IMAGES: (fileId) => `/images/${fileId}`,
  },

  HEADERS: {
    "Content-Type": "application/json",
  },

  IMAGE_FORMAT: "png",

  ERROR_CODES: {
    UNAUTHORIZED: [401, 403],
    RATE_LIMITED: 429,
    NOT_FOUND: 404,
  },
};

// Storage keys
export const STORAGE_KEYS = {
  FIGMA_TOKEN: "figmaToken",
  SPEC_HEADING: "specHeading",
  DIFF_APPROVAL_ENABLED: "diffApprovalEnabled",
};

// Validation patterns
export const VALIDATION = {
  FIGMA_TOKEN: /^figd?_[A-Za-z0-9_-]+$/,
  HEADING_TEXT: /^[a-zA-Z0-9\s\-_]+$/,
};

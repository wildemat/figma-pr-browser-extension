# Figma PR Extension

A browser extension that automatically processes Figma links in GitHub PR descriptions and generates design specs, similar to the [github-figma-action](https://github.com/wildemat/github-figma-action) but for individual use.

## Features

- **Process Figma Links**: Automatically converts Figma design URLs into organized design specs
- **Individual Use**: Works with your personal Figma API token - no repository setup required
- **Real-time Processing**: Process links directly in GitHub's PR interface
- **Smart Detection**: Handles both standalone URLs and markdown links
- **Preview Images**: Embeds preview images with version information
- **Clean Organization**: Creates collapsible, numbered design spec sections

## Installation

### For Development

1. Clone or download this extension
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. Get a Figma API token from [Figma Settings](https://www.figma.com/settings) → Account → Personal access tokens
6. Click the extension icon and enter your token

### For Users

*Extension will be published to Chrome Web Store soon*

## Usage

1. **Setup**: Install the extension and configure your Figma API token
2. **Navigate**: Go to any GitHub PR page (new PR or edit existing)
3. **Add Links**: Paste Figma design URLs in your PR description
4. **Process**: Click the "🎨 Process Figma Links" button that appears
5. **Review**: Your Figma links will be replaced with organized design specs

## Supported URL Formats

- Standalone URLs: `https://www.figma.com/design/FILE_ID/FILE_NAME?node-id=NODE_ID`
- Markdown links: `[Design name](https://www.figma.com/design/...)`

## Example

**Before:**
```
Here's the new homepage design: https://www.figma.com/design/abc123/Homepage?node-id=1-2
```

**After:**
```
Here's the new homepage design: [Refer to Design Spec 1 below](#design-spec-1)

## Design Specs

<details>
<summary><strong>🎨 Design Spec 1</strong> <a href="#design-spec-1">#</a></summary>

<kbd><img alt="Figma Design Preview" src="https://figma-alpha-api..." /></kbd>

<details>
<summary>📋 Spec Details</summary>

**Design Link:** [View in Figma](https://www.figma.com/design/abc123/?node-id=1-2&version-id=...)

**Version:** 2260315635405056828
**Snapshot Timestamp:** 2025-09-06T12:00:00Z
**Image Expires:** 2025-10-06

**Description: (enter description here)**
</details>
</details>
```

## Privacy & Security

- Your Figma token is stored locally in your browser
- No data is sent to third-party servers
- Extension only runs on GitHub PR pages
- Open source - you can review all code

## Comparison with GitHub Action

| Feature | Browser Extension | GitHub Action |
|---------|------------------|---------------|
| Setup | Individual token | Repository setup required |
| Permissions | Personal use | Org approval needed |
| Usage | Any repository | Configured repos only |
| Processing | Manual click | Automatic on PR events |
| Privacy | Local token | Shared repository secret |

## Development

### File Structure
```
figma-pr-extension/
├── manifest.json       # Extension configuration
├── content.js         # Main processing logic
├── content.css        # Button styling
├── popup.html         # Settings UI
├── popup.js          # Settings logic
├── background.js     # Background service worker
├── figmaApi.js       # Figma API functions
├── utils.js          # Utility functions
└── icons/            # Extension icons
```

### Building

No build process required - this is a vanilla JavaScript extension.

### Testing

1. Load the extension in developer mode
2. Navigate to any GitHub PR page
3. Add Figma links to the description
4. Click the process button
5. Verify the links are converted to design specs

## Contributing

Feel free to submit issues and pull requests!

## License

MIT License - see the original [github-figma-action](https://github.com/wildemat/github-figma-action) project.
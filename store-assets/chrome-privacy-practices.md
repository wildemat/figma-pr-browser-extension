# Chrome Web Store Privacy Practices

## Single Purpose Description

This extension automatically converts Figma design links in GitHub pull requests into rich, interactive design specifications with preview images, version tracking, and detailed metadata to enhance design collaboration workflows.

## Permission Justifications

### activeTab Permission

**Why needed**: Required to access and modify GitHub pull request pages when the user clicks the extension button. The extension only works when users are actively viewing GitHub PR pages and choose to process Figma links.

**How it's used**:

- Detects when user is editing a GitHub PR description
- Injects the "Process Figma Links" button into the page
- Reads PR description content to find Figma links
- Updates PR description with processed design specifications

### Host Permissions (github.com/_, api.figma.com/_)

**Why needed**:

- **github.com/\***: Access GitHub pull request and compare pages to read/modify PR descriptions
- **api.figma.com/\***: Make API calls to Figma to fetch design metadata and generate preview images

**How it's used**:

- **GitHub**: Only accesses PR description textareas and page elements needed for the extension functionality
- **Figma API**: Fetches file metadata, version information, and generates design preview images using user's API token

### storage Permission

**Why needed**: Securely store user's Figma API token locally in browser sync storage for persistent authentication across browser sessions.

**How it's used**:

- Stores only the user's Figma API token (provided by user)
- Uses browser.storage.sync for cross-device synchronization
- No other personal data is collected or stored
- Token is only transmitted to Figma's official API endpoints

### Remote Code Use

**Justification**: This extension does NOT execute remote code. All code is bundled within the extension package. The extension only makes API calls to Figma's official REST API to fetch design data and images, which return JSON data and image URLs - not executable code.

**What API calls are made**:

- GET requests to api.figma.com for design metadata
- GET requests to api.figma.com for design preview images
- All responses are data (JSON/images), never executable code

## Data Usage Compliance

### Data Collection

- **What we collect**: Only the user's Figma API token (voluntarily provided)
- **Where it's stored**: Locally in user's browser storage (chrome.storage.sync)
- **How it's used**: Authentication with Figma API to access user's design files
- **Who has access**: Only the user and Figma's API (when making authorized requests)

### Data Transmission

- **To Figma**: Only the user's API token for authentication (standard OAuth-style usage)
- **To GitHub**: No data transmitted - only reads/modifies content on pages user is viewing
- **To third parties**: None - no analytics, tracking, or external services

### User Control

- Users can revoke/change their Figma API token at any time through the extension popup
- Users can uninstall the extension to remove all stored data
- Extension only processes links when user explicitly clicks the "Process Figma Links" button

## Developer Program Policy Compliance

✅ **Single Purpose**: Extension has one clear purpose - converting Figma links to rich design specs in GitHub PRs

✅ **User Consent**: Extension only acts when user explicitly triggers it by clicking the process button

✅ **Data Minimization**: Only collects the minimum data needed (Figma API token) for core functionality

✅ **Transparency**: All functionality is clearly described to users

✅ **Security**: API token stored securely in browser's built-in storage system

✅ **No Deceptive Practices**: Extension clearly identifies itself and its purpose

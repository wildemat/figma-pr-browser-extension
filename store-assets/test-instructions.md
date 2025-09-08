# Chrome Web Store Test Instructions

## Required Setup

### 1. Figma API Token (Required)

**How to get a test token:**

1. Go to https://www.figma.com/settings (create free Figma account if needed)
2. Scroll to "Personal access tokens" section
3. Click "Create new token"
4. Name it "Chrome Store Review"
5. Copy the generated token

**Test Token Scopes Needed:**

- file_content:read
- file_metadata:read
- file_versions:read
- current_user:read

### 2. Test Figma File (Public)

Use this public Figma file for testing: https://www.figma.com/design/fNBj4RfSqBKVWR1lrLOyMP/Test-Design-File?node-id=1-2

## Step-by-Step Testing

### Phase 1: Extension Setup

1. Load the extension in Chrome
2. Click the extension icon in toolbar
3. Paste the Figma API token in the text field
4. Click "Test Token" - should show success message
5. Click "Save Settings"

### Phase 2: Core Functionality Test

1. Go to any GitHub repository with pull requests (e.g., https://github.com/microsoft/vscode/pulls)
2. Open any pull request
3. Click "Edit" button on the PR description
4. In the description text area, paste this Figma link:
   ```
   https://www.figma.com/design/fNBj4RfSqBKVWR1lrLOyMP/Test-Design-File?node-id=1-2
   ```
5. Ensure you're on the "Write" tab (not "Preview")
6. Look for the "🎨 Process Figma Links" button (should appear automatically)
7. Click the "🎨 Process Figma Links" button
8. Wait 3-5 seconds for processing
9. Observe that the Figma link is replaced with a rich design specification

### Expected Results

- Button appears only in edit mode on Write tab
- Processing replaces plain links with formatted design specs including:
  - Design preview image
  - Version information
  - Expandable details section
  - Clean Figma link

### Phase 3: Edge Cases

1. **No Token**: Try using extension without setting up token - should show setup prompt
2. **Preview Tab**: Switch to "Preview" tab - button should disappear
3. **Cancel Edit**: Click "Cancel" while editing - button should disappear
4. **Invalid Link**: Try processing invalid Figma URLs - should show error message

## Notes for Reviewers

- Extension only works on GitHub PR/compare pages
- Requires user to explicitly click the process button
- No automatic processing - respects user control
- All generated content stays within GitHub's interface
- No external popups or redirects during normal operation

## Troubleshooting

If extension doesn't work:

1. Check browser console for errors
2. Verify Figma token has correct permissions
3. Ensure you're on github.com (not GitHub Enterprise)
4. Try refreshing the page and re-editing PR description

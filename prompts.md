# AI Prompts for Contributors

This file contains useful prompts for AI assistants to help contributors understand and work with the Figma PR Extension codebase.

## Understanding the Extension

**How does the extension work?**
Explain how the Figma PR Extension detects GitHub PR pages and processes Figma links in descriptions. What are the main components and how do they interact?

**What is the build system architecture?**
Describe how the build.js script generates both Chrome and Firefox extensions from shared source code. How does it handle browser API differences?

**How does the edit mode detection work?**
Explain the logic for detecting when users are editing PR descriptions and when to show/hide the process button. What DOM elements does it monitor?

## Customization and Development

**How can I modify the design spec template?**
Show me how to customize the markdown template generated for Figma design specs in the utils.js file. What variables are available?

**How do I add new icon sizes or update the extension icons?**
Explain the icon system and how to generate new icon files with proper sizes and formats for both Chrome and Firefox.

**What's the difference between Chrome and Firefox implementations?**
Detail the browser-specific differences in manifest files, API calls, and debugging approaches used in this extension.

## Security and Best Practices

**What security considerations should I be aware of?**
Identify potential security risks in the extension code, especially around API token storage and external URL processing. What are the mitigation strategies?

**How should I safely test changes to the extension?**
Outline the recommended testing approach for extension development, including how to test on different GitHub PR pages without exposing real API tokens.

**What are the content security policy implications?**
Explain how CSP affects the extension's ability to inject content into GitHub pages and load external resources like Figma images.

## Troubleshooting and Debugging

**Why isn't the process button appearing on some PR pages?**
Help me debug issues with button visibility by examining the DOM selectors and edit mode detection logic.

**How do I troubleshoot Figma API integration issues?**
Guide me through debugging token validation, API rate limits, and image URL generation problems with the Figma API.

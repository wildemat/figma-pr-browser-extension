#!/usr/bin/env node

import { execSync } from "child_process";

console.log("📦 Creating Chrome zip file...");
try {
  process.chdir("build/chrome");
  execSync("zip -r ../releases/figma-pr-extension-chrome.zip .", {
    stdio: "inherit",
  });
  process.chdir("../..");
  console.log("  ✅ Created build/releases/figma-pr-extension-chrome.zip");
} catch (error) {
  console.error("  ❌ Failed to create zip for Chrome:", error.message);
  process.chdir("../..");
  process.exit(1);
}

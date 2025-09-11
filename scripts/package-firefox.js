#!/usr/bin/env node

import { execSync } from "child_process";

console.log("📦 Creating Firefox zip file...");
try {
  process.chdir("build/firefox");
  execSync("zip -r ../releases/figma-pr-extension-firefox.zip .", {
    stdio: "inherit",
  });
  process.chdir("../..");
  console.log("  ✅ Created build/releases/figma-pr-extension-firefox.zip");
} catch (error) {
  console.error("  ❌ Failed to create zip for Firefox:", error.message);
  process.chdir("../..");
  process.exit(1);
}

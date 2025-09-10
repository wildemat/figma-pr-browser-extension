#!/usr/bin/env node

/**
 * Automatic version bumping script
 * Increments patch version in package.json and both manifest files
 */

const fs = require("fs");
const path = require("path");

function updateJsonFile(filePath, updateVersion) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(content);

    if (json.version) {
      json.version = updateVersion(json.version);
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n");
      console.log(`✅ Updated ${filePath} to v${json.version}`);
      return json.version;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
  return null;
}

function bumpPatchVersion(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const rootDir = path.resolve(__dirname, "..");

  // Files to update
  const files = [
    path.join(rootDir, "package.json"),
    path.join(rootDir, "src/chrome/manifest.json"),
    path.join(rootDir, "src/firefox/manifest.json"),
  ];

  console.log("🔄 Bumping patch version...\n");

  // Read current version from package.json
  const packageJsonPath = files[0];
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const currentVersion = packageJson.version;
  const newVersion = bumpPatchVersion(currentVersion);

  console.log(`📦 Current version: ${currentVersion}`);
  console.log(`🚀 New version: ${newVersion}\n`);

  // Update all files
  files.forEach((file) => {
    updateJsonFile(file, () => newVersion);
  });

  console.log("\n✨ Version bump complete!");
  return newVersion;
}

if (require.main === module) {
  main();
}

module.exports = { main, bumpPatchVersion };

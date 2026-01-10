#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFile = path.join(__dirname, '..', 'version.json');
const envFile = path.join(__dirname, '..', '.env');

// 读取版本信息
function readVersion() {
  try {
    const content = fs.readFileSync(versionFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read version file:', error.message);
    return null;
  }
}

// 获取 Git 信息
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return { commitHash, branch };
  } catch (error) {
    return { commitHash: 'unknown', branch: 'unknown' };
  }
}

// 更新版本信息（构建时）
function updateBuildInfo() {
  const versionInfo = readVersion();
  if (!versionInfo) {
    console.error('No version info found');
    return;
  }

  const { commitHash, branch } = getGitInfo();
  const now = new Date().toISOString();

  const updatedInfo = {
    ...versionInfo,
    buildDate: now,
    gitCommit: commitHash,
    gitBranch: branch
  };

  fs.writeFileSync(versionFile, JSON.stringify(updatedInfo, null, 2) + '\n', 'utf8');

  console.log(`📦 Build Info Updated:`);
  console.log(`   Version: ${updatedInfo.version}`);
  console.log(`   Commit: ${commitHash}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Build: ${now}`);
}

// 更新 package.json 版本
function updatePackageVersion() {
  const versionInfo = readVersion();
  if (!versionInfo) return;

  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.version !== versionInfo.version) {
    packageJson.version = versionInfo.version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log(`✓ package.json updated to ${versionInfo.version}`);
  }
}

// 生成版本常量文件
function generateVersionFile() {
  const versionInfo = readVersion();
  if (!versionInfo) return;

  const versionContent = `// This file is auto-generated. Do not edit manually.
export const VERSION = {
  version: '${versionInfo.version}',
  buildDate: '${versionInfo.buildDate}',
  gitCommit: '${versionInfo.gitCommit}',
  gitBranch: '${versionInfo.gitBranch}'
} as const;

export type VersionInfo = typeof VERSION;
`;

  const versionFilePath = path.join(__dirname, '..', 'web', 'src', 'lib', 'version.ts');
  const versionDir = path.dirname(versionFilePath);

  // 确保目录存在
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  fs.writeFileSync(versionFilePath, versionContent, 'utf8');
  console.log(`✓ Version constants generated: version.ts`);
}

// 主函数
function main() {
  console.log('\n🔧 Updating build info...\n');
  updateBuildInfo();
  updatePackageVersion();
  generateVersionFile();
  console.log('\n✅ Build info updated!\n');
}

main();

module.exports = { updateBuildInfo, generateVersionFile };

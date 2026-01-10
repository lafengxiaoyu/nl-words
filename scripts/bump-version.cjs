#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const versionFile = path.join(__dirname, '..', 'version.json');

// 读取当前版本信息
function readVersion() {
  try {
    const content = fs.readFileSync(versionFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read version file:', error.message);
    process.exit(1);
  }
}

// 写入版本信息
function writeVersion(versionInfo) {
  try {
    fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2) + '\n', 'utf8');
    console.log('✓ Version updated:', versionInfo.version);
  } catch (error) {
    console.error('Failed to write version file:', error.message);
    process.exit(1);
  }
}

// 获取 Git 信息
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return { commitHash, branch };
  } catch (error) {
    console.warn('Warning: Could not get git information:', error.message);
    return { commitHash: 'unknown', branch: 'unknown' };
  }
}

// 获取最后一次 commit message
function getLastCommitMessage() {
  try {
    const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    return message;
  } catch (error) {
    console.warn('Warning: Could not get last commit message:', error.message);
    return '';
  }
}

// 根据 commit message 判断版本类型
function determineVersionType(commitMessage) {
  const lowerMessage = commitMessage.toLowerCase();

  // 明确指定 major
  if (lowerMessage.includes('major')) {
    return 'major';
  }

  // feature 或 feat - 次要版本
  if (lowerMessage.includes('feature') || lowerMessage.includes('feat')) {
    return 'minor';
  }

  // patch 或 fix 或其他情况 - 补丁版本
  return 'patch';
}

// 版本号递增
function bumpVersion(type = 'patch') {
  const versionInfo = readVersion();
  const currentVersion = versionInfo.version;

  // 解析版本号 (major.minor.patch)
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  return newVersion;
}

// 创建 Git 标签
function createGitTag(version) {
  try {
    execSync(`git tag -a v${version} -m "Release version ${version}"`, { encoding: 'utf8' });
    console.log(`✓ Git tag created: v${version}`);
    console.log(`  To push the tag, run: git push origin v${version}`);
  } catch (error) {
    console.warn('Warning: Could not create git tag:', error.message);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  let type = args[0]; // 可选：显式指定版本类型

  console.log(`\n📦 Version Management Tool\n`);

  // 如果没有显式指定类型，根据 commit message 自动判断
  let autoDetected = false;
  if (!type) {
    const commitMessage = getLastCommitMessage();
    console.log(`📝 Last commit message:`);
    console.log(`   "${commitMessage.substring(0, 100)}${commitMessage.length > 100 ? '...' : ''}"\n`);

    type = determineVersionType(commitMessage);
    autoDetected = true;
  } else if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Invalid type. Use: major, minor, or patch');
    console.error('Or leave it empty to auto-detect from commit message');
    process.exit(1);
  }

  // 读取当前版本
  const versionInfo = readVersion();
  console.log('Current version:', versionInfo.version);

  if (autoDetected) {
    console.log(`Auto-detected type: ${type.toUpperCase()}`);
  } else {
    console.log(`Type: ${type.toUpperCase()}`);
  }

  // 递增版本
  const newVersion = bumpVersion(type);
  console.log('New version:', newVersion);

  // 更新版本文件
  const { commitHash, branch } = getGitInfo();
  const now = new Date().toISOString();

  const newVersionInfo = {
    version: newVersion,
    buildDate: now,
    gitCommit: commitHash,
    gitBranch: branch
  };

  writeVersion(newVersionInfo);

  // 创建 Git 标签
  createGitTag(newVersion);

  console.log('\n✅ Version bump completed!');
  console.log(`   Version: ${newVersion}`);
  console.log(`   Commit: ${commitHash}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Build: ${now}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   git add version.json`);
  console.log(`   git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`   git push origin main`);
  console.log(`   git push origin v${newVersion}\n`);
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  bumpVersion,
  readVersion,
  writeVersion,
  getGitInfo,
  determineVersionType,
  getLastCommitMessage
};

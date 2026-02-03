#!/usr/bin/env node

/**
 * GitHub Pages 部署脚本
 * 使用方法: node scripts/deploy-to-pages.cjs [version-type]
 * version-type: major, minor, patch (可选，不指定则根据 commit message 自动判断)
 *
 * 版本类型自动判断规则:
 * - commit message 包含 "major" → major version
 * - commit message 包含 "feature" 或 "feat" → minor version
 * - commit message 包含 "patch" 或 "fix" 或其他 → patch version (默认)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'version.json');

// 获取当前版本
function getVersion() {
  try {
    const content = fs.readFileSync(versionFile, 'utf8');
    return JSON.parse(content).version;
  } catch {
    return 'unknown';
  }
}

// 执行命令
function runCommand(cmd, showOutput = false) {
  try {
    const output = execSync(cmd, { encoding: 'utf8' });
    if (showOutput) console.log(output);
    return output;
  } catch (error) {
    console.error(`Error running: ${cmd}`);
    console.error(error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const versionType = args[0]; // 可选：显式指定版本类型

  console.log('🚀 GitHub Pages Deployment Script (using GitHub Actions)\n');

  // 1. 验证词汇数据
  console.log('🔍 Step 1: Validating vocabulary data...');
  try {
    runCommand('npm run validate:words', true);
    console.log('✅ Vocabulary validation passed\n');
  } catch (error) {
    console.error('❌ Vocabulary validation failed');
    console.error('Please fix the validation errors before deploying.');
    process.exit(1);
  }

  // 2. 同步词汇数据
  console.log('🔄 Step 2: Syncing vocabulary data...');
  try {
    runCommand('node scripts/vocabulary-pipeline.cjs', true);
    console.log('✅ Vocabulary data synced\n');
  } catch (error) {
    console.error('❌ Vocabulary data sync failed');
    process.exit(1);
  }

  // 3. 递增版本（根据 commit message 自动判断，或显式指定）
  console.log('📦 Step 3: Bumping version...');
  const bumpArgs = versionType ? versionType : '';
  runCommand(`node scripts/bump-version.cjs ${bumpArgs}`, true);

  const newVersion = getVersion();
  console.log(`\n✅ Version bumped to: ${newVersion}\n`);

  // 4. 提交所有变更（包括验证、同步、版本更新）
  console.log('📝 Step 4: Committing all changes...');
  try {
    runCommand('git add .', false);
    runCommand(`git commit -m "chore: bump version to ${newVersion}"`, false);
    runCommand('git push origin main', false);
    console.log('✅ Changes committed and pushed to main\n');
  } catch (error) {
    console.warn('Warning: Could not commit changes. You may need to do it manually.\n');
    return;
  }

  // 3. 推送 Git 标签（触发 GitHub Actions 部署）
  console.log('🏷️  Step 3: Pushing Git tag to trigger deployment...');
  try {
    runCommand(`git push origin v${newVersion}`, false);
    console.log(`✅ Tag v${newVersion} pushed\n`);
    console.log('🔄 GitHub Actions deployment has been triggered!');
    console.log(`   View deployment status at:`);
    console.log(`   https://github.com/<username>/nl-words/actions\n`);
  } catch (error) {
    console.error('❌ Failed to push tag:', error.message);
    process.exit(1);
  }

  console.log('🎉 Deployment process initiated!');
  console.log(`\n📋 Summary:`);
  console.log(`   Version: ${newVersion}`);
  console.log(`   Status: Deploying via GitHub Actions`);
  console.log(`   Wait time: ~2-5 minutes for deployment to complete\n`);
}

main();

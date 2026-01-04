#!/usr/bin/env node

/**
 * 修复单词数据
 * 1. 删除重复的单词
 * 2. 修复数据格式问题
 */

const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 检查单词是否重复
function findDuplicates(words) {
  const wordMap = new Map();
  const duplicates = [];

  words.forEach((word, index) => {
    if (wordMap.has(word.word)) {
      duplicates.push({
        word: word.word,
        firstIndex: wordMap.get(word.word),
        duplicateIndex: index,
        firstId: words[wordMap.get(word.word)].id,
        duplicateId: word.id
      });
    } else {
      wordMap.set(word.word, index);
    }
  });

  return duplicates;
}

// 修复单词数据
function fixWords(words) {
  log('\n========== 修复单词数据 ==========\n', 'blue');

  const duplicates = findDuplicates(words);

  if (duplicates.length > 0) {
    warning(`发现 ${duplicates.length} 个重复的单词：\n`);
    duplicates.forEach((dup, i) => {
      warning(`  ${i + 1}. "${dup.word}" (ID: ${dup.firstId} ↔ ${dup.duplicateId}, 位置: #${dup.firstIndex + 1} ↔ #${dup.duplicateIndex + 1})`);
    });

    // 删除重复的单词（保留第一个，删除后面的）
    const indicesToRemove = new Set(duplicates.map(d => d.duplicateIndex));
    const filteredWords = words.filter((_, index) => !indicesToRemove.has(index));

    success(`\n删除了 ${indicesToRemove.size} 个重复的单词`);
    success(`剩余 ${filteredWords.length} 个单词\n`);

    return filteredWords;
  } else {
    success(`未发现重复的单词\n`);
    return words;
  }
}

// 主函数
function main() {
  const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');

  try {
    const wordsContent = fs.readFileSync(wordsFilePath, 'utf8');
    let words = JSON.parse(wordsContent);

    if (!Array.isArray(words)) {
      error('words.json 必须是一个数组');
      process.exit(1);
    }

    log(`原始单词数量: ${words.length}\n`, 'blue');

    // 备份原始文件
    const backupPath = path.join(__dirname, '../web/src/data/words.json.backup');
    fs.writeFileSync(backupPath, wordsContent, 'utf8');
    success(`已创建备份: ${backupPath}\n`);

    // 修复数据
    const fixedWords = fixWords(words);

    // 保存修复后的数据
    fs.writeFileSync(wordsFilePath, JSON.stringify(fixedWords, null, 2), 'utf8');

    success('✅ 单词数据修复完成！\n');
    info('运行验证脚本检查修复结果: npm run validate:words\n');

  } catch (err) {
    const error = err;
    if (error.code === 'ENOENT') {
      console.error(`找不到文件: ${wordsFilePath}`);
      process.exit(1);
    } else if (error instanceof SyntaxError) {
      console.error('words.json JSON 格式错误:');
      console.error(error.message);
      process.exit(1);
    } else {
      console.error('修复过程中出错:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// 运行脚本
main();

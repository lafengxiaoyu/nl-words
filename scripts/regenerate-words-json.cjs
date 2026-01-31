#!/usr/bin/env node

/**
 * 从 lesson 文件重新生成 words.json
 * 确保所有单词都有完整的 forms 字段
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

function main() {
  log('\n========== 重新生成 words.json ==========\n', 'blue');

  const vocabDir = path.join(__dirname, '../web/src/data/vocabulary');
  const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');
  const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

  const allWords = [];
  const idMap = new Map();
  const wordMap = new Map();
  let duplicates = [];

  // 遍历所有级别
  levels.forEach(level => {
    const levelDir = path.join(vocabDir, level);
    if (!fs.existsSync(levelDir)) return;

    const files = fs.readdirSync(levelDir)
      .filter(f => f.endsWith('.json') && f.startsWith('lesson-'))
      .sort();

    files.forEach(file => {
      const filePath = path.join(levelDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (!data.words || !Array.isArray(data.words)) return;

      data.words.forEach(word => {
        // 检查重复 ID
        if (idMap.has(word.id)) {
          duplicates.push({
            type: 'id',
            value: word.id,
            word: word.word,
            firstFile: idMap.get(word.id),
            duplicateFile: `${level}/${file}`
          });
        } else {
          idMap.set(word.id, `${level}/${file}`);
        }

        // 检查重复单词
        if (wordMap.has(word.word)) {
          duplicates.push({
            type: 'word',
            value: word.word,
            id: word.id,
            firstFile: wordMap.get(word.word),
            duplicateFile: `${level}/${file}`
          });
        } else {
          wordMap.set(word.word, `${level}/${file}`);
        }

        allWords.push(word);
      });

      info(`读取 ${level}/${file}: ${data.words.length} 个单词`);
    });
  });

  log(`\n总计读取: ${allWords.length} 个单词\n`, 'blue');

  // 报告重复
  if (duplicates.length > 0) {
    warning(`发现 ${duplicates.length} 个重复:`);
    duplicates.slice(0, 10).forEach(dup => {
      if (dup.type === 'id') {
        warning(`  重复 ID: ${dup.value} (单词: ${dup.word})`);
        warning(`    ${dup.firstFile} ↔ ${dup.duplicateFile}`);
      } else {
        warning(`  重复单词: "${dup.value}" (ID: ${dup.id})`);
        warning(`    ${dup.firstFile} ↔ ${dup.duplicateFile}`);
      }
    });
    if (duplicates.length > 10) {
      warning(`  ... 还有 ${duplicates.length - 10} 个重复`);
    }
  }

  // 按 ID 排序
  allWords.sort((a, b) => a.id - b.id);

  // 备份原文件
  if (fs.existsSync(wordsFilePath)) {
    const backupPath = wordsFilePath + '.backup.' + Date.now();
    fs.copyFileSync(wordsFilePath, backupPath);
    success(`已备份原文件: ${backupPath}`);
  }

  // 写入新文件
  fs.writeFileSync(wordsFilePath, JSON.stringify(allWords, null, 2), 'utf8');
  success(`已生成新的 words.json: ${allWords.length} 个单词`);

  // 验证统计
  let nounCount = 0;
  let verbCount = 0;
  let adjCount = 0;
  let missingForms = 0;

  allWords.forEach(word => {
    if (word.partOfSpeech === 'noun') nounCount++;
    else if (word.partOfSpeech === 'verb') verbCount++;
    else if (word.partOfSpeech === 'adjective') adjCount++;

    if ((word.partOfSpeech === 'noun' || word.partOfSpeech === 'verb' || word.partOfSpeech === 'adjective') && !word.forms) {
      missingForms++;
    }
  });

  log('\n========== 统计信息 ==========\n', 'blue');
  info(`名词: ${nounCount}`);
  info(`动词: ${verbCount}`);
  info(`形容词: ${adjCount}`);
  info(`缺少 forms: ${missingForms}`);

  if (missingForms === 0) {
    success('\n🎉 所有名词、动词、形容词都有完整的 forms 字段！');
  }

  log('\n请运行验证脚本确认: npm run validate:words\n', 'blue');
}

main();

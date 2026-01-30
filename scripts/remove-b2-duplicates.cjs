const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '../web/src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// 按级别分组
const levels = ['A1', 'A2', 'B1', 'B2'];
const levelGroups = {};
levels.forEach(level => {
  levelGroups[level] = words.filter(w => w.difficulty === level);
});

// 创建前面级别的单词集合
const lowerLevels = new Set();
['A1', 'A2', 'B1'].forEach(level => {
  levelGroups[level].forEach(w => lowerLevels.add(w.word));
});

console.log('=== B2中需要删除的重复单词 ===\n');
console.log(`前面级别(A1+A2+B1)单词总数: ${lowerLevels.size}`);

// 找出B2中与前面级别重复的单词
const b2Words = levelGroups['B2'];
const toRemove = [];
const toKeep = [];

b2Words.forEach(word => {
  if (lowerLevels.has(word.word)) {
    toRemove.push(word);
  } else {
    toKeep.push(word);
  }
});

console.log(`B2原始单词数: ${b2Words.length}`);
console.log(`需要删除的重复单词: ${toRemove.length}`);
console.log(`保留的单词: ${toKeep.length}\n`);

console.log('需要删除的单词示例(前30个):');
toRemove.slice(0, 30).forEach(w => {
  console.log(`  ${w.word} (ID:${w.id})`);
});
if (toRemove.length > 30) {
  console.log(`  ... (共 ${toRemove.length} 个)`);
}

// 生成新的单词列表
const newWords = [];
levels.forEach(level => {
  if (level === 'B2') {
    toKeep.forEach(w => newWords.push(w));
  } else {
    levelGroups[level].forEach(w => newWords.push(w));
  }
});

// 备份原文件
const backupPath = path.join(__dirname, '../web/src/data/words.json.backup');
fs.copyFileSync(wordsPath, backupPath);
console.log(`\n已备份原文件到: ${backupPath}`);

// 写入新文件
fs.writeFileSync(wordsPath, JSON.stringify(newWords, null, 2), 'utf-8');

console.log(`\n已更新 words.json`);
console.log(`  删除前: ${words.length} 个单词`);
console.log(`  删除后: ${newWords.length} 个单词`);
console.log(`  删除了: ${toRemove.length} 个重复单词`);

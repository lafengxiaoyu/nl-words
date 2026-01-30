const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '../web/src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

console.log('=== 重复单词分析 ===\n');

// 按级别分组
const levelGroups = {};
['A1', 'A2', 'B1', 'B2'].forEach(level => {
  levelGroups[level] = words.filter(w => w.difficulty === level);
});

// 检查跨级别重复
console.log('跨级别重复:');
const wordMap = new Map();
words.forEach(word => {
  if (!wordMap.has(word.word)) {
    wordMap.set(word.word, []);
  }
  wordMap.get(word.word).push({ id: word.id, level: word.difficulty });
});

let crossLevelCount = 0;
const crossLevelDuplicates = [];
wordMap.forEach((entries, word) => {
  if (entries.length > 1) {
    const levels = [...new Set(entries.map(e => e.level))];
    if (levels.length > 1) {
      crossLevelCount++;
      crossLevelDuplicates.push({ word, entries });
    }
  }
});

console.log(`  共 ${crossLevelCount} 个单词在多个级别中出现\n`);

// 显示前30个跨级别重复
console.log('跨级别重复单词 (前30个):');
crossLevelDuplicates.slice(0, 30).forEach(({ word, entries }) => {
  const sorted = entries.sort((a, b) => a.level.localeCompare(b.level));
  const levels = sorted.map(e => `${e.level}(ID${e.id})`).join(', ');
  console.log(`  ${word}: ${levels}`);
});
console.log('...\n');

// 检查B1内部重复
console.log('B1级别内部重复:');
const b1Words = levelGroups['B1'];
const b1Map = new Map();
b1Words.forEach(word => {
  if (!b1Map.has(word.word)) {
    b1Map.set(word.word, []);
  }
  b1Map.get(word.word).push({ id: word.id });
});

let b1InternalCount = 0;
const b1InternalDuplicates = [];
b1Map.forEach((entries, word) => {
  if (entries.length > 1) {
    b1InternalCount++;
    b1InternalDuplicates.push({ word, entries });
  }
});

console.log(`  共 ${b1InternalCount} 个单词在B1内部重复\n`);

if (b1InternalDuplicates.length > 0) {
  console.log('B1内部重复单词 (前20个):');
  b1InternalDuplicates.slice(0, 20).forEach(({ word, entries }) => {
    const ids = entries.map(e => `ID${e.id}`).join(', ');
    console.log(`  ${word}: ${ids}`);
  });
  if (b1InternalDuplicates.length > 20) {
    console.log(`  ... (共 ${b1InternalDuplicates.length} 个)`);
  }
}

console.log('\n=== 总结 ===');
console.log(`总单词数: ${words.length}`);
console.log(`唯一单词数: ${new Set(words.map(w => w.word)).size}`);
console.log(`跨级别重复: ${crossLevelCount} 个`);
console.log(`B1内部重复: ${b1InternalCount} 个`);
console.log(`总重复条目: ${words.length - new Set(words.map(w => w.word)).size} 个`);

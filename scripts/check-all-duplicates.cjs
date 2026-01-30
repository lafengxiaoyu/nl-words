const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '../web/src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

const levels = ['A1', 'A2', 'B1', 'B2'];
const results = {};

// 检查同级别内部重复
levels.forEach(level => {
  const levelWords = words.filter(w => w.difficulty === level);
  const wordMap = new Map();
  levelWords.forEach(word => {
    if (!wordMap.has(word.word)) {
      wordMap.set(word.word, []);
    }
    wordMap.get(word.word).push({ id: word.id });
  });

  const duplicates = [];
  wordMap.forEach((entries, word) => {
    if (entries.length > 1) {
      duplicates.push({ word, entries });
    }
  });

  results[level] = {
    count: levelWords.length,
    duplicates: duplicates.length,
    items: duplicates.slice(0, 10)
  };
});

console.log('=== 同级别内部重复 ===\n');
Object.entries(results).forEach(([level, data]) => {
  console.log(`${level}级别:`);
  console.log(`  总单词数: ${data.count}`);
  console.log(`  内部重复: ${data.duplicates} 个`);
  if (data.duplicates > 0) {
    console.log(`  前10个重复单词:`);
    data.items.forEach(({ word, entries }) => {
      const ids = entries.map(e => `ID${e.id}`).join(', ');
      console.log(`    ${word}: ${ids}`);
    });
    if (data.duplicates > 10) {
      console.log(`    ... (共 ${data.duplicates} 个)`);
    }
  }
  console.log('');
});

// 检查跨级别重复
const wordMap = new Map();
words.forEach(word => {
  if (!wordMap.has(word.word)) {
    wordMap.set(word.word, []);
  }
  wordMap.get(word.word).push({ id: word.id, level: word.difficulty });
});

const crossLevel = [];
wordMap.forEach((entries, word) => {
  if (entries.length > 1) {
    const levels = [...new Set(entries.map(e => e.level))];
    if (levels.length > 1) {
      crossLevel.push({ word, entries });
    }
  }
});

console.log('=== 跨级别重复 ===');
console.log(`共 ${crossLevel.length} 个单词在多个级别中出现\n`);

const levelCombinations = {};
crossLevel.forEach(({ word, entries }) => {
  const levels = [...new Set(entries.map(e => e.level))].sort().join('+');
  if (!levelCombinations[levels]) levelCombinations[levels] = [];
  levelCombinations[levels].push(word);
});

console.log('跨级别组合统计:');
Object.entries(levelCombinations).forEach(([combo, words]) => {
  console.log(`  ${combo}: ${words.length} 个`);
});

console.log('\n前20个跨级别重复:');
crossLevel.slice(0, 20).forEach(({ word, entries }) => {
  const sorted = entries.sort((a, b) => a.level.localeCompare(b.level));
  const levels = sorted.map(e => `${e.level}(ID${e.id})`).join(', ');
  console.log(`  ${word}: ${levels}`);
});

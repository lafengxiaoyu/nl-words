const w = require('./words.json');

const wordMap = new Map();
w.forEach(word => {
  if (!wordMap.has(word.word)) {
    wordMap.set(word.word, []);
  }
  wordMap.get(word.word).push(word);
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

console.log('=== 跨级别重复单词 ===');
console.log('总数:', crossLevel.length);
console.log('');
console.log('示例 (前30个):');
crossLevel.slice(0, 30).forEach(d => {
  const sorted = d.entries.sort((a, b) => a.level.localeCompare(b.level));
  const levels = sorted.map(e => `${e.level}(ID${e.id})`).join(', ');
  console.log('  ' + d.word + ': ' + levels);
});
if (crossLevel.length > 30) {
  console.log('  ... (共 ' + crossLevel.length + ' 个)');
}

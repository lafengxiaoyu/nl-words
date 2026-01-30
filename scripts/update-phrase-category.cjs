const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '../web/src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// 定义所有短语相关的partOfSpeech类型
const phraseTypes = [
  'phrase',
  'phrasal verb',
  'adverbial phrase',
  'noun phrase',
  'adverb phrase',
  'adjective phrase',
  'prepositional phrase'
];

console.log('=== 需要修改为短语类的单词 ===\n');

const toUpdate = [];
const phraseStats = {};

phraseTypes.forEach(type => {
  const items = words.filter(w => w.partOfSpeech === type);
  phraseStats[type] = items.length;
  items.forEach(w => {
    if (w.category !== '短语类') {
      toUpdate.push(w);
    }
  });
});

console.log('按类型统计:');
Object.entries(phraseStats).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}个`);
});

console.log(`\n需要修改的单词总数: ${toUpdate.length}`);

// 备份原文件
const backupPath = path.join(__dirname, '../web/src/data/words.json.backup2');
fs.copyFileSync(wordsPath, backupPath);
console.log(`\n已备份原文件到: ${backupPath}`);

// 更新category为"短语类"
let updatedCount = 0;
words.forEach(w => {
  if (phraseTypes.includes(w.partOfSpeech) && w.category !== '短语类') {
    w.category = '短语类';
    updatedCount++;
  }
});

// 写入文件
fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2), 'utf-8');

console.log(`\n✅ 已更新 words.json`);
console.log(`   修改了 ${updatedCount} 个单词的category为"短语类"`);
console.log('\n验证:');
phraseTypes.forEach(type => {
  const items = words.filter(w => w.partOfSpeech === type);
  const correctCount = items.filter(w => w.category === '短语类').length;
  console.log(`  ${type}: ${correctCount}/${items.length} 已标记为短语类`);
});

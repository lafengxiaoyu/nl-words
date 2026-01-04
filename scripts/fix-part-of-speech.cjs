const fs = require('fs');
const path = require('path');

// 读取数据文件
const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsFilePath, 'utf-8'));

console.log('=== 词性统一修改 ===\n');

let possessiveCount = 0;
let articleCount = 0;
let numberCount = 0;

words.forEach(word => {
  // possessive → pronoun（物主代词属于代词的一种）
  if (word.partOfSpeech === 'possessive') {
    word.partOfSpeech = 'pronoun';
    possessiveCount++;
    console.log(`修改: ${word.word} (ID: ${word.id}) - possessive → pronoun`);
  }
  // article → determiner（冠词属于限定词）
  else if (word.partOfSpeech === 'article') {
    word.partOfSpeech = 'determiner';
    articleCount++;
    console.log(`修改: ${word.word} (ID: ${word.id}) - article → determiner`);
  }
  // number → numeral（统一为numeral）
  else if (word.partOfSpeech === 'number') {
    word.partOfSpeech = 'numeral';
    numberCount++;
    console.log(`修改: ${word.word} (ID: ${word.id}) - number → numeral`);
  }
});

// 保存修改后的数据
fs.writeFileSync(wordsFilePath, JSON.stringify(words, null, 2) + '\n', 'utf-8');

console.log('\n=== 修改完成 ===');
console.log(`possessive → pronoun: ${possessiveCount} 个`);
console.log(`article → determiner: ${articleCount} 个`);
console.log(`number → numeral: ${numberCount} 个`);
console.log(`总计修改: ${possessiveCount + articleCount + numberCount} 个`);

// 统计修改后的词性
const posMap = {};
words.forEach(w => {
  posMap[w.partOfSpeech] = (posMap[w.partOfSpeech] || 0) + 1;
});

console.log('\n=== 修改后的词性统计 ===');
Object.entries(posMap)
  .sort((a, b) => b[1] - a[1])
  .forEach(([pos, count]) => {
    console.log(`  ${pos}: ${count}`);
  });

console.log('\n文件已保存:', wordsFilePath);

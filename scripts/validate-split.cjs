const fs = require('fs');
const path = require('path');

const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');
const vocabDir = path.join(__dirname, '../web/src/data/vocabulary');

console.log('\n========== 验证拆分数据 ==========\n');

// 加载原始数据
const originalWords = JSON.parse(fs.readFileSync(wordsFilePath, 'utf-8'));
console.log(`原始单词数: ${originalWords.length}`);

// 加载索引
const indexPath = path.join(vocabDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
console.log(`索引总单词数: ${index.totalWords}`);

// 验证1：检查总单词数
if (originalWords.length !== index.totalWords) {
  console.error('❌ 单词总数不匹配！');
  process.exit(1);
}
console.log('✅ 单词总数匹配');

// 验证2：加载所有lesson并验证单词
const allSplitWords = [];
const allIds = new Set();

for (const level of index.levels) {
  const levelPath = path.join(vocabDir, level.level.toLowerCase());

  for (const lesson of level.lessons) {
    const lessonPath = path.join(levelPath, lesson.file.split('/')[1]);
    const lessonData = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));

    // 验证lesson的基本信息
    if (lessonData.id !== lesson.id) {
      console.error(`❌ Lesson ID不匹配: ${lessonData.id} vs ${lesson.id}`);
      process.exit(1);
    }

    if (lessonData.words.length !== lesson.totalWords) {
      console.error(`❌ Lesson单词数不匹配: ${lessonData.words.length} vs ${lesson.totalWords}`);
      process.exit(1);
    }

    // 检查单词ID是否在lesson.wordIds中
    lessonData.words.forEach(word => {
      if (!lesson.wordIds.includes(word.id)) {
        console.error(`❌ 单词ID ${word.id} 不在lesson.wordIds中`);
        process.exit(1);
      }

      // 检查ID重复
      if (allIds.has(word.id)) {
        console.error(`❌ 单词ID ${word.id} 重复！`);
        process.exit(1);
      }
      allIds.add(word.id);

      allSplitWords.push(word);
    });
  }
}

console.log(`✅ 加载的单词总数: ${allSplitWords.length}`);

// 验证3：检查单词完整性
if (allSplitWords.length !== originalWords.length) {
  console.error(`❌ 单词数量不匹配: ${allSplitWords.length} vs ${originalWords.length}`);
  process.exit(1);
}
console.log('✅ 单词数量匹配');

// 验证4：检查每个单词的ID
const originalIds = new Set(originalWords.map(w => w.id));
const splitIds = new Set(allSplitWords.map(w => w.id));

if (originalIds.size !== splitIds.size) {
  console.error(`❌ ID数量不匹配: ${originalIds.size} vs ${splitIds.size}`);
  process.exit(1);
}

const missingIds = [...originalIds].filter(id => !splitIds.has(id));
if (missingIds.length > 0) {
  console.error(`❌ 缺失的ID: ${missingIds.join(', ')}`);
  process.exit(1);
}

const extraIds = [...splitIds].filter(id => !originalIds.has(id));
if (extraIds.length > 0) {
  console.error(`❌ 多余的ID: ${extraIds.join(', ')}`);
  process.exit(1);
}
console.log('✅ 所有ID匹配且唯一');

// 验证5：检查每个单词的内容
const originalMap = new Map(originalWords.map(w => [w.id, w]));
const splitMap = new Map(allSplitWords.map(w => [w.id, w]));

let contentErrors = 0;
for (const [id, originalWord] of originalMap) {
  const splitWord = splitMap.get(id);

  if (!splitWord) {
    console.error(`❌ 单词ID ${id} 在拆分数据中缺失`);
    contentErrors++;
    continue;
  }

  // 检查关键字段
  if (originalWord.id !== splitWord.id ||
      originalWord.word !== splitWord.word ||
      originalWord.partOfSpeech !== splitWord.partOfSpeech ||
      originalWord.difficulty !== splitWord.difficulty) {
    console.error(`❌ 单词ID ${id} 的基本信息不匹配`);
    contentErrors++;
  }

  // 检查翻译
  if (JSON.stringify(originalWord.translation) !== JSON.stringify(splitWord.translation)) {
    console.error(`❌ 单词ID ${id} 的翻译不匹配`);
    contentErrors++;
  }

  // 检查forms字段
  if (JSON.stringify(originalWord.forms) !== JSON.stringify(splitWord.forms)) {
    console.error(`❌ 单词ID ${id} 的forms不匹配`);
    contentErrors++;
  }

  // 检查例句
  if (JSON.stringify(originalWord.examples) !== JSON.stringify(splitWord.examples)) {
    console.error(`❌ 单词ID ${id} 的examples不匹配`);
    contentErrors++;
  }
}

if (contentErrors === 0) {
  console.log('✅ 所有单词内容匹配');
} else {
  console.error(`❌ 发现 ${contentErrors} 个内容错误`);
  process.exit(1);
}

// 验证6：检查lookup.json
const lookupPath = path.join(vocabDir, 'lookup.json');
const lookup = JSON.parse(fs.readFileSync(lookupPath, 'utf-8'));

if (Object.keys(lookup).length !== originalWords.length) {
  console.error(`❌ lookup.json中的单词数不匹配`);
  process.exit(1);
}
console.log('✅ lookup.json 包含所有单词');

// 验证7：检查stats.json
const statsPath = path.join(vocabDir, 'stats.json');
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

if (stats.totalWords !== originalWords.length) {
  console.error(`❌ stats.json中的总单词数不匹配`);
  process.exit(1);
}
console.log('✅ stats.json 总数匹配');

// 验证8：检查难度级别分布
const difficultyCount = {};
originalWords.forEach(w => {
  difficultyCount[w.difficulty] = (difficultyCount[w.difficulty] || 0) + 1;
});

for (const [level, count] of Object.entries(difficultyCount)) {
  if (stats.byDifficulty[level] !== count) {
    console.error(`❌ 难度级别 ${level} 的数量不匹配`);
    process.exit(1);
  }
}
console.log('✅ 难度级别分布匹配');

console.log('\n========== 验证完成 ==========\n');
console.log('✅ 所有验证通过！');
console.log(`\n总结:`);
console.log(`  - 原始单词: ${originalWords.length}`);
console.log(`  - 拆分单词: ${allSplitWords.length}`);
console.log(`  - 难度级别: ${index.levels.length}`);
console.log(`  - 总Lesson数: ${index.levels.reduce((sum, l) => sum + l.totalLessons, 0)}`);
console.log(`  - 所有ID唯一且稳定`);

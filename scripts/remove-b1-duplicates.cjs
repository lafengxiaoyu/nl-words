const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '../web/src/data/words.json');
const vocabularyDir = path.join(__dirname, '../web/src/data/vocabulary');

// 读取words.json
const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

// 找出B1内部的重复单词
const b1Words = words.filter(w => w.difficulty === 'B1');
const b1Map = new Map();

b1Words.forEach(word => {
  if (!b1Map.has(word.word)) {
    b1Map.set(word.word, []);
  }
  b1Map.get(word.word).push(word);
});

const duplicates = [];
b1Map.forEach((entries, word) => {
  if (entries.length > 1) {
    // 保留最小ID,删除其他
    entries.sort((a, b) => a.id - b.id);
    const keep = entries[0];
    const remove = entries.slice(1);
    duplicates.push({
      word,
      keepId: keep.id,
      keepLesson: findLessonFile(word, b1Words),
      removeIds: remove.map(w => w.id)
    });
  }
});

function findLessonFile(word, allB1Words) {
  const found = allB1Words.find(w => w.word === word && w.id !== undefined);
  if (!found) return 'unknown';

  // 遍历B1课程文件查找
  for (let i = 1; i <= 57; i++) {
    const lessonFile = path.join(vocabularyDir, `b1/lesson-${i.toString().padStart(2, '0')}.json`);
    if (fs.existsSync(lessonFile)) {
      try {
        const lessonData = JSON.parse(fs.readFileSync(lessonFile, 'utf-8'));
        if (lessonData.words) {
          const wordInLesson = lessonData.words.find(w => w.word === word);
          if (wordInLesson) {
            return `lesson-${i.toString().padStart(2, '0')}.json`;
          }
        }
      } catch (e) {
        // 继续下一个
      }
    }
  }
  return 'unknown';
}

console.log(`=== B1重复单词分析 ===\n`);
console.log(`找到 ${duplicates.length} 个重复单词\n`);

if (duplicates.length === 0) {
  console.log('没有发现B1内部重复单词');
  process.exit(0);
}

// 显示前20个
console.log('重复单词示例 (保留最小ID):');
duplicates.slice(0, 20).forEach(d => {
  console.log(`  ${d.word}: 保留 ID${d.keepId}, 删除 ${d.removeIds.map(id => `ID${id}`).join(', ')}`);
});
console.log('...\n');

// 计算要删除的ID
const idsToRemove = new Set();
duplicates.forEach(d => {
  d.removeIds.forEach(id => idsToRemove.add(id));
});

console.log(`将要删除 ${idsToRemove.size} 个重复条目\n`);

// 从words.json中删除重复条目
const newWords = words.filter(w => !idsToRemove.has(w.id));

console.log(`words.json: ${words.length} -> ${newWords.length} (删除 ${words.length - newWords.length} 条)\n`);

// 备份原文件
const backupPath = wordsPath + '.backup';
fs.writeFileSync(backupPath, JSON.stringify(words, null, 2));
console.log(`✓ 已备份到: ${backupPath}`);

// 写入新文件
fs.writeFileSync(wordsPath, JSON.stringify(newWords, null, 2));
console.log(`✓ 已更新: ${wordsPath}\n`);

// 重新生成lookup.json和index.json
console.log('重新生成索引文件...\n');
const { execSync } = require('child_process');
try {
  execSync('node scripts/generate-vocab-index.cjs', { cwd: path.join(__dirname, '..') });
} catch (e) {
  console.error('生成索引失败:', e.message);
}

console.log('\n✅ 完成!');
console.log(`删除了 ${idsToRemove.size} 个B1内部重复单词`);

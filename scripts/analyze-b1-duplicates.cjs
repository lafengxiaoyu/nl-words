const fs = require('fs');
const path = require('path');

const vocabularyDir = path.join(__dirname, '../web/src/data/vocabulary');

// 读取所有B1课程文件
const b1Lessons = [];
for (let i = 1; i <= 57; i++) {
  const lessonFile = path.join(vocabularyDir, `b1/lesson-${i.toString().padStart(2, '0')}.json`);
  if (fs.existsSync(lessonFile)) {
    const data = JSON.parse(fs.readFileSync(lessonFile, 'utf-8'));
    b1Lessons.push({
      lesson: i,
      file: `lesson-${i.toString().padStart(2, '0')}.json`,
      words: data.words || []
    });
  }
}

// 找出重复单词
const wordMap = new Map();
b1Lessons.forEach(lesson => {
  lesson.words.forEach(word => {
    if (!wordMap.has(word.word)) {
      wordMap.set(word.word, []);
    }
    wordMap.get(word.word).push({
      lesson: lesson.lesson,
      id: word.id
    });
  });
});

console.log('=== B1重复单词及所在课程 ===\n');

let totalDuplicates = 0;
const duplicatesByLesson = {};

wordMap.forEach((entries, word) => {
  if (entries.length > 1) {
    totalDuplicates++;
    entries.forEach(entry => {
      if (!duplicatesByLesson[entry.lesson]) {
        duplicatesByLesson[entry.lesson] = [];
      }
      duplicatesByLesson[entry.lesson].push({ word, id: entry.id });
    });
  }
});

console.log(`共 ${totalDuplicates} 个单词在B1内部重复\n`);

// 按课程统计重复数
Object.keys(duplicatesByLesson).sort((a, b) => a - b).forEach(lesson => {
  const count = duplicatesByLesson[lesson].length;
  console.log(`lesson-${lesson.padStart(2, '0')}: ${count} 个重复单词`);
});

console.log('\n=== 重复单词详情 ===');
const sortedLessons = Object.keys(duplicatesByLesson).sort((a, b) => a - b);
sortedLessons.forEach(lesson => {
  const words = duplicatesByLesson[lesson];
  console.log(`\nlesson-${lesson.padStart(2, '0')} (${words.length} 个):`);
  words.slice(0, 10).forEach(w => {
    console.log(`  ${w.word} (ID${w.id})`);
  });
  if (words.length > 10) {
    console.log(`  ... 还有 ${words.length - 10} 个`);
  }
});

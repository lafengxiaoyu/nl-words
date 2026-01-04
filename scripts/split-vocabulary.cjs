const fs = require('fs');
const path = require('path');

const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');
const words = JSON.parse(fs.readFileSync(wordsFilePath, 'utf-8'));
const outputPath = path.join(__dirname, '../web/src/data/vocabulary');

console.log('\n========== 开始拆分单词数据 ==========\n');

// 创建输出目录
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
  console.log(`创建目录: ${outputPath}`);
}

// 按难度分组
const difficultyGroups = {};
words.forEach(word => {
  const level = word.difficulty.toLowerCase();
  if (!difficultyGroups[level]) {
    difficultyGroups[level] = [];
  }
  difficultyGroups[level].push(word);
});

// 每个级别的配置
const config = {
  a1: { wordsPerLesson: 50, startLessonId: 1 },
  a2: { wordsPerLesson: 50, startLessonId: 1 },
  b1: { wordsPerLesson: 50, startLessonId: 1 },
  b2: { wordsPerLesson: 50, startLessonId: 1 },
  c2: { wordsPerLesson: 50, startLessonId: 1 }
};

// 创建索引
const index = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  totalWords: words.length,
  levels: []
};

// 处理每个难度级别
Object.entries(difficultyGroups).forEach(([level, levelWords]) => {
  console.log(`\n处理难度级别: ${level.toUpperCase()} (${levelWords.length}个单词)`);

  const levelDir = path.join(outputPath, level.toLowerCase());
  if (!fs.existsSync(levelDir)) {
    fs.mkdirSync(levelDir, { recursive: true });
  }

  const levelConfig = config[level] || { wordsPerLesson: 50, startLessonId: 1 };
  const totalLessons = Math.ceil(levelWords.length / levelConfig.wordsPerLesson);

  console.log(`  拆分成 ${totalLessons} 个lesson，每个lesson最多 ${levelConfig.wordsPerLesson} 个单词`);

  const levelData = {
    level: level.toUpperCase(),
    totalWords: levelWords.length,
    totalLessons: totalLessons,
    lessons: []
  };

  // 按ID排序，确保稳定性
  levelWords.sort((a, b) => a.id - b.id);

  // 拆分成多个lesson
  for (let i = 0; i < totalLessons; i++) {
    const start = i * levelConfig.wordsPerLesson;
    const end = Math.min(start + levelConfig.wordsPerLesson, levelWords.length);
    const lessonWords = levelWords.slice(start, end);

    const lessonId = String(levelConfig.startLessonId + i).padStart(2, '0');
    const lessonFilename = `lesson-${lessonId}.json`;
    const lessonPath = path.join(levelDir, lessonFilename);

    const lessonData = {
      id: `l${level.toUpperCase()}${lessonId}`,
      level: level.toUpperCase(),
      lessonNumber: levelConfig.startLessonId + i,
      totalWords: lessonWords.length,
      words: lessonWords
    };

    fs.writeFileSync(lessonPath, JSON.stringify(lessonData, null, 2) + '\n', 'utf-8');
    levelData.lessons.push({
      id: lessonData.id,
      lessonNumber: lessonData.lessonNumber,
      file: `${level.toLowerCase()}/${lessonFilename}`,
      totalWords: lessonData.totalWords,
      wordIds: lessonWords.map(w => w.id)
    });

    console.log(`    ✓ 创建 ${lessonFilename} (${lessonWords.length}个单词, ID: ${lessonWords[0].id}-${lessonWords[lessonWords.length-1].id})`);
  }

  index.levels.push(levelData);
});

// 保存索引文件
const indexPath = path.join(outputPath, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
console.log(`\n✓ 创建索引文件: index.json`);

// 创建一个快速查找表（用于快速定位单词）
const wordLookup = {};
words.forEach(word => {
  wordLookup[word.id] = {
    id: word.id,
    word: word.word,
    level: word.difficulty,
    partOfSpeech: word.partOfSpeech,
    translation: word.translation
  };
});

const lookupPath = path.join(outputPath, 'lookup.json');
fs.writeFileSync(lookupPath, JSON.stringify(wordLookup, null, 2) + '\n', 'utf-8');
console.log(`✓ 创建查找表: lookup.json`);

// 创建一个统计文件
const stats = {
  totalWords: words.length,
  byDifficulty: {},
  byPartOfSpeech: {},
  byLevelAndPos: {}
};

words.forEach(word => {
  // 按难度统计
  if (!stats.byDifficulty[word.difficulty]) {
    stats.byDifficulty[word.difficulty] = 0;
  }
  stats.byDifficulty[word.difficulty]++;

  // 按词性统计
  if (!stats.byPartOfSpeech[word.partOfSpeech]) {
    stats.byPartOfSpeech[word.partOfSpeech] = 0;
  }
  stats.byPartOfSpeech[word.partOfSpeech]++;

  // 按难度和词性统计
  const key = `${word.difficulty}-${word.partOfSpeech}`;
  if (!stats.byLevelAndPos[key]) {
    stats.byLevelAndPos[key] = 0;
  }
  stats.byLevelAndPos[key]++;
});

const statsPath = path.join(outputPath, 'stats.json');
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n', 'utf-8');
console.log(`✓ 创建统计文件: stats.json`);

console.log('\n========== 拆分完成 ==========\n');
console.log(`总计单词: ${words.length}`);
console.log(`拆分级别: ${Object.keys(difficultyGroups).length}`);
console.log(`拆分lesson: ${index.levels.reduce((sum, l) => sum + l.totalLessons, 0)}`);
console.log(`输出目录: ${outputPath}`);
console.log('\n文件结构:');
console.log('vocabulary/');
console.log('├── index.json        # 主索引文件');
console.log('├── lookup.json       # 快速查找表');
console.log('├── stats.json        # 统计信息');
console.log('├── a1/');
console.log('│   ├── lesson-01.json');
console.log('│   ├── lesson-02.json');
console.log('│   └── ...');
console.log('├── a2/');
console.log('│   └── lesson-01.json');
console.log('├── b1/');
console.log('│   └── lesson-01.json');
console.log('├── b2/');
console.log('│   └── lesson-01.json');
console.log('└── c2/');
console.log('    └── lesson-01.json');

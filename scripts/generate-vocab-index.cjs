const fs = require('fs');
const path = require('path');

const VOCABULARY_DIR = path.join(__dirname, '../web/src/data/vocabulary');
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

function getAllLessonFiles() {
  const lessons = [];

  for (const level of LEVELS) {
    const levelDir = path.join(VOCABULARY_DIR, level);
    if (!fs.existsSync(levelDir)) {
      console.warn(`⚠️  目录不存在: ${levelDir}`);
      continue;
    }

    const files = fs.readdirSync(levelDir)
      .filter(f => f.startsWith('lesson-') && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
      });

    for (const file of files) {
      lessons.push({
        level,
        file,
        filePath: path.join(levelDir, file)
      });
    }
  }

  return lessons;
}

function loadLessonData(lesson) {
  try {
    const content = fs.readFileSync(lesson.filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 加载失败: ${lesson.filePath}`, error.message);
    return null;
  }
}

function getWordInfo(word) {
  // 统一使用 translation.chinese 和 translation.english 格式
  const translation = word.translation || {};
  return {
    word: word.word,
    translation: translation,
    partOfSpeech: word.partOfSpeech || word.pos || 'unknown'
  };
}

function generateIndex(lessons) {
  const levels = {};

  for (const level of LEVELS) {
    levels[level.toUpperCase()] = {
      level: level.toUpperCase(),
      totalWords: 0,
      totalLessons: 0,
      lessons: []
    };
  }

  for (const lesson of lessons) {
    const data = loadLessonData(lesson);
    if (!data) continue;

    const levelKey = lesson.level.toUpperCase();
    const wordCount = data.words ? data.words.length : 0;

    levels[levelKey].lessons.push({
      file: `${lesson.level}/${lesson.file}`,
      totalWords: wordCount,
      wordIds: data.words ? data.words.map(w => w.id) : []
    });

    levels[levelKey].totalWords += wordCount;
    levels[levelKey].totalLessons++;
  }

  return {
    generatedAt: new Date().toISOString(),
    levels: Object.values(levels)
  };
}

function generateLookup(lessons) {
  const lookup = {};

  for (const lesson of lessons) {
    const data = loadLessonData(lesson);
    if (!data || !data.words) continue;

    for (const word of data.words) {
      const wordInfo = getWordInfo(word);
      // 使用单词原有的ID，不重新分配
      lookup[word.id] = {
        word: wordInfo.word,
        translation: wordInfo.translation,
        partOfSpeech: wordInfo.partOfSpeech,
        level: lesson.level.toUpperCase(),
        lesson: lesson.file
      };
    }
  }

  return lookup;
}

function generateStats(lessons, index) {
  const stats = {
    totalWords: 0,
    totalLessons: 0,
    levels: {},
    partOfSpeech: {},
    wordLength: {
      min: Infinity,
      max: 0,
      average: 0
    }
  };

  let totalWordLength = 0;
  let wordCount = 0;

  for (const level of LEVELS) {
    const levelLessons = lessons.filter(l => l.level === level);
    const levelData = index.levels.find(l => l.level === level.toUpperCase());

    if (!levelData) continue;

    const levelStats = {
      level: level.toUpperCase(),
      totalWords: levelData.totalWords,
      totalLessons: levelData.totalLessons,
      wordsPerLesson: levelData.totalWords > 0
        ? (levelData.totalWords / levelData.totalLessons).toFixed(1)
        : 0
    };

    for (const lesson of levelLessons) {
      const data = loadLessonData(lesson);
      if (!data || !data.words) continue;

      for (const word of data.words) {
        const wordInfo = getWordInfo(word);
        const pos = wordInfo.partOfSpeech;
        if (!stats.partOfSpeech[pos]) {
          stats.partOfSpeech[pos] = 0;
        }
        stats.partOfSpeech[pos]++;

        const wordLen = wordInfo.word.length;
        totalWordLength += wordLen;
        wordCount++;

        if (wordLen < stats.wordLength.min) {
          stats.wordLength.min = wordLen;
        }
        if (wordLen > stats.wordLength.max) {
          stats.wordLength.max = wordLen;
        }
      }
    }

    stats.levels[level.toUpperCase()] = levelStats;
    stats.totalWords += levelData.totalWords;
    stats.totalLessons += levelData.totalLessons;
  }

  stats.wordLength.min = stats.wordLength.min === Infinity ? 0 : stats.wordLength.min;
  stats.wordLength.average = wordCount > 0 ? (totalWordLength / wordCount).toFixed(2) : 0;

  return stats;
}

function generateAllWords(lessons) {
  const wordSet = new Set();

  for (const lesson of lessons) {
    const data = loadLessonData(lesson);
    if (!data || !data.words) continue;

    for (const word of data.words) {
      wordSet.add(word.word);
    }
  }

  return Array.from(wordSet).sort();
}

function generateWordsJson(lessons) {
  const allWords = [];

  for (const lesson of lessons) {
    const data = loadLessonData(lesson);
    if (!data || !data.words) continue;

    for (const word of data.words) {
      // 处理两种不同的数据格式
      const isOldFormat = word.meaning !== undefined || word.example !== undefined;
      let translation, examples, exampleTranslations, partOfSpeech;

      if (isOldFormat) {
        // 旧格式（B2级别）
        translation = {
          chinese: word.meaning || '',
          english: word.english || ''
        };
        examples = word.example ? [word.example] : [];
        exampleTranslations = word.example_translation ? {
          chinese: [word.example_translation],
          english: []
        } : {};
        partOfSpeech = word.partOfSpeech || word.pos || 'other';
      } else {
        // 新格式（A1/B1级别）
        const wordInfo = getWordInfo(word);
        translation = typeof wordInfo.translation === 'object'
          ? wordInfo.translation
          : { chinese: wordInfo.translation, english: '' };
        examples = word.examples || [];
        exampleTranslations = word.exampleTranslations || {};
        partOfSpeech = wordInfo.partOfSpeech;
      }

      allWords.push({
        id: word.id,  // 使用单词原有的ID，不重新分配
        word: word.word,
        translation: translation,
        partOfSpeech: partOfSpeech,
        examples: examples,
        exampleTranslations: exampleTranslations,
        notes: word.notes || '',
        difficulty: lesson.level.toUpperCase(),
        forms: word.forms
      });
    }
  }

  return allWords;
}

function main() {
  console.log('📚 开始生成词汇数据索引...\n');

  const lessons = getAllLessonFiles();
  console.log(`✓ 找到 ${lessons.length} 个lesson文件`);

  console.log('\n📝 生成 index.json...');
  const index = generateIndex(lessons);
  fs.writeFileSync(
    path.join(VOCABULARY_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );
  console.log(`✓ 生成成功，包含 ${index.levels.length} 个级别`);

  console.log('\n🔍 生成 lookup.json...');
  const lookup = generateLookup(lessons);
  fs.writeFileSync(
    path.join(VOCABULARY_DIR, 'lookup.json'),
    JSON.stringify(lookup, null, 2)
  );
  console.log(`✓ 生成成功，包含 ${Object.keys(lookup).length} 个单词`);

  console.log('\n📊 生成 stats.json...');
  const stats = generateStats(lessons, index);
  fs.writeFileSync(
    path.join(VOCABULARY_DIR, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );
  console.log(`✓ 生成成功`);
  console.log(`  - 总单词数: ${stats.totalWords}`);
  console.log(`  - 总课程数: ${stats.totalLessons}`);
  console.log(`  - 单词长度: ${stats.wordLength.min}-${stats.wordLength.max} (平均 ${stats.wordLength.average})`);

  console.log('\n📝 生成 all_words.txt...');
  const allWords = generateAllWords(lessons);
  const allWordsPath = path.join(__dirname, '../all_words.txt');
  console.log(`  路径: ${allWordsPath}`);
  fs.writeFileSync(allWordsPath, allWords.join('\n'));
  console.log(`✓ 生成成功，包含 ${allWords.length} 个单词`);

  console.log('\n📝 生成 words.json...');
  const wordsData = generateWordsJson(lessons);
  const wordsJsonPath = path.join(__dirname, '../web/src/data/words.json');
  console.log(`  路径: ${wordsJsonPath}`);
  fs.writeFileSync(wordsJsonPath, JSON.stringify(wordsData, null, 2));
  console.log(`✓ 生成成功，包含 ${wordsData.length} 个单词`);

  console.log('\n✅ 所有文件生成完成！');
}

main();

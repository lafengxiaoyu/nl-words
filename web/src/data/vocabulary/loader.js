/**
 * 词汇数据加载器
 * 提供按需加载和快速查找功能
 */

// 配置
const CONFIG = {
  basePath: '/data/vocabulary',
  cache: true,
  cacheDuration: 5 * 60 * 1000 // 5分钟缓存
};

// 缓存
const cache = {
  index: null,
  lookup: null,
  stats: null,
  lessons: {},
  timestamp: null
};

/**
 * 加载索引文件
 */
export async function loadIndex() {
  if (CONFIG.cache && cache.index && Date.now() - cache.timestamp < CONFIG.cacheDuration) {
    return cache.index;
  }

  const response = await fetch(`${CONFIG.basePath}/index.json`);
  const data = await response.json();
  cache.index = data;
  cache.timestamp = Date.now();
  return data;
}

/**
 * 加载查找表
 */
export async function loadLookup() {
  if (CONFIG.cache && cache.lookup) {
    return cache.lookup;
  }

  const response = await fetch(`${CONFIG.basePath}/lookup.json`);
  const data = await response.json();
  cache.lookup = data;
  return data;
}

/**
 * 加载统计信息
 */
export async function loadStats() {
  if (CONFIG.cache && cache.stats) {
    return cache.stats;
  }

  const response = await fetch(`${CONFIG.basePath}/stats.json`);
  const data = await response.json();
  cache.stats = data;
  return data;
}

/**
 * 加载指定级别的所有单词
 */
export async function loadLevel(level) {
  const index = await loadIndex();
  const levelData = index.levels.find(l => l.level === level.toUpperCase());

  if (!levelData) {
    throw new Error(`级别 ${level} 不存在`);
  }

  const lessons = await Promise.all(
    levelData.lessons.map(lesson => loadLesson(level.toLowerCase(), lesson.file.split('/')[1]))
  );

  return {
    level: level.toUpperCase(),
    totalWords: levelData.totalWords,
    totalLessons: levelData.totalLessons,
    lessons: lessons
  };
}

/**
 * 加载指定lesson
 */
export async function loadLesson(level, lessonFile) {
  const cacheKey = `${level}-${lessonFile}`;

  if (CONFIG.cache && cache.lessons[cacheKey]) {
    return cache.lessons[cacheKey];
  }

  const response = await fetch(`${CONFIG.basePath}/${level}/${lessonFile}`);
  const data = await response.json();
  cache.lessons[cacheKey] = data;
  return data;
}

/**
 * 根据ID查询单词详细信息
 */
export async function getWordById(id) {
  const lookup = await loadLookup();
  const wordInfo = lookup[id];

  if (!wordInfo) {
    return null;
  }

  // 需要加载完整的单词数据
  const index = await loadIndex();

  // 找到包含该单词的lesson
  for (const level of index.levels) {
    for (const lesson of level.lessons) {
      if (lesson.wordIds.includes(id)) {
        const lessonData = await loadLesson(level.level.toLowerCase(), lesson.file.split('/')[1]);
        return lessonData.words.find(w => w.id === id);
      }
    }
  }

  return null;
}

/**
 * 批量查询单词
 */
export async function getWordsByIds(ids) {
  const lookup = await loadLookup();
  const index = await loadIndex();

  const wordMap = new Map();
  const lessonsToLoad = new Map();

  // 找出需要加载的lessons
  for (const id of ids) {
    const wordInfo = lookup[id];
    if (wordInfo) {
      for (const level of index.levels) {
        for (const lesson of level.lessons) {
          if (lesson.wordIds.includes(id)) {
            const key = `${level.level.toLowerCase()}-${lesson.file.split('/')[1]}`;
            if (!lessonsToLoad.has(key)) {
              lessonsToLoad.set(key, {
                level: level.level.toLowerCase(),
                file: lesson.file.split('/')[1]
              });
            }
            break;
          }
        }
      }
    }
  }

  // 加载所有需要的lessons
  for (const [key, lessonInfo] of lessonsToLoad) {
    const lessonData = await loadLesson(lessonInfo.level, lessonInfo.file);
    lessonData.words.forEach(word => {
      if (ids.includes(word.id)) {
        wordMap.set(word.id, word);
      }
    });
  }

  return ids.map(id => wordMap.get(id) || null);
}

/**
 * 按难度查询单词
 */
export async function getWordsByDifficulty(difficulty) {
  const index = await loadIndex();
  const levelData = index.levels.find(l => l.level === difficulty.toUpperCase());

  if (!levelData) {
    return [];
  }

  const lessons = await Promise.all(
    levelData.lessons.map(lesson => loadLesson(difficulty.toLowerCase(), lesson.file.split('/')[1]))
  );

  return lessons.flatMap(lesson => lesson.words);
}

/**
 * 按词性查询单词
 */
export async function getWordsByPartOfSpeech(partOfSpeech) {
  const index = await loadIndex();
  const stats = await loadStats();

  // 这里需要加载所有数据，实际应用中可以考虑建立反向索引
  const lessonsPromises = [];

  for (const level of index.levels) {
    for (const lesson of level.lessons) {
      lessonsPromises.push(
        loadLesson(level.level.toLowerCase(), lesson.file.split('/')[1])
      );
    }
  }

  const lessons = await Promise.all(lessonsPromises);
  return lessons.flatMap(lesson =>
    lesson.words.filter(w => w.partOfSpeech === partOfSpeech)
  );
}

/**
 * 搜索单词
 */
export async function searchWords(query) {
  const lookup = await loadLookup();
  const queryLower = query.toLowerCase();

  const results = [];

  for (const [id, wordInfo] of Object.entries(lookup)) {
    const word = wordInfo.word.toLowerCase();
    const chinese = wordInfo.translation?.chinese?.toLowerCase() || '';
    const english = wordInfo.translation?.english?.toLowerCase() || '';

    if (word.includes(queryLower) ||
        chinese.includes(queryLower) ||
        english.includes(queryLower)) {
      results.push({
        id: parseInt(id),
        ...wordInfo
      });
    }
  }

  return results;
}

/**
 * 获取随机单词
 */
export async function getRandomWords(count = 10, difficulty = null) {
  const index = await loadIndex();

  let allWordIds = [];

  if (difficulty) {
    const levelData = index.levels.find(l => l.level === difficulty.toUpperCase());
    if (levelData) {
      allWordIds = levelData.lessons.flatMap(l => l.wordIds);
    }
  } else {
    allWordIds = index.levels.flatMap(l => l.lessons.flatMap(lesson => lesson.wordIds));
  }

  // 随机选择
  const shuffled = allWordIds.sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, Math.min(count, allWordIds.length));

  return await getWordsByIds(selectedIds);
}

/**
 * 清除缓存
 */
export function clearCache() {
  cache.index = null;
  cache.lookup = null;
  cache.stats = null;
  cache.lessons = {};
  cache.timestamp = null;
}

/**
 * 获取加载进度
 */
export async function getLoadingProgress(level) {
  const index = await loadIndex();
  const levelData = index.levels.find(l => l.level === level.toUpperCase());

  if (!levelData) {
    return null;
  }

  const loadedLessons = Object.keys(cache.lessons).filter(key =>
    key.startsWith(level.toLowerCase())
  ).length;

  return {
    totalLessons: levelData.totalLessons,
    loadedLessons: loadedLessons,
    progress: (loadedLessons / levelData.totalLessons) * 100
  };
}

export default {
  loadIndex,
  loadLookup,
  loadStats,
  loadLevel,
  loadLesson,
  getWordById,
  getWordsByIds,
  getWordsByDifficulty,
  getWordsByPartOfSpeech,
  searchWords,
  getRandomWords,
  clearCache,
  getLoadingProgress
};

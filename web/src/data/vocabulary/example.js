/**
 * 词汇数据使用示例
 * 展示如何在前端应用中使用拆分后的词汇数据
 */

// import loader from './loader.js';

// ========================================
// 示例1：加载和显示课程列表
// ========================================
/*
async function loadLessonList() {
  const index = await loader.loadIndex();

  const lessonList = document.getElementById('lesson-list');
  lessonList.innerHTML = '';

  for (const level of index.levels) {
    const levelSection = document.createElement('div');
    levelSection.innerHTML = `<h2>${level.level} 级别 (${level.totalWords}个单词)</h2>`;

    for (const lesson of level.lessons) {
      const lessonCard = document.createElement('div');
      lessonCard.className = 'lesson-card';
      lessonCard.innerHTML = `
        <h3>Lesson ${lesson.lessonNumber}</h3>
        <p>${lesson.totalWords} 个单词</p>
        <button onclick="loadLesson('${lesson.file}')">开始学习</button>
      `;
      levelSection.appendChild(lessonCard);
    }

    lessonList.appendChild(levelSection);
  }
}
*/

// ========================================
// 示例2：加载并显示单个lesson
// ========================================
/*
async function showLesson(level, lessonFile) {
  const lesson = await loader.loadLesson(level, lessonFile);

  const container = document.getElementById('lesson-content');
  container.innerHTML = `
    <h1>${lesson.level} - Lesson ${lesson.lessonNumber}</h1>
    <p>共 ${lesson.totalWords} 个单词</p>
    <div class="word-grid">
      ${lesson.words.map(word => `
        <div class="word-card" data-id="${word.id}">
          <h3>${word.word}</h3>
          <p class="translation">${word.translation.chinese}</p>
          <p class="english">${word.translation.english}</p>
          <span class="pos">${word.partOfSpeech}</span>
        </div>
      `).join('')}
    </div>
  `;
}
*/

// ========================================
// 示例3：搜索单词
// ========================================
/*
async function searchWords(query) {
  const results = await loader.searchWords(query);

  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = results.map(word => `
    <div class="search-result" onclick="showWordDetail(${word.id})">
      <h3>${word.word}</h3>
      <p>${word.translation.chinese}</p>
      <span class="badge">${word.level}</span>
    </div>
  `).join('');

  if (results.length === 0) {
    resultsContainer.innerHTML = '<p>未找到匹配的单词</p>';
  }
}
*/

// ========================================
// 示例4：显示单词详情
// ========================================
/*
async function showWordDetail(wordId) {
  const word = await loader.getWordById(wordId);

  if (!word) {
    alert('单词不存在');
    return;
  }

  const detailView = document.getElementById('word-detail');
  detailView.innerHTML = `
    <div class="detail-header">
      <h1>${word.word}</h1>
      <span class="badge">${word.difficulty}</span>
      <span class="badge">${word.partOfSpeech}</span>
    </div>

    <div class="translation-section">
      <h2>翻译</h2>
      <p>中文: ${word.translation.chinese}</p>
      <p>英文: ${word.translation.english}</p>
    </div>

    ${word.forms ? `
      <div class="forms-section">
        <h2>变形</h2>
        ${renderForms(word)}
      </div>
    ` : ''}

    <div class="examples-section">
      <h2>例句</h2>
      ${word.examples.map((example, i) => `
        <div class="example">
          <p class="dutch">${example}</p>
          <p class="chinese">${word.exampleTranslations.chinese[i]}</p>
          <p class="english">${word.exampleTranslations.english[i]}</p>
        </div>
      `).join('')}
    </div>

    ${word.notes ? `
      <div class="notes-section">
        <h2>备注</h2>
        <p>${word.notes}</p>
      </div>
    ` : ''}
  `;
}

function renderForms(word) {
  if (word.partOfSpeech === 'noun' && word.forms.noun) {
    const n = word.forms.noun;
    return `
      <p><strong>冠词:</strong> ${n.article}</p>
      <p><strong>单数:</strong> ${n.singular}</p>
      <p><strong>复数:</strong> ${n.plural}</p>
    `;
  }

  if (word.partOfSpeech === 'verb' && word.forms.verb) {
    const v = word.forms.verb;
    return `
      <p><strong>原形:</strong> ${v.infinitive}</p>
      <p><strong>可分:</strong> ${v.isSeparable ? '是' : '否'} ${v.prefix ? `(${v.prefix})` : ''}</p>
      <p><strong>过去分词:</strong> ${v.pastParticiple} (${v.pastParticipleAuxiliary})</p>
      <div class="conjugation">
        <h3>现在时:</h3>
        <ul>
          <li>ik: ${v.present.ik}</li>
          <li>jij: ${v.present.jij}</li>
          <li>hij: ${v.present.hij}</li>
          <li>wij: ${v.present.wij}</li>
          <li>jullie: ${v.present.jullie}</li>
          <li>zij: ${v.present.zij}</li>
        </ul>
        <h3>过去时:</h3>
        <ul>
          <li>单数: ${v.past.singular}</li>
          <li>复数: ${v.past.plural}</li>
        </ul>
      </div>
    `;
  }

  if (word.partOfSpeech === 'adjective' && word.forms.adjective) {
    const a = word.forms.adjective;
    return `
      <p><strong>原形:</strong> ${a.base}</p>
      <p><strong>with de:</strong> ${a.withDe}</p>
      <p><strong>with het:</strong> ${a.withHet}</p>
      <p><strong>比较级:</strong> ${a.comparative}</p>
      <p><strong>最高级:</strong> ${a.superlative}</p>
    `;
  }

  return '';
}
*/

// ========================================
// 示例5：按需加载以提升性能
// ========================================
/*
class VocabularyLoader {
  constructor() {
    this.loadedLessons = new Map();
    this.pendingLoads = new Map();
  }

  async loadLesson(level, lessonFile) {
    const cacheKey = `${level}-${lessonFile}`;

    // 如果已经加载，直接返回
    if (this.loadedLessons.has(cacheKey)) {
      return this.loadedLessons.get(cacheKey);
    }

    // 如果正在加载，等待加载完成
    if (this.pendingLoads.has(cacheKey)) {
      return await this.pendingLoads.get(cacheKey);
    }

    // 开始加载
    const loadPromise = loader.loadLesson(level, lessonFile);
    this.pendingLoads.set(cacheKey, loadPromise);

    try {
      const lesson = await loadPromise;
      this.loadedLessons.set(cacheKey, lesson);
      this.pendingLoads.delete(cacheKey);
      return lesson;
    } catch (error) {
      this.pendingLoads.delete(cacheKey);
      throw error;
    }
  }

  // 获取加载进度
  getProgress(level) {
    const index = loader.loadIndex(); // 假设已经缓存
    const levelData = index.levels.find(l => l.level === level);

    if (!levelData) return null;

    const loaded = Array.from(this.loadedLessons.keys())
      .filter(key => key.startsWith(level.toLowerCase()))
      .length;

    return {
      loaded,
      total: levelData.totalLessons,
      progress: (loaded / levelData.totalLessons) * 100
    };
  }

  // 清除缓存
  clearCache() {
    this.loadedLessons.clear();
    this.pendingLoads.clear();
  }
}
*/

// ========================================
// 示例6：学习进度管理
// ========================================
/*
class StudyProgress {
  constructor() {
    this.storageKey = 'vocabulary-progress';
    this.progress = this.loadProgress();
  }

  loadProgress() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : { learned: [], mastered: [] };
  }

  saveProgress() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
  }

  markAsLearned(wordId) {
    if (!this.progress.learned.includes(wordId)) {
      this.progress.learned.push(wordId);
      this.saveProgress();
    }
  }

  markAsMastered(wordId) {
    if (!this.progress.mastered.includes(wordId)) {
      this.progress.mastered.push(wordId);
      this.saveProgress();
    }
  }

  isLearned(wordId) {
    return this.progress.learned.includes(wordId);
  }

  isMastered(wordId) {
    return this.progress.mastered.includes(wordId);
  }

  getProgressByLevel(level) {
    const index = loader.loadIndex();
    const levelData = index.levels.find(l => l.level === level);

    if (!levelData) return null;

    const allIds = levelData.lessons.flatMap(l => l.wordIds);
    const learnedCount = allIds.filter(id => this.progress.learned.includes(id)).length;
    const masteredCount = allIds.filter(id => this.progress.mastered.includes(id)).length;

    return {
      learned: learnedCount,
      mastered: masteredCount,
      total: allIds.length,
      learnedPercent: (learnedCount / allIds.length) * 100,
      masteredPercent: (masteredCount / allIds.length) * 100
    };
  }
}
*/

// ========================================
// 示例7：随机单词练习
// ========================================
/*
async function startPractice(difficulty = 'A1', count = 10) {
  const words = await loader.getRandomWords(count, difficulty);

  if (words.length === 0) {
    alert('没有足够的单词进行练习');
    return;
  }

  let currentIndex = 0;
  let score = 0;

  function showNextWord() {
    if (currentIndex >= words.length) {
      showResults(score, words.length);
      return;
    }

    const word = words[currentIndex];
    const container = document.getElementById('practice-container');

    container.innerHTML = `
      <div class="practice-word">
        <p>单词 ${currentIndex + 1} / ${words.length}</p>
        <h1>${word.word}</h1>
        <input type="text" id="answer-input" placeholder="输入中文翻译">
        <button onclick="checkAnswer(${word.id})">检查</button>
        <button onclick="showAnswer(${word.id})">显示答案</button>
        <p id="result"></p>
      </div>
    `;

    document.getElementById('answer-input').focus();
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkAnswer(word.id);
    });
  }

  window.checkAnswer = (wordId) => {
    const input = document.getElementById('answer-input');
    const answer = input.value.trim();
    const word = words.find(w => w.id === wordId);
    const result = document.getElementById('result');

    if (answer === word.translation.chinese) {
      result.innerHTML = '<span class="correct">正确！</span>';
      score++;
    } else {
      result.innerHTML = `<span class="incorrect">错误！正确答案是: ${word.translation.chinese}</span>`;
    }

    setTimeout(() => {
      currentIndex++;
      showNextWord();
    }, 1500);
  };

  window.showAnswer = (wordId) => {
    const word = words.find(w => w.id === wordId);
    const result = document.getElementById('result');
    result.innerHTML = `<span class="hint">答案: ${word.translation.chinese}</span>`;
  };

  showNextWord();
}

function showResults(score, total) {
  const container = document.getElementById('practice-container');
  const percent = Math.round((score / total) * 100);

  container.innerHTML = `
    <div class="results">
      <h1>练习完成！</h1>
      <p>得分: ${score} / ${total}</p>
      <p>正确率: ${percent}%</p>
      <button onclick="startPractice()">再来一次</button>
    </div>
  `;
}
*/

// ========================================
// 示例8：筛选功能
// ========================================
/*
async function filterWords(options = {}) {
  const { level, partOfSpeech, minId, maxId } = options;

  let filteredWords = [];

  if (level) {
    filteredWords = await loader.getWordsByDifficulty(level);
  } else {
    const index = await loader.loadIndex();
    for (const levelData of index.levels) {
      const levelWords = await loader.getWordsByDifficulty(levelData.level);
      filteredWords = filteredWords.concat(levelWords);
    }
  }

  if (partOfSpeech) {
    filteredWords = filteredWords.filter(w => w.partOfSpeech === partOfSpeech);
  }

  if (minId !== undefined) {
    filteredWords = filteredWords.filter(w => w.id >= minId);
  }

  if (maxId !== undefined) {
    filteredWords = filteredWords.filter(w => w.id <= maxId);
  }

  return filteredWords;
}
*/

export default {
  // loadLessonList,
  // showLesson,
  // searchWords,
  // showWordDetail,
  // VocabularyLoader,
  // StudyProgress,
  // startPractice,
  // filterWords
};

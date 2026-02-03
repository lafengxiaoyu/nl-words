#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function error(message) {
  log(colors.red, '❌', message);
}

function success(message) {
  log(colors.green, '✅', message);
}

function info(message) {
  log(colors.blue, 'ℹ️', message);
}

function warning(message) {
  log(colors.yellow, '⚠️', message);
}

// 验证单词的基本结构
function validateWordStructure(word, filePath) {
  const errors = [];

  // 不需要 forms 的词类
  const noFormsPos = [
    'preposition',
    'adverb',
    'interjection',
    'conjunction',
    'phrase',
    'noun phrase',
    'verb phrase',
    'adjective phrase',
    'adverb phrase',
    'prepositional phrase',
    'adverbial phrase',
    'pronoun',
    'determiner',
    'numeral',
    'phrasal verb',
    'adjective/adverb',
    'adjective/noun'
  ];
  const requiresForms = !noFormsPos.includes(word.partOfSpeech);

  if (!word.id) errors.push('缺少 id');
  if (!word.word) errors.push('缺少 word');
  if (!word.translation) errors.push('缺少 translation');
  if (!word.partOfSpeech) errors.push('缺少 partOfSpeech');
  if (requiresForms && !word.forms) errors.push('缺少 forms');
  if (!word.examples) errors.push('缺少 examples');
  if (!word.exampleTranslations) errors.push('缺少 exampleTranslations');
  if (!word.difficulty) errors.push('缺少 difficulty');
  
  // 验证 translation 结构
  if (word.translation) {
    if (typeof word.translation === 'object') {
      if (!word.translation.chinese) {
        errors.push('translation 缺少 chinese');
      }
    } else if (typeof word.translation !== 'string') {
      errors.push('translation 格式错误');
    }
  }
  
  // 验证 partOfSpeech 对应的 forms
  if (word.partOfSpeech && word.forms) {
    const validPosForms = {
      'noun': ['noun'],
      'verb': ['verb'],
      'adjective': ['adjective'],
      'adverb': ['adverb'],
      'preposition': ['preposition'],
      'pronoun': ['pronoun'],
      'conjunction': ['conjunction'],
      'determiner': ['determiner'],
      'numeral': ['numeral'],
      'interjection': ['interjection'],
      'phrase': ['phrase'],
      'noun,verb': ['noun', 'verb'],
      'adjective,noun': ['adjective', 'noun'],
      'adjective,adverb': ['adjective', 'adverb'],
      'verb,noun': ['verb', 'noun'],
      'verb,adjective': ['verb', 'adjective'],
      'noun,adjective': ['noun', 'adjective'],
      'noun phrase': ['phrase'],
      'verb phrase': ['phrase'],
      'adjective phrase': ['phrase'],
      'adverb phrase': ['phrase'],
      'prepositional phrase': ['phrase'],
      'adjective/adverb': ['adjective'],
      'noun/adjective': ['noun'],
      'reflexive verb': ['verb']
    };

    const expectedForms = validPosForms[word.partOfSpeech] || [];
    const hasValidForm = expectedForms.some(form => word.forms[form]);

    if (!hasValidForm && !noFormsPos.includes(word.partOfSpeech)) {
      errors.push(`partOfSpeech '${word.partOfSpeech}' 缺少对应的 forms 结构`);
    }
  }
  
  // 如果是可分动词，验证结构
  if (word.partOfSpeech === 'verb' && word.forms && word.forms.verb) {
    const verbForm = word.forms.verb;
    if (verbForm.isSeparable === true) {
      if (!verbForm.prefix) {
        errors.push('可分动词缺少 prefix');
      }
      if (!verbForm.present) {
        errors.push('可分动词缺少 present 变位');
      }
    }
  }
  
  if (errors.length > 0) {
    error(`单词结构错误 (${word.word || 'unknown'}): ${errors.join(', ')}`);
    return false;
  }
  return true;
}

// 验证单词是否存在于 words.json
function validateInWordsJson(word, wordsJson) {
  const found = wordsJson.find(w => w.id === word.id);
  if (!found) {
    error(`单词未同步到 words.json: ${word.word} (ID: ${word.id})`);
    return false;
  }
  
  // 验证关键字段是否一致
  const mismatches = [];
  if (found.word !== word.word) mismatches.push('word');
  // 处理partOfSpeech可能是数组的情况
  if (Array.isArray(found.partOfSpeech) && Array.isArray(word.partOfSpeech)) {
    if (JSON.stringify(found.partOfSpeech) !== JSON.stringify(word.partOfSpeech)) {
      mismatches.push('partOfSpeech');
    }
  } else if (found.partOfSpeech !== word.partOfSpeech) {
    mismatches.push('partOfSpeech');
  }
  if (found.difficulty !== word.difficulty) mismatches.push('difficulty');
  
  if (mismatches.length > 0) {
    error(`words.json 数据不匹配 (${word.word}): ${mismatches.join(', ')}`);
    return false;
  }
  
  return true;
}

// 验证 stats.json
function validateInStats(word, statsJson) {
  // stats.json 结构: { "levels": { "A1": {...}, "A2": {...} } }
  const levelStats = statsJson.levels[word.difficulty];
  if (!levelStats) {
    error(`stats.json 中找不到级别: ${word.difficulty}`);
    return false;
  }
  
  // 这里我们只是检查级别存在，详细统计会在最后检查
  return true;
}

// 验证 index.json
function validateInIndex(word, indexJson) {
  // index.json 结构: { "levels": [{ "level": "A1", "lessons": [...] }, ...] }
  const levelData = indexJson.levels.find(l => l.level === word.difficulty);
  if (!levelData) {
    error(`index.json 中找不到级别: ${word.difficulty}`);
    return false;
  }
  
  // 检查单词ID是否在 wordIds 数组中
  const foundInLesson = levelData.lessons.some(lesson => 
    lesson.wordIds && lesson.wordIds.includes(word.id)
  );
  
  if (!foundInLesson) {
    error(`单词未在 index.json 中注册: ${word.word} (ID: ${word.id})`);
    return false;
  }
  
  return true;
}

// 验证 lookup.json
function validateInLookup(word, lookupJson) {
  const found = lookupJson[word.id];
  if (!found) {
    error(`单词未在 lookup.json 中: ${word.word} (ID: ${word.id})`);
    return false;
  }
  
  // 验证关键字段是否一致
  if (found.word !== word.word) {
    error(`lookup.json word 不匹配: ${word.word} (ID: ${word.id})`);
    return false;
  }
  
  if (found.level !== word.difficulty) {
    error(`lookup.json level 不匹配: ${word.word} (ID: ${word.id})`);
    return false;
  }
  
  return true;
}

// 主验证函数
function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     词汇数据同步验证工具 (Vocabulary Sync Validator)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // 读取所有数据文件
  info('读取数据文件...\n');
  
  const wordsJsonPath = path.join(__dirname, '../web/src/data/words.json');
  const statsJsonPath = path.join(__dirname, '../web/src/data/vocabulary/stats.json');
  const indexJsonPath = path.join(__dirname, '../web/src/data/vocabulary/index.json');
  const lookupJsonPath = path.join(__dirname, '../web/src/data/vocabulary/lookup.json');
  const vocabDir = path.join(__dirname, '../web/src/data/vocabulary');
  
  let wordsJson, statsJson, indexJson, lookupJson;
  
  try {
    wordsJson = JSON.parse(fs.readFileSync(wordsJsonPath, 'utf8'));
    success(`读取 words.json: ${wordsJson.length} 个单词`);
  } catch (e) {
    error(`读取 words.json 失败: ${e.message}`);
    process.exit(1);
  }
  
  try {
    statsJson = JSON.parse(fs.readFileSync(statsJsonPath, 'utf8'));
    success(`读取 stats.json: ${statsJson.totalWords} 个单词`);
  } catch (e) {
    error(`读取 stats.json 失败: ${e.message}`);
    process.exit(1);
  }
  
  try {
    indexJson = JSON.parse(fs.readFileSync(indexJsonPath, 'utf8'));
    success(`读取 index.json: ${Object.keys(indexJson).length} 个级别`);
  } catch (e) {
    error(`读取 index.json 失败: ${e.message}`);
    process.exit(1);
  }
  
  try {
    lookupJson = JSON.parse(fs.readFileSync(lookupJsonPath, 'utf8'));
    success(`读取 lookup.json: ${Object.keys(lookupJson).length} 个单词`);
  } catch (e) {
    error(`读取 lookup.json 失败: ${e.message}`);
    process.exit(1);
  }
  
  console.log('\n' + '─'.repeat(60));
  info('开始验证词汇数据...\n');
  
  // 遍历所有级别和课程
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  let totalErrors = 0;
  let totalWordsChecked = 0;
  const wordsInVocabDir = new Set();
  
  levels.forEach(level => {
    const levelDir = path.join(vocabDir, level.toLowerCase());
    if (!fs.existsSync(levelDir)) return;
    
    const files = fs.readdirSync(levelDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return;
    
    info(`\n验证级别: ${level} (${files.length} 个课程)`);
    
    files.forEach(file => {
      const filePath = path.join(levelDir, file);
      let data;
      
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        error(`解析失败: ${file} - ${e.message}`);
        totalErrors++;
        return;
      }
      
      if (!data.words || !Array.isArray(data.words)) {
        error(`文件格式错误 (缺少 words 数组): ${file}`);
        totalErrors++;
        return;
      }
      
      data.words.forEach(word => {
        totalWordsChecked++;
        wordsInVocabDir.add(word.id);
        
        // 验证单词结构
        if (!validateWordStructure(word, file)) {
          totalErrors++;
        }
        
        // 验证同步到各个文件
        if (!validateInWordsJson(word, wordsJson)) {
          totalErrors++;
        }
        
        if (!validateInStats(word, statsJson)) {
          totalErrors++;
        }
        
        if (!validateInIndex(word, indexJson)) {
          totalErrors++;
        }
        
        if (!validateInLookup(word, lookupJson)) {
          totalErrors++;
        }
      });
    });
  });
  
  console.log('\n' + '─'.repeat(60));
  info('验证统计...\n');
  
  // 验证总数一致性
  if (wordsJson.length !== wordsInVocabDir.size) {
    error(`words.json 数量 (${wordsJson.length}) 与词汇目录数量 (${wordsInVocabDir.size}) 不匹配`);
    totalErrors++;
  } else {
    success(`words.json 与词汇目录数量一致: ${wordsJson.length}`);
  }
  
  if (statsJson.totalWords !== wordsInVocabDir.size) {
    error(`stats.json 总数 (${statsJson.totalWords}) 与词汇目录数量 (${wordsInVocabDir.size}) 不匹配`);
    totalErrors++;
  } else {
    success(`stats.json 总数一致: ${statsJson.totalWords}`);
  }
  
  if (Object.keys(lookupJson).length !== wordsInVocabDir.size) {
    error(`lookup.json 数量 (${Object.keys(lookupJson).length}) 与词汇目录数量 (${wordsInVocabDir.size}) 不匹配`);
    totalErrors++;
  } else {
    success(`lookup.json 数量一致: ${Object.keys(lookupJson).length}`);
  }
  
  // 验证各级别统计
  Object.entries(statsJson.levels).forEach(([levelKey, levelStats]) => {
    const levelData = indexJson.levels.find(l => l.level === levelKey);
    
    if (levelData) {
      let levelWordCount = 0;
      levelData.lessons.forEach(lesson => {
        if (lesson.wordIds) {
          levelWordCount += lesson.wordIds.length;
        }
      });
      
      if (levelStats.totalWords !== levelWordCount) {
        error(`${levelKey} 级别统计不匹配: stats.json (${levelStats.totalWords}) vs index.json (${levelWordCount})`);
        totalErrors++;
      } else {
        success(`${levelKey} 级别统计一致: ${levelStats.totalWords} 个单词`);
      }
    }
  });
  
  console.log('\n' + '═'.repeat(60));
  
  // 最终结果
  if (totalErrors === 0) {
    success('\n🎉 所有验证通过！数据完全同步且格式正确。');
    console.log(`   检查单词数: ${totalWordsChecked}`);
    process.exit(0);
  } else {
    error(`\n💥 发现 ${totalErrors} 个错误！需要修复。`);
    console.log(`   检查单词数: ${totalWordsChecked}`);
    process.exit(1);
  }
}

// 运行主函数
main();

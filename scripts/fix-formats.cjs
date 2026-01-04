#!/usr/bin/env node

/**
 * 修复单词数据格式
 * 将不一致的 forms 格式转换为标准格式
 */

const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 转换动词 forms 格式
function fixVerbForms(verb) {
  if (!verb.forms || !verb.forms.verb) {
    return verb;
  }

  const v = verb.forms.verb;

  // 检查 present 字段，如果有 "wij/we" 需要删除
  if (v.present && v.present['wij/we']) {
    delete v.present['wij/we'];
  }

  // 修复 present 字段：如果是 singular/plural 数组格式，转换为 ik/jij/hij/wij/jullie/zij 格式
  if (v.present && (v.present.singular || Array.isArray(v.present))) {
    // 检查是否已经是正确格式（有 ik, jij, hij 等字段）
    if (v.present.ik && v.present.jij && v.present.hij) {
      // 已经是正确格式，跳过
    } else if (v.present.singular) {
      // 处理 singular/plural 格式
      let singular = v.present.singular;
      let plural = v.present.plural || '';

      // 如果 singular 是数组，转换为对象格式
      if (Array.isArray(singular)) {
        v.present = {
          ik: singular[0] || '',
          jij: singular[1] || singular[0] || '',
          hij: singular[2] || singular[1] || singular[0] || '',
          wij: typeof plural === 'string' ? plural : (plural[0] || ''),
          jullie: typeof plural === 'string' ? plural : (plural[0] || ''),
          zij: typeof plural === 'string' ? plural : (plural[0] || '')
        };
      } else if (typeof singular === 'string') {
        // singular 是字符串，需要推断其他形式
        // 这里使用简单的规则，但最好从数据中获取
        v.present = {
          ik: singular,
          jij: singular.endsWith('t') ? singular : singular + 't',
          hij: singular.endsWith('t') ? singular : singular + 't',
          wij: typeof plural === 'string' ? plural : (singular + 'en'),
          jullie: typeof plural === 'string' ? plural : (singular + 'en'),
          zij: typeof plural === 'string' ? plural : (singular + 'en')
        };
      }
    } else if (Array.isArray(v.present) && v.present.length >= 6) {
      // present 直接是数组格式（6个元素）
      v.present = {
        ik: v.present[0] || '',
        jij: v.present[1] || '',
        hij: v.present[2] || '',
        wij: v.present[3] || '',
        jullie: v.present[4] || '',
        zij: v.present[5] || ''
      };
    }
  }

  // 如果缺少 isSeparable，添加默认值
  if (v.isSeparable === undefined) {
    v.isSeparable = false;
  }

  return verb;
}

// 转换形容词 forms 格式
function fixAdjectiveForms(word) {
  if (!word.forms || !word.forms.adjective) {
    return word;
  }

  const adj = word.forms.adjective;

  // 如果格式已经是正确的，直接返回
  if (adj.base && adj.withDe && adj.withHet && adj.comparative && adj.superlative) {
    return word;
  }

  // 尝试从现有数据提取
  let base = word.word;
  let withDe = word.word;
  let withHet = word.word;
  let comparative = null;
  let superlative = null;

  // 尝试从 indefinite 数组获取
  if (adj.indefinite && Array.isArray(adj.indefinite) && adj.indefinite.length > 0) {
    withDe = adj.indefinite[0] || word.word;
    withHet = adj.indefinite[2] || word.word;
  }

  // 尝试从 definite 数组获取
  if (adj.definite && Array.isArray(adj.definite) && adj.definite.length > 0) {
    withDe = adj.definite[0] || withDe;
  }

  // 尝试从 comparison 数组获取
  if (adj.comparison && Array.isArray(adj.comparison) && adj.comparison.length > 0) {
    comparative = adj.comparison[0];
    superlative = adj.comparison[1];
  }

  // 如果没有比较级，尝试自动生成
  if (!comparative) {
    const baseWord = word.word;
    if (baseWord.endsWith('er') || baseWord.endsWith('st') || baseWord.endsWith('en')) {
      comparative = baseWord + 'der';
      superlative = baseWord + 'dst';
    } else if (baseWord.endsWith('r')) {
      comparative = baseWord + 'der';
      superlative = baseWord + 'dst';
    } else {
      comparative = baseWord + 'er';
      superlative = baseWord + 'st';
    }
  }

  // 构建新的 forms
  word.forms.adjective = {
    base: base,
    withDe: withDe,
    withHet: withHet,
    comparative: comparative,
    superlative: superlative
  };

  return word;
}

// 从数组中提取第一个不包含冠词的值
function extractWordFromArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return null;
  }

  // 优先选择不包含冠词的值
  for (const item of arr) {
    if (typeof item === 'string' && !item.startsWith('de ') && !item.startsWith('het ')) {
      return item;
    }
  }

  // 如果没有找到，返回第一个值并去除冠词
  const first = arr[0];
  if (typeof first === 'string') {
    return first.replace(/^(de|het)\s+/, '');
  }
  return first;
}

// 转换名词 forms 格式
function fixNounForms(word) {
  if (!word.forms || !word.forms.noun) {
    return word;
  }

  const noun = word.forms.noun;
  let needsFix = false;

  // 检查是否需要修复
  if (Array.isArray(noun.singular) || Array.isArray(noun.plural)) {
    needsFix = true;
  }

  // 如果格式已经是正确的（都是字符串），且不需要修复，直接返回
  if (!needsFix && noun.article && typeof noun.singular === 'string' && typeof noun.plural === 'string') {
    return word;
  }

  // 尝试从现有数据提取
  let article = noun.article || noun.gender || 'de';
  let singular = word.word;
  let plural = null;

  // 处理 singular：如果是数组，提取第一个不包含冠词的值
  if (Array.isArray(noun.singular)) {
    const extracted = extractWordFromArray(noun.singular);
    if (extracted) {
      singular = extracted;
    }
  } else if (typeof noun.singular === 'string') {
    singular = noun.singular;
  }

  // 处理 plural：如果是数组，提取第一个不包含冠词的值
  if (Array.isArray(noun.plural)) {
    if (noun.plural.length === 0) {
      plural = '-'; // 空数组表示不可数
    } else {
      const extracted = extractWordFromArray(noun.plural);
      if (extracted) {
        plural = extracted;
      }
    }
  } else if (typeof noun.plural === 'string') {
    plural = noun.plural;
  }

  // 如果没有复数，使用 '-' 表示不可数
  if (!plural || plural === '') {
    plural = '-';
  }

  // 构建新的 forms，删除 gender 字段（如果存在）
  const fixedNoun = {
    article: article,
    singular: singular,
    plural: plural
  };

  // 如果有 uncountablePreposition，保留它
  if (noun.uncountablePreposition) {
    fixedNoun.uncountablePreposition = noun.uncountablePreposition;
  }

  word.forms.noun = fixedNoun;

  return word;
}

// 检查词性是否包含指定类型
function hasPartOfSpeech(word, pos) {
  if (Array.isArray(word.partOfSpeech)) {
    return word.partOfSpeech.includes(pos);
  }
  return word.partOfSpeech === pos;
}

// 修复所有单词的 forms
function fixAllWords(words) {
  log('\n========== 修复单词 forms 格式 ==========\n', 'blue');

  let fixedCount = 0;

  words.forEach((word, index) => {
    const originalWord = word.word;
    let wasFixed = false;

    // 处理动词
    if (hasPartOfSpeech(word, 'verb')) {
      word = fixVerbForms(word);
      wasFixed = true;
    }

    // 处理形容词
    if (hasPartOfSpeech(word, 'adjective')) {
      word = fixAdjectiveForms(word);
      wasFixed = true;
    }

    // 处理名词
    if (hasPartOfSpeech(word, 'noun')) {
      word = fixNounForms(word);
      wasFixed = true;
    }

    if (wasFixed) {
      fixedCount++;
    }
  });

  success(`修复了 ${fixedCount} 个单词的 forms 格式\n`);

  return words;
}

// 主函数
function main() {
  const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');

  try {
    const wordsContent = fs.readFileSync(wordsFilePath, 'utf8');
    let words = JSON.parse(wordsContent);

    if (!Array.isArray(words)) {
      log('words.json 必须是一个数组', 'red');
      process.exit(1);
    }

    log(`原始单词数量: ${words.length}\n`, 'blue');

    // 备份原始文件
    const backupPath = path.join(__dirname, '../web/src/data/words.json.backup2');
    fs.writeFileSync(backupPath, wordsContent, 'utf8');
    success(`已创建备份: ${backupPath}\n`);

    // 修复数据
    const fixedWords = fixAllWords(words);

    // 保存修复后的数据
    fs.writeFileSync(wordsFilePath, JSON.stringify(fixedWords, null, 2), 'utf8');

    success('✅ 单词 forms 格式修复完成！\n');
    info('运行验证脚本检查修复结果: npm run validate:words\n');

  } catch (err) {
    const error = err;
    if (error.code === 'ENOENT') {
      console.error(`找不到文件: ${wordsFilePath}`);
      process.exit(1);
    } else if (error instanceof SyntaxError) {
      console.error('words.json JSON 格式错误:');
      console.error(error.message);
      process.exit(1);
    } else {
      console.error('修复过程中出错:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// 运行脚本
main();

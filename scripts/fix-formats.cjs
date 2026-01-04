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

// 转换名词 forms 格式
function fixNounForms(word) {
  if (!word.forms || !word.forms.noun) {
    return word;
  }

  const noun = word.forms.noun;

  // 如果格式已经是正确的，直接返回
  if (noun.article && noun.singular && noun.plural) {
    return word;
  }

  // 尝试从现有数据提取
  let article = noun.article || noun.gender || 'de';
  let singular = word.word;
  let plural = null;

  // 尝试从 singular 数组获取
  if (noun.singular && Array.isArray(noun.singular) && noun.singular.length > 0) {
    singular = noun.singular[0] || word.word;
  }

  // 尝试从 plural 数组获取
  if (noun.plural && Array.isArray(noun.plural) && noun.plural.length > 0) {
    plural = noun.plural[0];
  }

  // 如果没有复数，使用 '-' 表示不可数
  if (!plural) {
    plural = '-';
  }

  // 构建新的 forms
  word.forms.noun = {
    article: article,
    singular: singular,
    plural: plural
  };

  return word;
}

// 修复所有单词的 forms
function fixAllWords(words) {
  log('\n========== 修复单词 forms 格式 ==========\n', 'blue');

  let fixedCount = 0;

  words.forEach((word, index) => {
    const originalWord = word.word;

    if (word.partOfSpeech === 'verb') {
      word = fixVerbForms(word);
      fixedCount++;
    } else if (word.partOfSpeech === 'adjective') {
      word = fixAdjectiveForms(word);
      fixedCount++;
    } else if (word.partOfSpeech === 'noun') {
      word = fixNounForms(word);
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

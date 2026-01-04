#!/usr/bin/env node

/**
 * 修复动词 forms 格式
 * 将 singular/plural 数组格式转换为标准的 ik/jij/hij/wij/jullie/zij 格式
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

// 修复动词的 present 格式
function fixVerbPresent(verb) {
  if (!verb || !verb.verb || !verb.verb.present) {
    return verb;
  }

  const v = verb.verb;

  // 检查是否已经是正确格式
  if (v.present.ik && v.present.jij && v.present.hij &&
      v.present.wij && v.present.jullie && v.present.zij) {
    return verb;
  }

  // 检查是否是数组格式（直接包含6个元素）
  if (Array.isArray(v.present) && v.present.length >= 6) {
    v.present = {
      ik: v.present[0] || '',
      jij: v.present[1] || '',
      hij: v.present[2] || '',
      wij: v.present[3] || '',
      jullie: v.present[4] || '',
      zij: v.present[5] || ''
    };
    return verb;
  }

  // 检查是否是 singular/plural 格式
  if (v.present.singular) {
    let singular = v.present.singular;
    let plural = v.present.plural;

    // 如果 singular 是数组，取元素
    if (Array.isArray(singular)) {
      v.present = {
        ik: singular[0] || '',
        jij: singular[1] || '',
        hij: singular[2] || '',
        wij: typeof plural === 'string' ? plural : '',
        jullie: typeof plural === 'string' ? plural : '',
        zij: typeof plural === 'string' ? plural : ''
      };
    } else if (typeof singular === 'string') {
      // 如果 singular 是字符串，自动推断其他形式
      v.present = {
        ik: singular,
        jij: singular + 't',
        hij: singular + 't',
        wij: plural || singular + 'n',
        jullie: plural || singular + 'n',
        zij: plural || singular + 'n'
      };
    }
  }

  return verb;
}

// 修复动词的 past 格式
function fixVerbPast(verb) {
  if (!verb || !verb.verb || !verb.verb.past) {
    return verb;
  }

  const v = verb.verb;

  // 检查是否已经是正确格式
  if (v.past.singular && v.past.plural) {
    return verb;
  }

  // 检查是否是数组格式（直接包含6个元素）
  if (Array.isArray(v.past) && v.past.length >= 6) {
    // 取第一个作为 singular，取第四个作为 plural（前3个是单数，后3个是复数）
    v.past = {
      singular: v.past[0] || '',
      plural: v.past[3] || ''
    };
    return verb;
  }

  // 检查是否是字符串格式
  if (typeof v.past === 'string') {
    const past = v.past;
    // 根据动词原形推断复数形式
    const infinitive = v.infinitive || '';
    let plural = past;

    // 简单规则：如果过去时以 'de' 结尾，复数通常改为 'den'
    if (past.endsWith('de') && !past.endsWith('iden')) {
      plural = past.slice(0, -2) + 'den';
    }
    // 如果以 'te' 结尾
    else if (past.endsWith('te') && !past.endsWith('ite')) {
      plural = past.slice(0, -2) + 'ten';
    }

    v.past = {
      singular: past,
      plural: plural
    };
    return verb;
  }

  return verb;
}

// 修复所有动词
function fixAllVerbs(words) {
  log('\n========== 修复动词 present 格式 ==========\n', 'blue');

  let fixedCount = 0;

  words.forEach((word, index) => {
    if (word.partOfSpeech === 'verb' && word.forms && word.forms.verb) {
      word.forms = fixVerbPresent(word.forms);
      word.forms = fixVerbPast(word.forms);
      fixedCount++;
    }
  });

  success(`修复了 ${fixedCount} 个动词的 present/past 格式\n`);

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
    const backupPath = path.join(__dirname, '../web/src/data/words.json.backup3');
    fs.writeFileSync(backupPath, wordsContent, 'utf8');
    success(`已创建备份: ${backupPath}\n`);

    // 修复数据
    const fixedWords = fixAllVerbs(words);

    // 保存修复后的数据
    fs.writeFileSync(wordsFilePath, JSON.stringify(fixedWords, null, 2), 'utf8');

    success('✅ 动词 present 格式修复完成！\n');
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

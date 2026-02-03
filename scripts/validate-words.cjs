#!/usr/bin/env node

/**
 * 单词数据验证脚本
 * 用于验证 words.json 中的单词数据是否符合规则
 */

const fs = require('fs');
const path = require('path');

// 不需要forms字段的词性列表
const noFormsPos = [
  'preposition', 'adverb', 'interjection', 'conjunction', 'phrase',
  'noun phrase', 'verb phrase', 'adjective phrase', 'adverb phrase',
  'prepositional phrase', 'adverbial phrase', 'pronoun', 'determiner',
  'numeral', 'phrasal verb', 'adjective/adverb', 'adjective/noun'
];

// 颜色输出
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

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 验证单词数据
function validateWords(words) {
  let totalErrors = 0;
  let totalWarnings = 0;

  log('\n========== 单词数据验证 ==========\n', 'blue');

  // 检查重复的id和单词
  const idMap = new Map();
  const wordMap = new Map();
  words.forEach((word, index) => {
    if (idMap.has(word.id)) {
      error(`  重复的 id: ${word.id} (位置 #${index + 1} 与 #${idMap.get(word.id) + 1})`);
      totalErrors++;
    } else {
      idMap.set(word.id, index);
    }

    if (wordMap.has(word.word)) {
      error(`  重复的单词: "${word.word}" (位置 #${index + 1} 与 #${wordMap.get(word.word) + 1})`);
      totalErrors++;
    } else {
      wordMap.set(word.word, index);
    }
  });

  words.forEach((word, index) => {
    const wordNumber = index + 1;
    let hasErrors = false;

    log(`\n验证单词 #${wordNumber}: ${word.word}`, 'blue');

    // 基本字段验证
    if (!word.id) {
      error(`  缺少 id 字段`);
      hasErrors = true;
      totalErrors++;
    }

    if (!word.word || typeof word.word !== 'string') {
      error(`  缺少或无效的 word 字段`);
      hasErrors = true;
      totalErrors++;
    }

    if (!word.translation) {
      error(`  缺少 translation 字段`);
      hasErrors = true;
      totalErrors++;
    } else {
      if (!word.translation.chinese) {
        error(`  缺少 translation.chinese 字段`);
        hasErrors = true;
        totalErrors++;
      }
      if (!word.translation.english) {
        error(`  缺少 translation.english 字段`);
        hasErrors = true;
        totalErrors++;
      }
    }

    if (!word.partOfSpeech) {
      error(`  缺少 partOfSpeech 字段`);
      hasErrors = true;
      totalErrors++;
    }

    if (!word.examples || !Array.isArray(word.examples) || word.examples.length === 0) {
      error(`  缺少或无效的 examples 字段`);
      hasErrors = true;
      totalErrors++;
    }

    if (!word.difficulty || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(word.difficulty)) {
      error(`  缺少或无效的 difficulty 字段 (必须是 A1/A2/B1/B2/C1/C2)`);
      hasErrors = true;
      totalErrors++;
    }

    // 验证 exampleTranslations
    if (word.examples && word.examples.length > 0) {
      if (!word.exampleTranslations) {
        warning(`  缺少 exampleTranslations 字段`);
        totalWarnings++;
      } else {
        if (!Array.isArray(word.exampleTranslations)) {
          const translations = word.exampleTranslations;
          if (!translations.chinese || !Array.isArray(translations.chinese)) {
            warning(`  缺少或无效的 exampleTranslations.chinese 字段`);
            totalWarnings++;
          }
          if (!translations.english || !Array.isArray(translations.english)) {
            warning(`  缺少或无效的 exampleTranslations.english 字段`);
            totalWarnings++;
          }
        }
      }
    }

    // 按词性验证
    if (word.forms) {
      if (word.partOfSpeech === 'noun') {
        const nounInfo = word.forms.noun;
        if (!nounInfo) {
          error(`  名词必须包含 forms.noun 字段`);
          hasErrors = true;
          totalErrors++;
        } else {
          // 验证冠词
          if (!nounInfo.article) {
            error(`  名词必须包含 article 字段 (de 或 het)`);
            hasErrors = true;
            totalErrors++;
          } else if (!['de', 'het'].includes(nounInfo.article)) {
            error(`  article 必须是 'de' 或 'het'`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证单数形式
          if (!nounInfo.singular) {
            error(`  名词必须包含 singular 字段`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证复数形式
          if (!nounInfo.plural) {
            error(`  名词必须包含 plural 字段`);
            hasErrors = true;
            totalErrors++;
          }
        }
      } else if (word.partOfSpeech === 'verb') {
        const verbInfo = word.forms.verb;
        if (!verbInfo) {
          error(`  动词必须包含 forms.verb 字段`);
          hasErrors = true;
          totalErrors++;
        } else {
          // 验证动词原形
          if (!verbInfo.infinitive) {
            error(`  动词必须包含 infinitive 字段`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证可分动词标注
          if (verbInfo.isSeparable === undefined) {
            error(`  动词必须包含 isSeparable 字段 (true 或 false)`);
            hasErrors = true;
            totalErrors++;
          } else if (verbInfo.isSeparable) {
            // 可分动词必须有前缀
            if (!verbInfo.prefix) {
              error(`  可分动词必须包含 prefix 字段`);
              hasErrors = true;
              totalErrors++;
            }
          }

          // 验证现在时变位
          if (!verbInfo.present) {
            error(`  动词必须包含 present 变位字段`);
            hasErrors = true;
            totalErrors++;
          } else {
            const required = ['ik', 'jij', 'hij', 'wij', 'jullie', 'zij'];
            required.forEach(person => {
              if (!verbInfo.present[person]) {
                error(`  动词现在时变位缺少 ${person} 字段`);
                hasErrors = true;
                totalErrors++;
              }
            });
          }

          // 验证过去时变位
          if (!verbInfo.past) {
            error(`  动词必须包含 past 变位字段`);
            hasErrors = true;
            totalErrors++;
          } else {
            if (!verbInfo.past.singular) {
              error(`  动词过去时变位缺少 singular 字段`);
              hasErrors = true;
              totalErrors++;
            }
            if (!verbInfo.past.plural) {
              error(`  动词过去时变位缺少 plural 字段`);
              hasErrors = true;
              totalErrors++;
            }
          }

          // 验证过去分词
          if (!verbInfo.pastParticiple) {
            error(`  动词必须包含 pastParticiple 字段`);
            hasErrors = true;
            totalErrors++;
          }
        }
      } else if (word.partOfSpeech === 'adjective') {
        const adjInfo = word.forms.adjective;
        if (!adjInfo) {
          error(`  形容词必须包含 forms.adjective 字段`);
          hasErrors = true;
          totalErrors++;
        } else {
          // 验证原形
          if (!adjInfo.base) {
            error(`  形容词必须包含 base 字段`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证与de连用
          if (!adjInfo.withDe) {
            error(`  形容词必须包含 withDe 字段`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证与het连用
          if (!adjInfo.withHet) {
            error(`  形容词必须包含 withHet 字段`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证比较级
          if (!adjInfo.comparative) {
            error(`  形容词必须包含 comparative 字段`);
            hasErrors = true;
            totalErrors++;
          }

          // 验证最高级
          if (!adjInfo.superlative) {
            error(`  形容词必须包含 superlative 字段`);
            hasErrors = true;
            totalErrors++;
          }
        }
      }
    } else {
      // 只有当partOfSpeech不在noFormsPos列表中时才发出警告
      const posList = Array.isArray(word.partOfSpeech) ? word.partOfSpeech : [word.partOfSpeech];
      const shouldWarn = posList.every(pos => {
        return !noFormsPos.some(noPos => pos.toLowerCase().includes(noPos.toLowerCase()));
      });

      if (shouldWarn) {
        warning(`  ${word.partOfSpeech} 建议包含 forms 字段`);
        totalWarnings++;
      }
    }

    if (!hasErrors) {
      success(`  单词验证通过`);
    }
  });

  // 输出总结
  log('\n========== 验证总结 ==========\n', 'blue');
  
  if (totalErrors === 0 && totalWarnings === 0) {
    success(`所有 ${words.length} 个单词验证通过！`);
    log('\n🎉 数据质量优秀，可以提交！\n', 'green');
    return true;
  } else {
    if (totalErrors > 0) {
      error(`发现 ${totalErrors} 个错误`);
    }
    if (totalWarnings > 0) {
      warning(`发现 ${totalWarnings} 个警告`);
    }
    log('\n请根据上述提示修正数据后重新运行验证。\n', 'yellow');
    log('查看详细规则：WORD_VALIDATION_RULES.md\n', 'blue');
    return false;
  }
}

// 主函数
function main() {
  // 从 web 目录运行，所以需要回到项目根目录
  const wordsFilePath = path.join(__dirname, '../web/src/data/words.json');

  try {
    const wordsContent = fs.readFileSync(wordsFilePath, 'utf8');
    const words = JSON.parse(wordsContent);

    if (!Array.isArray(words)) {
      error('words.json 必须是一个数组');
      process.exit(1);
    }

    if (words.length === 0) {
      warning('words.json 为空数组');
      process.exit(0);
    }

    const isValid = validateWords(words);
    process.exit(isValid ? 0 : 1);

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
      console.error('验证过程中出错:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// 运行脚本
main();

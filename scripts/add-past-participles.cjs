#!/usr/bin/env node

/**
 * 为缺少 pastParticiple 的动词添加过去分词
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

// 手动添加的过去分词映射
const pastParticiples = {
  "tegenvallen": "tegengevallen",
  "uitbreiden": "uitgebreid",
  "uitgeven": "uitgegeven",
  "uitrusten": "uitgerust",
  "uitstappen": "uitgestapt",
  "uitvoeren": "uitgevoerd",
  "uitzoeken": "uitgezocht",
  "vaststellen": "vastgesteld",
  "vechten": "gevochten",
  "verbeteren": "verbeterd",
  "verbieden": "verboden",
  "verbouwen": "verbouwd",
  "verdagaan": "uitgedaagd",
  "verdelen": "verdeeld",
  "verdienen": "verdiend",
  "verdragen": "verdrogen",
  "verdwijnen": "verdwonnen",
  "vergeven": "vergeven",
  "vergeten": "vergeten",
  "verhogen": "verhoogd",
  "verhuren": "verhuurd",
  "verhuizen": "verhuisd",
  "verklaren": "verklaard",
  "verkopen": "verkocht",
  "verliezen": "verloren",
  "verminderen": "verminderd",
  "veroorzaken": "veroorzaakt",
  "verrassen": "verrast",
  "versturen": "verzonden",
  "vertalen": "vertaald",
  "vertrouwen": "vertrouwd",
  "vervangen": "vervangen",
  "verwachten": "verwacht",
  "verwarmen": "verwarmd",
  "verwijderen": "verwijderd",
  "verwijzen": "verwezen",
  "verzekeren": "verzekerd",
  "vestigen": "gevestigd",
  "voeden": "gevoed",
  "volgen": "gevolgd",
  "voorbereiden": "voorbereid",
  "waarderen": "gewaardeerd",
  "waarschuwen": "gewaarschuwd",
  "wegen": "gewogen",
  "weigeren": "geweigerd",
  "verlaten": "verlaten",
  "verlengen": "verlengd",
  "vermijden": "vermeden",
  "vermoeden": "vermoed",
  "verplichten": "verplicht",
  "verrijken": "verrijkt",
  "verschepen": "verscheept",
  "verschillen": "verschild",
  "verschijnen": "verschenen",
  "verstaan": "verstaan"
};

// 为动词添加 pastParticiple
function addPastParticiples(words) {
  log('\n========== 添加动词 pastParticiple ==========\n', 'blue');

  let fixedCount = 0;

  words.forEach((word, index) => {
    if (word.partOfSpeech === 'verb' && word.forms && word.forms.verb) {
      if (!word.forms.verb.pastParticiple && pastParticiples[word.word]) {
        word.forms.verb.pastParticiple = pastParticiples[word.word];
        fixedCount++;
        info(`添加 ${word.word} 的过去分词: ${pastParticiples[word.word]}`);
      }
    }
  });

  success(`\n为 ${fixedCount} 个动词添加了 pastParticiple\n`);

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
    const backupPath = path.join(__dirname, '../web/src/data/words.json.backup4');
    fs.writeFileSync(backupPath, wordsContent, 'utf8');
    success(`已创建备份: ${backupPath}\n`);

    // 添加过去分词
    const fixedWords = addPastParticiples(words);

    // 保存修复后的数据
    fs.writeFileSync(wordsFilePath, JSON.stringify(fixedWords, null, 2), 'utf8');

    success('✅ 动词 pastParticiple 添加完成！\n');
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

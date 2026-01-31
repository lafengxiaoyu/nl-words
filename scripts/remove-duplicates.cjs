const fs = require('fs');
const path = require('path');

const VOCABULARY_DIR = path.join(__dirname, '../web/src/data/vocabulary');
const LEVELS = ['a1', 'a2', 'b1', 'b2'];
const WORDS_JSON_PATH = path.join(__dirname, '../web/src/data/words.json');

// 获取所有单词（按出现顺序）
function getAllWords() {
  const words = JSON.parse(fs.readFileSync(WORDS_JSON_PATH, 'utf-8'));
  return words;
}

// 查找重复单词
function findDuplicates(words) {
  const seen = new Map();
  const duplicates = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].word.toLowerCase();
    if (seen.has(word)) {
      const firstIndex = seen.get(word);
      duplicates.push({
        word: word,
        firstIndex: firstIndex,
        secondIndex: i,
        firstId: words[firstIndex].id,
        secondId: words[i].id,
        firstLevel: words[firstIndex].difficulty,
        secondLevel: words[i].difficulty
      });
    } else {
      seen.set(word, i);
    }
  }

  return duplicates;
}

// 找到单词在哪个lesson文件中
function findWordInFiles(wordId) {
  for (const level of LEVELS) {
    const levelDir = path.join(VOCABULARY_DIR, level);
    if (!fs.existsSync(levelDir)) continue;

    const files = fs.readdirSync(levelDir)
      .filter(f => f.startsWith('lesson-') && f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(levelDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (data.words) {
        const wordIndex = data.words.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
          return { level, file, filePath, wordIndex };
        }
      }
    }
  }

  return null;
}

// 从lesson文件中删除单词
function removeWordFromFile(location) {
  const { filePath, wordIndex } = location;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  data.words.splice(wordIndex, 1);
  data.totalWords = data.words.length;

  // 更新剩余单词的ID
  for (let i = wordIndex; i < data.words.length; i++) {
    data.words[i].id--;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  已删除: ${path.basename(filePath)} (位置 ${wordIndex + 1})`);

  return data.totalWords;
}

function main() {
  console.log('🔍 开始查找和删除重复单词...\n');

  // 获取所有单词
  const allWords = getAllWords();
  console.log(`总单词数: ${allWords.length}\n`);

  // 查找重复
  const duplicates = findDuplicates(allWords);
  console.log(`找到 ${duplicates.length} 个重复单词\n`);

  if (duplicates.length === 0) {
    console.log('✅ 没有重复单词');
    return;
  }

  // 按第二个单词的ID排序（从大到小），避免删除时影响ID
  duplicates.sort((a, b) => b.secondId - a.secondId);

  // 显示前10个重复单词
  console.log('重复单词示例（前10个）:');
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`  "${dup.word}" - 第一次出现: #${dup.firstId} (${dup.firstLevel}), 第二次出现: #${dup.secondId} (${dup.secondLevel})`);
  });
  console.log();

  // 逐个删除重复单词
  let deletedCount = 0;
  for (const dup of duplicates) {
    console.log(`处理重复单词: "${dup.word}" (#${dup.secondId})`);

    const location = findWordInFiles(dup.secondId);
    if (location) {
      removeWordFromFile(location);
      deletedCount++;
    } else {
      console.log(`  ⚠️  未找到单词 #${dup.secondId}`);
    }
    console.log();
  }

  console.log(`✅ 删除完成！共删除 ${deletedCount} 个重复单词\n`);

  // 重新生成索引
  console.log('🔄 重新生成词汇索引...');
  const { execSync } = require('child_process');
  execSync('node scripts/generate-vocab-index.cjs', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('\n✅ 完成！请运行验证脚本确认: node scripts/validate-words.cjs');
}

main();

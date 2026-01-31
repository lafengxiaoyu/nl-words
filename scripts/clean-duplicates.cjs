const fs = require('fs');
const path = require('path');

const VOCABULARY_DIR = path.join(__dirname, '../web/src/data/vocabulary');
const LEVELS = ['a1', 'a2', 'b1', 'b2'];

// 收集所有单词并记录位置
function collectAllWords() {
  const allWords = new Map(); // word -> { id, level, file, wordData }

  for (const level of LEVELS) {
    const levelDir = path.join(VOCABULARY_DIR, level);
    if (!fs.existsSync(levelDir)) continue;

    const files = fs.readdirSync(levelDir)
      .filter(f => f.startsWith('lesson-') && f.endsWith('.json'))
      .sort();

    for (const file of files) {
      const filePath = path.join(levelDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (data.words) {
        for (const word of data.words) {
          const wordKey = word.word.toLowerCase();
          if (!allWords.has(wordKey)) {
            // 第一次出现，保留
            allWords.set(wordKey, {
              id: word.id,
              level,
              file,
              wordData: word
            });
          } else {
            // 重复，记录要删除
            const existing = allWords.get(wordKey);
            console.log(`重复: "${word}" (${level}/${file} #${word.id}) - 已存在于 ${existing.level}/${existing.file}`);
          }
        }
      }
    }
  }

  return allWords;
}

// 清理重复单词并重新生成文件
function cleanDuplicates() {
  console.log('🔍 开始清理重复单词...\n');

  // 收集所有要保留的单词
  const keptWords = collectAllWords();

  // 按级别和文件分组
  const filesToWrite = new Map();
  for (const [wordKey, info] of keptWords.entries()) {
    const key = `${info.level}/${info.file}`;
    if (!filesToWrite.has(key)) {
      filesToWrite.set(key, []);
    }
    filesToWrite.get(key).push(info.wordData);
  }

  // 写入清理后的文件
  let totalWords = 0;
  for (const [key, words] of filesToWrite.entries()) {
    const [level, file] = key.split('/');
    const filePath = path.join(VOCABULARY_DIR, level, file);

    // 重新排序并分配 ID
    words.sort((a, b) => {
      // 保持原始文件中的顺序
      return a.id - b.id;
    });

    // 重新分配 ID
    words.forEach((word, index) => {
      word.id = index + 1;
    });

    totalWords += words.length;

    const fileData = {
      id: file.replace('lesson-', '').replace('.json', ''),
      level: level.toUpperCase(),
      lessonNumber: parseInt(file.replace('lesson-', '').replace('.json', '')),
      totalWords: words.length,
      words: words
    };

    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
  }

  console.log(`\n✅ 清理完成！`);
  console.log(`总单词数: ${totalWords}`);

  // 重新生成索引
  console.log('\n🔄 重新生成词汇索引...');
  const { execSync } = require('child_process');
  execSync('node scripts/generate-vocab-index.cjs', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('\n✅ 完成！');
}

cleanDuplicates();

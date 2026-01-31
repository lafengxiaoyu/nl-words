const fs = require('fs');
const path = require('path');

const VOCABULARY_DIR = path.join(__dirname, '../web/src/data/vocabulary');
const LEVELS = ['a1', 'a2', 'b1', 'b2'];

// 找出重复单词（第二次及之后出现的）
function findDuplicates() {
  const seen = new Map(); // word -> first occurrence info
  const duplicates = [];

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
        for (let i = 0; i < data.words.length; i++) {
          const word = data.words[i];
          const wordKey = word.word.toLowerCase();

          if (seen.has(wordKey)) {
            // 这是重复的，记录要删除
            duplicates.push({
              level,
              file,
              filePath,
              index: i,
              wordId: word.id,
              word: wordKey,
              firstLevel: seen.get(wordKey).level,
              firstFile: seen.get(wordKey).file
            });
          } else {
            // 第一次出现，记录
            seen.set(wordKey, { level, file });
          }
        }
      }
    }
  }

  return duplicates;
}

// 从后往前删除（避免索引变化）
function removeDuplicates(duplicates) {
  // 按文件和位置倒序排序，从后往前删除
  duplicates.sort((a, b) => {
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    return b.index - a.index;
  });

  console.log(`找到 ${duplicates.length} 个重复单词\n`);

  let deletedCount = 0;
  for (const dup of duplicates) {
    const data = JSON.parse(fs.readFileSync(dup.filePath, 'utf-8'));
    data.words.splice(dup.index, 1);
    data.totalWords = data.words.length;
    fs.writeFileSync(dup.filePath, JSON.stringify(data, null, 2));
    deletedCount++;

    if (deletedCount % 50 === 0) {
      console.log(`已删除 ${deletedCount}/${duplicates.length} 个重复单词`);
    }
  }

  console.log(`\n✅ 删除完成！共删除 ${deletedCount} 个重复单词`);
}

function main() {
  console.log('🔍 开始查找和删除重复单词...\n');

  const duplicates = findDuplicates();
  if (duplicates.length === 0) {
    console.log('✅ 没有重复单词');
    return;
  }

  // 显示一些示例
  console.log('重复单词示例（前5个）:');
  duplicates.slice(0, 5).forEach(dup => {
    console.log(`  "${dup.word}" (ID: ${dup.wordId}) - ${dup.level}/${dup.file}`);
    console.log(`    第一次出现在: ${dup.firstLevel}/${dup.firstFile}\n`);
  });

  removeDuplicates(duplicates);

  // 重新生成索引
  console.log('\n🔄 重新生成词汇索引...');
  const { execSync } = require('child_process');
  execSync('node scripts/generate-vocab-index.cjs', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('\n✅ 完成！请运行验证脚本确认: node scripts/validate-words.cjs');
}

main();

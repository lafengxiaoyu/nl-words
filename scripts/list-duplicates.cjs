const fs = require('fs');
const path = require('path');

const VOCABULARY_DIR = path.join(__dirname, '../web/src/data/vocabulary');
const LEVELS = ['a1', 'a2', 'b1', 'b2'];

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
        for (const word of data.words) {
          const wordKey = word.word.toLowerCase();

          if (seen.has(wordKey)) {
            // 这是重复的，记录要删除
            const first = seen.get(wordKey);
            duplicates.push({
              word: word.word,
              id: word.id,
              level,
              file,
              firstId: first.id,
              firstLevel: first.level,
              firstFile: first.file,
              translation: word.translation ? `${word.translation.chinese || ''} / ${word.translation.english || ''}` : 'N/A',
              firstTranslation: first.translation ? `${first.translation.chinese || ''} / ${first.translation.english || ''}` : 'N/A'
            });
          } else {
            // 第一次出现，记录
            seen.set(wordKey, {
              id: word.id,
              level,
              file,
              translation: word.translation
            });
          }
        }
      }
    }
  }

  return duplicates;
}

function main() {
  console.log('🔍 查找重复单词...\n');

  const duplicates = findDuplicates();

  if (duplicates.length === 0) {
    console.log('✅ 没有重复单词');
    return;
  }

  console.log(`找到 ${duplicates.length} 个重复单词\n`);
  console.log('='.repeat(120));
  console.log('重复单词列表');
  console.log('='.repeat(120));

  duplicates.forEach((dup, index) => {
    console.log(`\n[${index + 1}/${duplicates.length}] "${dup.word}"`);
    console.log(`  保留: ${dup.firstLevel}/${dup.firstFile} (ID: ${dup.firstId})`);
    console.log(`  翻译: ${dup.firstTranslation}`);
    console.log(`  删除: ${dup.level}/${dup.file} (ID: ${dup.id})`);
    console.log(`  翻译: ${dup.translation}`);
    console.log('-'.repeat(120));
  });

  console.log(`\n总计: ${duplicates.length} 个重复单词需要删除\n`);
  console.log('请审阅上述列表，确认无误后运行删除脚本。');
}

main();

const fs = require('fs');
const path = require('path');

const VOCABULARY_DIR = path.join(__dirname, '../web/src/data/vocabulary');
const LEVELS = ['a1', 'a2', 'b1', 'b2'];

function findDuplicates() {
  const seen = new Map();
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
            duplicates.push({
              level,
              file,
              filePath,
              index: i,
              wordId: word.id,
              word: wordKey
            });
          } else {
            seen.set(wordKey, true);
          }
        }
      }
    }
  }

  return duplicates;
}

function removeDuplicates(duplicates) {
  // 按文件分组
  const byFile = new Map();
  for (const dup of duplicates) {
    const key = dup.filePath;
    if (!byFile.has(key)) {
      byFile.set(key, []);
    }
    byFile.get(key).push(dup);
  }

  console.log(`找到 ${duplicates.length} 个重复单词，分布在 ${byFile.size} 个文件中\n`);

  // 对每个文件中的重复项按索引倒序排序，从后往前删除
  let deletedCount = 0;
  for (const [filePath, dups] of byFile.entries()) {
    dups.sort((a, b) => b.index - a.index);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const dup of dups) {
      data.words.splice(dup.index, 1);
      deletedCount++;
    }

    data.totalWords = data.words.length;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`  ✓ ${path.basename(filePath)} - 删除 ${dups.length} 个单词`);
  }

  console.log(`\n✅ 删除完成！共删除 ${deletedCount} 个重复单词`);
}

function main() {
  console.log('🔍 开始删除重复单词...\n');

  const duplicates = findDuplicates();
  if (duplicates.length === 0) {
    console.log('✅ 没有重复单词');
    return;
  }

  console.log('📝 删除详情:\n');
  removeDuplicates(duplicates);

  // 重新生成索引
  console.log('\n🔄 重新生成词汇索引...');
  const { execSync } = require('child_process');
  execSync('node scripts/generate-vocab-index.cjs', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('\n✅ 完成！');

  // 验证
  console.log('\n📊 最终统计:');
  execSync('node -e "const data = require(\'./web/src/data/vocabulary/index.json\'); data.levels.forEach(l => console.log(\`\${l.level}: \${l.totalWords} words\`))"', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
}

main();

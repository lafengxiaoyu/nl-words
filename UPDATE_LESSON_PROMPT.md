# 更新 Lesson 到主文件的 Prompt 模板

## 使用说明

复制以下内容，将 `{LEVEL}` 和 `{LESSON_NUM}` 替换为实际值后发给 AI：

---

## 任务

我刚刚创建了新的 lesson 文件 `web/src/data/vocabulary/{LEVEL}/lesson-{LESSON_NUM}.json`，包含新单词。

请执行以下任务来更新主数据文件：

### 1. 验证 lesson 文件

首先检查 lesson 文件是否有语法错误：

```bash
node -e "const fs = require('fs'); const content = fs.readFileSync('web/src/data/vocabulary/{LEVEL}/lesson-{LESSON_NUM}.json', 'utf8'); try { JSON.parse(content); console.log('✅ JSON valid'); } catch (e) { console.log('❌ Error:', e.message); }"
```

如果有错误，检查所有 `examples` 数组结尾：
- **错误模式**：`examples` 数组使用了 `}` 结尾而不是 `]`
- **修复方法**：将该行的 `}` 改为 `]`

### 2. 运行词汇生成脚本

```bash
cd /Users/mac/IdeaProjects/nl-words
node scripts/generate-vocab-index.cjs
```

这个脚本会自动更新：
- ✅ `web/src/data/words.json` - 所有单词的完整数据
- ✅ `web/src/data/vocabulary/index.json` - 课程索引
- ✅ `web/src/data/vocabulary/lookup.json` - 单词查找表
- ✅ `web/src/data/vocabulary/stats.json` - 统计信息
- ✅ `all_words.txt` - 所有单词列表

### 3. 验证数据质量

```bash
node scripts/validate-words.cjs
```

确认输出显示：
```
✅ 所有 XXXX 个单词验证通过！
🎉 数据质量优秀，可以提交！
```

### 4. 检查更新结果

检查文件是否正确更新：

```bash
# 检查 words.json 单词数量
cat web/src/data/words.json | jq 'length'

# 检查 index.json 是否包含新 lesson
cat web/src/data/vocabulary/index.json | jq '.levels[] | select(.level == "{LEVEL_UPPER}") | .lessons[] | select(.file | contains("lesson-{LESSON_NUM}"))'

# 检查 stats.json 统计信息
cat web/src/data/vocabulary/stats.json | jq '.totalWords, .totalLessons'
```

预期结果：
- `words.json` 应该比之前多 `{NEW_WORD_COUNT}` 个单词
- `index.json` 应该显示 `{LEVEL_UPPER}` 级别包含新 lesson
- `stats.json` 应该更新总单词数和总课程数

## 变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `{LEVEL}` | 级别目录名（小写） | `c1`, `b2`, `a1` |
| `{LESSON_NUM}` | Lesson 编号（补零） | `02`, `31`, `01` |
| `{LEVEL_UPPER}` | 级别名称（大写） | `C1`, `B2`, `A1` |
| `{NEW_WORD_COUNT}` | 新增单词数量 | `88`, `50`, `45` |

## 示例

**场景：创建 C1 lesson-02，包含 88 个单词**

替换变量后：
- `{LEVEL}` → `c1`
- `{LESSON_NUM}` → `02`
- `{LEVEL_UPPER}` → `C1`
- `{NEW_WORD_COUNT}` → `88`

执行的命令：
```bash
node -e "const fs = require('fs'); const content = fs.readFileSync('web/src/data/vocabulary/c1/lesson-02.json', 'utf8'); try { JSON.parse(content); console.log('✅ JSON valid'); } catch (e) { console.log('❌ Error:', e.message); }"
```

**场景：创建 B2 lesson-31，包含 50 个单词**

替换变量后：
- `{LEVEL}` → `b2`
- `{LESSON_NUM}` → `31`
- `{LEVEL_UPPER}` → `B2`
- `{NEW_WORD_COUNT}` → `50`

执行的命令：
```bash
node -e "const fs = require('fs'); const content = fs.readFileSync('web/src/data/vocabulary/b2/lesson-31.json', 'utf8'); try { JSON.parse(content); console.log('✅ JSON valid'); } catch (e) { console.log('❌ Error:', e.message); }"
```

## 注意事项

1. **必须先修复 lesson 文件的 JSON 语法错误**（如果存在）
2. **按顺序执行**：验证 JSON → 生成索引 → 验证数据
3. **不要跳过验证步骤**，确保数据完整性
4. **更新 INSTRUCTION.md** 中的全局最大 ID（如有新增单词）

## 输出要求

完成后请提供：

1. ✅ JSON 验证结果（通过/失败）
2. ✅ `generate-vocab-index.cjs` 的完整输出
3. ✅ `validate-words.cjs` 的完整输出
4. ✅ 更新后的文件统计信息：
   - `words.json` 单词总数
   - `index.json` 中 `{LEVEL_UPPER}` 的 lesson 数量
   - `stats.json` 总单词数和总课程数

---

## 快速执行命令（替换变量后可直接运行）

```bash
# 1. 验证 JSON
node -e "const fs = require('fs'); const content = fs.readFileSync('web/src/data/vocabulary/{LEVEL}/lesson-{LESSON_NUM}.json', 'utf8'); try { JSON.parse(content); console.log('✅ JSON valid'); } catch (e) { console.log('❌ Error:', e.message); }"

# 2. 生成索引
node scripts/generate-vocab-index.cjs

# 3. 验证数据
node scripts/validate-words.cjs

# 4. 检查结果
echo "=== words.json 单词数 ===" && cat web/src/data/words.json | jq 'length'
echo "=== {LEVEL_UPPER} lesson 数量 ===" && cat web/src/data/vocabulary/index.json | jq '.levels[] | select(.level == "{LEVEL_UPPER}") | .lessons | length'
echo "=== 总统计 ===" && cat web/src/data/vocabulary/stats.json | jq '{totalWords, totalLessons}'
```

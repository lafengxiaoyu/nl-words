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

---

## 改进现有单词 Notes 的指南

当发现单词的 notes 只是简单重复词性（如"名词"、"动词"等）时，应改进为更有价值的学习信息。

### 有意义的 Notes 应包含以下内容（至少一项）：

1. **使用场景和上下文**
   - 常用于什么领域或语境（医学、法律、日常口语等）
   - 例："医学术语，指疾病或病症"

2. **固定搭配和短语**
   - 常见的固定搭配、习语或短语动词
   - 例："固定搭配：abonnement opzeggen（取消订阅）"

3. **同义词和反义词**
   - 帮助扩展词汇网络
   - 例："同义词：brommerig, humeurig（易怒的）"

4. **语体色彩**
   - 正式用语 vs 口语表达
   - 例："俚语：青少年用语，同义词：cool"

5. **语法注意事项**
   - 特殊变位、可数/不可数、及物/不及物等
   - 例："可分动词，前缀可分离：aan-"

6. **词源和构词法**
   - 帮助记忆单词构成
   - 例："词根：socio-（社会）+ logie（学科）"

7. **易混淆点**
   - 常见错误或特殊用法
   - 例："多义词：既有'点燃'义，也有'涨价'义"

8. **专业领域知识**
   - 特定领域的专业用法或背景
   - 例："法律术语：正式执行计划或政策"

### 示例对比

#### ❌ 差的 notes（无价值）
```json
{
  "word": "aanbetaling",
  "partOfSpeech": "noun",
  "notes": "名词"
}
```

#### ✅ 好的 notes（有价值）
```json
{
  "word": "aanbetaling",
  "partOfSpeech": "noun",
  "notes": "商业术语。预付款、定金。固定搭配：een aanbetaling doen（支付定金）"
}
```

### 检查需要改进的单词

运行以下命令找出所有 notes 需要改进的单词：

```bash
python3 << 'EOF'
import json
import os

levels = ['a1', 'a2', 'b1', 'b2', 'c1']
simple_notes_words = []

for level in levels:
    level_dir = f'web/src/data/vocabulary/{level}'
    for file in os.listdir(level_dir):
        if file.endswith('.json'):
            filepath = os.path.join(level_dir, file)
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            for word in data['words']:
                notes = word.get('notes', '')
                if notes in ['名词', '动词', '形容词', '副词', '短语动词']:
                    simple_notes_words.append(f"{level.upper()} {file}: {word['word']}")

print(f"发现 {len(simple_notes_words)} 个单词的 notes 需要改进:\n")
for item in simple_notes_words[:20]:  # 显示前20个
    print(item)
if len(simple_notes_words) > 20:
    print(f"... 还有 {len(simple_notes_words) - 20} 个")
EOF
```

### 批量改进建议

对于大量需要改进的单词，建议：
1. **分批处理**：每次处理 3-5 个课程文件
2. **按主题分类**：优先处理同一主题或词性的单词
3. **使用脚本**：编写 Python 脚本自动化更新（如 `/tmp/update_notes.py`）
4. **保持一致性**：同一课程内的相似单词采用相似的 notes 格式

---

## 何时需要改进 Notes

在以下情况应立即改进单词 notes：
- ✅ 发现 notes 只是简单重复词性（"名词"、"动词"等）
- ✅ 用户反馈 notes 不够有用
- ✅ 批量添加新单词时，为每个单词编写有意义的 notes
- ✅ 审查词汇数据质量时发现大量简单 notes

---

## 质量检查清单

改进后的 notes 应满足：
- [ ] 不是简单的词性重复
- [ ] 提供至少一项有价值的学习信息
- [ ] 长度适中（通常 20-100 字符）
- [ ] 使用准确的专业术语（如适用）
- [ ] 包含实用的固定搭配或例句
- [ ] 避免与 translation 字段内容重复

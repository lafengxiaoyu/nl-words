# 词汇数据文件

按难度级别拆分的荷兰语词汇数据，支持按需加载和快速查找。

## 文件结构

```
vocabulary/
├── index.json          # 主索引文件，包含所有级别的元数据
├── lookup.json         # 快速查找表，轻量级单词索引
├── stats.json         # 统计信息
├── loader.js          # 数据加载器（JavaScript）
├── a1/                # A1级别单词
│   ├── lesson-01.json
│   ├── lesson-02.json
│   └── ...
├── a2/                # A2级别单词
│   └── lesson-01.json
├── b1/                # B1级别单词
│   └── lesson-01.json
├── b2/                # B2级别单词
│   └── lesson-01.json
└── c2/                # C2级别单词
    └── lesson-01.json
```

## 数据统计

- 总单词数：626
- 难度级别：5个（A1, A2, B1, B2, C2）
- Lesson总数：17个
- 每个Lesson：约50个单词

### 按难度分布

| 级别 | 单词数 | Lessons |
|------|--------|---------|
| A1   | 616    | 13      |
| A2   | 4      | 1       |
| B1   | 4      | 1       |
| B2   | 1      | 1       |
| C2   | 1      | 1       |

### 按词性分布

- 名词（noun）：285个
- 动词（verb）：105个
- 形容词（adjective）：83个
- 副词（adverb）：62个
- 代词（pronoun）：25个
- 介词（preposition）：23个
- 其他：23个

## 文件格式说明

### index.json

主索引文件，包含所有级别的元数据：

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-04T09:20:28.901Z",
  "totalWords": 626,
  "levels": [
    {
      "level": "A1",
      "totalWords": 616,
      "totalLessons": 13,
      "lessons": [
        {
          "id": "lA101",
          "lessonNumber": 1,
          "file": "a1/lesson-01.json",
          "totalWords": 50,
          "wordIds": [1, 2, 3, ...]
        }
      ]
    }
  ]
}
```

### lookup.json

快速查找表，包含所有单词的基本信息：

```json
{
  "1": {
    "id": 1,
    "word": "hallo",
    "level": "A1",
    "partOfSpeech": "interjection",
    "translation": {
      "chinese": "你好",
      "english": "hello"
    }
  }
}
```

### lesson-XX.json

每个lesson文件包含完整的单词数据：

```json
{
  "id": "lA101",
  "level": "A1",
  "lessonNumber": 1,
  "totalWords": 50,
  "words": [
    {
      "id": 1,
      "word": "hallo",
      "translation": { "chinese": "你好", "english": "hello" },
      "partOfSpeech": "interjection",
      "examples": ["Hallo, hoe gaat het?"],
      "exampleTranslations": {
        "chinese": ["你好，最近怎么样？"],
        "english": ["Hello, how are you?"]
      },
      "notes": "非正式问候语",
      "difficulty": "A1",
      "forms": { ... }
    }
  ]
}
```

## 使用方法

### 1. 使用 loader.js（推荐）

```javascript
import loader from './data/vocabulary/loader.js';

// 加载索引
const index = await loader.loadIndex();

// 加载指定级别
const a1Level = await loader.loadLevel('A1');

// 加载指定lesson
const lesson1 = await loader.loadLesson('a1', 'lesson-01.json');

// 根据ID查询单词
const word = await loader.getWordById(1);

// 批量查询单词
const words = await loader.getWordsByIds([1, 2, 3]);

// 按难度查询单词
const a1Words = await loader.getWordsByDifficulty('A1');

// 搜索单词
const results = await loader.searchWords('hallo');

// 获取随机单词
const randomWords = await loader.getRandomWords(10, 'A1');

// 清除缓存
loader.clearCache();
```

### 2. 直接加载 JSON 文件

```javascript
// 加载索引
const index = await fetch('/data/vocabulary/index.json').then(r => r.json());

// 加载指定lesson
const lesson = await fetch('/data/vocabulary/a1/lesson-01.json').then(r => r.json());

// 加载查找表
const lookup = await fetch('/data/vocabulary/lookup.json').then(r => r.json());
```

## 按需加载策略

### 推荐加载方式

1. **首次加载**：只加载 `index.json` 和 `lookup.json`
2. **用户浏览**：根据用户选择的级别动态加载对应的lesson
3. **搜索功能**：使用 `lookup.json` 进行快速搜索
4. **详情查看**：根据需要加载包含该单词的lesson

### 加载时间估算

- `index.json`：~14KB，快速加载
- `lookup.json`：~114KB，快速加载
- `stats.json`：<1KB，快速加载
- 单个lesson：~35-40KB（约50个单词）

## 单词ID稳定性

所有单词的ID都是稳定的，不会随数据更新而改变。这意味着：

1. 可以安全地使用ID作为学习进度的标识
2. 可以缓存用户的学习状态
3. 可以跨版本同步学习进度

## 数据验证

所有单词都通过了以下验证：

- ✅ 名词有 de/het 冠词和单复数形式
- ✅ 动词是原形，包含完整变位
- ✅ 形容词有 de/het 变形和比较级
- ✅ 可分动词有标注和前缀
- ✅ 所有单词都有中英文例句

## 重新拆分

如果需要重新拆分数据，运行：

```bash
node scripts/split-vocabulary.cjs
```

这会更新所有拆分文件，但保持单词ID不变。

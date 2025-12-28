# 单词数据文件说明

## 文件结构

- `types.ts` - TypeScript 类型定义
- `words.json` - 单词数据（JSON格式）
- `words.ts` - 数据导入文件

## 如何添加新单词

编辑 `words.json` 文件，按照以下格式添加新单词：

```json
{
  "id": 11,
  "word": "voorbeeld",
  "translation": {
    "chinese": "例子",
    "english": "example"
  },
  "partOfSpeech": "noun",
  "forms": {
    "noun": {
      "article": "het",
      "singular": "voorbeeld",
      "plural": "voorbeelden"
    }
  },
  "examples": [
    "Dit is een goed voorbeeld.",
    "Kun je een voorbeeld geven?"
  ],
  "exampleTranslations": [
    "这是一个好例子。",
    "你能举个例子吗？"
  ],
  "notes": "中性名词",
  "familiarity": "new",
  "mastered": false,
  "difficulty": "A1"
}
```

## 字段说明

### 必需字段

- `id`: 唯一标识符（数字）
- `word`: 荷兰语单词
- `translation`: 翻译对象
  - `chinese`: 中文翻译
  - `english`: 英文翻译
- `partOfSpeech`: 词性（见下方词性列表）
- `examples`: 例句数组（荷兰语）
- `familiarity`: 熟悉程度（`new` | `learning` | `familiar` | `mastered`）
- `mastered`: 是否已掌握（布尔值）
- `difficulty`: 难度级别（`A1` | `A2` | `B1` | `B2` | `C1` | `C2`）- CEFR标准

### 可选字段

- `forms`: 词性相关的变形信息
  - `noun`: 名词信息（当 `partOfSpeech` 为 `noun` 时）
    - `article`: 定冠词（`de` 或 `het`）
    - `singular`: 单数形式
    - `plural`: 复数形式
  - `verb`: 动词变形（当 `partOfSpeech` 为 `verb` 时）
    - `infinitive`: 不定式
    - `present`: 现在时变位
    - `past`: 过去时（单数/复数）
    - `pastParticiple`: 过去分词
  - `adjective`: 形容词变形（当 `partOfSpeech` 为 `adjective` 时）
    - `base`: 原形
    - `withDe`: 与 de 连用
    - `withHet`: 与 het 连用
    - `comparative`: 比较级
    - `superlative`: 最高级
- `exampleTranslations`: 例句翻译数组（中文）
- `notes`: 备注信息

## 难度级别（CEFR标准）

- `A1` - 入门级（Beginner）
- `A2` - 基础级（Elementary）
- `B1` - 进阶级（Intermediate）
- `B2` - 高阶级（Upper Intermediate）
- `C1` - 流利级（Advanced）
- `C2` - 精通级（Proficient）

## 词性列表

- `noun` - 名词
- `verb` - 动词
- `adjective` - 形容词
- `adverb` - 副词
- `pronoun` - 代词
- `preposition` - 介词
- `conjunction` - 连词
- `interjection` - 感叹词
- `other` - 其他

## 示例

### 名词示例

```json
{
  "id": 12,
  "word": "tafel",
  "translation": {
    "chinese": "桌子",
    "english": "table"
  },
  "partOfSpeech": "noun",
  "forms": {
    "noun": {
      "article": "de",
      "singular": "tafel",
      "plural": "tafels"
    }
  },
  "examples": ["De tafel is groot."],
  "exampleTranslations": ["桌子很大。"],
  "familiarity": "new",
  "mastered": false
}
```

### 动词示例

```json
{
  "id": 13,
  "word": "drinken",
  "translation": {
    "chinese": "喝",
    "english": "to drink"
  },
  "partOfSpeech": "verb",
  "forms": {
    "verb": {
      "infinitive": "drinken",
      "present": {
        "ik": "drink",
        "jij": "drinkt",
        "hij": "drinkt",
        "wij": "drinken",
        "jullie": "drinken",
        "zij": "drinken"
      },
      "past": {
        "singular": "dronk",
        "plural": "dronken"
      },
      "pastParticiple": "gedronken"
    }
  },
  "examples": ["Ik drink water."],
  "exampleTranslations": ["我喝水。"],
  "familiarity": "new",
  "mastered": false
}
```

### 形容词示例

```json
{
  "id": 14,
  "word": "groot",
  "translation": {
    "chinese": "大的",
    "english": "big"
  },
  "partOfSpeech": "adjective",
  "forms": {
    "adjective": {
      "base": "groot",
      "withDe": "grote",
      "withHet": "groot",
      "comparative": "groter",
      "superlative": "grootst"
    }
  },
  "examples": ["Het huis is groot."],
  "exampleTranslations": ["房子很大。"],
  "familiarity": "new",
  "mastered": false
}
```

## 注意事项

1. 确保 JSON 格式正确（可以使用 JSON 验证工具）
2. `id` 必须唯一
3. 添加新单词后，应用会自动加载新数据
4. 如果修改了数据结构，需要同步更新 `types.ts` 中的类型定义


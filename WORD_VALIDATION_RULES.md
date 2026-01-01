# 单词数据验证规则

本文档定义了荷兰语单词数据必须遵循的验证规则，确保数据完整性和一致性。

## 基本规则

所有单词必须包含以下基本字段：
- `id`: 唯一标识符（数字）
- `word`: 荷兰语单词（字符串）
- `translation`: 翻译对象（包含 chinese 和 english）
- `partOfSpeech`: 词性（noun/verb/adjective/adverb/pronoun/preposition/conjunction/interjection/other）
- `examples`: 例句数组（至少包含一个荷兰语例句）
- `difficulty`: 难度级别（A1/A2/B1/B2/C1/C2）
- `exampleTranslations`: 例句翻译对象（包含 chinese 和 english 数组）

## 按词性的特定规则

### 名词（noun）规则

**必需字段：**
```json
{
  "partOfSpeech": "noun",
  "forms": {
    "noun": {
      "article": "de" | "het",      // 必须指定冠词
      "singular": string,               // 单数形式
      "plural": string,                // 复数形式
      "uncountablePreposition": string  // 可选：不可数名词的搭配介词
    }
  }
}
```

**验证要求：**
1. ✅ 必须包含 `article` 字段，值为 `"de"` 或 `"het"`
2. ✅ 必须包含 `singular` 字段，表示单词的单数形式
3. ✅ 必须包含 `plural` 字段，表示单词的复数形式
4. ⚠️ 如果是可数名词，可以省略 `uncountablePreposition`
5. ⚠️ 如果是不可数名词，强烈建议提供 `uncountablePreposition` 字段

**示例：**
```json
{
  "id": 1,
  "word": "huis",
  "translation": {
    "chinese": "房子",
    "english": "house"
  },
  "partOfSpeech": "noun",
  "forms": {
    "noun": {
      "article": "het",
      "singular": "huis",
      "plural": "huizen",
      "uncountablePreposition": "in het huis"
    }
  },
  "examples": ["Het huis is groot."],
  "exampleTranslations": {
    "chinese": ["这所房子很大。"],
    "english": ["The house is big."]
  },
  "difficulty": "A1"
}
```

### 动词（verb）规则

**必需字段：**
```json
{
  "partOfSpeech": "verb",
  "forms": {
    "verb": {
      "infinitive": string,          // 动词原形
      "isSeparable": boolean,        // 是否为可分动词
      "prefix": string,            // 可分动词的前缀（如果是可分动词则必需）
      "present": {                 // 现在时变位
        "ik": string,
        "jij": string,
        "hij": string,
        "wij": string,
        "jullie": string,
        "zij": string
      },
      "past": {                   // 过去时变位
        "singular": string,
        "plural": string
      },
      "pastParticiple": string    // 过去分词
    }
  }
}
```

**验证要求：**
1. ✅ 必须包含 `infinitive` 字段，表示动词原形
2. ✅ 必须包含 `isSeparable` 字段，布尔值
3. ✅ 如果 `isSeparable` 为 `true`，必须包含 `prefix` 字段
4. ✅ 如果 `isSeparable` 为 `false`，可以省略 `prefix` 字段
5. ✅ 必须包含完整的 `present` 变位（ik, jij, hij, wij, jullie, zij）
6. ✅ 必须包含 `past.singular` 和 `past.plural`
7. ✅ 必须包含 `pastParticiple` 字段

**示例 - 可分动词：**
```json
{
  "id": 16,
  "word": "aankomen",
  "translation": {
    "chinese": "到达",
    "english": "to arrive"
  },
  "partOfSpeech": "verb",
  "forms": {
    "verb": {
      "infinitive": "aankomen",
      "isSeparable": true,
      "prefix": "aan",
      "present": {
        "ik": "kom aan",
        "jij": "komt aan",
        "hij": "komt aan",
        "wij": "komen aan",
        "jullie": "komen aan",
        "zij": "komen aan"
      },
      "past": {
        "singular": "kwam aan",
        "plural": "kwamen aan"
      },
      "pastParticiple": "aangekomen"
    }
  },
  "examples": ["De trein komt aan om 15:00."],
  "exampleTranslations": {
    "chinese": ["火车下午3点到达。"],
    "english": ["The train arrives at 15:00."]
  },
  "difficulty": "A2"
}
```

**示例 - 不可分动词：**
```json
{
  "id": 5,
  "word": "eten",
  "translation": {
    "chinese": "吃",
    "english": "to eat"
  },
  "partOfSpeech": "verb",
  "forms": {
    "verb": {
      "infinitive": "eten",
      "isSeparable": false,
      "present": {
        "ik": "eet",
        "jij": "eet",
        "hij": "eet",
        "wij": "eten",
        "jullie": "eten",
        "zij": "eten"
      },
      "past": {
        "singular": "at",
        "plural": "aten"
      },
      "pastParticiple": "gegeten"
    }
  },
  "examples": ["Ik eet een appel."],
  "exampleTranslations": {
    "chinese": ["我吃一个苹果。"],
    "english": ["I eat an apple."]
  },
  "difficulty": "A2"
}
```

### 形容词（adjective）规则

**必需字段：**
```json
{
  "partOfSpeech": "adjective",
  "forms": {
    "adjective": {
      "base": string,           // 原形
      "withDe": string,        // 与 de 连用时的形式
      "withHet": string,       // 与 het 连用时的形式
      "comparative": string,   // 比较级
      "superlative": string    // 最高级
    }
  }
}
```

**验证要求：**
1. ✅ 必须包含 `base` 字段，表示形容词原形
2. ✅ 必须包含 `withDe` 字段，表示与 de 连用时的变形
3. ✅ 必须包含 `withHet` 字段，表示与 het 连用时的变形
4. ✅ 必须包含 `comparative` 字段，表示比较级形式
5. ✅ 必须包含 `superlative` 字段，表示最高级形式

**示例：**
```json
{
  "id": 18,
  "word": "groot",
  "translation": {
    "chinese": "大的",
    "english": "big, large"
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
  "examples": ["Het is een groot huis.", "De grote boom staat in de tuin."],
  "exampleTranslations": {
    "chinese": ["这是一所大房子。", "大树立在花园里。"],
    "english": ["It is a big house.", "The big tree stands in garden."]
  },
  "difficulty": "A1"
}
```

### 其他词性规则

对于以下词性，`forms` 字段是可选的：
- `adverb`（副词）
- `pronoun`（代词）
- `preposition`（介词）
- `conjunction`（连词）
- `interjection`（感叹词）
- `other`（其他）

## 验证检查清单

在添加新单词前，请确保：

- [ ] 所有必需的字段都已填写
- [ ] 名词包含 article、singular、plural
- [ ] 动词包含 infinitive、isSeparable、完整变位
- [ ] 可分动词标记了 isSeparable=true 并提供了 prefix
- [ ] 形容词包含 base、withDe、withHet、comparative、superlative
- [ ] exampleTranslations 与 examples 数量匹配
- [ ] difficulty 级别正确（A1/A2/B1/B2/C1/C2）
- [ ] JSON 格式正确，无语法错误

## 自动验证

项目包含自动验证脚本（`scripts/validate-words.js`），在以下情况自动运行：

1. 提交代码前（通过 pre-commit hook）
2. 创建 Pull Request 时（通过 GitHub Actions）
3. 手动运行：`npm run validate:words`

如果验证失败，请根据错误提示修正数据后重新提交。

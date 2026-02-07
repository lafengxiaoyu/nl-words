# 荷兰语单词数据录入标准

## 概述

本文档定义了荷兰语单词数据的录入标准，确保数据的一致性和完整性。所有新增单词必须遵循以下格式规范。

## 数据结构

每个单词包含以下核心字段：
- `id`: 唯一标识符
- `word`: 荷兰语单词
- `translation`: 中英文翻译
- `partOfSpeech`: 词性
- `forms`: 词形变形（根据词性不同包含不同内容）
- `examples`: 例句（荷兰语）
- `exampleTranslations`: 例句翻译（中英文）
- `notes`: 备注
- `difficulty`: 难度级别

---

## 按词性分类的录入标准

### 1. 名词 (noun)

**必填字段：**
- `article`: 冠词（`de` 或 `het`）
- `singular`: 单数形式
- `plural`: 复数形式（不可数名词用 `-` 标记）

**JSON 格式示例：**

#### 可数名词（de-名词）
```json
{
  "id": 1,
  "word": "auto",
  "translation": {
    "chinese": "汽车",
    "english": "car"
  },
  "partOfSpeech": "noun",
  "forms": {
    "noun": {
      "article": "de",
      "singular": "auto",
      "plural": "auto's"
    }
  },
  "examples": [
    "De auto staat voor het huis.",
    "Ik heb een nieuwe auto gekocht."
  ],
  "exampleTranslations": {
    "chinese": [
      "汽车停在房子前面。",
      "我买了一辆新车。"
    ],
    "english": [
      "The car is in front of the house.",
      "I bought a new car."
    ]
  },
  "notes": "阳性/阴性名词，复数加's",
  "difficulty": "A1"
}
```

#### 可数名词（het-名词）
```json
{
  "id": 2,
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
      "plural": "huizen"
    }
  },
  "examples": [
    "Het huis is groot.",
    "Ik woon in een mooi huis."
  ],
  "exampleTranslations": {
    "chinese": [
      "这所房子很大。",
      "我住在一所漂亮的房子里。"
    ],
    "english": [
      "The house is big.",
      "I live in a beautiful house."
    ]
  },
  "notes": "中性名词，复数形式是huizen",
  "difficulty": "A1"
}
```

#### 不可数名词
```json
{
  "id": 3,
  "word": "water",
  "translation": {
    "chinese": "水",
    "english": "water"
  },
  "partOfSpeech": "noun",
  "forms": {
    "noun": {
      "article": "het",
      "singular": "water",
      "plural": "-",
      "uncountablePreposition": "uit het water"
    }
  },
  "examples": [
    "Ik drink water.",
    "Het water is koud."
  ],
  "exampleTranslations": {
    "chinese": [
      "我喝水。",
      "水是冷的。"
    ],
    "english": [
      "I drink water.",
      "The water is cold."
    ]
  },
  "notes": "中性名词，常不可数，搭配介词 uit het water",
  "difficulty": "A1"
}
```

---

### 2. 动词 (verb)

**必填字段：**
- `infinitive`: 不定式形式
- `present`: 现在时变位（6个人称）
- `past`: 过去时变位（单数/复数）
- `pastParticiple`: 过去分词
- `isSeparable`: 是否为可分动词（默认 `false`）
- `pastParticipleAuxiliary`: 过去分词搭配的辅助动词（`zijn` 或 `hebben`）

**可选字段：**
- `prefix`: 可分动词的前缀（仅可分动词）

**JSON 格式示例：**

#### 普通动词
```json
{
  "id": 4,
  "word": "werken",
  "translation": {
    "chinese": "工作",
    "english": "to work"
  },
  "partOfSpeech": "verb",
  "forms": {
    "verb": {
      "infinitive": "werken",
      "isSeparable": false,
      "present": {
        "ik": "werk",
        "jij": "werkt",
        "hij": "werkt",
        "wij": "werken",
        "jullie": "werken",
        "zij": "werken"
      },
      "past": {
        "singular": "werkte",
        "plural": "werkten"
      },
      "pastParticiple": "gewerkt",
      "pastParticipleAuxiliary": "hebben"
    }
  },
  "examples": [
    "Ik werk in Amsterdam.",
    "Hij werkt hard."
  ],
  "exampleTranslations": {
    "chinese": [
      "我在阿姆斯特丹工作。",
      "他工作很努力。"
    ],
    "english": [
      "I work in Amsterdam.",
      "He works hard."
    ]
  },
  "notes": "规则动词",
  "difficulty": "A1"
}
```

#### 可分动词
```json
{
  "id": 5,
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
      "pastParticiple": "aangekomen",
      "pastParticipleAuxiliary": "zijn"
    }
  },
  "examples": [
    "De trein komt aan om 10 uur.",
    "Ik kom morgen aan."
  ],
  "exampleTranslations": {
    "chinese": [
      "火车10点到达。",
      "我明天到达。"
    ],
    "english": [
      "The train arrives at 10 o'clock.",
      "I arrive tomorrow."
    ]
  },
  "notes": "可分动词，前缀 aan 在主句中位于句末",
  "difficulty": "A1"
}
```

#### 不规则动词
```json
{
  "id": 6,
  "word": "zijn",
  "translation": {
    "chinese": "是",
    "english": "to be"
  },
  "partOfSpeech": "verb",
  "forms": {
    "verb": {
      "infinitive": "zijn",
      "isSeparable": false,
      "present": {
        "ik": "ben",
        "jij": "bent",
        "hij": "is",
        "wij": "zijn",
        "jullie": "zijn",
        "zij": "zijn"
      },
      "past": {
        "singular": "was",
        "plural": "waren"
      },
      "pastParticiple": "geweest",
      "pastParticipleAuxiliary": "zijn"
    }
  },
  "examples": [
    "Ik ben student.",
    "Hij is Nederlands."
  ],
  "exampleTranslations": {
    "chinese": [
      "我是学生。",
      "他是荷兰人。"
    ],
    "english": [
      "I am a student.",
      "He is Dutch."
    ]
  },
  "notes": "不规则动词，过去分词搭配zijn",
  "difficulty": "A1"
}
```

---

### 3. 形容词 (adjective)

**必填字段：**
- `base`: 基本形式（不带冠词）
- `withDe`: 与 de 连用的形式（-e）
- `withHet`: 与 het 连用的形式（-e 或基本形式）
- `comparative`: 比较级
- `superlative`: 最高级

**JSON 格式示例：**

#### 规则形容词
```json
{
  "id": 7,
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
      "withHet": "grote",
      "comparative": "groter",
      "superlative": "grootst"
    }
  },
  "examples": [
    "Het huis is groot.",
    "De grote auto."
  ],
  "exampleTranslations": {
    "chinese": [
      "房子很大。",
      "那辆大汽车。"
    ],
    "english": [
      "The house is big.",
      "The big car."
    ]
  },
  "notes": "规则形容词变位",
  "difficulty": "A1"
}
```

#### 不规则形容词
```json
{
  "id": 8,
  "word": "goed",
  "translation": {
    "chinese": "好的",
    "english": "good"
  },
  "partOfSpeech": "adjective",
  "forms": {
    "adjective": {
      "base": "goed",
      "withDe": "goede",
      "withHet": "goede",
      "comparative": "beter",
      "superlative": "best"
    }
  },
  "examples": [
    "Dat is een goed idee.",
    "De beste vriend."
  ],
  "exampleTranslations": {
    "chinese": [
      "那是个好主意。",
      "最好的朋友。"
    ],
    "english": [
      "That is a good idea.",
      "The best friend."
    ]
  },
  "notes": "不规则形容词，比较级是beter，最高级是best",
  "difficulty": "A1"
}
```

---

### 4. 其他词性

#### 副词 (adverb)
```json
{
  "id": 9,
  "word": "snel",
  "translation": {
    "chinese": "快速地",
    "english": "quickly, fast"
  },
  "partOfSpeech": "adverb",
  "examples": [
    "Hij rent snel.",
    "Kom snel!"
  ],
  "exampleTranslations": {
    "chinese": [
      "他跑得快。",
      "快来！"
    ],
    "english": [
      "He runs fast.",
      "Come quickly!"
    ]
  },
  "notes": "副词无词形变化",
  "difficulty": "A1"
}
```

#### 介词 (preposition)
```json
{
  "id": 10,
  "word": "in",
  "translation": {
    "chinese": "在...里面",
    "english": "in"
  },
  "partOfSpeech": "preposition",
  "examples": [
    "Ik woon in Amsterdam.",
    "Het boek ligt in de tas."
  ],
  "exampleTranslations": {
    "chinese": [
      "我住在阿姆斯特丹。",
      "书在包里。"
    ],
    "english": [
      "I live in Amsterdam.",
      "The book is in the bag."
    ]
  },
  "notes": "表示位置的介词",
  "difficulty": "A1"
}
```

#### 代词 (pronoun)
```json
{
  "id": 11,
  "word": "ik",
  "translation": {
    "chinese": "我",
    "english": "I"
  },
  "partOfSpeech": "pronoun",
  "examples": [
    "Ik ben student.",
    "Ik kom uit China."
  ],
  "exampleTranslations": {
    "chinese": [
      "我是学生。",
      "我来自中国。"
    ],
    "english": [
      "I am a student.",
      "I come from China."
    ]
  },
  "notes": "第一人称单数主格代词",
  "difficulty": "A1"
}
```

#### 短语 (phrase)
```json
{
  "id": 12,
  "word": "dank je",
  "translation": {
    "chinese": "谢谢",
    "english": "thank you"
  },
  "partOfSpeech": "phrase",
  "examples": [
    "Dank je wel voor je hulp.",
    "Dank je, dat is erg aardig."
  ],
  "exampleTranslations": {
    "chinese": [
      "谢谢你的帮助。",
      "谢谢，你真好。"
    ],
    "english": [
      "Thank you for your help.",
      "Thank you, that's very kind."
    ]
  },
  "notes": "非正式，正式用dank u",
  "difficulty": "A1"
}
```

#### 感叹词 (interjection)
```json
{
  "id": 13,
  "word": "hallo",
  "translation": {
    "chinese": "你好",
    "english": "hello"
  },
  "partOfSpeech": "interjection",
  "examples": [
    "Hallo, hoe gaat het?",
    "Hallo, ik ben Jan."
  ],
  "exampleTranslations": {
    "chinese": [
      "你好，最近怎么样？",
      "你好，我是Jan。"
    ],
    "english": [
      "Hello, how are you?",
      "Hello, I'm Jan."
    ]
  },
  "notes": "非正式问候语，正式场合用goedemorgen/goedemiddag/goedenavond",
  "difficulty": "A1"
}
```

---

## Lesson 文件格式

每个 Lesson 文件包含多个单词，基本格式如下：

```json
{
  "id": "lA101",
  "level": "A1",
  "lessonNumber": 1,
  "totalWords": 50,
  "words": [
    // 单词列表...
  ]
}
```

**字段说明：**
- `id`: 课程唯一标识符，格式为 `l` + 级别 + 课程编号（如：`lA101`, `lB205`）
- `level`: 难度级别（`A1`, `A2`, `B1`, `B2`, `C1`, `C2`）
- `lessonNumber`: 课程编号
- `totalWords`: 课程中的单词总数
- `words`: 单词数组

### 单词 ID 规则

**重要：新增单词的 ID 必须**从当前全局最大 ID + 1 开始递增。

- **当前全局最大 ID**: `6431`（截至 2026-02-07）
- **下一个可用 ID**: `6432`

**规则：**
1. 每个新增单词的 `id` 字段必须是全局唯一的
2. ID 必须连续递增，不能跳号
3. 不要修改任何已存在单词的 ID
4. 每个建议包含约 50 个单词

**示例：**
如果当前最大 ID 是 5237，那么新 lesson 的单词 ID 应该是：
```json
{
  "words": [
    {"id": 5238, ...},
    {"id": 5239, ...},
    {"id": 5240, ...},
    // ... 共约50个单词
    {"id": 5287, ...}
  ]
}
```

---

## 录入检查清单

在录入新单词时，请检查以下项目：

### 全局检查（必须首先检查）
- [ ] 确认当前全局最大 ID（查看最新的 lesson 文件）
- [ ] 新单词 ID 从全局最大 ID + 1 开始
- [ ] ID 连续递增，无跳号
- [ ] 确保每个 lesson 包含约 50 个单词

### 名词检查
- [ ] 冠词（de/het）是否正确
- [ ] 单数和复数形式是否正确
- [ ] 如果是不可数名词，是否标记 `plural: "-"` 并添加 `uncountablePreposition`

### 动词检查
- [ ] 现在时变位（6个人称）是否完整且正确
- [ ] 过去时变位是否正确
- [ ] 过去分词是否正确
- [ ] 如果是可分动词，是否标记 `isSeparable: true` 并添加 `prefix`
- [ ] 是否标注过去分词的辅助动词（zijn/hebben）

### 形容词检查
- [ ] 基本形式是否正确
- [ ] 与 de 和 het 连用的形式是否正确
- [ ] 比较级和最高级是否正确

### 通用检查
- [ ] 翻译是否准确
- [ ] 例句是否自然且符合语法
- [ ] 例句翻译是否准确
- [ ] 备注是否提供了有用的语法或用法说明
- [ ] 难度级别是否恰当（A1/A2/B1/B2/C1/C2）
- [ ] 运行验证脚本 `node scripts/validate-words.cjs` 检查数据

### 例句要求
- [ ] 每个单词必须提供 **2 个例句**
- [ ] 例句难度必须与单词难度级别匹配
- [ ] 例句要自然、实用，展示单词的典型用法
- [ ] 例句中的荷兰语语法必须正确
- [ ] 例句翻译要准确，传达句子的真实含义

### 备注要求
- [ ] 备注必须有意义，提供有用的语法或用法信息
- [ ] 避免使用无意义的备注（如"名词"、"动词"等）
- [ ] 对于不规则形式，应在备注中说明
- [ ] 对于特殊用法或常见错误，应在备注中指出

---

## 常见错误和注意事项

### 冠词错误
- ❌ 错误：将 `de-woord` 标记为 `het`
- ✅ 正确：仔细核对荷兰语词典，确保冠词准确

### 可分动词标注
- ❌ 错误：忘记标注可分动词
- ✅ 正确：如果动词可分，必须设置 `isSeparable: true` 并添加 `prefix`

### 过去分词辅助动词
- ❌ 错误：未标注过去分词的辅助动词
- ✅ 正确：必须明确标注 `pastParticipleAuxiliary` 为 `zijn` 或 `hebben`

### 形容词变形
- ❌ 错误：混淆 `withDe` 和 `withHet`
- ✅ 正确：
  - `withDe`: 形容词后加 `-e`
  - `withHet`: 在 het 名词前加 `-e`，但在表语中用基本形式

### 例句质量
- ❌ 错误：例句过于简单或不符合实际使用场景
- ✅ 正确：提供自然、实用的例句，展示单词的典型用法

### 例句数量和难度
- ❌ 错误：只提供1个例句，或例句难度远高于/低于单词级别
- ✅ 正确：提供2个例句，难度与单词级别匹配

### 备注质量
- ❌ 错误：备注只是简单重复词性（如"名词"、"动词"）
- ✅ 正确：备注提供有价值的语法说明、不规则变化、特殊用法等信息

---

## 数据验证

在提交数据前，建议进行以下验证：

### 自动验证（推荐）

运行验证脚本：
```bash
node scripts/validate-words.cjs
```

验证脚本会检查：
- **重复性检查**：是否有重复的 id 或单词
- **基本字段验证**：id、word、translation、partOfSpeech、examples、difficulty
- **例句翻译验证**：exampleTranslations 字段完整性
- **词性特定验证**：
  - 名词：article、singular、plural
  - 动词：infinitive、isSeparable、present（6个人称）、past（单数/复数）、pastParticiple
  - 形容词：base、withDe、withHet、comparative、superlative
- **格式一致性**：同类单词的格式保持一致

### 手动验证

1. **JSON 语法检查**：确保 JSON 格式正确
2. **翻译准确性**：核对中英文翻译的准确性
3. **语法正确性**：确保荷兰语句子的语法正确
4. **例句质量**：确保例句自然且符合难度级别
5. **备注质量**：确保备注提供有价值的语法或用法信息

---

## 参考资源

- [荷兰语语法参考](https://www.dutchgrammar.com/)
- [荷兰语词典](https://en.wiktionary.org/)
- [CEFR 难度级别说明](https://www.coe.int/en/web/common-european-framework-of-reference-for-languages)

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-02-07 | 2.0 | 更新全局最大ID为6431（完成C1 lesson-10数据录入） |
| 2026-02-07 | 1.9 | 更新全局最大ID为6379（完成C1 lesson-09数据录入） |
| 2026-02-07 | 1.8 | 更新全局最大ID为6330（完成C1 lesson-08数据录入） |
| 2026-02-07 | 1.7 | 更新全局最大ID为6260（完成C1 lesson-07数据录入） |
| 2026-02-07 | 1.6 | 更新全局最大ID为6190（完成C1 lesson-06数据录入） |
| 2026-02-07 | 1.5 | 更新全局最大ID为6116（完成C1 lesson-05数据录入） |
| 2026-02-07 | 1.4 | 更新全局最大ID为5902（完成C1 lesson-02数据录入） |
| 2026-02-03 | 1.3 | 更新全局最大ID为5814（完成C1 lesson-01数据录入） |
| 2026-02-03 | 1.2 | 添加自动验证脚本说明，修正必填字段列表 |
| 2026-02-03 | 1.1 | 添加单词ID生成规则、例句和备注要求 |
| 2026-02-03 | 1.0 | 初始版本，定义基本的单词录入标准 |

# 词汇数据拆分完成报告

## 概述

已成功将626个荷兰语单词按难度级别拆分为17个lesson文件，实现了快速加载和按需加载。

## 文件结构

```
web/src/data/vocabulary/
├── index.json           # 主索引文件（13.85 KB）
├── lookup.json          # 快速查找表（114.18 KB）
├── stats.json           # 统计信息（<1 KB）
├── loader.js            # 数据加载器
├── example.js           # 使用示例
├── README.md            # 详细文档
│
├── a1/                 # A1级别（616个单词，13个lesson）
│   ├── lesson-01.json  (50个单词)
│   ├── lesson-02.json  (50个单词)
│   ├── ...
│   └── lesson-13.json  (16个单词)
│
├── a2/                 # A2级别（4个单词）
│   └── lesson-01.json
│
├── b1/                 # B1级别（4个单词）
│   └── lesson-01.json
│
├── b2/                 # B2级别（1个单词）
│   └── lesson-01.json
│
└── c2/                 # C2级别（1个单词）
    └── lesson-01.json
```

## 数据统计

### 总览
- 总单词数：626
- 难度级别：5个（A1, A2, B1, B2, C2）
- Lesson总数：17个
- 单词ID：稳定且唯一

### 按难度分布

| 级别 | 单词数 | Lessons | 单个Lesson大小 |
|------|--------|---------|---------------|
| A1   | 616    | 13      | 50个（最后一个16个） |
| A2   | 4      | 1       | 4个 |
| B1   | 4      | 1       | 4个 |
| B2   | 1      | 1       | 1个 |
| C2   | 1      | 1       | 1个 |

### 按词性分布

- 名词：285个
- 动词：105个
- 形容词：83个
- 副词：62个
- 代词：25个
- 介词：23个
- 其他：28个

## 核心文件说明

### 1. index.json
主索引文件，包含所有级别的元数据和lesson列表。
- 文件大小：~14 KB
- 用途：获取课程结构，无需加载所有单词数据

### 2. lookup.json
快速查找表，包含所有单词的基本信息。
- 文件大小：~114 KB
- 用途：快速搜索、筛选，无需加载完整单词数据

### 3. stats.json
统计信息，按难度和词性统计单词分布。
- 文件大小：<1 KB
- 用途：数据统计、进度展示

### 4. loader.js
数据加载器，提供便捷的API。
- 功能：按需加载、缓存管理、批量查询
- 特性：自动缓存、去重加载、错误处理

## 优势

### 1. 快速加载
- 首次加载只需 index.json 和 lookup.json（~128 KB）
- 按需加载具体lesson（~35-40 KB）
- 避免一次性加载全部数据（~400 KB）

### 2. 按需加载
- 用户只需下载正在学习的lesson
- 节省带宽和内存
- 提升应用启动速度

### 3. 稳定的ID
- 单词ID保持不变
- 可安全使用ID追踪学习进度
- 支持跨版本数据同步

### 4. 灵活的查询
- 按难度筛选
- 按词性筛选
- 按ID范围筛选
- 全文搜索（中文/英文/荷兰语）

## 使用方法

### 基础使用

```javascript
import loader from './data/vocabulary/loader.js';

// 加载索引
const index = await loader.loadIndex();

// 加载指定level
const a1Words = await loader.getWordsByDifficulty('A1');

// 加载指定lesson
const lesson1 = await loader.loadLesson('a1', 'lesson-01.json');

// 根据ID查询单词
const word = await loader.getWordById(1);
```

### 高级功能

```javascript
// 搜索
const results = await loader.searchWords('hallo');

// 随机单词
const randomWords = await loader.getRandomWords(10, 'A1');

// 批量查询
const words = await loader.getWordsByIds([1, 2, 3, 4, 5]);

// 获取进度
const progress = await loader.getLoadingProgress('A1');
```

更多示例请参考 `example.js` 文件。

## 验证结果

✅ 所有验证通过

- ✅ 单词总数匹配（626个）
- ✅ 所有ID唯一且稳定
- ✅ 单词内容完整匹配
- ✅ lookup.json 包含所有单词
- ✅ stats.json 统计正确
- ✅ 难度级别分布正确

## 维护指南

### 重新拆分数据

如果更新了 `words.json`，运行：

```bash
node scripts/split-vocabulary.cjs
```

### 验证拆分结果

```bash
node scripts/validate-split.cjs
```

### 注意事项

1. 单词ID必须保持稳定，不要随意修改
2. 新增单词应使用新的ID（当前最大ID + 1）
3. 修改单词内容后，需要重新运行拆分脚本
4. 删除单词后，其ID不应被重用

## 性能建议

### 加载策略

1. **应用启动**：只加载 index.json 和 lookup.json
2. **浏览课程**：按需加载对应的lesson
3. **搜索功能**：使用 lookup.json 进行快速搜索
4. **查看详情**：根据ID定位并加载对应lesson

### 缓存策略

- 使用 loader.js 内置的缓存机制
- 可以自定义缓存时长（默认5分钟）
- 支持手动清除缓存

### 离线支持

可以将所有lesson文件预加载到本地存储：
- Service Worker 缓存
- IndexedDB 存储
- 本地文件系统（PWA）

## 文件清单

### 生成的文件
- ✅ index.json
- ✅ lookup.json
- ✅ stats.json
- ✅ a1/lesson-01.json ~ a1/lesson-13.json
- ✅ a2/lesson-01.json
- ✅ b1/lesson-01.json
- ✅ b2/lesson-01.json
- ✅ c2/lesson-01.json

### 工具文件
- ✅ loader.js（数据加载器）
- ✅ example.js（使用示例）
- ✅ README.md（详细文档）

### 脚本文件
- ✅ scripts/split-vocabulary.cjs（拆分脚本）
- ✅ scripts/validate-split.cjs（验证脚本）

## 总结

成功完成了单词数据的拆分工作，实现了：

✅ 按难度级别拆分（5个级别）
✅ 按lesson拆分（17个lesson）
✅ 稳定的单词ID
✅ 快速加载和按需加载
✅ 完整的验证通过
✅ 详细的文档和示例

现在可以使用这些拆分后的数据来构建高效的词汇学习应用！

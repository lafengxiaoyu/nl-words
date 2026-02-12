# 智能复习功能指南

## 概述

智能复习功能基于**艾宾浩斯遗忘曲线**算法，自动计算每个单词的最佳复习时间，帮助用户高效地巩固记忆。

## 核心算法

### 复习间隔策略

根据单词的熟悉程度，系统使用不同的复习间隔：

| 熟悉程度 | 第一阶段 | 第二阶段 | 第三阶段 |
|---------|---------|---------|---------|
| 新词 (new) | 1小时 | 4小时 | 24小时 |
| 学习中 (learning) | 1天 | 3天 | 7天 |
| 熟悉 (familiar) | 7天 | 14天 | 30天 |
| 已掌握 (mastered) | 30天 | 60天 | 120天 |

### 复习阶段推进

- 每次答对一题，复习阶段 +1（最多到第三阶段）
- 每次答错一题，复习阶段重置为 0
- 连续答对 3 次，单词从错题本移除（标记为已掌握）

### 复习优先级计算

系统根据以下因素计算复习优先级：

1. **时间因子**：距离上次复习的时间 / 推荐复习间隔
   - 超过 100%：紧急复习（优先级 90-100）
   - 80%-100%：即将到期（优先级 70-95）
   - 50%-80%：中等优先级（优先级 50-70）
   - 低于 50%：低优先级（优先级 0-50）

2. **熟悉程度**：不同熟悉程度的单词有不同的基础优先级

3. **答错历史**：最近答错的单词优先级提高

## 功能特性

### 1. 智能复习页面

路径：`/zh/smart-review` (中文) 或 `/en/smart-review` (英文)

功能：
- 显示所有单词的复习统计
- 按优先级排序需要复习的单词
- 可选择复习数量（5/10/20/30）
- 显示每个单词的下次复习时间

### 2. 复习统计

页面顶部显示四个类别的统计：

- 🔴 **紧急复习**：已过期的单词
- 🟡 **即将到期**：24小时内到期的单词
- 🔵 **近期复习**：1周内到期的单词
- 🟢 **未来复习**：1周后到期的单词

### 3. 与测试模式集成

在测试页面的"测试模式"中，新增"智能复习"按钮：
- 点击跳转到智能复习页面
- 选择复习单词后开始测试

### 4. 自动同步

- 支持本地存储（localStorage）
- 支持 Supabase 云端同步
- 实时更新复习进度

## 使用流程

### 第一次使用

1. 学习一些新单词（标记为 new）
2. 等待 1 小时后，单词进入"紧急复习"状态
3. 进入智能复习页面，查看需要复习的单词
4. 选择复习数量并开始测试
5. 答对单词后，复习间隔延长到下一阶段

### 日常复习

1. 每天查看智能复习页面
2. 优先复习"紧急复习"和"即将到期"的单词
3. 答错后，复习间隔重置，需要重新学习
4. 答对后，复习间隔延长，减少复习频率

### 长期学习效果

- **新词** → 通过 3 次正确测试 → **学习中**
- **学习中** → 通过测试 → **熟悉**
- **熟悉** → 通过测试 → **已掌握**
- **已掌握** → 复习间隔达到 120 天

## 技术实现

### 核心函数

```typescript
// 计算复习优先级（0-100）
calculateReviewPriority(familiarity: FamiliarityLevel, stats?: LearningStats): number

// 计算下次复习时间（时间戳）
calculateNextReviewTime(familiarity: FamiliarityLevel, stats?: LearningStats): number

// 判断单词是否需要复习
needsReview(familiarity: FamiliarityLevel, stats?: LearningStats): boolean

// 获取需要复习的单词列表
getReviewWords(words: Word[], limit?: number): ReviewWord[]

// 获取复习状态文本
getReviewStatusText(familiarity: FamiliarityLevel, stats?: LearningStats, language: 'chinese' | 'english'): string

// 获取复习统计
getReviewStats(words: Word[]): ReviewStats
```

### 数据结构

```typescript
interface ReviewStats {
  urgentReview: number      // 紧急需要复习（已过期）
  dueSoon: number          // 即将到期（24小时内）
  upcoming: number         // 即将到期（1周内）
  future: number           // 未来复习
  totalWords: number
}

interface ReviewWord {
  id: number
  priority: number         // 复习优先级（0-100）
  nextReviewTime: number   // 下次复习时间戳
  daysUntilReview: number  // 距离复习的天数
}
```

## 配置选项

### 复习间隔配置

可以在 `web/src/lib/smartReview.ts` 中修改 `REVIEW_INTERVALS` 常量来自定义复习间隔：

```typescript
const REVIEW_INTERVALS = {
  new: [1, 4, 24],           // 新词间隔（小时）
  learning: [24, 72, 168],   // 学习中间隔（小时）
  familiar: [168, 336, 720], // 熟悉间隔（小时）
  mastered: [720, 1440, 2880] // 已掌握间隔（小时）
}
```

### 连续答对阈值

默认为 3 次，可在 `web/src/lib/progressSync.ts` 中修改：

```typescript
const CONSECUTIVE_CORRECT_THRESHOLD = 3
```

## 注意事项

1. **初始状态**：新学习单词的复习间隔从 1 小时开始
2. **答错重置**：答错后复习阶段重置到第一阶段
3. **时间精度**：复习时间精确到秒，建议每天定期检查
4. **云端同步**：登录用户可同步复习进度到云端
5. **离线支持**：未登录用户使用本地存储

## 常见问题

**Q: 为什么有些单词一直显示"紧急复习"？**

A: 这些单词可能多次答错，导致复习阶段重置。建议集中复习这些单词。

**Q: 复习间隔能手动调整吗？**

A: 可以通过修改 `REVIEW_INTERVALS` 常量来自定义，但建议保持默认值以获得最佳效果。

**Q: 智能复习与错题本有什么区别？**

A: 
- **错题本**：显示所有答错过且未掌握的单词
- **智能复习**：基于遗忘曲线，按优先级推荐需要复习的单词

**Q: 复习进度会丢失吗？**

A: 不会。复习进度保存在 localStorage 中，登录用户还会同步到 Supabase 云端。

## 未来改进

- [ ] 添加自定义复习间隔功能
- [ ] 支持分组复习（按词性、难度）
- [ ] 添加复习提醒通知
- [ ] 支持学习计划（每日目标）
- [ ] 统计复习效果数据
- [ ] 支持导出复习进度报告

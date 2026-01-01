# 熟悉程度自动计算系统

## 概述

熟悉程度采用**混合策略**：用户明确标记优先 + 智能降级保护。系统会综合考虑用户的标记和测试数据来评估对单词的掌握程度。

**核心原则**：
- 🎯 **尊重用户明确标记**（标记掌握、学习中、新词等）
- 📊 **测试数据作为验证**（不直接覆盖用户选择）
- ⚡ **智能降级保护**（防止用户明显误标时自动纠正）
- 🏷️ **自动计算展示**（熟悉程度通过算法自动计算，以标签形式展示）

**注意**：熟悉程度在详情面板中以**标签形式展示**，显示当前掌握程度和计算分数。用户不再需要手动点击选择熟悉程度。

## 计算因素

### 1. 测试正确率 (40%)
- **权重**: 40 分
- **说明**: 最能反映真实掌握程度的指标
- **计算**: `正确次数 / 测试次数 * 40`

### 2. 掌握倾向 (30%)
- **权重**: 30 分
- **说明**: 用户主动标记的倾向性
- **计算**: `标记掌握次数 / (标记掌握次数 + 标记未掌握次数) * 30`

### 3. 练习频次 (20%)
- **权重**: 20 分
- **说明**: 查看次数代表接触频率
- **计算**: `min(查看次数 * 2, 20)`
  - 每次查看增加 2 分
  - 最高不超过 20 分（查看10次）

### 4. 时间因素 (10%)
- **权重**: 10 分
- **说明**: 最近学习活动的影响
- **计算**:
  - 最近 7 天内有活动：10 分
  - 7-30 天内有活动：线性衰减
  - 超过 30 天：0 分

## 级别划分标准

### 混合策略优先级

| 优先级 | 情况 | 结果 |
|--------|------|------|
| 1️⃣ | 用户标记 `mastered`，且测试数据不矛盾 | ✅ 直接使用用户选择（mastered） |
| 1️⃣ | 用户标记 `new` 或 `learning` | ✅ 直接使用用户选择 |
| 1️⃣ | 用户标记 `familiar` | ✅ 直接使用用户选择 |
| 2️⃣ | 用户标记 `mastered`，但测试正确率 < 50% | ⚠️ 强制降级为 `familiar` 或 `learning`（智能保护） |
| 3️⃣ | 无用户明确标记 | 📊 根据分数自动计算 |

### 级别划分标准

| 级别 | 分数范围 | 条件 | 说明 |
|------|---------|------|------|
| new | 0 分 | 无任何学习活动 | 尚未开始学习 |
| learning | 1-39 分 | 有学习活动但分数较低 | 正在学习中，需要更多练习 |
| familiar | 40-69 分 | 有一定测试/标记活动 | 基本掌握，可以继续提高 |
| mastered | 70+ 分 | 需满足额外条件 | 完全掌握，无需复习 |

### 掌握级别的额外条件

当无用户明确标记，根据分数自动判断时，要标记为 `mastered`，除分数 ≥70 外，还需满足：
- 至少有 3 次测试记录
- 测试正确率 ≥ 70%

这确保了单词的掌握是有依据的，避免误判。

### 智能降级保护

当用户标记为 `mastered` 时，系统会检查测试数据：
- 如果测试正确率 < 50%，系统会强制降级为 `familiar` 或 `learning`
- 这防止了用户盲目标记为掌握但实际表现不佳的情况

## 界面展示

熟悉程度在单词详情面板中以**标签形式**展示，包含：

### 显示内容

1. **熟悉程度标签**
   - 根据当前级别显示不同颜色的标签
   - 新单词（new）：紫色渐变
   - 学习中（learning）：橙红色渐变
   - 熟悉（familiar）：蓝青色渐变
   - 已掌握（mastered）：绿色渐变

2. **掌握分数**
   - 显示当前计算出的分数（0-100）
   - 分数是系统综合测试、标记、练习等因素自动计算的结果
   - 格式：`掌握分数：XX / 100`

### 界面示例

```
单词详情
━━━━━━━━━━━━━━━━━━━━━
荷兰语：hallo
中文：你好
英文：hello
词性：interjection
难度：A1

熟悉程度：[新单词] ← 彩色标签
掌握分数：0 / 100 ← 自动计算
```

### 用户交互

- 用户通过右滑/左滑标记掌握/未掌握
- 熟悉程度会自动更新
- 查看详情面板可看到当前掌握程度和计算分数
- 无需手动点击选择熟悉程度（由系统自动计算）

## 自动计算时机

熟悉程度会在以下情况自动重新计算：

1. **测试完成后**
   - 答对/答错题目
   - 跳过题目（标记为未掌握）

2. **用户标记后**
   - 用户通过右滑/左滑标记掌握/未掌握
   - 系统会自动更新熟悉程度和掌握分数

3. **加载进度时**
   - 从数据库加载用户进度时自动计算

## 使用示例

### 代码示例

#### 1. 根据统计数据自动计算

```typescript
import { calculateFamiliarity } from './lib/familiarityCalculator'

// 根据统计数据计算熟悉程度（无用户标记）
const stats: LearningStats = {
  viewCount: 10,
  masteredCount: 5,
  unmasteredCount: 2,
  testCount: 8,
  testCorrectCount: 6,
  testWrongCount: 2,
  lastViewedAt: '2026-01-01T10:00:00Z',
  lastTestedAt: '2026-01-01T10:00:00Z',
}

const familiarity = calculateFamiliarity(stats)
// 结果可能是: 'familiar'
```

#### 2. 尊重用户标记（混合策略）

```typescript
import { calculateFamiliarity } from './lib/familiarityCalculator'

// 用户标记为掌握，系统会根据测试数据智能判断
const stats: LearningStats = {
  viewCount: 10,
  masteredCount: 5,
  unmasteredCount: 3,
  testCount: 8,
  testCorrectCount: 6,
  testWrongCount: 2,
  lastViewedAt: '2026-01-01T10:00:00Z',
  lastTestedAt: '2026-01-01T10:00:00Z',
}

const userChoice: FamiliarityLevel = 'mastered'  // 用户明确标记为掌握
const familiarity = calculateFamiliarity(stats, userChoice)

// 如果测试正确率 >= 50%，结果为: 'mastered'（尊重用户选择）
// 如果测试正确率 < 50%，结果为: 'familiar' 或 'learning'（智能降级）
```

### 获取熟悉程度描述

```typescript
import { getFamiliarityLabel, getFamiliarityDescription } from './lib/familiarityCalculator'

// 获取中文名称
const label = getFamiliarityLabel('learning')
// 结果: '学习中'

// 获取英文名称
const labelEn = getFamiliarityLabelEn('learning')
// 结果: 'Learning'

// 获取描述
const description = getFamiliarityDescription('learning', 'chinese')
// 结果: '正在学习中，需要更多练习'
```

## 控制台日志

系统会在自动计算时输出日志，方便调试：

```
测试结果: 正确, 自动计算熟悉程度: familiar
测试结果: 错误, 自动计算熟悉程度: learning
手动标记为 mastered（用户选择: mastered）→ 尊重用户选择
手动标记为 mastered（用户选择: mastered）→ 智能降级为 familiar（测试正确率<50%）
设置熟悉程度为 learning（用户选择: new）→ 尊重用户选择
```

## 数据持久化

### 登录用户
- 统计数据和熟悉程度自动保存到 Supabase
- `familiarity` 字段会根据混合策略自动更新

### 本地用户（游客模式）
- 数据保存在 `localStorage` 的 `nl-words` 键中
- 每次操作后自动更新

### 数据同步
- 登录用户的数据会自动同步到云端
- 用户标记和测试数据都会被记录和同步

## 配置和调整

如果需要调整计算权重、级别阈值或混合策略参数，可以修改 `web/src/lib/familiarityCalculator.ts`：

### 调整分数权重

```typescript
export function calculateFamiliarityScore(stats: LearningStats | undefined): number {
  // 测试正确率权重（0-40分）
  const testScore = accuracy * 40        // 调整测试权重
  // 掌握倾向权重（0-30分）
  const masteryScore = masteryRatio * 30 // 调整掌握倾向权重
  // 练习频次权重（0-20分）
  const viewScore = Math.min(stats.viewCount * 2, 20)  // 调整练习权重
  // 时间因素权重（0-10分）
  const timeScore = 10                   // 调整时间权重
  return testScore + masteryScore + viewScore + timeScore
}
```

### 调整级别阈值

```typescript
export function getFamiliarityFromScore(
  score: number,
  stats: LearningStats | undefined,
  userFamiliarity?: FamiliarityLevel
): FamiliarityLevel {
  // 修改这些阈值来调整级别划分
  if (score <= 39) {  // learning 的上限
    return 'learning'
  }
  if (score <= 69) {  // familiar 的上限
    return 'familiar'
  }
  // ...
}
```

### 调整智能降级阈值

```typescript
export function getFamiliarityFromScore(
  score: number,
  stats: LearningStats | undefined,
  userFamiliarity?: FamiliarityLevel
): FamiliarityLevel {
  // 智能降级保护阈值
  if (userFamiliarity === 'mastered') {
    if (stats.testCount >= 2) {
      const accuracy = stats.testCorrectCount / stats.testCount
      // 修改这个阈值：0.5 表示50%正确率
      if (accuracy < 0.5) {
        return score <= 39 ? 'learning' : 'familiar'
      }
    }
    return 'mastered'
  }
  // ...
}
```

## 注意事项

1. **用户选择优先**: 用户明确标记（掌握、学习中、新词）会被优先尊重，不会直接被覆盖
2. **智能降级保护**: 只有当用户标记为"掌握"但测试数据明显矛盾时（正确率<50%），系统才会强制降级
3. **数据准确性**: 熟悉程度的准确性取决于测试和标记的数据量，建议多进行测试
4. **时间衰减**: 长期不学习的单词，熟悉程度会因时间因素而降低
5. **多次标记累积**: 用户多次标记掌握/未掌握会被记录为历史数据，用于评估掌握倾向

## 迁移说明

如果已有数据使用旧的熟悉程度系统：
1. 系统会自动根据现有统计数据重新计算
2. 第一次加载进度时，所有单词的熟悉程度都会更新
3. 用户的标记历史（masteredCount、unmasteredCount）会被保留
4. 混合策略会在每次操作时应用，不覆盖用户明确标记

## 常见问题

### Q: 为什么我标记为掌握，但系统显示为熟悉？
A: 这可能是因为测试正确率低于50%，触发了智能降级保护。系统检测到虽然您标记为掌握，但测试表现不佳，因此智能降级为熟悉。提高测试正确率后，标记为掌握就会被保留。

### Q: 用户多次标记掌握和未掌握会怎样？
A: 系统会记录所有的标记历史。例如5次标记掌握、3次标记未掌握，掌握比例为62.5%，这会影响"掌握倾向"分数。但只要您最新标记为掌握，且测试数据正常，系统会尊重您的选择。

### Q: 如何快速提高熟悉程度？
A: 多进行测试并保持高正确率，定期复习单词。测试准确性和频率是提升熟悉程度的关键。

### Q: 熟悉程度会下降吗？
A: 会。如果测试表现不佳，或者长时间不学习（时间因素衰减），熟悉程度会下降。

### Q: 智能降级保护的阈值是多少？
A: 当用户标记为"掌握"时，如果测试正确率低于50%，系统会强制降级。这个阈值是为了防止明显的误标。

### Q: 可以禁用智能降级吗？
A: 可以，修改 `getFamiliarityFromScore` 函数中的阈值即可。但建议保留，因为它可以防止盲目标记的情况。

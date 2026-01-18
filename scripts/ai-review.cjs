#!/usr/bin/env node

/**
 * AI Code Review Script
 * 使用 Groq API 进行免费的 AI 代码审查
 * Groq 提供快速免费的 LLM API,适合代码审查
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Groq API 配置
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 可用的免费模型
const MODELS = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B (最推荐)',
  'llama-3.1-8b-instant': 'Llama 3.1 8B (快速)',
  'mixtral-8x7b-32768': 'Mixtral 8x7B'
};

// 默认模型
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// API 速率限制配置
const RATE_LIMIT = {
  maxRetries: 3,
  initialDelay: 2000, // 初始延迟 2 秒
  maxDelay: 10000,    // 最大延迟 10 秒
  delayBetweenRequests: 1500 // 请求间延迟 1.5 秒
};

// 当前使用的模型索引(用于轮换模型)
let currentModelIndex = 0;

/**
 * 获取待审查的文件
 */
function getFilesToReview() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // 用户指定了文件路径
    return args.map(arg => {
      const fullPath = path.resolve(arg);
      if (!fs.existsSync(fullPath)) {
        error(`文件不存在: ${fullPath}`);
        process.exit(1);
      }
      return fullPath;
    });
  }

  // 默认审查 TypeScript/JavaScript 文件
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const files = [];

  // 查找 web/src 目录下的文件
  const srcDir = path.join(__dirname, '../web/src');
  if (fs.existsSync(srcDir)) {
    function findFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          findFiles(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(path.join(dir, entry.name));
          }
        }
      }
    }
    findFiles(srcDir);
  }

  // 查找根目录的配置文件
  const configFiles = [
    'vite.config.ts',
    'eslint.config.js',
    'tsconfig.json',
    'package.json'
  ];
  configFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      files.push(fullPath);
    }
  });

  return files;
}

/**
 * 读取文件内容
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    error(`无法读取文件: ${filePath}`);
    return null;
  }
}

/**
 * 获取下一个模型(用于轮换)
 */
function getNextModel() {
  const models = Object.keys(MODELS);
  const model = models[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % models.length;
  return model;
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用 Groq API (带重试机制)
 */
async function callGroqAPI(messages, model = DEFAULT_MODEL, retryCount = 0) {
  const data = JSON.stringify({
    model,
    messages,
    temperature: 0.3,
    max_tokens: 4096
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, async (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);

          if (res.statusCode === 200) {
            resolve(jsonResponse);
          } else if (res.statusCode === 429 && retryCount < RATE_LIMIT.maxRetries) {
            // 速率限制,尝试重试
            const errorMsg = jsonResponse.error?.message || 'Rate limit exceeded';

            // 尝试从错误消息中提取等待时间
            const waitTimeMatch = errorMsg.match(/try again in ([\d.]+)s/);
            const waitTime = waitTimeMatch
              ? (parseFloat(waitTimeMatch[1]) + 1) * 1000 // 多加 1 秒作为缓冲
              : RATE_LIMIT.initialDelay * Math.pow(2, retryCount);

            const delayTime = Math.min(waitTime, RATE_LIMIT.maxDelay);

            warning(`速率限制,${delayTime / 1000}秒后重试 (${retryCount + 1}/${RATE_LIMIT.maxRetries})...`);

            // 尝试切换到其他模型
            const nextModel = getNextModel();
            if (nextModel !== model) {
              info(`切换模型: ${MODELS[model]} → ${MODELS[nextModel]}`);
            }

            setTimeout(async () => {
              try {
                const result = await callGroqAPI(messages, nextModel, retryCount + 1);
                resolve(result);
              } catch (err) {
                reject(err);
              }
            }, delayTime);
          } else {
            reject(new Error(`API 错误: ${res.statusCode} - ${jsonResponse.error?.message || '未知错误'}`));
          }
        } catch (err) {
          reject(new Error(`解析响应失败: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

/**
 * 审查单个文件
 */
async function reviewFile(filePath, resultsLog) {
  const content = readFileContent(filePath);
  if (!content) {
    return null;
  }

  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`审查文件: ${relativePath}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');

  const fileExtension = path.extname(filePath);
  const fileType = fileExtension.startsWith('.ts') ? 'TypeScript' : 
                   fileExtension.startsWith('.js') ? 'JavaScript' : 'Code';

  const systemPrompt = `You are an expert code reviewer. Review the provided ${fileType} code and provide detailed feedback.

Focus on:
1. **Code Quality**: Readability, maintainability, and best practices
2. **Potential Bugs**: Logic errors, edge cases, and common mistakes
3. **Performance**: Optimization opportunities and performance issues
4. **Security**: Security vulnerabilities and potential risks
5. **Type Safety**: Type usage and potential type errors (for TypeScript)
6. **Best Practices**: Framework and language-specific best practices

Format your response with:
- ✅ **Strengths**: What's done well
- ⚠️ **Issues**: Problems found with severity (Critical/Major/Minor)
- 💡 **Suggestions**: Improvements and recommendations
- 📝 **Code Examples**: Specific code changes if needed

Be concise but thorough. Prioritize critical issues.`;

  const userPrompt = `Review this file:

\`\`\`
${content}
\`\`\`

File: ${relativePath}
Language: ${fileType}`;

  try {
    info(`正在分析代码... (使用模型: ${MODELS[DEFAULT_MODEL]})`);
    const response = await callGroqAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const review = response.choices[0].message.content;

    // 输出到控制台
    log(review);

    // 保存到日志文件
    if (resultsLog) {
      resultsLog += `\n\n${'='.repeat(60)}\n`;
      resultsLog += `文件: ${relativePath}\n`;
      resultsLog += `${'='.repeat(60)}\n`;
      resultsLog += review;
      resultsLog += `\n`;
    }

    return { review, log: resultsLog };

  } catch (err) {
    error(`审查失败: ${err.message}`);

    // 记录失败到日志
    if (resultsLog) {
      resultsLog += `\n\n${'='.repeat(60)}\n`;
      resultsLog += `文件: ${relativePath}\n`;
      resultsLog += `${'='.repeat(60)}\n`;
      resultsLog += `❌ 审查失败: ${err.message}\n`;
    }

    return { review: null, log: resultsLog };
  }
}

/**
 * 汇总审查结果
 */
function summarizeResults(results) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log('审查汇总', 'blue');
  log(`${'='.repeat(60)}\n`, 'blue');

  const totalFiles = results.length;
  const successfulReviews = results.filter(r => r !== null).length;
  const failedReviews = totalFiles - successfulReviews;

  success(`成功审查: ${successfulReviews}/${totalFiles} 个文件`);
  if (failedReviews > 0) {
    error(`审查失败: ${failedReviews} 个文件`);
  }

  log('\n💡 提示:', 'cyan');
  log('   - 使用 GROQ_API_KEY 环境变量设置你的 Groq API Key', 'cyan');
  log('   - 获取免费 API Key: https://console.groq.com/keys', 'cyan');
  log('   - Groq 提供免费的 API 额度,速度很快!', 'cyan');
  log('');
}

/**
 * 主函数
 */
async function main() {
  log('\n🤖 AI Code Review (Powered by Groq)\n', 'cyan');

  // 检查 API Key
  if (!GROQ_API_KEY) {
    error('未找到 GROQ_API_KEY 环境变量');
    log('\n请按以下步骤设置:\n', 'yellow');
    log('1. 访问 https://console.groq.com/keys 获取免费 API Key', 'blue');
    log('2. 创建 .env 文件并添加: GROQ_API_KEY=your_key_here', 'blue');
    log('3. 或者直接运行: export GROQ_API_KEY=your_key_here\n', 'blue');
    process.exit(1);
  }

  // 获取要审查的文件
  const files = getFilesToReview();
  if (files.length === 0) {
    warning('没有找到可审查的文件');
    log('\n提示: 可以指定文件路径,例如:', 'yellow');
    log('  npm run ai-review -- web/src/App.tsx\n', 'yellow');
    process.exit(0);
  }

  log(`找到 ${files.length} 个文件需要审查\n`, 'blue');

  // 审查文件
  let resultsLog = '# 🤖 AI Code Review 报告\n\n';
  resultsLog += `生成时间: ${new Date().toISOString()}\n`;
  resultsLog += `审查文件数: ${files.length}\n`;
  resultsLog += `\n${'='.repeat(60)}\n\n`;

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    info(`\n[${i + 1}/${files.length}] 开始审查...`);
    const result = await reviewFile(file, resultsLog);
    results.push(result.review);

    // 更新日志
    if (result.log) {
      resultsLog = result.log;
    }

    // 添加延迟以避免 API 限流(除了最后一个文件)
    if (i < files.length - 1) {
      log(`⏳ 等待 ${RATE_LIMIT.delayBetweenRequests / 1000} 秒后继续...`, 'yellow');
      await delay(RATE_LIMIT.delayBetweenRequests);
    }
  }

  // 保存完整报告到文件
  const reportPath = path.join(__dirname, '../ai-review-report.md');
  try {
    fs.writeFileSync(reportPath, resultsLog, 'utf8');
    log(`\n📄 完整报告已保存到: ${reportPath}`, 'green');
  } catch (err) {
    warning(`无法保存报告: ${err.message}`);
  }

  // 汇总结果
  summarizeResults(results);
}

// 运行脚本
main().catch(err => {
  error(`运行出错: ${err.message}`);
  process.exit(1);
});

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

// --- 环境变量导出 ---
export const { 
  MAX_RUNTIME_MINUTES, NODE_REFRESH_TOKEN, NODE_ACCESS_TOKEN, 
  NODE_USERNAME, NODE_TASK_URL, TARGET_DIR, GITHUB_ACTIONS 
} = process.env;

// --- 核心配置 ---
export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 30) * 60 * 1000,
  checkIntervalMs: 100, // 极致 100ms 动画频率
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

// --- 辅助工具 ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getTimestamp = () => {
  const f = (n) => String(n).padStart(2, '0');
  const now = new Date();
  return `${now.getFullYear()}-${f(now.getMonth() + 1)}-${f(now.getDate())}-${f(now.getHours())}-${f(now.getMinutes())}-${f(now.getSeconds())}`;
};

// 构造视觉进度
function getProgressUI(startTime, step) {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const elapsed = Date.now() - startTime;
  const s = Math.floor(elapsed / 1000) % 60;
  const m = Math.floor(elapsed / 60000);
  
  return { 
    ui: `${spinner[step % 10]} ${m > 0 ? `${m}分${s}秒` : `${s}秒`}`, 
    isTimeout: elapsed > CONFIG.maxRuntimeMs,
    timeLabel: `${m}分${s}秒`
  };
}

/**
 * 初始化浏览器：本地自动开启窗口模式
 */
export async function initApp() {
  const isCI = !!GITHUB_ACTIONS && GITHUB_ACTIONS !== 'false';
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`, `--load-extension=${CONFIG.extensionPath}`, '--lang=zh-CN'
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    headless: isCI ? "new" : false,
    defaultViewport: { width: 1920, height: 1080 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');
  return { browser, page, isCI };
}

/**
 * 终极监控循环
 */
export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0, lastTitle = "初始化...";
  
  process.stdout.write('\u001B[?25l'); // 隐藏光标

  while (browser.connected) {
    const { ui, isTimeout, timeLabel } = getProgressUI(startTime, step++);

    try {
      // 性能平衡：每 5 帧视觉更新才调用 1 次标题获取（约 500ms）
      if (step % 5 === 0) lastTitle = await page.title();

      // \r 回车, \x1b[K 清除行尾
      process.stdout.write(`\r   > ${ui} | ${lastTitle}\x1b[K`);

      if (/错误|失败|Error/.test(lastTitle)) {
        process.stdout.write('\n');
        await page.screenshot({ path: path.join(CONFIG.errorDir, `ERROR-${getTimestamp()}.png`) });
        console.error(`❌ [${timeLabel}] 状态异常。`);
        break;
      }

      if (lastTitle.includes("已完成所有任务") || lastTitle.includes("Mission Complete")) {
        process.stdout.write('\n');
        console.log(`✅ [${timeLabel}] 任务顺利结束。`);
        break;
      }
    } catch (e) { if (!browser.connected) break; }

    if (isTimeout) {
      process.stdout.write('\n⏰ 达到最大运行限时。\n');
      break;
    }

    await delay(CONFIG.checkIntervalMs);
  }
  process.stdout.write('\u001B[?25h'); // 恢复光标
}
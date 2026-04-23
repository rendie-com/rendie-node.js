import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

export const { 
  MAX_RUNTIME_MINUTES, NODE_REFRESH_TOKEN, NODE_ACCESS_TOKEN, 
  NODE_USERNAME, NODE_TASK_URL, TARGET_DIR, GITHUB_ACTIONS 
} = process.env;

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 30) * 60 * 1000,
  checkIntervalMs: 100, // 100ms 极致视觉频率
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 终极静默退出：拦截 stderr 屏蔽 Windows 乱码
 */
export const silentExit = async (browser) => {
  process.stdout.write('\u001B[?25h'); // 恢复光标
  if (browser && browser.connected) {
    const originalStderr = process.stderr.write;
    process.stderr.write = () => {}; // 暂时禁言 stderr
    try {
      await browser.close();
    } catch (e) {}
    process.stderr.write = originalStderr; // 恢复 stderr
  }
  process.exit(0);
};

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
  return { browser, page, isCI };
}

export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0, lastTitle = "载入中...";
  process.stdout.write('\u001B[?25l'); // 隐藏光标

  while (browser.connected) {
    const { ui, isTimeout, timeLabel } = getProgressUI(startTime, step++);
    try {
      if (step % 5 === 0) lastTitle = await page.title();
      process.stdout.write(`\r   > ${ui} | ${lastTitle}\x1b[K`);

      if (/错误|失败|Error/.test(lastTitle)) {
        process.stdout.write('\n');
        console.error(`❌ [${timeLabel}] 检测到异常。`);
        break;
      }
      if (lastTitle.includes("已完成所有任务") || lastTitle.includes("Mission Complete")) {
        process.stdout.write('\n');
        console.log(`✅ [${timeLabel}] 任务顺利结束。`);
        break;
      }
    } catch (e) { throw e; } // 抛出错误交给 index.js 的探测器处理

    if (isTimeout) {
      process.stdout.write('\n⏰ 达到限时。');
      break;
    }
    await delay(CONFIG.checkIntervalMs);
  }
}
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
  checkIntervalMs: 100, 
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getReadableTimestamp = () => {
  const now = new Date();
  const Y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, '0');
  const D = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${Y}年${M}月${D}日-${h}时${m}分${s}秒`;
};

async function saveScreenshot(page, typeName) {
  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);
  try {
    await page.screenshot({ path: imgPath });
    console.log(`\n📸 已保存截图: ${fileName}`);
  } catch (e) {
    console.error(`\n⚠️ 截图失败: ${e.message}`);
  }
}

/**
 * 终极静默退出
 */
export const silentExit = async (browser) => {
  process.stdout.write('\u001B[?25h'); 
  if (browser && browser.connected) {
    const originalStderr = process.stderr.write;
    process.stderr.write = () => {}; 
    try {
      // 强行关闭所有页面并退出
      await browser.close();
    } catch (e) {}
    process.stderr.write = originalStderr;
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

/**
 * 核心监控：确保任何结果都会触发退出
 */
export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0, lastTitle = "载入中...";
  process.stdout.write('\u001B[?25l'); 

  while (browser.connected) {
    const { ui, isTimeout, timeLabel } = getProgressUI(startTime, step++);
    try {
      if (step % 5 === 0) lastTitle = await page.title().catch(() => "读取中...");
      process.stdout.write(`\r   > ${ui} | ${lastTitle}\x1b[K`);

      // 1. 业务错误 -> 截图并退出
      if (/错误|失败|Error/.test(lastTitle)) {
        process.stdout.write('\n❌ 检测到逻辑异常');
        await saveScreenshot(page, '业务错误');
        await silentExit(browser); 
        return; // 防护性返回
      }
      
      // 2. 正常完成 -> 退出
      if (lastTitle.includes("已完成所有任务") || lastTitle.includes("Mission Complete")) {
        process.stdout.write(`\n✅ [${timeLabel}] 任务顺利结束。`);
        await silentExit(browser);
        return;
      }

      // 3. 超时 -> 截图并退出
      if (isTimeout) {
        process.stdout.write('\n⏰ 达到监控限时');
        await saveScreenshot(page, '监控超时');
        await silentExit(browser);
        return;
      }

    } catch (e) {
      const isContextError = e.message.includes('context') || e.message.includes('Execution');
      if (!isContextError && browser.connected) {
        process.stdout.write(`\n🚨 监控点崩溃`);
        await saveScreenshot(page, '系统崩溃');
        throw e; // 抛给 index.js 的探测器做最后一次 silentExit
      }
    }
    await delay(CONFIG.checkIntervalMs);
  }
}
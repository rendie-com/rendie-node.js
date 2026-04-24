import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub } from './utils.js';

puppeteer.use(StealthPlugin());

const { MAX_RUNTIME_MINUTES, TARGET_DIR, GITHUB_ACTIONS, NODE_USERNAME } = process.env;
const isCI = !!GITHUB_ACTIONS && GITHUB_ACTIONS !== 'false';

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 1) * 60 * 1000,
  checkIntervalMs: 1500, 
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

async function getTitleSafe(page, timeout = 5000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('TITLE_TIMEOUT')), timeout);
  });

  try {
    const title = await Promise.race([page.title(), timeoutPromise]);
    clearTimeout(timer);
    return title;
  } catch (err) {
    clearTimeout(timer);
    if (err.message === 'TITLE_TIMEOUT') {
      console.error("⚠️ 标题获取超时，正在紧急截图...");
      await triggerErrorCapture(page, 'HUNG_DEBUG').catch(() => {});
      return "STATE_HUNG"; 
    }
    throw err;
  }
}

export async function triggerErrorCapture(page, typeName) {
  console.log(`\n📸 [${typeName}] 触发自动截图...`);
  if (!page || page.isClosed()) return;

  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);

  try {
    await delay(500);
    await page.screenshot({ path: imgPath, timeout: 20000 });
    if (fs.existsSync(imgPath)) {
      console.log(`✅ 截图已保存: ${fileName}`);
      await uploadToGithub(imgPath, fileName);
    }
  } catch (e) {
    console.error(`❌ 截图失败: ${e.message}`);
  }
}

export const silentExit = async (browser) => {
  if (browser?.connected) {
    console.log("🛑 正在关闭浏览器...");
    await browser.close().catch(() => {});
  }
  process.exit(0);
};

export async function initApp() {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`, 
      `--load-extension=${CONFIG.extensionPath}`, 
      '--lang=zh-CN',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    headless: isCI ? "new" : false, 
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    console.log(`💬 弹窗拦截: ${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });

  return { browser, page, isCI };
}

export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0;

  console.log("🚀 监控启动...");

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    
    try {
      const lastTitle = await getTitleSafe(page);

      if (step % 10 === 0) {
        console.log(`[${Math.floor(elapsed/1000)}s] 实时状态: ${lastTitle}`);
      }

      // 1. 只要标题包含“错误、失败、Error、Exception”，立即截图
      if (lastTitle !== "STATE_HUNG" && /错误|失败|Error|Exception|404|500/.test(lastTitle)) {
          console.log(`🚨 检测到异常标题: "${lastTitle}"`);
          await triggerErrorCapture(page, 'PAGE_REPORTED_ERROR');
          // 截图后可以选择继续监控或直接退出，这里推荐退出防止重复截图
          await silentExit(browser);
          return;
      }

      // 2. 正常成功判定
      if (lastTitle.includes("已完成所有任务") || lastTitle.includes("SUCCESS")) {
          console.log(`\n✅ 任务圆满结束。`);
          await triggerErrorCapture(page, 'SUCCESS_DONE');
          await silentExit(browser);
          return;
      }

      // 3. 超时保底
      if (elapsed > CONFIG.maxRuntimeMs) {
        console.log(`\n⏰ 到达限时...`);
        await triggerErrorCapture(page, 'AUTO_TIMEOUT');
        await silentExit(browser);
        return;
      }

    } catch (e) {
      const msg = e.message;
      if (msg.includes('detached Frame') || msg.includes('Target closed') || msg.includes('destroyed')) {
        if (step % 5 === 0) console.log("⏳ 页面环境重定向中，等待稳定...");
        await delay(2000);
        continue; 
      }
      // 捕获到未知的 Promise 异常也触发一次截图
      await triggerErrorCapture(page, 'RUNTIME_EXCEPTION').catch(() => {});
      console.error("监控循环异常:", msg);
    }
    
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}
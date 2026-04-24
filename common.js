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

/**
 * 带有超时竞争的标题获取
 */
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
      console.error("⚠️ page.title() 响应超时，正在取证...");
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
      console.log(`✅ 截图保存: ${fileName}`);
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

  // 处理可能导致死锁的弹窗
  page.on('dialog', async dialog => {
    console.log(`💬 自动处理弹窗: ${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });

  return { browser, page, isCI };
}

export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0;

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    
    try {
      const lastTitle = await getTitleSafe(page);

      if (step % 10 === 0) {
        console.log(`[${Math.floor(elapsed/1000)}s] 状态: ${lastTitle}`);
      }

      if (lastTitle === "STATE_HUNG") {
        await delay(2000); 
        continue;
      }

      // 业务逻辑判定
      if (lastTitle !== "读取中..." && lastTitle !== "localhost:3000") {
          if (/错误|失败|Error/.test(lastTitle)) {
            await triggerErrorCapture(page, 'BUSINESS_ERROR');
            await silentExit(browser);
            return;
          }
          if (lastTitle.includes("已完成所有任务")) {
            console.log(`\n✅ 任务圆满结束。`);
            await triggerErrorCapture(page, 'SUCCESS');
            await silentExit(browser);
            return;
          }
      }

      if (elapsed > CONFIG.maxRuntimeMs) {
        console.log(`\n⏰ 到达限时，执行超时取证...`);
        await triggerErrorCapture(page, 'TIMEOUT_AUTO');
        await silentExit(browser);
        return;
      }
    } catch (e) {
      const msg = e.message;
      // 关键修复：静默处理框架失效错误
      if (msg.includes('detached Frame') || msg.includes('Target closed') || msg.includes('Execution context was destroyed')) {
        if (step % 5 === 0) console.log("⏳ 页面环境重定向中，等待稳定...");
        await delay(2000);
        continue; 
      }
      console.error("监控循环异常:", msg);
    }
    
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}
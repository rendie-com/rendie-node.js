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
  checkIntervalMs: 1500, // 略微增加间隔，提高稳定性
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

/**
 * 带有超时机制的标题获取，防止协议卡死
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
      console.error("⚠️ [警告] page.title() 响应超时，正在强制截图...");
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
    // 截图增加超时，防止截图本身卡死
    await page.screenshot({ path: imgPath, timeout: 20000 });
    if (fs.existsSync(imgPath)) {
      console.log(`✅ 截图保存: ${fileName}`);
      await uploadToGithub(imgPath, fileName);
    }
  } catch (e) {
    console.error(`❌ 截图流程异常: ${e.message}`);
  }
}

export const silentExit = async (browser) => {
  if (browser?.connected) {
    console.log("🛑 正在安全关闭浏览器...");
    await browser.close().catch(() => {});
  }
  process.exit(0);
};

export async function initApp() {
  console.log(`🌐 [${isCI ? 'CI' : 'Local'}] 模式 | 用户: ${NODE_USERNAME || 'admin'}`);
  
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`, 
      `--load-extension=${CONFIG.extensionPath}`, 
      '--lang=zh-CN',
      // 增强稳定性：禁止后台标签页限速
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    headless: isCI ? "new" : false, 
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // 处理 Dialog 弹窗，防止其阻塞 title() 指令
  page.on('dialog', async dialog => {
    console.log(`💬 自动处理弹窗: [${dialog.type()}] ${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('failed')) {
      console.log(`🖥️ [Browser]: ${text}`);
    }
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

      if (step % 8 === 0) {
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
      if (e.message.includes('Target closed')) break;
      console.error("监控循环异常:", e.message);
    }
    
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub } from './utils.js';

puppeteer.use(StealthPlugin());

export const { 
  MAX_RUNTIME_MINUTES, NODE_REFRESH_TOKEN, NODE_ACCESS_TOKEN, 
  NODE_USERNAME, NODE_TASK_URL, TARGET_DIR, GITHUB_ACTIONS 
} = process.env;

const isCI = !!GITHUB_ACTIONS && GITHUB_ACTIONS !== 'false';

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 1) * 60 * 1000,
  checkIntervalMs: 100, 
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

// 优化后的截图函数，增加 await 强制等待
async function triggerErrorCapture(page, typeName) {
  if (!page || page.isClosed()) return;
  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);
  try {
    console.log(`\n📸 [Action] 正在截图: ${fileName}`);
    await page.screenshot({ path: imgPath });
    
    if (fs.existsSync(imgPath)) {
      console.log(`✅ [Action] 截图本地已保存 (${(fs.statSync(imgPath).size / 1024).toFixed(2)} KB)`);
      // 必须加上 await，确保上传流程走完
      await uploadToGithub(imgPath, fileName);
    }
  } catch (e) {
    console.error(`❌ [Action] 截图/上传异常: ${e.message}`);
  }
}

export const silentExit = async (browser) => {
  if (!isCI) process.stdout.write('\u001B[?25h'); 
  if (browser && browser.connected) {
    try { 
      console.log("关闭浏览器中...");
      await browser.close(); 
    } catch (e) {}
  }
  process.exit(0);
};

export async function initApp() {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`, 
      `--load-extension=${CONFIG.extensionPath}`, 
      '--lang=zh-CN',
      '--disable-dev-shm-usage', // 核心：解决云端容器内存不足导致的截图卡死
      '--disable-gpu'            // 云端加速
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

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    const isTimeout = elapsed > CONFIG.maxRuntimeMs;
    
    try {
      if (step % 10 === 0) lastTitle = await page.title().catch(() => "读取中...");

      if (isCI) {
        if (step % 100 === 0) console.log(`[${Math.floor(elapsed/1000)}s] 状态: ${lastTitle}`);
      } else {
        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        process.stdout.write(`\r   > ${spinner[step % 10]} ${Math.floor(elapsed/1000)}秒 | ${lastTitle}\x1b[K`);
      }

      if (/错误|失败|Error/.test(lastTitle)) {
        await triggerErrorCapture(page, '业务错误');
        await silentExit(browser);
        return;
      }
      
      if (lastTitle.includes("已完成所有任务") || lastTitle.includes("Mission Complete")) {
        console.log(`\n✅ 任务完成。`);
        await silentExit(browser);
        return;
      }

      if (isTimeout) {
        console.log(`\n⏰ 到达限时，执行超时截图推送...`);
        await triggerErrorCapture(page, '测试超时');
        // 推送完后多等 3 秒给 GitHub API 缓冲
        await delay(3000); 
        await silentExit(browser);
        return;
      }
    } catch (e) {
      if (!e.message.includes('context') && browser.connected) {
        await triggerErrorCapture(page, '系统崩溃');
        throw e;
      }
    }
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}
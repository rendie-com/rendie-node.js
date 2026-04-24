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

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 30) * 60 * 1000,
  checkIntervalMs: 100, 
};

// 使用 recursive: true 确保支持 error/task1 这种嵌套目录的创建
if (!fs.existsSync(CONFIG.errorDir)) {
  fs.mkdirSync(CONFIG.errorDir, { recursive: true });
}

async function triggerErrorCapture(page, typeName) {
  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);
  try {
    await page.screenshot({ path: imgPath });
    console.log(`\n📸 本地截图已保存: ${fileName}`);
    await uploadToGithub(imgPath, fileName);
  } catch (e) {
    console.error(`\n⚠️ 截图流程异常: ${e.message}`);
  }
}

export const silentExit = async (browser) => {
  process.stdout.write('\u001B[?25h'); 
  if (browser && browser.connected) {
    const originalStderr = process.stderr.write;
    process.stderr.write = () => {}; 
    try { await browser.close(); } catch (e) {}
    process.stderr.write = originalStderr;
  }
  process.exit(0);
};

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
  process.stdout.write('\u001B[?25l'); 

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    const isTimeout = elapsed > CONFIG.maxRuntimeMs;
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    
    try {
      if (step % 5 === 0) lastTitle = await page.title().catch(() => "读取中...");
      process.stdout.write(`\r   > ${spinner[step % 10]} ${Math.floor(elapsed/1000)}秒 | ${lastTitle}\x1b[K`);

      if (/错误|失败|Error/.test(lastTitle)) {
        await triggerErrorCapture(page, '业务错误');
        await silentExit(browser);
        return;
      }
      
      if (lastTitle.includes("已完成所有任务") || lastTitle.includes("Mission Complete")) {
        console.log(`\n✅ 任务圆满结束。`);
        await silentExit(browser);
        return;
      }

      if (isTimeout) {
        await triggerErrorCapture(page, '监控超时');
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
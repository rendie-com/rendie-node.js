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

// 判断是否在 CI 环境
const isCI = !!GITHUB_ACTIONS && GITHUB_ACTIONS !== 'false';

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 30) * 60 * 1000,
  checkIntervalMs: 100, 
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

async function triggerErrorCapture(page, typeName) {
  if (!page || page.isClosed()) return;
  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);
  try {
    console.log(`\n📸 正在捕获截图: ${fileName}...`);
    await page.screenshot({ path: imgPath });
    console.log(`✅ 本地截图已保存。`);
    await uploadToGithub(imgPath, fileName);
  } catch (e) {
    console.error(`\n⚠️ 截图流程异常: ${e.message}`);
  }
}

export const silentExit = async (browser) => {
  if (!isCI) process.stdout.write('\u001B[?25h'); 
  if (browser && browser.connected) {
    try { await browser.close(); } catch (e) {}
  }
  process.exit(0);
};

export async function initApp() {
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
  
  if (!isCI) process.stdout.write('\u001B[?25l'); 

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    const isTimeout = elapsed > CONFIG.maxRuntimeMs;
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    
    try {
      if (step % 5 === 0) lastTitle = await page.title().catch(() => "读取中...");

      // --- 日志输出逻辑 ---
      if (isCI) {
        // CI 环境：每 10 秒（100 * 100ms）打印一行
        if (step % 100 === 0) {
          console.log(`[${Math.floor(elapsed/1000)}s] 状态: ${lastTitle}`);
        }
      } else {
        // 本地环境：动态刷新
        process.stdout.write(`\r   > ${spinner[step % 10]} ${Math.floor(elapsed/1000)}秒 | ${lastTitle}\x1b[K`);
      }

      // --- 逻辑判断 ---
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
        console.log(`\n⏰ 达到最大运行时间 (${MAX_RUNTIME_MINUTES}分钟)，触发超时截图...`);
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
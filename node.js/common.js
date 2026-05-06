import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub, formatElapsed, checkProjectEnv, isBrowserConnected, registerProcessGuards } from './utils.js';

puppeteer.use(StealthPlugin());

let browser, page;
const env = process.env;
const isCI = env.GITHUB_ACTIONS === 'true';
let isShuttingDown = false;

export const CONFIG = {
  url: "http://localhost:3000/admin",
  extPath: path.resolve('../chrome-extension'),
  errorDir: path.resolve(env.TARGET_DIR || 'error'),
  maxTime: (Number.parseInt(env.MAX_RUNTIME_MINUTES, 10) || 1) * 60000,
  interval: 1000,
};

const GOTO_TIMEOUT_MS = 30_000;
const TITLE_TIMEOUT_MS = 5_000;

async function ensureBrowser() {
  if (isBrowserConnected(browser)) return browser;

  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled', '--lang=zh-CN', `--disable-extensions-except=${CONFIG.extPath}`, `--load-extension=${CONFIG.extPath}`],
    headless: isCI ? "new" : false,
    defaultViewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  browser.on('disconnected', () => {
    // 保持静默：监控循环会自然退出
  });

  return browser;
}

async function ensurePage() {
  if (page && !page.isClosed()) return page;
  if (!isBrowserConnected(browser)) await ensureBrowser();
  page = await browser.newPage();
  return page;
}

export async function initApp() {
  checkProjectEnv(env);

  await ensureBrowser();
  await ensurePage();

  await page.evaluateOnNewDocument((e) => {
    const conf = {
      access_token: e.NODE_ACCESS_TOKEN,
      refresh_token: e.NODE_REFRESH_TOKEN,
      username: e.NODE_USERNAME,
      expires_in: e.NODE_EXPIRES_IN || '604800',
      menuList: e.NODE_MENU_LIST || '[]',
      DEFAULT_DB: 'sqlite',
    };
    Object.entries(conf).forEach(([k, v]) => localStorage.setItem(k, v || ''));
  }, env);

  console.log(`\n🔑 尝试进入系统: ${CONFIG.url}`);

  // --- 优化后的 goto 逻辑 ---
  try {
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle2',
      timeout: GOTO_TIMEOUT_MS,
    });
    console.log("✅ 页面加载成功");
  } catch (e) {
    console.log(`\n❌ 访问失败: 无法连接到 ${CONFIG.url}`);
    console.log(`💡 请确保您的前端服务已启动 (npm run dev)`);
    await shutdown();
    throw new Error(`无法连接到 ${CONFIG.url}`);
  }
}

export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  while (!isShuttingDown && browser?.connected) {
    const elapsed = Date.now() - start;

    // 1. 获取标题：如果 5 秒没反应，就显示“标题获取超时”
    const title = await Promise.race([
      page.title(),
      new Promise((_, r) => setTimeout(() => r(new Error('标题获取超时')), 5000))
    ]).catch((err) => err.message); // 捕捉错误并将其作为标题内容显示

    if (step % 10 === 0) {
      console.log(`[${formatElapsed(elapsed)}] 标题状态: ${title}`);
    }

    // 2. 判定原因
    const isErr = title.includes("出错");
    const isHung = title === "标题获取超时"; // 显式判断挂起原因
    const isTimeOut = elapsed > CONFIG.maxTime;
    const isSuccess = title.includes("已完成所有任务");

    if (isErr || isHung || isTimeOut || isSuccess) {
      // 确定终止的类型标签
      const type = (isErr || isHung) ? 'ERROR' : (isTimeOut ? 'TIMEOUT' : 'SUCCESS');

      // 确定具体显示的原因描述
      let reason = "";
      if (isErr) reason = `页面显示: ${title}`;
      else if (isHung) reason = `由于“${title}”导致页面挂起`;
      else if (isTimeOut) reason = `运行时间超过 ${CONFIG.maxTime / 60000} 分钟`;
      else if (isSuccess) reason = `任务顺利完成`;

      if (isErr || isHung || isTimeOut) {
        const name = `${type}_${getReadableTimestamp()}_${Date.now().toString().slice(-3)}.png`;
        if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });
        const imgPath = path.join(CONFIG.errorDir, name);

        console.log(`📸 异常终止 [${type}]: ${reason}`);
        await page.screenshot({ path: imgPath }).catch(() => { });
        await uploadToGithub(imgPath, name).catch(() => { });
      } else {
        console.log(`✅ ${reason}`);
      }

      await shutdown();
      return;
    }

    step++;
    await delay(CONFIG.interval);
  }
}

export async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    if (page && !page.isClosed()) await page.close().catch(() => { });
  } finally {
    if (isBrowserConnected(browser)) await browser.close().catch(() => { });
  }
}

registerProcessGuards({ shutdown });
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

    // 1. 获取主页面 URL 和 标题
    const currentUrl = page.url();
    const title = await page.title().catch((err) => {
      if (err.message.includes('detached')) return "框架脱离/跳转中";
      return "标题获取失败";
    });

    // 2. 获取所有 iframe 的地址
    // filter(f => f !== page.mainFrame()) 排除主框架，只留真正的 iframe
    const frames = page.frames();
    const iframeUrls = frames
      .filter(f => f !== page.mainFrame())
      .map(f => f.url())
      .filter(url => url !== 'about:blank'); // 过滤掉空白 iframe

    // 3. 每 10 秒打印详细报告
    if (step % 10 === 0) {
      console.log(`--- [${formatElapsed(elapsed)}] 状态报告 ---`);
      console.log(`📍 主地址: ${currentUrl}`);
      console.log(`🏷️  主标题: ${title}`);
      
      if (iframeUrls.length > 0) {
        console.log(`🖼️  检测到 ${iframeUrls.length} 个 iframe:`);
        iframeUrls.forEach((url, i) => console.log(`   └─ [${i+1}] ${url}`));
      } else {
        console.log(`🖼️  暂无活动 iframe`);
      }
      console.log(`------------------------------`);
    }

    // 4. 判定逻辑
    const isErr = title.includes("出错");
    const isSuccess = title.includes("已完成所有任务");
    const isTimeOut = elapsed > CONFIG.maxTime;

    if (isErr || isTimeOut || isSuccess) {
      const type = isErr ? 'ERROR' : (isTimeOut ? 'TIMEOUT' : 'SUCCESS');
      
      if (isErr || isTimeOut) {
        console.log(`🚨 任务终止 [${type}]: ${title}`);
        const name = `${type}_${getReadableTimestamp()}_${Date.now().toString().slice(-3)}.png`;
        const imgPath = path.join(CONFIG.errorDir, name);

        if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });
        await page.screenshot({ path: imgPath }).catch(() => {});
        await uploadToGithub(imgPath, name).catch(() => {});
      } else {
        console.log(`✅ 任务顺利完成`);
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
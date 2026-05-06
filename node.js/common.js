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
  url: "https://www.rendie.com/admin",
  extPath: path.resolve('../chrome-extension'),
  errorDir: path.resolve(env.TARGET_DIR || 'error'),
  maxTime: (Number.parseInt(env.MAX_RUNTIME_MINUTES, 10) || 1) * 60000,
  interval: 1000,
};

const GOTO_TIMEOUT_MS = 30_000;

async function ensureBrowser() {
  if (isBrowserConnected(browser)) return browser;

  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled', '--lang=zh-CN', `--disable-extensions-except=${CONFIG.extPath}`, `--load-extension=${CONFIG.extPath}`],
    headless: isCI ? "new" : false,
    defaultViewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  return browser;
}

async function ensurePage() {
  if (page && !page.isClosed()) return page;
  if (!isBrowserConnected(browser)) await ensureBrowser();
  
  page = await browser.newPage();

  // --- 🚩 异常检测监听器：实时排查跳转/挂起原因 ---
  
  // 1. 监听请求失败（网络层：如连不上后端、DNS 错误）
  page.on('requestfailed', request => {
    const url = request.url();
    const type = request.resourceType();
    if (['document', 'script', 'xhr', 'fetch'].includes(type)) {
      console.log(`❌ 网络请求失败: [${type}] ${url} -> ${request.failure()?.errorText}`);
    }
  });

  // 2. 监听 HTTP 状态异常（业务层：如 404, 500）
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      console.log(`🚫 HTTP 异常 [${status}]: ${response.url()}`);
    }
  });

  // 3. 监听浏览器内部 JS 运行时错误（崩溃层：如变量未定义导致的白屏）
  page.on('pageerror', err => {
    console.log(`💀 浏览器脚本崩溃: ${err.message}`);
  });

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
    };
    Object.entries(conf).forEach(([k, v]) => localStorage.setItem(k, v || ''));
  }, env);

  console.log(`\n🔑 尝试进入系统: ${CONFIG.url}`);

  try {
    await page.goto(CONFIG.url, {
      waitUntil: 'networkidle2',
      timeout: GOTO_TIMEOUT_MS,
    });
    console.log("✅ 页面加载成功");
  } catch (e) {
    console.log(`\n❌ 访问失败: 无法连接到 ${CONFIG.url} (原因: ${e.message})`);
    console.log(`💡 提示: 请确保前端服务已启动，且端口与 CONFIG.url 一致`);
    await shutdown();
    throw new Error(`无法连接到 ${CONFIG.url}`);
  }
}

export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  while (!isShuttingDown && isBrowserConnected(browser)) {
    const elapsed = Date.now() - start;

    // 1. 获取主页面 URL 和 标题
    const currentUrl = page.url();
    const title = await page.title().catch((err) => {
      if (err.message.includes('detached')) return "框架脱离/跳转中";
      return "标题获取失败";
    });

    // 2. 获取 iframe 详情
    const frames = page.frames();
    const iframeUrls = frames
      .filter(f => f !== page.mainFrame())
      .map(f => f.url())
      .filter(url => url !== 'about:blank');

    // 3. 定时报告
    if (step % 10 === 0) {
      console.log(`--- [${formatElapsed(elapsed)}] 状态报告 ---`);
      console.log(`📍 主地址: ${currentUrl}`);
      console.log(`🏷️  主标题: ${title}`);
      
      if (iframeUrls.length > 0) {
        console.log(`🖼️  检测到 ${iframeUrls.length} 个 iframe:`);
        iframeUrls.forEach((url, i) => console.log(`   └─ [${i+1}] ${url}`));
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
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
  // 🚩 优先从 yml 的环境变量 TARGET_URL 读取
  url: env.TARGET_URL || "https://www.rendie.com/admin",
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

  page.on('requestfailed', request => {
    const url = request.url();
    const type = request.resourceType();
    if (['document', 'script', 'xhr', 'fetch'].includes(type)) {
      console.log(`❌ 网络请求失败: [${type}] ${url} -> ${request.failure()?.errorText}`);
    }
  });

  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      console.log(`🚫 HTTP 异常 [${status}]: ${response.url()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`💀 浏览器脚本崩溃: ${err.message}`);
  });

  return page;
}

export async function initApp() {
  checkProjectEnv(env);
  await ensureBrowser();
  await ensurePage();

  const targetUrl = env.TARGET_URL;

  // 1. 注入配置：利用解构别名一次性完成变量映射
  await page.evaluateOnNewDocument(({
    NODE_ACCESS_TOKEN: access_token,
    NODE_REFRESH_TOKEN: refresh_token,
    NODE_USERNAME: username,
    NODE_EXPIRES_IN: expires_in = '604800',
    TARGET_URL
  }) => {
    const conf = {
      access_token, refresh_token, username, expires_in,
      menuList: JSON.stringify({
        top1: 1,
        top2: {
          23: {
            name: "任务", id: "23", isbool: true,
            url: `${TARGET_URL}/iframe?template=Shopee/任务/index.js&jsFile=js02&return=%2Fview%2FDefault%2Fadmin%2Fhtml%2Fiframe.html%3Ftemplate%3DShopee%2F%25E4%25BB%25BB%25E5%258A%25A1%2Findex.js%26jsFile%3Djs04`
          }
        }
      })
    };

    for (const [k, v] of Object.entries(conf)) {
      localStorage.setItem(k, v ?? '');
    }
  }, { ...env, TARGET_URL: targetUrl });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: GOTO_TIMEOUT_MS });
    console.log("✅ 页面加载成功");
  } catch (err) {
    console.error(`\n❌ 访问失败: ${targetUrl}\n原因: ${err.message}`);
    await shutdown();
    throw err;
  }
}
export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  while (!isShuttingDown && isBrowserConnected(browser)) {
    const elapsed = Date.now() - start;

    // 1. 最简单的获取：拿不到就给空字符串
    const title = await page.title().catch(() => "");

    // 2. 每 10 秒输出一次标题状态
    if (step % 10 === 0) {
      console.log(`[${formatElapsed(elapsed)}] 标题: ${title || "---"}`);
    }

    // 3. 核心判断逻辑
    const isErr = title.includes("出错");
    const isSuccess = title.includes("已完成所有任务");
    const isTimeOut = elapsed > CONFIG.maxTime;

    if (isErr || isTimeOut || isSuccess) {
      const type = isErr ? 'ERROR' : (isTimeOut ? 'TIMEOUT' : 'SUCCESS');

      if (type !== 'SUCCESS') {
        console.log(`🚨 终止 [${type}]: ${title}`);
        await delay(CONFIG.interval);//不延时截图的报错还没出来。
        const name = `${type}_${getReadableTimestamp()}_${Date.now().toString().slice(-3)}.png`;
        const imgPath = path.join(CONFIG.errorDir, name);

        if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });
        await page.screenshot({ path: imgPath }).catch(() => { });
        await uploadToGithub(imgPath, name).catch(() => { });
      } else {
        console.log(`✅ ${title}`);
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
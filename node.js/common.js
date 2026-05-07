import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { 
  delay, 
  getReadableTimestamp, 
  uploadToGithub, 
  formatElapsed, 
  checkProjectEnv, 
  isBrowserConnected, 
  registerProcessGuards 
} from './utils.js';

puppeteer.use(StealthPlugin());

let browser, page;
const env = process.env;
const isCI = env.GITHUB_ACTIONS === 'true';
let isShuttingDown = false;
let isHandlingError = false; // 防止多次触发关闭逻辑

export const CONFIG = {
  url: env.TARGET_URL || "https://www.rendie.com/admin",
  extPath: path.resolve('../chrome-extension'),
  errorDir: path.resolve(env.TARGET_DIR || 'error'),
  maxTime: (Number.parseInt(env.MAX_RUNTIME_MINUTES, 10) || 1) * 60000,
  interval: 1000,
};

const GOTO_TIMEOUT_MS = 30_000;

/**
 * 🛠 核心：统一报错处理、截图上传并关闭
 */
async function handleFatalError(type) {
  // 如果正在关闭或正在处理错误，则跳过，避免死循环或重复上传
  if (isHandlingError || isShuttingDown) return;
  isHandlingError = true;

  console.log(`\n🚨 [致命异常] 类型: ${type}`);
  
  try {
    const name = `${type}_${getReadableTimestamp()}_${Date.now().toString().slice(-3)}.png`;
    const imgPath = path.join(CONFIG.errorDir, name);

    if (!fs.existsSync(CONFIG.errorDir)) {
      fs.mkdirSync(CONFIG.errorDir, { recursive: true });
    }

    // 等待 1s 确保页面渲染了最新的错误 UI
    await delay(1000);

    if (page && !page.isClosed()) {
      console.log(`📸 正在截取错误页面...`);
      await page.screenshot({ path: imgPath }).catch(() => {});
      console.log(`☁️ 正在上传至 GitHub: ${name}`);
      await uploadToGithub(imgPath, name).catch((e) => console.error('GitHub 上传失败:', e.message));
    }
  } catch (e) {
    console.error('处理报错截图时发生异常:', e.message);
  } finally {
    console.log(`🛑 正在强制关闭任务...`);
    await shutdown();
  }
}

async function ensureBrowser() {
  if (isBrowserConnected(browser)) return browser;

  browser = await puppeteer.launch({
    args: [
      '--no-sandbox', 
      '--disable-dev-shm-usage', 
      '--disable-gpu', 
      '--disable-blink-features=AutomationControlled', 
      '--lang=zh-CN', 
      `--disable-extensions-except=${CONFIG.extPath}`, 
      `--load-extension=${CONFIG.extPath}`
    ],
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

  // 1. 监听网络请求失败 (DNS/连接被拒等)
  page.on('requestfailed', async (request) => {
    const type = request.resourceType();
    if (['document', 'script', 'xhr', 'fetch'].includes(type)) {
      console.error(`❌ 网络请求失败: [${type}] ${request.url()} -> ${request.failure()?.errorText}`);
      await handleFatalError(`NET_FAIL_${type.toUpperCase()}`);
    }
  });

  // 2. 监听 HTTP 异常状态码 (400以上)
  page.on('response', async (response) => {
    const status = response.status();
    if (status >= 400) {
      console.error(`🚫 HTTP 异常 [${status}]: ${response.url()}`);
      await handleFatalError(`HTTP_ERR_${status}`);
    }
  });

  // 3. 监听浏览器脚本崩溃
  page.on('pageerror', async (err) => {
    console.error(`💀 浏览器脚本崩溃: ${err.message}`);
    await handleFatalError('JS_CRASH');
  });

  return page;
}

export async function initApp() {
  checkProjectEnv(env);
  await ensureBrowser();

  // 捕获 ensurePage 自身的初始化错误
  try {
    await ensurePage();
  } catch (err) {
    console.error(`🔥 ensurePage 失败: ${err.message}`);
    await handleFatalError('INIT_PAGE_ERR');
    throw err;
  }

  const targetUrl = env.TARGET_URL;

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
    console.error(`❌ 访问页面超时或失败: ${err.message}`);
    await handleFatalError('GOTO_TIMEOUT');
    throw err;
  }
}

export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  while (!isShuttingDown && isBrowserConnected(browser)) {
    const elapsed = Date.now() - start;

    // 获取标题，如果获取不到说明页面可能已关闭，返回空
    const title = await page.title().catch(() => "");

    if (step % 10 === 0) {
      console.log(`[${formatElapsed(elapsed)}] 标题: ${title || "---"}`);
    }

    const isErr = title.includes("出错");
    const isSuccess = title.includes("已完成所有任务");
    const isTimeOut = elapsed > CONFIG.maxTime;

    if (isErr || isTimeOut || isSuccess) {
      if (isErr || isTimeOut) {
        const type = isErr ? 'UI_ERROR' : 'RUNTIME_TIMEOUT';
        console.log(`🚨 终止 [${type}]: ${title}`);
        await handleFatalError(type);
      } else {
        console.log(`✅ 任务圆满完成: ${title}`);
        await shutdown();
      }
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
    if (page && !page.isClosed()) await page.close().catch(() => {});
  } finally {
    if (isBrowserConnected(browser)) await browser.close().catch(() => {});
  }
}

registerProcessGuards({ shutdown });
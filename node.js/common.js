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
// 错误类型中文映射
const ERROR_TYPE_CN = {
  'TimeoutError': '请求超时',
  'NavigationError': '导航失败',
  'TargetClosedError': '浏览器关闭',
  'EvaluationError': '脚本执行错误'
};

/**
 * 🛠 核心：统一报错处理、截图上传并关闭
 */
async function handleFatalError(type) {
  if (isHandlingError || isShuttingDown) return;
  isHandlingError = true;

  // 1. 转换中文类型名
  const cnType = ERROR_TYPE_CN[type] || '未知错误';

  console.log(`\n🚨 [致命异常] 类型: ${cnType} (${type})`);

  try {
    // 2. 构造文件名：时间戳放在最前面确保排序，中文放在中间一眼识别
    const timestamp = getReadableTimestamp();
    const name = `${timestamp}_【${cnType}】_${Date.now().toString().slice(-3)}.png`;
    const imgPath = path.join(CONFIG.errorDir, name);

    if (!fs.existsSync(CONFIG.errorDir)) {
      fs.mkdirSync(CONFIG.errorDir, { recursive: true });
    }

    await delay(1000);

    if (page && !page.isClosed()) {
      console.log(`📸 正在截取错误页面: ${name}`);
      await page.screenshot({ path: imgPath, fullPage: true }).catch(() => { });

      if (isCI) {
        console.log(`☁️ 正在上传至 GitHub...`);
        await uploadToGithub(imgPath, name).catch((e) => console.error('GitHub 上传失败:', e.message));
      }
    }
  } catch (e) {
    console.error('处理报错截图时发生异常:', e.message);
  } finally {
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
    console.error(`💀 浏览器脚本崩溃: ${err}`);
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

  // 假设 env 中已经有了 TEMPLATE 变量
  const TARGET_URL = env.TARGET_URL;
  const TEMPLATE = env.TEMPLATE;

  await page.evaluateOnNewDocument(({
    NODE_ACCESS_TOKEN,
    NODE_USERNAME,
    TARGET_URL,
    TEMPLATE  // 从传入的对象中解构大写的 TEMPLATE
  }) => {
    const conf = {
      access_token: NODE_ACCESS_TOKEN,
      username: NODE_USERNAME,
      menuList: JSON.stringify({
        top1: 1,
        top2: {
          23: {
            name: "任务",
            id: "23",
            isbool: true,
            // 使用大写的变量名进行字符串拼接
            url: `${TARGET_URL}/iframe?template=${TEMPLATE}`
          }
        }
      })
    };

    for (const [k, v] of Object.entries(conf)) {
      localStorage.setItem(k, v ?? '');
    }
  }, {
    ...env,
    TARGET_URL: TARGET_URL,
    TEMPLATE: TEMPLATE // 确保将 env.TEMPLATE 传给浏览器上下文
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: GOTO_TIMEOUT_MS });
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
      console.log(`[${formatElapsed(elapsed)}] : ${title || "页面挂起"}`);
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
    if (page && !page.isClosed()) await page.close().catch(() => { });
  } finally {
    if (isBrowserConnected(browser)) await browser.close().catch(() => { });
  }
}

registerProcessGuards({ shutdown });
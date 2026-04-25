import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub, formatElapsed, checkProjectEnv } from './utils.js';

puppeteer.use(StealthPlugin());

let browser, page;
const env = process.env;
const isCI = env.GITHUB_ACTIONS === 'true';

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extPath: path.resolve('rendie.com'),
  errorDir: path.resolve(env.TARGET_DIR || 'error'),
  maxTime: (parseInt(env.MAX_RUNTIME_MINUTES) || 1) * 60000,
  interval: 1000,
};

export async function initApp() {
  checkProjectEnv(env);
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled', '--lang=zh-CN', `--disable-extensions-except=${CONFIG.extPath}`, `--load-extension=${CONFIG.extPath}`],
    headless: isCI ? "new" : false,
    defaultViewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  page = await browser.newPage();
  await page.evaluateOnNewDocument((e) => {
    const conf = { 'access_token': e.NODE_ACCESS_TOKEN, 'refresh_token': e.NODE_REFRESH_TOKEN, 'username': e.NODE_USERNAME, 'expires_in': e.NODE_EXPIRES_IN || '604800', 'menuList': e.NODE_MENU_LIST || '[]', 'DEFAULT_DB': 'sqlite' };
    Object.entries(conf).forEach(([k, v]) => localStorage.setItem(k, v || ''));
  }, env);
  console.log(`\n🔑 进入系统: ${CONFIG.url}`);
  await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });
}

export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  while (browser?.connected) {
    const elapsed = Date.now() - start;
    try {
      const title = await Promise.race([
        page.title(),
        new Promise((_, r) => setTimeout(() => r(new Error()), 5000))
      ]).catch(() => "页面挂起");

      if (step % 10 === 0) console.log(`[${formatElapsed(elapsed)}] 标题: ${title}`);

      const isErr = /错误|失败|Error|Exception|404|500/.test(title);
      const isTimeOut = elapsed > CONFIG.maxTime;

      if (isErr || isTimeOut || /已完成所有任务|SUCCESS/.test(title)) {
        if (isErr || isTimeOut) {
          const name = `${isErr ? 'ERROR' : 'TIMEOUT'}_${getReadableTimestamp()}.png`;
          if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });
          const imgPath = path.join(CONFIG.errorDir, name);

          await page.screenshot({ path: imgPath }).catch(() => { });
          await uploadToGithub(imgPath, name).catch(() => { });
          console.log(`🚨 异常结束: ${title}`);
        } else {
          console.log(`✅ 任务完成: ${title}`);
        }
        await silentExit();
      }
    } catch (e) {
      if (e.message.includes('closed')) break;
      await delay(2000);
    }
    step++;
    await delay(CONFIG.interval);
  }
}

export const silentExit = async () => {
  if (browser?.connected) await browser.close().catch(() => { });
  process.exit(0);
};
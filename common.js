import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub, formatElapsed } from './utils.js';

puppeteer.use(StealthPlugin());

let browser, page;
const env = process.env;
const isCI = !!env.GITHUB_ACTIONS && env.GITHUB_ACTIONS !== 'false';

export const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), env.TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(env.MAX_RUNTIME_MINUTES || 1) * 60000,
  checkIntervalMs: 1000,
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

export async function initApp() {
  console.log(`\n--- 运行环境配置检查 ---`);
  const sensitiveKeys = ['GITHUB_TOKEN', 'NODE_ACCESS_TOKEN', 'NODE_REFRESH_TOKEN'];

  Object.entries(env).forEach(([key, value]) => {
    // 仅打印我们关心的业务变量
    if (key.startsWith('GITHUB_') || key.startsWith('NODE_') || key === 'TARGET_DIR') {
      let displayValue = value;
      if (sensitiveKeys.includes(key) && value) {
        // 脱敏处理：保留首尾，中间打码
        displayValue = value.length > 8
          ? `${value.substring(0, 3)}****${value.substring(value.length - 3)}`
          : '********';
      }
      console.log(`${key.padEnd(20)} : ${displayValue || '未设置'}`);
    }
  });
  console.log(`------------------------\n`);
  console.log("🔍 正在以调试模式启动浏览器...");
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',      // 核心：防止容器内存溢出
      '--disable-gpu',                // 核心：节省 CPU 资源
      '--disable-blink-features=AutomationControlled', // 隐藏特征
      '--lang=zh-CN',
      `--disable-extensions-except=${CONFIG.extensionPath}`,
      `--load-extension=${CONFIG.extensionPath}`,
    ],
    // CI 环境下保持 "new" 以支持插件运行
    headless: isCI ? "new" : false,
    defaultViewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  // 监听浏览器层面的崩溃
  browser.on('disconnected', () => console.error("🚨 警告：浏览器连接已断开！"));

  page = await browser.newPage();

  // 预注入凭据，解决跳转导致的 destroyed 错误
  await page.evaluateOnNewDocument((e) => {
    const mapping = { 'access_token': e.NODE_ACCESS_TOKEN, 'refresh_token': e.NODE_REFRESH_TOKEN, 'username': e.NODE_USERNAME, 'expires_in': e.NODE_EXPIRES_IN || '604800', 'menuList': e.NODE_MENU_LIST || '[]', 'DEFAULT_DB': 'sqlite' };
    Object.entries(mapping).forEach(([k, v]) => localStorage.setItem(k, v || ''));
  }, env);

  console.log(`🔑 正在进入系统: ${CONFIG.url}`);
  await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });
}

export async function runMonitor() {
  const startTime = Date.now();
  let step = 0;

  while (browser?.connected) {
    const elapsed = Date.now() - startTime;
    try {
      const title = await Promise.race([
        page.title(),
        new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT')), 5000))
      ]).catch(() => "页面挂起");

      // “状态”改为“标题”
      if (step % 10 === 0) console.log(`[${formatElapsed(elapsed)}] 标题: ${title}`);

      const isError = /错误|失败|Error|Exception|404|500/.test(title);
      const isSuccess = /已完成所有任务|SUCCESS/.test(title);
      const isTimeout = elapsed > CONFIG.maxRuntimeMs;

      if (isError || isSuccess || isTimeout) {
        if (isError || isTimeout) {
          const type = isError ? 'ERROR' : 'TIMEOUT';
          const fileName = `${type}_${getReadableTimestamp()}.png`;


          const absoluteErrorDir = path.resolve(CONFIG.errorDir);
          if (!fs.existsSync(absoluteErrorDir)) {
            fs.mkdirSync(absoluteErrorDir, { recursive: true });
          }
          const imgPath = path.join(absoluteErrorDir, fileName);
          console.log(`📸 正在保存截图至: ${imgPath}`);
          await page.screenshot({ path: imgPath }).catch(e => console.error("保存失败:", e.message));


          await uploadToGithub(imgPath, fileName).catch(() => { });
          console.log(`🚨 任务异常结束: ${title}`);
        } else {
          console.log(`✅ 任务圆满完成: ${title}`);
        }
        await silentExit();
      }
    } catch (e) {
      if (e.message.includes('Target closed')) break;
      await delay(2000);
    }
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}

export const silentExit = async () => {
  if (browser?.connected) await browser.close().catch(() => { });
  process.exit(0);
};
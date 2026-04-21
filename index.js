import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

// --- 严格配置校验 ---
const { 
  MAX_RUNTIME_MINUTES, 
  NODE_SHOPEE_REFRESH_TOKEN, 
  NODE_SHOPEE_ACCESS_TOKEN, 
  NODE_SHOPEE_NAME 
} = process.env;

const missingVars = [];
if (!MAX_RUNTIME_MINUTES) missingVars.push("MAX_RUNTIME_MINUTES");
if (!NODE_SHOPEE_REFRESH_TOKEN) missingVars.push("NODE_SHOPEE_REFRESH_TOKEN");
if (!NODE_SHOPEE_ACCESS_TOKEN) missingVars.push("NODE_SHOPEE_ACCESS_TOKEN");
if (!NODE_SHOPEE_NAME) missingVars.push("NODE_SHOPEE_NAME");

if (missingVars.length > 0) {
  console.error("❌ 启动失败，缺失参数:", missingVars.join(", "));
  process.exit(1);
}

const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES) * 60 * 1000,
  checkIntervalMs: 5000,
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`,
      `--load-extension=${CONFIG.extensionPath}`,
      '--lang=zh-CN'
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    headless: false,
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();
    
    // 注入防检测逻辑
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

    console.log(`🌐 正在进入系统 (用户: ${NODE_SHOPEE_NAME})...`);
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });

    // 1. 注入 LocalStorage
    await page.evaluate((data) => {
      localStorage.clear();
      localStorage.setItem("username", data.username);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("expires_in", Math.floor(Date.now() / 1000) + 7200);
      localStorage.setItem("menuList", JSON.stringify({ 
        "top1": 1, 
        "top2": { "23": { "name": "任务", "id": "23", "isbool": true, "url": data.taskUrl } } 
      }));
    }, {
      refresh_token: NODE_SHOPEE_REFRESH_TOKEN,
      access_token: NODE_SHOPEE_ACCESS_TOKEN,
      username: NODE_SHOPEE_NAME,
      taskUrl: "http://localhost:3000/view/Default/admin/html/iframe.html?template=Shopee/任务/index.js&jsFile=js02"
    });

    await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });

    // 2. 监控
    const startTime = Date.now();
    while (browser.connected) {
      const elapsedMs = Date.now() - startTime;
      const timeStr = `${String(Math.floor(elapsedMs / 60000)).padStart(2, ' ')}分${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}秒`;

      if (elapsedMs > CONFIG.maxRuntimeMs) {
        console.warn(`⏰ [${timeStr}] 超时退出`);
        await page.screenshot({ path: `./超时退出-${timeStr.trim()}.png` });
        break;
      }

      try {
        const title = await page.title();
        console.log(`   > ${timeStr} (标题: ${title})`);
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");

        if (title.includes("错误")) {
          console.error(`❌ [${timeStr}] 检测到错误!`);
          await page.screenshot({ path: `./错误停止-${timeStr.trim()}-${safeTitle}.png` });
          break;
        }

        if (title.includes("已完成所有任务")) {
          console.log(`✅ [${timeStr}] 任务完成!`);
          break;
        }
      } catch (e) { break; }

      await delay(CONFIG.checkIntervalMs);
    }

  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

// --- 严格配置校验 ---
const { 
  MAX_RUNTIME_MINUTES, 
  NODE_REFRESH_TOKEN, 
  NODE_ACCESS_TOKEN, 
  NODE_USERNAME, 
  NODE_TASK_URL,
  GITHUB_ACTIONS 
} = process.env;

const missingVars = [];
if (!MAX_RUNTIME_MINUTES) missingVars.push("MAX_RUNTIME_MINUTES");
if (!NODE_REFRESH_TOKEN) missingVars.push("NODE_REFRESH_TOKEN");
if (!NODE_ACCESS_TOKEN) missingVars.push("NODE_ACCESS_TOKEN");
if (!NODE_USERNAME) missingVars.push("NODE_USERNAME");
if (!NODE_TASK_URL) missingVars.push("NODE_TASK_URL");

if (missingVars.length > 0) {
  console.error("❌ 启动失败，环境变量缺失:");
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  // 直接固定使用根目录下的 error 文件夹
  errorDir: path.resolve(process.cwd(), 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES) * 60 * 1000,
  checkIntervalMs: 5000, 
};

// 保底确保 error 目录存在
if (!fs.existsSync(CONFIG.errorDir)) {
  fs.mkdirSync(CONFIG.errorDir, { recursive: true });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const isCI = !!GITHUB_ACTIONS;
  
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
    headless: isCI ? "new" : false, 
    defaultViewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await browser.newPage();
    
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

    console.log(`🌐 [${isCI ? '云端' : '本地'}] 账号: ${NODE_USERNAME}`);
    
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });

    // 注入配置
    await page.evaluate((data) => {
      localStorage.clear();
      localStorage.setItem("username", data.username);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("expires_in", Math.floor(Date.now() / 1000) + 7200);
      localStorage.setItem("menuList", JSON.stringify({ 
        "top1": 1, 
        "top2": { 
          "23": { "name": "任务", "id": "23", "isbool": true, "url": data.taskUrl } 
        } 
      }));
    }, {
      refresh_token: NODE_REFRESH_TOKEN,
      access_token: NODE_ACCESS_TOKEN,
      username: NODE_USERNAME,
      taskUrl: NODE_TASK_URL 
    });

    await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });

    const startTime = Date.now();
    console.log(`🚀 监控中 | 限时: ${MAX_RUNTIME_MINUTES}min`);

    while (browser.connected) {
      const elapsedMs = Date.now() - startTime;
      const m = Math.floor(elapsedMs / 60000);
      const s = Math.floor((elapsedMs % 60000) / 1000);
      const timeStr = `${String(m).padStart(2, ' ')}分${String(s).padStart(2, '0')}秒`;

      if (elapsedMs > CONFIG.maxRuntimeMs) {
        console.warn(`⏰ [${timeStr}] 超时，保存截图。`);
        await page.screenshot({ path: path.join(CONFIG.errorDir, `TIMEOUT.png`), fullPage: true }).catch(() => {});
        break;
      }

      try {
        const title = await page.title();
        console.log(`   > ${timeStr} | ${title}`);
        
        if (title.includes("错误") || title.includes("失败") || title.includes("Error")) {
          console.error(`❌ [${timeStr}] 异常，保存截图。`);
          const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
          await page.screenshot({ path: path.join(CONFIG.errorDir, `ERROR-${safeTitle}.png`), fullPage: true }).catch(() => {});
          break;
        }

        if (title.includes("已完成所有任务") || title.includes("Mission Complete")) {
          console.log(`✅ [${timeStr}] 成功。`);
          break;
        }
      } catch (err) {
        if (!browser.connected || err.message.includes('closed')) break;
      }

      await delay(CONFIG.checkIntervalMs);
    }

  } catch (err) {
    console.error("🚨 崩溃:", err);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
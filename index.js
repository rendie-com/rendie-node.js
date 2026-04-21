import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

// --- 严格配置校验 ---
const { 
  MAX_RUNTIME_MINUTES, 
  NODE_SHOPEE_REFRESH_TOKEN, 
  NODE_SHOPEE_ACCESS_TOKEN, 
  NODE_SHOPEE_NAME,
  NODE_TASK_URL 
} = process.env;

const missingVars = [];
if (!MAX_RUNTIME_MINUTES) missingVars.push("MAX_RUNTIME_MINUTES");
if (!NODE_SHOPEE_REFRESH_TOKEN) missingVars.push("NODE_SHOPEE_REFRESH_TOKEN");
if (!NODE_SHOPEE_ACCESS_TOKEN) missingVars.push("NODE_SHOPEE_ACCESS_TOKEN");
if (!NODE_SHOPEE_NAME) missingVars.push("NODE_SHOPEE_NAME");
if (!NODE_TASK_URL) missingVars.push("NODE_TASK_URL");

if (missingVars.length > 0) {
  console.error("❌ 启动失败，.env 缺失参数:");
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES) * 60 * 1000,
  checkIntervalMs: 5000, 
};

// 确保 error 目录存在
if (!fs.existsSync(CONFIG.errorDir)) {
  fs.mkdirSync(CONFIG.errorDir);
}

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
    
    // 隐藏自动化特征
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

    console.log(`🌐 正在初始化 RENDIE V5.0 (用户: ${NODE_SHOPEE_NAME})`);
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });

    // 1. 注入 LocalStorage 配置
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
      refresh_token: NODE_SHOPEE_REFRESH_TOKEN,
      access_token: NODE_SHOPEE_ACCESS_TOKEN,
      username: NODE_SHOPEE_NAME,
      taskUrl: NODE_TASK_URL 
    });

    // 已删除配置应用的日志输出，直接跳转
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });

    // 2. 核心监控循环
    const startTime = Date.now();
    console.log(`🚀 监控启动 | 间隔: 5s | 保底: ${MAX_RUNTIME_MINUTES}min`);

    while (browser.connected) {
      const elapsedMs = Date.now() - startTime;
      const m = Math.floor(elapsedMs / 60000);
      const s = Math.floor((elapsedMs % 60000) / 1000);
      const timeStr = `${String(m).padStart(2, ' ')}分${String(s).padStart(2, '0')}秒`;

      // 保底强制退出
      if (elapsedMs > CONFIG.maxRuntimeMs) {
        const picName = `超时退出-${timeStr.trim()}.png`;
        console.warn(`\n⏰ [${timeStr}] 触发保底上限，保存截图并退出。`);
        await page.screenshot({ path: path.join(CONFIG.errorDir, picName) }).catch(() => {});
        break;
      }

      try {
        const title = await page.title();
        console.log(`   > ${timeStr} (标题: ${title})`);
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");

        // 识别“错误”字样
        if (title.includes("错误")) {
          const picName = `错误停止-${timeStr.trim()}-${safeTitle}.png`;
          console.error(`\n❌ [${timeStr}] 检测到错误标题，立即停止！`);
          await page.screenshot({ path: path.join(CONFIG.errorDir, picName) }).catch(() => {});
          break;
        }

        // 成功完成
        if (title.includes("已完成所有任务")) {
          console.log(`\n✅ [${timeStr}] 任务顺利全部完成！`);
          break;
        }
      } catch (err) {
        if (!browser.connected || err.message.includes('closed')) break;
        console.error("⚠️ 轮询探测异常:", err.message);
      }

      await delay(CONFIG.checkIntervalMs);
    }

  } catch (err) {
    if (browser.connected) console.error("🚨 运行时崩溃:", err);
  } finally {
    console.log('🏁 正在回收资源并退出程序...');
    if (browser) await browser.close();
    process.exit(0);
  }
})();
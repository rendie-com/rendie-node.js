import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

// --- 环境变量解构 ---
const { 
  MAX_RUNTIME_MINUTES, 
  NODE_REFRESH_TOKEN, 
  NODE_ACCESS_TOKEN, 
  NODE_USERNAME, 
  NODE_TASK_URL,
  TARGET_DIR,      // 由 .yml 传入，例如 "error/task1"
  GITHUB_ACTIONS 
} = process.env;

// --- 配置对象 ---
const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  // 截图存放目录
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 30) * 60 * 1000,
  checkIntervalMs: 5000, 
};

// 确保目录存在
if (!fs.existsSync(CONFIG.errorDir)) {
  fs.mkdirSync(CONFIG.errorDir, { recursive: true });
}

/**
 * 获取格式化时间戳，用于生成唯一文件名
 * 格式: 14-30-05 (时-分-秒)
 */
const getTimestamp = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
};

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
    
    // 抹除 WebDriver 特征
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

    console.log(`🌐 [${isCI ? 'GitHub Actions' : '本地调试'}] 运行中...`);
    console.log(`👤 用户名: ${NODE_USERNAME} | 📂 目录: ${CONFIG.errorDir}`);
    
    // 1. 初始化访问
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });

    // 2. 注入 localStorage
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

    // 3. 刷新页面应用配置并开始任务
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });

    // 4. 自动化监控循环
    const startTime = Date.now();
    while (browser.connected) {
      const elapsedMs = Date.now() - startTime;
      const m = Math.floor(elapsedMs / 60000);
      const s = Math.floor((elapsedMs % 60000) / 1000);
      const timeStr = `${m}分${s}秒`;

      // --- 超时逻辑 ---
      if (elapsedMs > CONFIG.maxRuntimeMs) {
        const fileName = `TIMEOUT-${getTimestamp()}.png`; // 加入时间戳
        console.warn(`⏰ [${timeStr}] 达到保底时长，正在保存截图: ${fileName}`);
        await page.screenshot({ path: path.join(CONFIG.errorDir, fileName), fullPage: true }).catch(() => {});
        break;
      }

      try {
        const title = await page.title();
        console.log(`   > ${timeStr} | 页面标题: ${title}`);
        
        // --- 异常识别 ---
        if (title.includes("错误") || title.includes("失败") || title.includes("Error")) {
          const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
          const fileName = `ERROR-${getTimestamp()}-${safeTitle}.png`; // 加入时间戳
          console.error(`❌ [${timeStr}] 检测到页面异常，正在截图: ${fileName}`);
          await page.screenshot({ path: path.join(CONFIG.errorDir, fileName), fullPage: true }).catch(() => {});
          break;
        }

        // --- 任务完成识别 ---
        if (title.includes("已完成所有任务") || title.includes("Mission Complete")) {
          console.log(`✅ [${timeStr}] 任务流程已顺利结束。`);
          break;
        }
      } catch (err) {
        if (!browser.connected || err.message.includes('closed')) break;
        console.log("...等待页面加载...");
      }

      await delay(CONFIG.checkIntervalMs);
    }

  } catch (err) {
    if (browser.connected) console.error("🚨 运行时崩溃:", err);
  } finally {
    if (browser) {
      console.log('🏁 任务结束，正在关闭浏览器。');
      await browser.close();
    }
    process.exit(0);
  }
})();
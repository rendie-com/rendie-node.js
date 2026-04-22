import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

// --- 1. 配置加载函数 ---
function loadConfig() {
  const { MAX_RUNTIME_MINUTES, NODE_USERNAME, TARGET_DIR } = process.env;
  return {
    url: "http://localhost:3000/admin.html",
    extensionPath: path.resolve(process.cwd(), 'rendie.com'),
    // 修改：确保路径解析在 Actions 环境下绝对可靠
    errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error/task1'),
    maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 30) * 60 * 1000,
    checkIntervalMs: 5000,
    username: NODE_USERNAME || "default_user"
  };
}

// --- 2. 目录准备函数 ---
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 目录已创建: ${dir}`);
  }
}

// --- 3. 截图存档函数 ---
async function saveScreenshot(page, dir, type, extraInfo = "") {
  const now = new Date();
  // 补零操作，确保文件名排序整齐
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const fileName = `${type}-${time}${extraInfo ? '-' + extraInfo : ''}.png`;
  const fullPath = path.join(dir, fileName);
  
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`📸 截图已保存: ${fileName}`);
}

// --- 4. 身份注入函数 ---
async function injectAuthData(page, config) {
  const { NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_TASK_URL } = process.env;
  
  await page.evaluate((data) => {
    localStorage.clear();
    localStorage.setItem("username", data.username);
    localStorage.setItem("access_token", data.access_token || "");
    localStorage.setItem("refresh_token", data.refresh_token || "");
    localStorage.setItem("expires_in", Math.floor(Date.now() / 1000) + 7200);
    localStorage.setItem("menuList", JSON.stringify({ 
      "top2": { "23": { "name": "任务", "id": "23", "isbool": true, "url": data.taskUrl } } 
    }));
  }, {
    username: config.username,
    access_token: NODE_ACCESS_TOKEN,
    refresh_token: NODE_REFRESH_TOKEN,
    taskUrl: NODE_TASK_URL || ""
  });
  console.log("🔑 身份与任务数据注入成功");
}

// --- 5. 核心监控逻辑 ---
async function startMonitoring(page, config) {
  const startTime = Date.now();
  console.log(`🚀 开始监控任务状态 (限时 ${config.maxRuntimeMs / 60000} 分钟)...`);

  while (true) {
    const elapsed = Date.now() - startTime;
    const timeLabel = `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`;

    if (elapsed > config.maxRuntimeMs) {
      console.warn(`⏰ [${timeLabel}] 触发任务超时保护`);
      await saveScreenshot(page, config.errorDir, "TIMEOUT");
      break;
    }

    try {
      const title = await page.title();
      console.log(`   > ${timeLabel} | 当前状态: ${title}`);

      if (title.includes("错误") || title.includes("失败") || title.includes("Error")) {
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
        await saveScreenshot(page, config.errorDir, "ERROR", safeTitle);
        break;
      }

      if (title.includes("已完成所有任务") || title.includes("Mission Complete")) {
        console.log(`✅ [${timeLabel}] 识别到任务完成标志。`);
        // 完成时也截个图存证
        await saveScreenshot(page, config.errorDir, "SUCCESS");
        break;
      }
    } catch (e) {
      console.log("...页面响应中...");
    }

    await new Promise(r => setTimeout(r, config.checkIntervalMs));
  }
}

// --- 主程序入口 ---
async function runRendie() {
  const config = loadConfig();
  ensureDirectory(config.errorDir);

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', // 关键：防止 Actions 内存溢出
      `--disable-extensions-except=${config.extensionPath}`, 
      `--load-extension=${config.extensionPath}`, 
      '--lang=zh-CN'
    ],
    // 修改：加载扩展时，Headless 必须为 false（Actions 环境会自动处理虚拟显示）
    headless: false, 
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    // 模拟真实的浏览器环境
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

    await page.goto(config.url, { waitUntil: 'domcontentloaded' });
    await injectAuthData(page, config);
    
    // 注入后重新跳转以刷新 LocalStorage 生效
    await page.goto(config.url, { waitUntil: 'networkidle2' });
    
    await startMonitoring(page, config);

  } catch (error) {
    console.error("🚨 核心流程故障:", error);
    // 即使故障也尝试截图
    try {
        const pages = await browser.pages();
        if (pages.length > 0) await saveScreenshot(pages[0], config.errorDir, "CRASH");
    } catch (e) {}
  } finally {
    await browser.close();
    console.log("🏁 浏览器已关闭。");
    // 强制等待 1 秒，确保文件系统完成写入
    setTimeout(() => {
      console.log("🚀 程序退出。");
      process.exit(0);
    }, 1000);
  }
}

runRendie();
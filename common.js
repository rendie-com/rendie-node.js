import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub } from './utils.js';

puppeteer.use(StealthPlugin());

// 提取环境变量
const { 
  MAX_RUNTIME_MINUTES, 
  TARGET_DIR, 
  GITHUB_ACTIONS,
  NODE_USERNAME 
} = process.env;

// 环境判断：是否在 GitHub Actions 运行
const isCI = !!GITHUB_ACTIONS && GITHUB_ACTIONS !== 'false';

export const CONFIG = {
  // 核心入口：由 index.js 统一调用
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  // 运行保底时长转换
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 1) * 60 * 1000,
  checkIntervalMs: 1000, 
};

// 确保截图目录存在
if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

/**
 * 核心功能：截图并推送到 GitHub 仓库
 */
export async function triggerErrorCapture(page, typeName) {
  console.log(`\n📸 [${typeName}] 触发自动截图...`);
  
  if (!page || page.isClosed()) {
    console.log("❌ 截图失败：页面已关闭");
    return;
  }

  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);

  try {
    // 强制等待 500ms 确保渲染完成
    await delay(500);
    await page.screenshot({ path: imgPath, timeout: 30000 });
    
    if (fs.existsSync(imgPath)) {
      console.log(`✅ 截图已保存: ${fileName} (${(fs.statSync(imgPath).size / 1024).toFixed(2)} KB)`);
      // 通过 utils.js 上传到指定的错误日志仓库
      await uploadToGithub(imgPath, fileName);
    }
  } catch (e) {
    console.error(`❌ 截图流程异常: ${e.message}`);
  }
}

/**
 * 安全退出浏览器
 */
export const silentExit = async (browser) => {
  if (browser?.connected) {
    console.log("🛑 正在关闭浏览器并释放资源...");
    await browser.close().catch(() => {});
  }
  process.exit(0);
};

/**
 * 初始化浏览器：针对 CI 环境优化
 */
export async function initApp() {
  console.log(`🌐 [${isCI ? 'CI' : 'Local'}] 运行模式 | 用户: ${NODE_USERNAME || 'admin'}`);
  
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', // 关键：解决 GitHub Actions 内存限制导致的截图失败
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`, 
      `--load-extension=${CONFIG.extensionPath}`, 
      '--lang=zh-CN'
    ],
    // CI 环境使用 new headless 模式，本地使用有头模式调试
    headless: isCI ? "new" : false, 
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // 捕获浏览器内部 Console 报错以便调试
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('failed')) {
      console.log(`🖥️  [Browser]: ${text}`);
    }
  });

  return { browser, page, isCI };
}

/**
 * 核心监控逻辑：轮询页面标题变化
 */
export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0;

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    const isTimeout = elapsed > CONFIG.maxRuntimeMs;
    
    try {
      // 获取当前标题，若卡死则返回“读取中”
      const lastTitle = await page.title().catch(() => "读取中...");

      // 日志输出频率控制
      if (step % 10 === 0) {
        console.log(`[${Math.floor(elapsed/1000)}s] 状态: ${lastTitle}`);
      }

      // 业务逻辑判定
      if (lastTitle !== "读取中..." && lastTitle !== "localhost:3000") {
          // 判定失败
          if (/错误|失败|Error/.test(lastTitle)) {
            await triggerErrorCapture(page, 'BUSINESS_ERROR');
            await silentExit(browser);
            return;
          }
          
          // 判定成功：匹配你的扩展程序完成后的标题
          if (lastTitle.includes("已完成所有任务")) {
            console.log(`\n✅ 任务圆满结束。`);
            await triggerErrorCapture(page, 'SUCCESS');
            await silentExit(browser);
            return;
          }
      }

      // 强制超时保底
      if (isTimeout) {
        console.log(`\n⏰ 到达限时，执行超时截图推送...`);
        await triggerErrorCapture(page, 'TIMEOUT_SNAPSHOT');
        await delay(5000); 
        await silentExit(browser);
        return;
      }
    } catch (e) {
      if (e.message.includes('Target closed')) break;
      console.error("监控循环异常:", e.message);
    }
    
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}
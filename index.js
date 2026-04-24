import 'dotenv/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
// 假设你的 utils.js 依然存在用于工具函数
import { delay, getReadableTimestamp, uploadToGithub } from './utils.js';

puppeteer.use(StealthPlugin());

// --- 配置区 ---
const { 
  NODE_USERNAME, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN,
  NODE_EXPIRES_IN, NODE_MENU_LIST, TARGET_DIR 
} = process.env;

const CONFIG = {
  url: "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  durationMs: 60 * 1000, // 运行总时长：60秒
  intervalMs: 1000,      // 截图频率：1秒
};

// 确保截图目录存在
if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

/**
 * 核心功能：带序号的序列截图
 */
async function captureSequence(page, index) {
  const seq = String(index).padStart(2, '0');
  const stamp = getReadableTimestamp();
  const fileName = `STEP_${seq}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);

  try {
    if (!page || page.isClosed()) return;
    
    // 设置较短的截图超时，防止单次截图卡死影响下一秒
    await page.screenshot({ path: imgPath, timeout: 5000 });
    
    if (fs.existsSync(imgPath)) {
      console.log(`📸 [${seq}/60] 截图已保存: ${fileName}`);
      // 如果需要上传到 GitHub，取消下面注释 (注意高频上传可能触发 GitHub API 限制)
      // await uploadToGithub(imgPath, fileName).catch(() => {});
    }
  } catch (e) {
    console.warn(`⚠️  [${seq}] 截图跳过 (页面可能正在跳转): ${e.message}`);
  }
}

/**
 * 安全获取标题
 */
async function getTitleSafe(page) {
  try {
    return await Promise.race([
      page.title(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
  } catch {
    return "加载中/跳转中...";
  }
}

/**
 * 主执行函数
 */
async function main() {
  console.log(`\n🚀 开始任务 | 用户: ${NODE_USERNAME || 'admin'}`);

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`,
      `--load-extension=${CONFIG.extensionPath}`,
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--lang=zh-CN'
    ],
    headless: process.env.GITHUB_ACTIONS ? "new" : false,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // 拦截并自动关闭弹窗，防止其阻塞所有操作
  page.on('dialog', async dialog => {
    console.log(`💬 自动关闭弹窗: ${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });

  try {
    // 1. 初次访问
    console.log(`🔗 正在访问: ${CONFIG.url}`);
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 2. 注入 LocalStorage
    console.log("🔑 正在注入凭据...");
    await page.evaluate((at, rt, un, exp, menu) => {
      localStorage.setItem('access_token', at || '');
      localStorage.setItem('refresh_token', rt || '');
      localStorage.setItem('username', un || 'admin');
      localStorage.setItem('expires_in', exp || '3600');
      localStorage.setItem('menuList', menu || '[]');
      localStorage.setItem('DEFAULT_DB', 'sqlite');
    }, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_USERNAME, NODE_EXPIRES_IN, NODE_MENU_LIST);

    // 3. 重新加载页面使凭据生效
    console.log("🔄 重载页面并进入 60 秒监控期...");
    await page.goto(CONFIG.url, { waitUntil: 'load' }).catch(() => {});
    await delay(2000); // 给 2 秒初始化缓冲

    // 4. 循环监控：每秒截图，持续 60 秒
    const startTime = Date.now();
    let count = 0;

    while (Date.now() - startTime < CONFIG.durationMs) {
      count++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      // 执行截图
      await captureSequence(page, count);
      
      // 获取当前标题用于日志输出
      const title = await getTitleSafe(page);
      console.log(`⏱️  第 ${elapsed}s | 标题: ${title}`);

      // 如果任务提前完成，可根据标题判断提前退出
      if (title.includes("已完成所有任务")) {
        console.log("✅ 检测到完成标识，提前结束。");
        break;
      }

      await delay(CONFIG.intervalMs);
      
      // 检查浏览器是否还连着
      if (!browser.connected) break;
    }

    console.log(`\n🏁 运行结束，共生成 ${count} 张截图。`);

  } catch (err) {
    console.error(`\n❌ [致命异常]: ${err.message}`);
  } finally {
    if (browser.connected) {
      console.log("🛑 正在关闭浏览器...");
      await browser.close().catch(() => {});
    }
    process.exit(0);
  }
}

// 全局异常处理
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ 未处理的 Promise 拒绝:', reason);
});

main();
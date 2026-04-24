import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { delay, getReadableTimestamp, uploadToGithub } from './utils.js';

puppeteer.use(StealthPlugin());

const { 
  MAX_RUNTIME_MINUTES, NODE_TASK_URL, TARGET_DIR, GITHUB_ACTIONS 
} = process.env;

// 严格的环境检测
const isCI = !!GITHUB_ACTIONS && GITHUB_ACTIONS !== 'false';

export const CONFIG = {
  url: NODE_TASK_URL || "http://localhost:3000/admin.html",
  extensionPath: path.resolve(process.cwd(), 'rendie.com'),
  errorDir: path.resolve(process.cwd(), TARGET_DIR || 'error'),
  maxRuntimeMs: parseInt(MAX_RUNTIME_MINUTES || 3) * 60 * 1000, 
  checkIntervalMs: 500, 
};

if (!fs.existsSync(CONFIG.errorDir)) fs.mkdirSync(CONFIG.errorDir, { recursive: true });

/**
 * 截图并上传逻辑
 */
export async function triggerErrorCapture(page, typeName) {
  console.log(`\n📸 [Action] 尝试截图: ${typeName}`);
  
  if (!page || page.isClosed()) {
    console.log("❌ [跳过截图] 页面已关闭或不存在");
    return;
  }

  const stamp = getReadableTimestamp();
  const fileName = `${typeName}_${stamp}.png`;
  const imgPath = path.join(CONFIG.errorDir, fileName);

  try {
    await page.screenshot({ path: imgPath, timeout: 30000 });
    console.log(`✅ [本地保存] ${fileName} (${(fs.statSync(imgPath).size / 1024).toFixed(2)} KB)`);
    await uploadToGithub(imgPath, fileName);
  } catch (e) {
    console.error(`❌ [截图失败] ${e.message}`);
  }
}

export const silentExit = async (browser) => {
  if (browser?.connected) {
    console.log("🛑 正在关闭浏览器...");
    await browser.close().catch(() => {});
  }
  process.exit(0);
};

export async function initApp() {
  console.log(`🌍 运行模式: ${isCI ? '☁️ CI (Headless)' : '💻 Local (Headed)'}`);
  
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', // 关键：解决云端截图内存报错
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${CONFIG.extensionPath}`, 
      `--load-extension=${CONFIG.extensionPath}`, 
      '--lang=zh-CN'
    ],
    headless: isCI ? "new" : false, 
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  
  // 实时捕获浏览器内部的 Console 日志
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('failed')) {
        console.log(`🖥️  [Browser Log]: ${text}`);
    }
  });

  return { browser, page, isCI };
}

export async function runMonitor(browser, page) {
  const startTime = Date.now();
  let step = 0;

  console.log(`🔗 访问目标: ${CONFIG.url}`);
  
  try {
    // 增加等待强度，确保网络空闲
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log("⚠️ 页面加载超时，可能正在编译，进入轮询...");
  }

  while (browser.connected) {
    const elapsed = Date.now() - startTime;
    const isTimeout = elapsed > CONFIG.maxRuntimeMs;
    
    try {
      const lastTitle = await page.title().catch(() => "PAGE_CRASHED");

      if (isCI) {
        if (step % 10 === 0) console.log(`[${Math.floor(elapsed/1000)}s] 状态: ${lastTitle}`);
      } else {
        process.stdout.write(`\r   > ${Math.floor(elapsed/1000)}s | ${lastTitle}\x1b[K`);
      }

      if (lastTitle === "PAGE_CRASHED") {
        await triggerErrorCapture(page, 'CRASH');
        await silentExit(browser);
        return;
      }

      // 业务逻辑判断
      if (lastTitle !== "读取中..." && lastTitle !== "localhost:3000") {
          if (/错误|失败|Error/.test(lastTitle)) {
            await triggerErrorCapture(page, 'ERROR_UI');
            await silentExit(browser);
            return;
          }
          if (lastTitle.includes("已完成所有任务")) {
            console.log("\n✅ 任务圆满完成！");
            await triggerErrorCapture(page, 'SUCCESS');
            await silentExit(browser);
            return;
          }
      }

      if (isTimeout) {
        console.log(`\n⏰ 到达限时 ${MAX_RUNTIME_MINUTES}min，强制快照...`);
        await triggerErrorCapture(page, 'TIMEOUT_CAPTURE');
        await delay(5000); 
        await silentExit(browser);
        return;
      }
    } catch (e) {
      if (e.message.includes('Target closed')) break;
      console.error("循环异常:", e.message);
    }
    step++;
    await delay(CONFIG.checkIntervalMs);
  }
}
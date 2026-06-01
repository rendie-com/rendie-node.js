import { chromium } from 'playwright';
import { state } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import { background } from './common/background.mjs';

// 判断是否运行在 CI 环境
const isCI = !!process.env.CI;

export async function ensureBrowser() {
  if (state.browser && state.browser.isConnected()) return state.browser;

  // CI 环境必须使用 headless 模式，且需要特定的内存优化参数
  const launchOptions = {
    headless: isCI ? true : false,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--lang=zh-CN',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage', // [核心] 防止 Docker 容器内存不足导致崩溃
      '--disable-setuid-sandbox'
    ]
  };

  // 仅在本地非 CI 环境尝试最大化窗口
  if (!isCI) {
    launchOptions.args.push('--start-maximized');
  }

  state.browser = await chromium.launch(launchOptions);
  return state.browser;
}

export async function initBridge(page) {
  // 注入反检测脚本
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.navigator.chrome = { runtime: {} };
  });

  // 暴露 Node.js 后端接口
  await page.exposeFunction('nodeBridge', async (request) => {
    try {
      const result = await background.a01(request);
      return { status: 'success', data: result };
    } catch (err) {
      console.error(`❌ 后端执行 [${request.action}] 失败:`, err);
      return { status: 'error', msg: err.toString() };
    }
  });

  // 页面桥接监听逻辑
  await page.addInitScript(() => {
    window.addEventListener('rendie-req-dispatch', async (e) => {
      const request = e.detail;
      const result = await window.nodeBridge(request);
      window.dispatchEvent(new CustomEvent('rendie-res-dispatch', {
        detail: { requestId: request.requestId, ...result }
      }));
    }, false);
  });
}

export async function ensurePage() {
  if (state.page && !state.page.isClosed()) return state.page;
  if (!state.browser || !state.browser.isConnected()) await ensureBrowser();

  // 创建上下文，CI 环境建议固定视口大小以保证一致性
  const context = await state.browser.newContext({
    viewport: isCI ? { width: 1280, height: 720 } : null,
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  state.page = await context.newPage();

  // 绑定桥接逻辑
  await initBridge(state.page);

  // 设置页面错误监听
  state.page.on('pageerror', async (err) => {
    console.error(`📋 浏览器内部脚本崩溃: ${err.message}`);
    await handleFatalError('JS_CRASH');
  });

  return state.page;
}
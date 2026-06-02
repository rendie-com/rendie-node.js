// browser.mjs
import { chromium } from 'playwright';
import { state, isCI } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import { background } from './common/background.mjs';

export async function ensureBrowser() {
  if (state.browser && state.browser.isConnected()) return state.browser;

  const launchOptions = {
    headless: isCI,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--lang=zh-CN',
      '--disable-blink-features=AutomationControlled',
      ...(isCI ? ['--disable-dev-shm-usage', '--disable-setuid-sandbox'] : ['--start-maximized'])
    ]
  };

  state.browser = await chromium.launch(launchOptions);
  return state.browser;
}

export async function initBridge(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.navigator.chrome = { runtime: {} };
  });

  await page.exposeFunction('nodeBridge', async (request) => {
    try {
      const result = await background.a01(request);
      return { status: 'success', data: result };
    } catch (err) {
      console.error(`❌ 后端执行 [${request.action}] 失败:`, err);
      return { status: 'error', msg: err.toString() };
    }
  });

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

  const context = await state.browser.newContext({
    viewport: isCI ? { width: 1280, height: 720 } : null,
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  state.page = await context.newPage();
  await initBridge(state.page);

  // 【检查正确】：只要是 .js 资源或 Document 主文档发生 404/500，立刻报错打断
  state.page.on('requestfinished', async (request) => {
    const response = await request.response();
    if (response && response.status() >= 400) {
      const errorMsg = `🚨 关键资源加载失败 [HTTP ${response.status()}]: ${request.url()}`;
      console.error(errorMsg);
      if (request.url().endsWith('.js') || request.resourceType() === 'document') {
        state.isShuttingDown = true; // 强制破坏外部 while 循环
        await handleFatalError('NET_FAIL_DOCUMENT');
      }
    }
  });

  state.page.on('pageerror', async (err) => {
    console.error(`📋 浏览器内部脚本崩溃:`, err);
    await handleFatalError('JS_CRASH');
  });

  return state.page;
}
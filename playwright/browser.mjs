// browser.js
import { chromium } from 'playwright';
import { state } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import path from 'path';
import { background } from './common/background.mjs';

export async function ensureBrowser() {
  if (state.browser && state.browser.isConnected()) return state.browser;
  state.browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--lang=zh-CN',
      '--start-maximized', // 关键参数：启动即最大化
      '--disable-blink-features=AutomationControlled' // 原生抹除自动化特征
    ]
  });
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

  // 创建一个全新的纯净上下文 (类似浏览器的隐私窗口)
  const context = await state.browser.newContext({
    viewport: null,
    locale: 'zh-CN'
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
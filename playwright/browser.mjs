// browser.mjs
import { chromium } from 'playwright';
import { state, isCI } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import { background } from './common/background.mjs';

export async function ensureBrowser() {
  if (state.browser && state.browser.isConnected()) return state.browser;

  const launchOptions = {
    headless: isCI,
    // 关键过检测：1688 极度看重 Chromium 启动参数
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--lang=zh-CN,zh;q=0.9',
      // 抹除自动化受控标记
      '--disable-blink-features=AutomationControlled',
      // 禁用各种暴露自动化痕迹的扩展和功能
      '--disable-infobars',
      '--no-default-browser-check',
      // 防止 Linux / Docker 环境下特有的无头特征泄露
      ...(isCI ? [
        '--disable-dev-shm-usage', 
        '--disable-setuid-sandbox',
        '--hide-scrollbars',
        '--mute-audio'
      ] : ['--start-maximized'])
    ]
  };

  state.browser = await chromium.launch(launchOptions);
  return state.browser;
}

export async function initBridge(page) {
  // 核心过检测注入：完美伪装正常 window 属性，防止 1688 爬虫检测脚本
  await page.addInitScript(() => {
    // 1. 抹除 webdriver 痕迹
    const newProto = Object.create(Navigator.prototype);
    Object.defineProperty(newProto, 'webdriver', { get: () => undefined });
    Object.setPrototypeOf(navigator, newProto);

    // 2. 伪装 Chrome 插件与运行环境（1688 重点扫描项）
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };

    // 3. 伪装语言和插件列表，防止 headless 特征暴露
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

    // 4. 伪装 WebGL 渲染器（防止1688通过硬件指纹识破云端 Linux 服务器）
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Open Source Technology Center';
      if (parameter === 37446) return 'Mesa Aegean';
      return getParameter.apply(this, arguments);
    };
  });

  // 内部桥接通信逻辑保持不变
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

  // 关键过检测：从上下文抹除 Playwright 默认的标志
  const context = await state.browser.newContext({
    // 模拟真实的 Windows 10 Chrome 环境，防止 1688 察觉是 Linux 容器
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false
  });

  state.page = await context.newPage();
  await initBridge(state.page);

  // 严格资源报错拦截
  state.page.on('requestfinished', async (request) => {
    if (state.isShuttingDown) return;
    try {
      const response = await request.response();
      if (response && typeof response.status === 'function') {
        const statusCode = response.status();
        if (statusCode >= 400) {
          if (request.url().endsWith('.js') || request.resourceType() === 'document') {
            console.error(`🚨 资源拦截器发现核心文件加载失败 [HTTP ${statusCode}]: ${request.url()}`);
            state.isShuttingDown = true; 
            await handleFatalError('NET_FAIL_DOCUMENT');
          }
        }
      }
    } catch (e) {}
  });

  state.page.on('pageerror', async (err) => {
    console.error(`📋 浏览器内部脚本崩溃:`, err);
    await handleFatalError('JS_CRASH');
  });

  return state.page;
}
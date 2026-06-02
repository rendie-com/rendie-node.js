// browser.mjs
import { chromium } from 'playwright';
import { state, isCI } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import { background } from './common/background.mjs';
import path from 'path';

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
      loadTimes: function () { },
      csi: function () { },
      app: {}
    };

    // 3. 伪装语言和插件列表，防止 headless 特征暴露
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

    // 4. 伪装 WebGL 渲染器（防止1688通过硬件指纹识破云端 Linux 服务器）
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Open Source Technology Center';
      if (parameter === 37446) return 'Mesa Aegean';
      return getParameter.apply(this, arguments);
    };

    // 5. 动态干掉 playwright 暴露在全局的敏感内部变量
    delete window.__playwright;
    delete window.__webdriver_evaluate;
    delete window.__selenium_evaluate;
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

  // 💡 【核心重构】：指定本地缓存指纹目录，不再每次都使用“纯净无痕模式”
  const userDataDir = path.resolve('./.rendie_chrome_profile');

  // 🌟 将原本 launch 的 args 与 context 的选项在持久化模式下进行大融合
  const persistentOptions = {
    headless: isCI,
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,

    // 🛡️【跨域豁免核心开关】配合 args 里的 web-security，彻底解开 window.fetch 的 Failed 锁
    bypassCSP: true,

    // 🔐【安全代理挂载】
    proxy: {
      server: 'socks5://127.0.0.1:10808',
      bypass: 'localhost,127.0.0.1,3000'
    },

    // 🚀【高级过检启动参数】
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--lang=zh-CN,zh;q=0.9',
      '--disable-blink-features=AutomationControlled', // 抹除自动化控制特征
      '--disable-infobars',
      '--no-default-browser-check',
      
      // 🌟【强效跨域沙箱关闭】
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',

      ...(isCI ? [
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--hide-scrollbars',
        '--mute-audio'
      ] : ['--start-maximized'])
    ]
  };

  // 💡 启动或接管带有持久化指纹的独立浏览器环境（这里无需单独 chromium.launch）
  const context = await chromium.launchPersistentContext(userDataDir, persistentOptions);
  
  // 提取首个默认页面，避免 launchPersistentContext 默认多开一个空白页
  const pages = context.pages();
  state.page = pages.length > 0 ? pages[0] : await context.newPage();

  // 执行核心过检桥接注入
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
    } catch (e) { }
  });

  state.page.on('pageerror', async (err) => {
    console.error(`📋 浏览器内部脚本崩溃:`, err);
    await handleFatalError('JS_CRASH');
  });

  return state.page;
}

// 保持向下兼容导出一个空的 ensureBrowser 占位，防止 index.mjs 报错
export async function ensureBrowser() {
  return state.browser;
}
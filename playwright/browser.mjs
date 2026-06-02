'use strict';
// browser.mjs
import { chromium } from 'playwright';
import { state, isCI } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import { background } from './common/background.mjs';
import path from 'path';

/**
 * 初始化防检测与跨进程桥接网关
 * @param {import('playwright').Page} page - Playwright 页面实例
 */
export async function initBridge(page) {
  // 🛡️ 核心过检测注入：完美伪装正常 window 属性，防止主流跨境电商的风控爬虫检测脚本
  await page.addInitScript(() => {
    // 1. 抹除自动化控制痕迹 (webdriver)
    const newProto = Object.create(Navigator.prototype);
    Object.defineProperty(newProto, 'webdriver', { get: () => undefined });
    Object.setPrototypeOf(navigator, newProto);

    // 2. 伪装真实 Chrome 插件与运行环境（风控脚本重点扫描项）
    window.chrome = {
      runtime: {},
      loadTimes: function () { },
      csi: function () { },
      app: {}
    };

    // 3. 伪装系统硬件及语言特征，防止无头模式 (headless) 特征暴露
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

    // 4. 伪装 WebGL 渲染器（防止风控引擎通过硬件指纹识破云端 Linux 服务器）
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Open Source Technology Center';
      if (parameter === 37446) return 'Mesa Aegean';
      return getParameter.apply(this, arguments);
    };

    // 5. 动态干掉 Playwright 暴露在全局的敏感内部追踪变量
    delete window.__playwright;
    delete window.__webdriver_evaluate;
    delete window.__selenium_evaluate;
  });

  // 📡 注册跨进程传输桥梁：将网页端的 nodeBridge 消息打通至 Node.js 中央路由器
  await page.exposeFunction('nodeBridge', async (request) => {
    try {
      // 通过统一通信协议直接转发至后台业务中央分发器
      const result = await background.a01(request);
      return { status: 'success', data: result };
    } catch (err) {
      console.error(`❌ 后端中央路由器执行 [${request.action}] 失败:`, err);
      return { status: 'error', msg: err.toString() };
    }
  });

  // 🔀 前端 DOM 自定义事件监听与响应机制配置 (rendie-req-dispatch通道)
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

/**
 * 确保并获取当前活跃的受控浏览器页面上下文
 * @returns {Promise<import('playwright').Page>}
 */
export async function ensurePage() {
  if (state.page && !state.page.isClosed()) return state.page;

  // 📂 指定本地浏览器持久化缓存指纹目录
  const userDataDir = path.resolve('./.rendie_chrome_profile');
  
  // 🌟 融合了工业级反指纹风控及高强跨域沙箱关闭的持久化配置选项
  const persistentOptions = {
    headless: isCI, // 🌟 100% 还原为你要求的原版变量写法
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,

    // 🛡️【强效跨域及内容安全策略豁免】配合 args 内的命令，解除跨域同源提取锁定
    bypassCSP: true,

    // 🚀【高级防风控启动沙箱参数】
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--lang=zh-CN,zh;q=0.9',
      '--disable-blink-features=AutomationControlled', // 抹除底层受控特征
      '--disable-infobars',
      '--no-default-browser-check',

      // 🌟【降维打击网络沙箱限制】：解除源隔离与域隔离限制
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

  // 💡 启动或安全接管带有持久化指纹的独立 Chromium 上下文环境
  const context = await chromium.launchPersistentContext(userDataDir, persistentOptions);

  // 提取首个默认初始化页面，避免 launchPersistentContext 默认多开多余的空白标签页
  const pages = context.pages();
  state.page = pages.length > 0 ? pages[0] : await context.newPage();

  // 注入核心防检测及 DOM 双向消息异步调度网关
  await initBridge(state.page);

  // 🚨 严格核心 resource 拦截器
  state.page.on('requestfinished', async (request) => {
    if (state.isShuttingDown) return;
    try {
      const response = await request.response();
      if (response && typeof response.status === 'function') {
        const statusCode = response.status();
        if (statusCode >= 400) {
          if (request.url().endsWith('.js') || request.resourceType() === 'document') {
            console.error(`🚨 [Resource Guard] 关键基础核心资源文件加载失败 [HTTP ${statusCode}]: ${request.url()}`);
            state.isShuttingDown = true;
            await handleFatalError('NET_FAIL_DOCUMENT');
          }
        }
      }
    } catch (e) { }
  });

  // 📋 全自动化中心运行时内核崩溃日志捕捉器
  state.page.on('pageerror', async (err) => {
    console.error(`📋 [Browser Kernel] 页面内部运行时环境出现未捕获脚本异常:`, err);
    await handleFatalError('JS_CRASH');
  });

  return state.page;
}
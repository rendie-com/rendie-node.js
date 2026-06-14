// browser.mjs
import { chromium } from 'playwright';
import { state, isCI } from './config.mjs';
import { handleFatalError } from './errorPage.mjs';
import path from 'path';

/**
 * 初始化防检测网关
 * @param {import('playwright').Page} page - Playwright 页面实例
 */
export async function initBridge(page) {
  // 🛡️ 核心过检测注入：完美伪装正常 window 属性，防止主流跨境电商的风控爬虫检测脚本
  await page.addInitScript(() => {
    // 1. 严格抹除自动化控制痕迹 (通过重写 getter 彻底解决 window.navigator.webdriver 检测)
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

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

    // 4. 优化 WebGL 渲染器指纹伪装（完全对齐商用 Chrome 指纹，防大厂图片反爬）
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      // 37445: UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) return 'Google Inc. (Intel)';
      // 37446: UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) return 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, vs_0_0 ps_0_0)';
      return getParameter.apply(this, arguments);
    };

    // 5. 动态干掉 Playwright 暴露在全局的敏感内部追踪变量
    delete window.__playwright;
    delete window.__webdriver_evaluate;
    delete window.__selenium_evaluate;
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
  const pluginDir = path.resolve('../chrome-extension');
  
  // 🌟 融合了工业级反指纹风控及高强跨域沙箱关闭的持久化配置选项
  const persistentOptions = {
    headless: false, 
    viewport: null, // 铺满大窗
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    bypassCSP: true, // 豁免内容安全策略

    // 🚀【高级防风控启动沙箱参数】
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${pluginDir}`,
      `--load-extension=${pluginDir}`,
      '--lang=zh-CN,zh;q=0.9',
      '--disable-blink-features=AutomationControlled', 
      '--disable-infobars',
      '--no-default-browser-check',
      '--start-maximized', // 启动时强制大窗
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      ...(isCI ? [
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--disable-gpu', // 🌟 在本地有显卡调试时保留硬件加速，只在 CI（云端无显卡）下完全禁用，提高本地调试速度
        '--hide-scrollbars',
        '--mute-audio'
      ] : [])
    ]
  };

  // 💡 启动或安全接管带有持久化指纹的独立 Chromium 上下文环境
  const context = await chromium.launchPersistentContext(userDataDir, persistentOptions);

  // 🌟 核心优化：全量劫持新开标签页（防止 1688 详情页 `target="_blank"` 弹窗导致防检测网关击穿）
  context.on('page', async (newPage) => {
    try {
      await initBridge(newPage);
    } catch (e) { }
  });

  // 提取首个默认初始化页面
  const pages = context.pages();
  state.page = pages.length > 0 ? pages[0] : await context.newPage();

  // 注入初始防检测网关
  await initBridge(state.page);

  // 🚨 严格核心 resource 拦截器
  state.page.on('requestfinished', async (request) => {
    if (state.isShuttingDown) return;
    try {
      const response = await request.response();
      if (response) {
        const statusCode = response.status(); // 🌟 修复点：移除了无意义的 typeof 校验，直接获取状态码
        if (statusCode >= 400) {
          const url = request.url();
          if (url.endsWith('.js') || request.resourceType() === 'document') {
            console.error(`🚨 [Resource Guard] 关键基础核心资源文件加载失败 [HTTP ${statusCode}]: ${url}`);
            state.isShuttingDown = true;
            await handleFatalError('NET_FAIL_DOCUMENT');
          }
        }
      }
    } catch (e) { } // 🌟 防死锁：吞掉因跨域重定向导致的不可用 response 报错
  });

  // 📋 全自动化中心运行时内核崩溃日志捕捉器
  state.page.on('pageerror', async (err) => {
    console.error(`📋 [Browser Kernel] 页面内部运行时环境出现未捕获脚本异常:`, err);
    await handleFatalError('JS_CRASH');
  });

  return state.page;
}
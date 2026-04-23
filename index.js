import { 
  initApp, runMonitor, silentExit, CONFIG, 
  NODE_USERNAME, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_TASK_URL 
} from './common.js';

(async () => {
  let { browser, page, isCI } = await initApp();

  // 绑定退出信号
  process.on('SIGINT', () => silentExit(browser));
  process.on('SIGTERM', () => silentExit(browser));

  try {
    console.log(`🌐 [${isCI ? 'CI' : '本地'}] 运行模式 | 用户: ${NODE_USERNAME}`);
    
    // 1. 快速注入数据
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((d) => {
      localStorage.clear();
      Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : v));
      localStorage.setItem("expires_in", Math.floor(Date.now() / 1000) + 7200);
    }, {
      username: NODE_USERNAME, access_token: NODE_ACCESS_TOKEN, refresh_token: NODE_REFRESH_TOKEN,
      menuList: { top1: 1, top2: { "23": { name: "任务", id: "23", isbool: true, url: NODE_TASK_URL } } }
    }).catch(() => {});

    // 2. 启动跳转 (不等待)
    page.goto(CONFIG.url, { waitUntil: 'networkidle2' }).catch(() => {});
    
    // 3. 瞬发探测启动器
    const startMonitoring = async () => {
      try {
        await runMonitor(browser, page);
      } catch (err) {
        // 捕获跳转瞬间的上下文销毁错误，100ms 后重试
        if (err.message.includes('context') || err.message.includes('Execution')) {
          setTimeout(startMonitoring, 100);
        } else if (browser && browser.connected) {
          console.error("\n🚨 运行异常:", err.message);
        }
      }
    };

    startMonitoring();

  } catch (err) {
    if (!err.message.includes('Target closed')) {
      console.error("\n🚨 初始化失败:", err.message);
    }
  }
})();
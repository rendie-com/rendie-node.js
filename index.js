import { 
  initApp, runMonitor, silentExit, CONFIG, 
  NODE_USERNAME, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_TASK_URL 
} from './common.js';

(async () => {
  let { browser, page, isCI } = await initApp();

  process.on('SIGINT', () => silentExit(browser));
  process.on('SIGTERM', () => silentExit(browser));

  try {
    console.log(`🌐 [${isCI ? 'CI' : '本地'}] 运行模式 | 用户: ${NODE_USERNAME}`);
    
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((d) => {
      localStorage.clear();
      Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : v));
      localStorage.setItem("expires_in", Math.floor(Date.now() / 1000) + 7200);
    }, {
      username: NODE_USERNAME, access_token: NODE_ACCESS_TOKEN, refresh_token: NODE_REFRESH_TOKEN,
      menuList: { top1: 1, top2: { "23": { name: "任务", id: "23", isbool: true, url: NODE_TASK_URL } } }
    }).catch(() => {});

    page.goto(CONFIG.url, { waitUntil: 'networkidle2' }).catch(() => {});
    
    const startMonitoring = async () => {
      try {
        await runMonitor(browser, page);
      } catch (err) {
        if (err.message.includes('context') || err.message.includes('Execution')) {
          setTimeout(startMonitoring, 100);
        } else if (browser && browser.connected) {
          console.error(`\n🚨 脚本异常终止: ${err.message}`);
          await silentExit(browser);
        }
      }
    };

    startMonitoring();

  } catch (err) {
    console.error("\n🚨 初始化失败:", err.message);
    if (browser) await silentExit(browser);
  }
})();
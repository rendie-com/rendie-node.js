import { initApp, runMonitor, CONFIG, NODE_USERNAME, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_TASK_URL } from './common.js';

(async () => {
  const { browser, page, isCI } = await initApp();

  try {
    console.log(`🌐 [${isCI ? 'CI' : '本地'}] 运行模式 | 用户: ${NODE_USERNAME}`);

    // 1. 快速注入数据
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });
    await page.evaluate((d) => {
      localStorage.clear();
      Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : v));
      localStorage.setItem("expires_in", Math.floor(Date.now() / 1000) + 7200);
    }, {
      username: NODE_USERNAME, access_token: NODE_ACCESS_TOKEN, refresh_token: NODE_REFRESH_TOKEN,
      menuList: { top1: 1, top2: { "23": { name: "任务", id: "23", isbool: true, url: NODE_TASK_URL } } }
    });

    // 2. 刷新应用并接管监控
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });
    await runMonitor(browser, page);

  } catch (err) {
    console.error("\n🚨 崩溃:", err.message);
  } finally {
    if (browser?.connected) await browser.close();
    process.exit(0);
  }
})();
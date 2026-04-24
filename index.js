import 'dotenv/config'; 
import { initApp, runMonitor, silentExit } from './common.js';

const { 
  NODE_USERNAME, 
  NODE_ACCESS_TOKEN, 
  NODE_REFRESH_TOKEN,
  NODE_EXPIRES_IN,
  NODE_MENU_LIST
} = process.env;

async function main() {
  console.log(`\n🔵 系统启动 | 环境检查通过`);
  
  const { browser, page } = await initApp();
  
  try {
    const adminUrl = "http://localhost:3000/admin.html";
    
    console.log(`🔗 访问入口: ${adminUrl}`);
    await page.goto(adminUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 50000 
    });

    console.log("🔑 正在注入凭据到 LocalStorage...");
    await page.evaluate((at, rt, un, exp, menu) => {
      localStorage.setItem('access_token', at || '');
      localStorage.setItem('refresh_token', rt || '');
      localStorage.setItem('username', un || 'admin');
      localStorage.setItem('expires_in', exp || '3600');
      localStorage.setItem('menuList', menu || '[]'); 
      localStorage.setItem('DEFAULT_DB', 'sqlite');
    }, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_USERNAME, NODE_EXPIRES_IN, NODE_MENU_LIST);

    console.log("🔄 注入完成，刷新页面启动插件任务...");
    
    // 优化点：使用竞争机制防止 reload 永久挂起
    await Promise.all([
      page.reload({ waitUntil: 'load', timeout: 60000 }),
      new Promise(resolve => setTimeout(resolve, 15000)) // 15秒强制向下执行
    ]);

    await runMonitor(browser, page);
    
  } catch (err) {
    console.error(`\n❌ [入口阶段崩溃]: ${err.message}`);
    // 异常时尝试抓拍最后一帧
    try {
      const { triggerErrorCapture } = await import('./common.js');
      await triggerErrorCapture(page, 'FATAL_INIT_ERROR');
    } catch (e) {}
    await silentExit(browser);
  }
}

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [未处理的 Promise 拒绝]:', reason);
});

main();
import 'dotenv/config'; 
import { initApp, runMonitor, silentExit } from './common.js';
import { delay } from './utils.js';

const { 
  NODE_USERNAME, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN,
  NODE_EXPIRES_IN, NODE_MENU_LIST
} = process.env;

async function main() {
  console.log(`\n🔵 启动 | 用户: ${NODE_USERNAME || 'admin'}`);
  const { browser, page } = await initApp();
  
  try {
    const adminUrl = "http://localhost:3000/admin.html";
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 500 });

    console.log("🔑 写入凭据...");
    await page.evaluate((at, rt, un, exp, menu) => {
      localStorage.setItem('access_token', at || '');
      localStorage.setItem('refresh_token', rt || '');
      localStorage.setItem('username', un || 'admin');
      localStorage.setItem('expires_in', exp || '3600');
      localStorage.setItem('menuList', typeof menu === 'string' ? menu : JSON.stringify(menu)); 
      localStorage.setItem('DEFAULT_DB', 'sqlite');
    }, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_USERNAME, NODE_EXPIRES_IN, NODE_MENU_LIST);

    console.log("🔄 重载页面中...");
  

    await delay(3000); // 避开 Next.js 重定向高发期
    await runMonitor(browser, page);
    
  } catch (err) {
    console.error(`\n❌ 入口崩溃: ${err.message}`);
    try {
      const { triggerErrorCapture } = await import('./common.js');
      await triggerErrorCapture(page, 'INIT_CRASH');
    } catch (e) {}
    await silentExit(browser);
  }
}

main();
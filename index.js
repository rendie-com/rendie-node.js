import 'dotenv/config'; 
import { initApp, runMonitor, silentExit } from './common.js';
import { delay } from './utils.js';

const { 
  NODE_USERNAME, 
  NODE_ACCESS_TOKEN, 
  NODE_REFRESH_TOKEN,
  NODE_EXPIRES_IN,
  NODE_MENU_LIST
} = process.env;

async function main() {
  console.log(`\n🔵 系统启动 | 用户: ${NODE_USERNAME || 'admin'}`);
  
  const { browser, page } = await initApp();
  
  try {
    const adminUrl = "http://localhost:3000/admin.html";
    
    // 1. 初始访问
    console.log(`🔗 访问入口: ${adminUrl}`);
    await page.goto(adminUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 50000 
    });

    // 2. 注入凭据
    console.log("🔑 正在注入凭据到 LocalStorage...");
    await page.evaluate((at, rt, un, exp, menu) => {
      localStorage.setItem('access_token', at || '');
      localStorage.setItem('refresh_token', rt || '');
      localStorage.setItem('username', un || 'admin');
      localStorage.setItem('expires_in', exp || '3600');
      localStorage.setItem('menuList', menu || '[]'); 
      localStorage.setItem('DEFAULT_DB', 'sqlite');
    }, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_USERNAME, NODE_EXPIRES_IN, NODE_MENU_LIST);

    // 3. 刷新页面（采用更稳定的 goto 替代 reload）
    console.log("🔄 凭据注入完成，重载页面以启动插件任务...");
    try {
      await page.goto(adminUrl, { waitUntil: 'load', timeout: 60000 });
    } catch (e) {
      // 忽略刷新瞬间可能产生的框架脱离报错
      if (!e.message.includes('detached Frame')) throw e;
    }

    // 4. 重要：等待页面重定向和 Next.js 状态稳定
    console.log("⏳ 等待 3 秒确保环境稳定...");
    await delay(3000);

    // 5. 进入监控循环
    console.log("🚀 启动监控轮询...");
    await runMonitor(browser, page);
    
  } catch (err) {
    console.error(`\n❌ [入口阶段崩溃]: ${err.message}`);
    // 捕获最后一帧用于排查
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
import 'dotenv/config'; // 自动加载 .env 配置文件
import { initApp, runMonitor, silentExit } from './common.js';

// 解构 .env 中的变量
const { 
  NODE_USERNAME, 
  NODE_ACCESS_TOKEN, 
  NODE_REFRESH_TOKEN,
  NODE_EXPIRES_IN,
  NODE_MENU_LIST,
  MAX_RUNTIME_MINUTES
} = process.env;

async function main() {
  console.log(`\n🔵 [CI] 运行模式 | 用户: ${NODE_USERNAME || 'admin'}`); //
  
  // 1. 初始化浏览器和页面
  const { browser, page } = await initApp();
  
  try {
    const adminUrl = "http://localhost:3000/admin.html";
    
    // 2. 访问主入口（必须先访问域才能写 LocalStorage）
    console.log(`🔗 正在打开入口并准备注入凭据: ${adminUrl}`);
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 3. 注入 LocalStorage 数据（精准匹配你的截图需求）
    console.log("🔑 正在同步访问凭据与 menuList 到 LocalStorage...");
    await page.evaluate((at, rt, un, exp, menu) => {
      localStorage.setItem('access_token', at);
      localStorage.setItem('refresh_token', rt);
      localStorage.setItem('username', un);
      localStorage.setItem('expires_in', exp);
      localStorage.setItem('menuList', menu); // 注入来自 .env 的 JSON 字符串
      localStorage.setItem('DEFAULT_DB', 'sqlite'); // 默认数据库配置
    }, NODE_ACCESS_TOKEN, NODE_REFRESH_TOKEN, NODE_USERNAME, NODE_EXPIRES_IN, NODE_MENU_LIST);

    // 4. 刷新页面使凭据生效并让扩展程序检测到登录状态
    console.log("🔄 凭据注入完成，刷新页面启动任务...");
    await page.reload({ waitUntil: 'networkidle2' });

    // 5. 进入核心监控逻辑
    await runMonitor(browser, page);
    
  } catch (err) {
    console.error(`\n❌ [致命异常]: ${err.message}`);
    await silentExit(browser);
  }
}

// 全局错误捕获
process.on('unhandledRejection', (reason) => {
    console.error('未处理的 Promise 拒绝:', reason);
});

main();
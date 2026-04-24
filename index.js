import { initApp, runMonitor, silentExit } from './common.js';

// 直接从环境变量读取，不走 common.js 的 export 
const { 
  NODE_USERNAME, 
  NODE_ACCESS_TOKEN, 
  NODE_REFRESH_TOKEN 
} = process.env;

async function main() {
  console.log(`\n🚀 [启动] 用户: ${NODE_USERNAME || '未知'}`);
  
  // 初始化浏览器和页面
  const { browser, page, isCI } = await initApp();
  
  try {
    // 注入 Token 到 localStorage 或 Cookie (如果业务需要)
    if (NODE_ACCESS_TOKEN) {
      console.log("🔑 正在注入访问令牌...");
      // 这里可以根据你的 rendie 业务逻辑添加 page.evaluate
    }

    // 执行核心监控逻辑
    await runMonitor(browser, page);
    
  } catch (err) {
    console.error("\n❌ [致命异常]:", err.message);
    // 发生崩溃时尝试最后一次截图
    if (page && !page.isClosed()) {
        const { triggerErrorCapture } = await import('./common.js'); // 动态导入以防万一
        await triggerErrorCapture(page, 'FATAL_ERROR');
    }
    await silentExit(browser);
  }
}

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main();
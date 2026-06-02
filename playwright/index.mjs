// index.mjs
import { state, CONFIG, envConfig, GOTO_TIMEOUT_MS } from './config.mjs';
import { ensureBrowser, ensurePage } from './browser.mjs';
import { handleFatalError } from './errorPage.mjs';
import { delay, formatElapsed, checkProjectEnv, registerProcessGuards, shutdown } from './utils.mjs';

export async function initApp() {
  checkProjectEnv(envConfig);
  await ensureBrowser();
  await ensurePage();

  const { TARGET_URL, TEMPLATE, NODE_ACCESS_TOKEN, NODE_USERNAME } = envConfig;

  await state.page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT_MS });

  // 页面主结构加载后，直接注入数据
  await state.page.evaluate(({ token, user, url, tpl }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('menuList', JSON.stringify({
      top1: 1,
      top2: { 23: { name: "任务", id: "23", isbool: true, url: `${url}/iframe?template=${tpl}` } }
    }));
  }, { token: NODE_ACCESS_TOKEN, user: NODE_USERNAME, url: TARGET_URL, tpl: TEMPLATE });

  // 注入数据后，刷新一下页面或者等待网络空闲使更改生效
  await state.page.reload({ waitUntil: 'networkidle' });
  console.log("✅ 目标页面加载且数据注入验证通过");
}

export async function runMonitor() {
  const start = Date.now();
  let step = 0;
  
  while (!state.isShuttingDown && state.browser?.isConnected()) {
    const elapsed = Date.now() - start;
    const title = await state.page.title().catch(() => "");
    
    if (step % 10 === 0) console.log(`[${formatElapsed(elapsed)}] : ${title || "页面挂起"}`);
    
    const isErr = title.includes("出错");
    const isSuccess = title.includes("已完成所有任务");
    
    if (isErr || elapsed > CONFIG.maxTime || isSuccess) {
      if (isErr || elapsed > CONFIG.maxTime) {
        const type = isErr ? 'UI_ERROR' : 'RUNTIME_TIMEOUT';
        console.log(`🚨 终止 [${type}]: ${title}`);
        await handleFatalError(type);
      } else {
        console.log(`✅ 任务圆满完成: ${title}`);
      }
      await shutdown();
      return;
    }
    step++;
    await delay(CONFIG.interval);
  }
}

// 注册进程守卫
registerProcessGuards({ shutdown });

try {
  await initApp();
  await runMonitor();
} catch (err) {
  console.error("🔥 主程序崩溃:", err);
  await shutdown(); // 确保崩溃时也能清理
}
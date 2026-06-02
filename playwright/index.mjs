//index.mjs
import { state, CONFIG, envConfig, GOTO_TIMEOUT_MS } from './config.mjs';
import { ensureBrowser, ensurePage } from './browser.mjs';
import { handleFatalError } from './errorPage.mjs';
import { delay, formatElapsed, checkProjectEnv, registerProcessGuards, shutdown } from './utils.mjs';

// index.mjs (强化校验版)

export async function initApp() {
  checkProjectEnv(envConfig);
  await ensureBrowser();
  await ensurePage();

  const { TARGET_URL, TEMPLATE, NODE_ACCESS_TOKEN, NODE_USERNAME } = envConfig;

  // --- 1. 严格跳转校验 ---
  const response = await state.page.goto(TARGET_URL, {
    waitUntil: 'networkidle',
    timeout: GOTO_TIMEOUT_MS
  });

  // 逻辑：只要状态码不是 200 系列，强制报错
  if (!response || response.status() >= 300) {
    throw new Error(`[致命错误] 页面加载异常，HTTP状态码: ${response?.status() || '无响应'}`);
  }

  // --- 2. 严格数据注入校验 ---
  const injectSuccess = await state.page.evaluate(({ token, user, url, tpl }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('menuList', JSON.stringify({
      top1: 1,
      top2: { 23: { name: "任务", id: "23", isbool: true, url: `${url}/iframe?template=${tpl}` } }
    }));
    // 返回校验值：如果不等于 token，说明注入无效
    return localStorage.getItem('access_token') === token;
  }, { token: NODE_ACCESS_TOKEN, user: NODE_USERNAME, url: TARGET_URL, tpl: TEMPLATE });

  if (!injectSuccess) {
    throw new Error("[致命错误] LocalStorage 注入失败，页面可能已禁用 JS 或被反爬阻断");
  }

  // --- 3. 严格刷新校验 ---
  await state.page.reload({ waitUntil: 'networkidle' });

  // 额外检查：刷新后检查 Token 是否依然存在（防止页面重定向导致数据丢失）
  const tokenExists = await state.page.evaluate(() => !!localStorage.getItem('access_token'));
  if (!tokenExists) {
    throw new Error("[致命错误] 刷新页面后数据丢失，登录态无效");
  }

  console.log("✅ 严格环境检查通过，任务启动");
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



registerProcessGuards({ shutdown });

try {
  await initApp();
  await runMonitor();
} catch (err) {
  console.error("主程序崩溃:", err);
  await shutdown(); // 确保崩溃时也能清理
}

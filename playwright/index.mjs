//index.mjs
import { state, CONFIG, envConfig, GOTO_TIMEOUT_MS } from './config.mjs';
import { ensureBrowser, ensurePage } from './browser.mjs';
import { handleFatalError } from './errorPage.mjs';
import { delay, formatElapsed, checkProjectEnv, registerProcessGuards, shutdown } from './utils.mjs';

export async function initApp() {
  checkProjectEnv(envConfig);
  await ensureBrowser();
  await ensurePage();

  const { TARGET_URL, TEMPLATE, NODE_ACCESS_TOKEN, NODE_USERNAME } = envConfig;

  await state.page.addInitScript(({ token, user, url, tpl }) => {
    window.localStorage.setItem('access_token', token);
    window.localStorage.setItem('username', user);
    window.localStorage.setItem('menuList', JSON.stringify({
      top1: 1,
      top2: { 23: { name: "任务", id: "23", isbool: true, url: `${url}/iframe?template=${tpl}` } }
    }));
  }, { token: NODE_ACCESS_TOKEN, user: NODE_USERNAME, url: TARGET_URL, tpl: TEMPLATE });
  console.log("🚀 正在前往目标页面 (已预设登录态)...");
  const response = await state.page.goto(TARGET_URL, {
    waitUntil: 'networkidle',
    timeout: GOTO_TIMEOUT_MS
  });
  if (!response || response.status() >= 400) {
    throw new Error(`页面无法访问 (HTTP ${response?.status()})`);
  }
  const isLoggedIn = await state.page.evaluate(() => !!localStorage.getItem('access_token'));
  if (!isLoggedIn) {
    throw new Error("[致命错误] 跳转后登录态丢失，可能被反爬阻断");
  }
  console.log("✅ 登录态注入并验证成功");
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

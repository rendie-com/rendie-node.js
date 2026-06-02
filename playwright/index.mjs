'use strict';
// index.mjs
import { state, CONFIG, envConfig, GOTO_TIMEOUT_MS } from './config.mjs';
import { ensurePage } from './browser.mjs';
import { handleFatalError } from './errorPage.mjs';
import { delay, formatElapsed, checkProjectEnv, registerProcessGuards, shutdown } from './utils.mjs';

export async function initApp() {
  checkProjectEnv(envConfig);
  await ensurePage();
  const { TARGET_URL, TEMPLATE, NODE_ACCESS_TOKEN, NODE_USERNAME } = envConfig;
  await state.page.goto(TARGET_URL, { waitUntil: 'commit', timeout: GOTO_TIMEOUT_MS }).catch(() => { });
  await state.page.evaluate(({ token, user, url, tpl }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('menuList', JSON.stringify({
      top1: 1,
      top2: { 23: { name: "任务", id: "23", isbool: true, url: `${url}/iframe?template=${tpl}` } }
    }));
  }, { token: NODE_ACCESS_TOKEN, user: NODE_USERNAME, url: TARGET_URL, tpl: TEMPLATE });
  await state.page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: GOTO_TIMEOUT_MS });
  console.log("✅ 中台数据注入成功，目标页就绪");
}

export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  while (!state.isShuttingDown && state.page && !state.page.isClosed()) {
    const elapsed = Date.now() - start;
    const title = await state.page.title().catch(() => "");

    if (step % 10 === 0) console.log(`[${formatElapsed(elapsed)}] : ${title || "页面挂起..."}`);

    const isErr = title.includes("出错");
    const isSuccess = title.includes("已完成所有任务");

    if (isErr || elapsed > CONFIG.maxTime || isSuccess) {
      if (isErr || elapsed > CONFIG.maxTime) {
        const type = isErr ? 'UI_ERROR' : 'RUNTIME_TIMEOUT';
        console.log(`🚨 任务意外终止 [原因: ${type}]: ${title}`);
        await handleFatalError(type);
      } else {
        console.log(`✅ 自动化任务圆满完成: ${title}`);
      }
      return await shutdown();
    }
    step++;
    await delay(CONFIG.interval);
  }
  console.log("⚠️ 浏览器页面已关闭，监控退出");
}

registerProcessGuards({ shutdown });

try {
  await initApp();
  await runMonitor();
} catch (err) {
  console.error("🔥 调度内核崩溃:", err);
  await shutdown();
}
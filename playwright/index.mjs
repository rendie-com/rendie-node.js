'use strict';
// index.mjs
import { state, CONFIG, envConfig, GOTO_TIMEOUT_MS } from './config.mjs';
import { ensurePage } from './browser.mjs';
import { handleFatalError } from './errorPage.mjs';
import { delay, formatElapsed, checkProjectEnv, registerProcessGuards, shutdown } from './utils.mjs';

/**
 * 初始化应用：确保浏览器拉起并注入核心中台凭证
 */
export async function initApp() {
  checkProjectEnv(envConfig);
  
  // 🌟 核心调用：直接拉起页面，底层已全量无脑对齐本地 10808 端口的 Xray 隧道
  await ensurePage();

  const { TARGET_URL, TEMPLATE, NODE_ACCESS_TOKEN, NODE_USERNAME } = envConfig;

  await state.page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT_MS });

  // 页面主结构加载后，直接注入业务 LocalStorage 凭证
  await state.page.evaluate(({ token, user, url, tpl }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('username', user);
    localStorage.setItem('menuList', JSON.stringify({
      top1: 1,
      top2: { 23: { name: "任务", id: "23", isbool: true, url: `${url}/iframe?template=${tpl}` } }
    }));
  }, { token: NODE_ACCESS_TOKEN, user: NODE_USERNAME, url: TARGET_URL, tpl: TEMPLATE });

  // 注入数据后，刷新页面使凭证在业务生命周期中即时生效
  await state.page.reload({ waitUntil: 'networkidle' });
  console.log("✅ 目标页面加载且中台数据注入验证通过");
}

/**
 * 工业级运行时健康状态监控心跳
 */
export async function runMonitor() {
  const start = Date.now();
  let step = 0;

  // 🌟【Bug 修复的核心硬核防线】
  // 摒弃已失效的 state.browser 检测，改用 state.page 及其闭合状态进行运行时活性锚定
  while (!state.isShuttingDown && state.page && !state.page.isClosed()) {
    const elapsed = Date.now() - start;
    
    // 防御性捕获标题：防止在循环判断间隙页面突然关闭引发报错
    const title = await state.page.title().catch(() => "");

    // 节流日志输出，避免垃圾日志塞满控制台
    if (step % 10 === 0) {
      console.log(`[${formatElapsed(elapsed)}] : ${title || "控制台页面挂起..."}`);
    }

    const isErr = title.includes("出错");
    const isSuccess = title.includes("已完成所有任务");

    // 终止判定网关
    if (isErr || elapsed > CONFIG.maxTime || isSuccess) {
      if (isErr || elapsed > CONFIG.maxTime) {
        const type = isErr ? 'UI_ERROR' : 'RUNTIME_TIMEOUT';
        console.log(`🚨 任务意外终止 [原因: ${type}]: 当前页面标题 -> ${title}`);
        await handleFatalError(type);
      } else {
        console.log(`✅ 自动化任务圆满完成: ${title}`);
      }
      
      await shutdown();
      return;
    }
    
    step++;
    await delay(CONFIG.interval);
  }
  
  console.log("⚠️ 监听到浏览器页面已主动关闭，心跳监控安全退出");
}

// 注册系统底层进程守卫（拦截 Ctrl+C 等退出信号进行优雅收尾）
registerProcessGuards({ shutdown });

// ------------------------------------------------------------------------
// 🚀 全自动化调度主入口
// ------------------------------------------------------------------------
try {
  await initApp();
  await runMonitor();
} catch (err) {
  console.error("🔥 Rendie 全自动化主调度内核崩溃:", err);
  await shutdown(); // 确保极端崩溃情况下也能安全清理系统孤儿进程
}
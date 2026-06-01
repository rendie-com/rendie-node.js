// errorPage.mjs
import fs from 'fs';
import path from 'path';
import { CONFIG, ERROR_TYPE_CN, state, isCI } from './config.mjs';
import { getReadableTimestamp, uploadToGithub, delay, shutdown } from './utils.mjs';

/**
 * 🛠 核心：统一报错处理、截图上传并关闭
 */
export async function handleFatalError(type) {
  if (state.isHandlingError || state.isShuttingDown) return;
  state.isHandlingError = true;

  // 1. 转换中文类型名
  const cnType = ERROR_TYPE_CN[type] || type || '未知错误';

  console.log(`\n🚨 [致命异常] 类型: ${cnType} (${type})`);

  try {
    // 2. 构造文件名：时间戳放在最前面确保排序，中文放在中间一眼识别
    const timestamp = getReadableTimestamp();
    const name = `${timestamp}_【${cnType}】_${Date.now().toString().slice(-3)}.png`;
    const imgPath = path.join(CONFIG.errorDir, name);

    if (!fs.existsSync(CONFIG.errorDir)) {
      fs.mkdirSync(CONFIG.errorDir, { recursive: true });
    }

    await delay(1000);

    if (state.page && !state.page.isClosed()) {
      console.log(`📸 正在截取错误页面: ${name}`);
      await state.page.screenshot({ path: imgPath, fullPage: true }).catch(() => { });

      if (isCI) {
        console.log(`☁️ 正在上传至 GitHub...`);
        await uploadToGithub(imgPath, name).catch((e) => console.error('GitHub 上传失败:', e.message));
      }
    }
  } catch (e) {
    console.error('处理报错截图时发生异常:', e.message);
  } finally {
    await shutdown();
  }
}
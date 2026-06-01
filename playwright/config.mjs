// config.js
import path from 'path';
import { fileURLToPath } from 'url';

const env = process.env;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const envConfig = env;
export const isCI = env.GITHUB_ACTIONS === 'true';

// 共享的全局状态指针
export const state = {
    browser: null,
    page: null,
    isShuttingDown: false,
    isHandlingError: false
};

// 全局静态配置
export const CONFIG = {
    url: env.TARGET_URL,
    errorDir: path.resolve(env.TARGET_DIR || 'error'),
    maxTime: (Number.parseInt(env.MAX_RUNTIME_MINUTES, 10) || 1) * 60000,
    interval: 1000,
};

export const GOTO_TIMEOUT_MS = 30000;

// 错误类型中文映射
export const ERROR_TYPE_CN = {
    'TimeoutError': '请求超时',
    'NavigationError': '导航失败',
    'TargetClosedError': '浏览器关闭',
    'EvaluationError': '脚本执行错误',
    'NET_FAIL_DOCUMENT': '网络主文档加载失败',
    'JS_CRASH': '前端脚本崩溃',
    'INIT_PAGE_ERR': '页面初始化失败',
    'GOTO_TIMEOUT': '访问页面超时',
    'UI_ERROR': '界面显示出错',
    'RUNTIME_TIMEOUT': '任务执行超时'
};
import fs from 'fs';
import { Octokit } from '@octokit/rest';

export const delay = (ms) => new Promise(res => setTimeout(res, ms));

export function isBrowserConnected(browser) {
  try {
    return Boolean(browser && typeof browser.isConnected === 'function' && browser.isConnected());
  } catch {
    return false;
  }
}

export function registerProcessGuards({ shutdown }) {
  if (typeof shutdown !== 'function') return;

  process.once('SIGINT', async () => {
    await shutdown();
    process.exitCode = 130;
  });

  process.once('unhandledRejection', async (reason) => {
    console.error(reason);
    await shutdown();
    process.exitCode = 1;
  });

  process.once('uncaughtException', async (err) => {
    console.error(err);
    await shutdown();
    process.exitCode = 1;
  });
}

// 文件名：04月25日_11时30分
export const getReadableTimestamp = () => {
  const now = new Date();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const h = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  return `${m}月${d}日_${h}时${min}分`;
};

// 计时显示：超过60秒显示分，否则秒
export const formatElapsed = (ms) => {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}秒` : `${Math.floor(s / 60)}分${s % 60}秒`;
};

export async function uploadToGithub(localPath, fileName) {
  const { GITHUB_TOKEN: auth, "rendie-com": owner, "rendie-node.js-error": repo, TARGET_DIR: dir } = process.env;
  if (!auth || auth.includes('***')) return;
  if (!owner || !repo) return;

  const octokit = new Octokit({ auth });
  try {
    const contentBase64 = await fs.promises.readFile(localPath, { encoding: 'base64' });
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: `${dir || 'error'}/${fileName}`,
      message: `📸 异常截屏: ${fileName}`,
      content: contentBase64,
      committer: { name: 'Rendie-Bot', email: 'bot@rendie.com' },
      author: { name: 'Rendie-Bot', email: 'bot@rendie.com' }
    });
    console.log(`✅ 已同步至 GitHub`);
  } catch (e) { console.error(`❌ 上传失败: ${e.message}`); }
}

export function checkProjectEnv(env = process.env) {
  console.log(`\n--- 🚀 Rendie 项目变量检查 ---`);
  const keys = [
    'NODE_USERNAME', 'NODE_ACCESS_TOKEN', 
    'TARGET_URL','TEMPLATE', 'MAX_RUNTIME_MINUTES', 'TARGET_DIR',
    'GITHUB_TOKEN'
  ];

  const sensitive = ['GITHUB_TOKEN', 'NODE_ACCESS_TOKEN'];

  keys.forEach(key => {
    const val = env[key] || '未设置 ❌';
    let display = val;

    if (val !== '未设置 ❌' && sensitive.includes(key)) {
      display = val.length > 8 ? `${val.slice(0, 3)}****${val.slice(-3)}` : '********';
    }
    console.log(`${key.padEnd(20)} : ${display}`);
  });
  console.log(`------------------------------\n`);
}

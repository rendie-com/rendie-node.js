import fs from 'fs';
import { Octokit } from '@octokit/rest';

export const delay = (ms) => new Promise(res => setTimeout(res, ms));

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
  const { GITHUB_TOKEN: auth, GITHUB_OWNER: owner, GITHUB_REPO: repo, TARGET_DIR: dir } = process.env;
  if (!auth || auth.includes('***')) return;

  const octokit = new Octokit({ auth });
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: `${dir || 'error'}/${fileName}`,
      message: `📸 异常截屏: ${fileName}`,
      content: fs.readFileSync(localPath, 'base64'),
      committer: { name: 'Rendie-Bot', email: 'bot@rendie.com' },
      author: { name: 'Rendie-Bot', email: 'bot@rendie.com' }
    });
    console.log(`✅ 已同步至 GitHub`);
  } catch (e) { console.error(`❌ 上传失败: ${e.message}`); }
}
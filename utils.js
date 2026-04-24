import { Octokit } from "@octokit/rest";
import fs from 'fs';
import 'dotenv/config';

const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, TARGET_DIR } = process.env;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getReadableTimestamp = () => {
  const now = new Date();
  const f = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}年${f(now.getMonth() + 1)}月${f(now.getDate())}日-${f(now.getHours())}时${f(now.getMinutes())}分${f(now.getSeconds())}秒`;
};

export async function uploadToGithub(localPath, fileName) {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return;
  const cloudDir = TARGET_DIR || 'error';

  try {
    const content = fs.readFileSync(localPath, { encoding: 'base64' });
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: `${cloudDir}/${fileName}`,
      message: `🚨 监控报错: ${fileName}`,
      content: content,
      branch: "main"
    });
    console.log(`☁️  GitHub 云端同步成功: [${GITHUB_REPO} -> /${cloudDir}/${fileName}]`);
  } catch (e) {
    console.error(`⚠️  云端同步失败: ${e.message}`);
  }
}
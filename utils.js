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
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error("❌ GitHub 变量未定义，取消上传。");
    return;
  }
  const cloudPath = `${TARGET_DIR || 'error'}/${fileName}`;

  try {
    const content = fs.readFileSync(localPath, { encoding: 'base64' });
    console.log(`🚀 开始上传云端: ${cloudPath} ...`);
    
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: cloudPath,
      message: `🚨 Error Log: ${fileName}`,
      content: content,
      branch: "main"
    });
    
    console.log(`✅ 云端同步完成！请检查仓库: ${GITHUB_REPO}`);
  } catch (e) {
    console.error(`❌ 云端上传失败详情: ${e.message}`);
    // 如果报 404，多半是 MY_PAT 权限不够或仓库名写错了
  }
}
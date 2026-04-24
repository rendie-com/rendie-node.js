import { Octokit } from "@octokit/rest";
import fs from 'fs';
import 'dotenv/config';

const { GITHUB_TOKEN, GITHUB_OWNER } = process.env;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// 延迟函数
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 高可读性时间戳
export const getReadableTimestamp = () => {
  const now = new Date();
  const format = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}年${format(now.getMonth() + 1)}月${format(now.getDate())}日-${format(now.getHours())}时${format(now.getMinutes())}分${format(now.getSeconds())}秒`;
};

/**
 * 上传图片到 rendie-node.js 仓库的 error 分支
 */
export async function uploadToGithub(localPath, fileName) {
  if (!GITHUB_TOKEN || !GITHUB_OWNER) {
    console.log("⚠️ 未配置 GITHUB_TOKEN 或 GITHUB_OWNER，跳过云端上传。");
    return;
  }

  try {
    const content = fs.readFileSync(localPath, { encoding: 'base64' });
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: "rendie-node.js", // 直接固定仓库名
      path: `errors/${fileName}`,
      message: `🚨 自动报错记录: ${fileName}`,
      content: content,
      branch: "error"
    });
    console.log(`☁️  GitHub 云端同步成功: [rendie-node.js / error 分支]`);
  } catch (e) {
    console.error(`⚠️  云端同步失败: ${e.message}`);
  }
}
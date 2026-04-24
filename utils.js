import fs from 'fs';
import { Octokit } from '@octokit/rest'; // 需要安装: pnpm add @octokit/rest

/**
 * 延迟函数
 * @param {number} ms 毫秒
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取可读的时间戳用于文件名 (格式: 20260424_143005)
 */
export const getReadableTimestamp = () => {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/[-:]/g, '');
};

/**
 * 将本地截图上传到指定的 GitHub 仓库
 * @param {string} localPath 本地文件路径
 * @param {string} fileName 要在 GitHub 上保存的文件名
 */
export async function uploadToGithub(localPath, fileName) {
  const { 
    GITHUB_TOKEN, 
    GITHUB_OWNER, 
    GITHUB_REPO, 
    TARGET_DIR 
  } = process.env;

  // 如果没有配置 Token，则跳过上传（本地开发模式）
  if (!GITHUB_TOKEN || GITHUB_TOKEN.startsWith('ghp_***')) {
    console.log("ℹ️  未检测到有效的 GITHUB_TOKEN，跳过云端上传。");
    return;
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    const content = fs.readFileSync(localPath, { encoding: 'base64' });
    
    // 构造在仓库中的存储路径 (例如: error/task1/SUCCESS_20260424.png)
    const githubPath = `${TARGET_DIR || 'error'}/${fileName}`;

    console.log(`🚀 正在上传至 GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/${githubPath}`);

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: githubPath,
      message: `📸 自动截屏提交: ${fileName}`,
      content: content,
      committer: {
        name: 'Rendie-Bot',
        email: 'bot@rendie.com'
      },
      author: {
        name: 'Rendie-Bot',
        email: 'bot@rendie.com'
      }
    });

    console.log(`✅ GitHub 上传成功！`);
  } catch (error) {
    console.error(`❌ GitHub 上传失败: ${error.message}`);
  }
}
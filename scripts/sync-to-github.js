const { Octokit } = require("octokit");
const fs = require("fs");
const path = require("path");

// 配置参数
const CONFIG = {
  token: process.env.GITHUB_TOKEN,
  owner: "你的用户名", // 例如: your-github-handle
  repo: "仓库名",     // 例如: rendie-data
  branch: "main",
  localDir: path.join(process.cwd(), "sqlite3"), // 本地读取目录
  targetDir: "database", // 仓库中的目标目录
};

const octokit = new Octokit({ auth: CONFIG.token });

async function syncFiles() {
  try {
    console.log("🚀 开始同步 SQLite 目录到 GitHub...");

    // 1. 读取本地目录下的所有文件
    if (!fs.existsSync(CONFIG.localDir)) {
      console.error(`❌ 错误: 本地目录 ${CONFIG.localDir} 不存在`);
      return;
    }

    const files = fs.readdirSync(CONFIG.localDir);
    
    for (const fileName of files) {
      const localFilePath = path.join(CONFIG.localDir, fileName);
      const stats = fs.statSync(localFilePath);

      // 只处理文件，跳过文件夹
      if (!stats.isFile()) continue;

      const githubPath = `${CONFIG.targetDir}/${fileName}`;
      console.log(`正在处理: ${fileName}...`);

      // 2. 获取文件的 SHA (如果文件已存在，更新必须带上 SHA)
      let sha;
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner: CONFIG.owner,
          repo: CONFIG.repo,
          path: githubPath,
          ref: CONFIG.branch,
        });
        sha = data.sha;
      } catch (e) {
        // 文件不存在则 sha 为空，视为新增
      }

      // 3. 读取内容并转为 Base64
      const fileBuffer = fs.readFileSync(localFilePath);
      const contentBase64 = fileBuffer.toString("base64");

      // 4. 上传/更新到 GitHub
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        path: githubPath,
        message: `chore: 自动同步数据库文件 ${fileName} [skip ci]`,
        content: contentBase64,
        sha: sha, // 如果是更新，这个参数至关重要
        branch: CONFIG.branch,
      });

      console.log(`✅ 已成功推送: ${githubPath}`);
    }

    console.log("🎉 所有文件同步完成！");
  } catch (error) {
    console.error("❌ 同步过程中发生错误:", error.message);
    process.exit(1);
  }
}

syncFiles();
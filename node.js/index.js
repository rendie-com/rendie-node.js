import { initApp, runMonitor } from './common.js';

async function main() {
  try {
    await initApp();
    await runMonitor();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();
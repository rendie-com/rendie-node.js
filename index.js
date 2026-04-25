import { initApp, runMonitor } from './common.js';

async function main() {
  await initApp();
  await runMonitor();
}

main();
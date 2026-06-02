'use strict';
import { chromium } from 'playwright';
import { state, isCI } from './config.mjs';
import path from 'path';

export async function ensurePage() {
  if (state.page && !state.page.isClosed()) return state.page;
  const userDataDir = path.resolve('./.rendie_chrome_profile');
  const pluginDir = path.resolve('../chrome-extension');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${pluginDir}`,
      `--load-extension=${pluginDir}`,
      '--disable-blink-features=AutomationControlled',
      '--enable-automation=false',
      '--disable-web-security',
      ...(isCI ? ['--disable-dev-shm-usage', '--disable-setuid-sandbox'] : [])
    ]
  });

  state.page = context.pages()[0] || await context.newPage();
  return state.page;
}
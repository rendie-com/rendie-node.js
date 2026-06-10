'use strict';

export const proxy = {
    isProxyEnabled: false,
    defaultPac: 'function FindProxyForURL(url, host) { return "SOCKS5 127.0.0.1:10809; DIRECT"; }',

    // 1. 初始化入口（保持 init 命名与结构，通过原生事件与无条件垫底双重保障时序）
    init() {
        // 绑定点击事件：点击时实时查询底层状态切换，防止状态倒挂
        chrome.action.onClicked.addListener(() => {
            chrome.proxy.settings.get({ incognito: false }, (details) => {
                const isOn = (details && details.value && details.value.mode === 'pac_script');
                if (isOn) {
                    this.disable();
                } else {
                    this.enable(this.defaultPac);
                }
            });
        });

        // 监听浏览器启动事件：开机瞬间立刻去查状态并强行画字
        chrome.runtime.onStartup.addListener(() => {
            this.checkAndRefreshUI();
        });

        //首次安装或点击扩展页面刷新按钮时触发
        chrome.runtime.onInstalled.addListener(() => {
            this.checkAndRefreshUI();
        });

        // 核心关键：每次 Service Worker 一睁眼，无条件垫底强刷一次 UI，确保图标绝不漏画
        this.checkAndRefreshUI();
    },

    // 2. 检查底层代理状态并强制同步绘制 UI
    checkAndRefreshUI() {
        chrome.proxy.settings.get({ incognito: false }, (details) => {
            const lastStateWasOn = (details && details.value && details.value.mode === 'pac_script');
            this.isProxyEnabled = lastStateWasOn;

            // 连发同步指令，不使用回调嵌套，不给 Chrome 偷懒的机会
            chrome.action.setBadgeText({ text: lastStateWasOn ? 'ON' : 'OFF' });
            chrome.action.setBadgeBackgroundColor({ color: lastStateWasOn ? '#4CAF50' : '#999999' });
            chrome.action.setTitle({ title: `代理: ${lastStateWasOn ? '已开启' : '已关闭'}` });
        });
    },

    // 3. 开启代理
    enable(pacScript, next) {
        const config = { mode: "pac_script", pacScript: { data: pacScript } };
        chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
            this.checkAndRefreshUI();
            if (next) next();
        });
    },

    // 4. 关闭代理
    disable(next) {
        chrome.proxy.settings.clear({ scope: 'regular' }, () => {
            this.checkAndRefreshUI();
            if (next) next();
        });
    }
}

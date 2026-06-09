'use strict';

export const proxy = {
    isProxyEnabled: false,

    // 1. 初始化入口（绑定点击事件、启动事件）
    init() {
        chrome.action.onClicked.addListener(() => {
            if (this.isProxyEnabled) {
                this.disable();
            } else {
                const defaultPac = 'function FindProxyForURL(url, host) { return "SOCKS5 127.0.0.1:10808; SOCKS 127.0.0.1:10808; DIRECT"; }';
                this.enable(defaultPac);
            }
        });

        // 监听浏览器启动，重置状态
        chrome.runtime.onStartup.addListener(() => this.disable());
        this.updateUI(this.isProxyEnabled);
    },

    // 2. 开启代理
    enable(pacScript, next) {
        const config = { mode: "pac_script", pacScript: { data: pacScript } };
        chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
            this.updateUI(true);
            if (next) next();
        });
    },

    // 3. 关闭代理（原 disable 与 disableProxy 合并）
    disable(next) {
        chrome.proxy.settings.clear({ scope: 'regular' }, () => {
            this.updateUI(false);
            if (next) next();
        });
    },

    // 4. 更新图标 UI 状态 (支持缩写判定)
    updateUI(isOn) {
        this.isProxyEnabled = isOn;
        chrome.action.setBadgeText({ text: isOn ? 'ON' : 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: isOn ? '#4CAF50' : '#999999' }); // 修复了原代码关闭时误用绿色的问题
        chrome.action.setTitle({ title: `代理: ${isOn ? '已开启' : '已关闭'}` });
    }
}

// 确保在扩展安装或更新时重置状态
chrome.runtime.onInstalled.addListener(() => proxy.disable());
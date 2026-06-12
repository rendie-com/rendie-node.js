'use strict';
export const proxy = {
    isProxyEnabled: false,

    // PAC 脚本：内置本地数组控制，精准匹配与通配符双管齐下
    defaultPac: 'function FindProxyForURL(url, host) { var directHosts = ["localhost", "127.0.0.1", "[::1]", "::1", "10.168.1.159"]; if (directHosts.indexOf(host) !== -1 || shExpMatch(host, "*.alicdn.com") || shExpMatch(host, "*.shopee.cn") || shExpMatch(host, "*.1688.com")) { return "DIRECT"; } return "SOCKS5 127.0.0.1:10809; DIRECT"; }',
    // ==========================================
    // 1. 核心初始化入口
    // ==========================================
    async init() {
        chrome.action.onClicked.addListener(async () => {
            const isNowOn = await this.getSystemProxyState();
            if (isNowOn) {
                await this.disable();
            } else {
                await this.enable(this.defaultPac);
            }
        });

        chrome.runtime.onStartup.addListener(() => this.syncUI());
        chrome.runtime.onInstalled.addListener(() => this.syncUI());

        await this.syncUI();
    },

    // ==========================================
    // 2. 核心原子操作
    // ==========================================
    enable(pacScript) {
        return new Promise((resolve) => {
            const config = { mode: "pac_script", pacScript: { data: pacScript } };
            chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
                this.updateUI(true);
                resolve();
            });
        });
    },

    disable() {
        return new Promise((resolve) => {
            chrome.proxy.settings.clear({ scope: 'regular' }, () => {
                this.updateUI(false);
                resolve();
            });
        });
    },

    // ==========================================
    // 3. 状态同步与渲染管道
    // ==========================================
    async syncUI() {
        const isSystemProxyOn = await this.getSystemProxyState();
        this.updateUI(isSystemProxyOn);
    },

    updateUI(isOn) {
        this.isProxyEnabled = isOn;
        chrome.action.setBadgeText({ text: isOn ? 'ON' : 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: isOn ? '#4CAF50' : '#999999' });
        chrome.action.setTitle({ title: `代理: ${isOn ? '已开启' : '已关闭'}` });
    },

    getSystemProxyState() {
        return new Promise((resolve) => {
            chrome.proxy.settings.get({ incognito: false }, (details) => {
                const isPac = !!(details && details.value && details.value.mode === 'pac_script');
                resolve(isPac);
            });
        });
    }
}
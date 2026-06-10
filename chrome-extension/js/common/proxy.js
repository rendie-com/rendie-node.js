'use strict';

/**
 * 工业级代理控制器 - 采用扁平化与原子化设计
 */
export const proxy = {
    isProxyEnabled: false,
    defaultPac: 'function FindProxyForURL(url, host) { return "SOCKS5 127.0.0.1:10809; DIRECT"; }',

    // ==========================================
    // 1. 核心初始化入口
    // ==========================================
    async init() {
        // 绑定点击事件：点击时一键切换
        chrome.action.onClicked.addListener(async () => {
            const isNowOn = await this.getSystemProxyState();
            if (isNowOn) {
                await this.disable();
            } else {
                await this.enable(this.defaultPac);
            }
        });

        // 绑定生命周期事件（开机与安装/刷新）
        chrome.runtime.onStartup.addListener(() => this.syncUI());
        chrome.runtime.onInstalled.addListener(() => this.syncUI());

        // 睁眼无条件同步一次状态
        await this.syncUI();
    },

    // ==========================================
    // 2. 核心原子操作 (Core Atomic Operations)
    // ==========================================

    /**
     * 开启代理 (支持 Promise 的异步等待)
     */
    enable(pacScript) {
        return new Promise((resolve) => {
            const config = { mode: "pac_script", pacScript: { data: pacScript } };
            chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
                this.updateUI(true);
                resolve();
            });
        });
    },

    /**
     * 关闭代理 (支持 Promise 的异步等待)
     */
    disable() {
        return new Promise((resolve) => {
            chrome.proxy.settings.clear({ scope: 'regular' }, () => {
                this.updateUI(false);
                resolve();
            });
        });
    },

    // ==========================================
    // 3. 状态同步与渲染管道 (UI & State Pipeline)
    // ==========================================

    /**
     * 从 Chrome 底层强制同步状态到 UI
     */
    async syncUI() {
        const isSystemProxyOn = await this.getSystemProxyState();
        this.updateUI(isSystemProxyOn);
    },

    /**
     * 纯粹的 UI 渲染函数 (原子化，不夹杂任何业务判断)
     */
    updateUI(isOn) {
        this.isProxyEnabled = isOn;
        
        // 连发同步指令，直接消灭文字漏画的可能
        chrome.action.setBadgeText({ text: isOn ? 'ON' : 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: isOn ? '#4CAF50' : '#999999' });
        chrome.action.setTitle({ title: `代理: ${isOn ? '已开启' : '已关闭'}` });
    },

    /**
     * 工具函数：将 Chrome 复杂的底层返回结构扁平化为纯布尔值
     */
    getSystemProxyState() {
        return new Promise((resolve) => {
            chrome.proxy.settings.get({ incognito: false }, (details) => {
                const isPac = !!(details && details.value && details.value.mode === 'pac_script');
                resolve(isPac);
            });
        });
    }
}
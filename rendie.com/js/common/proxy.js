'use strict';
export const proxy = {
    isInstall: false, isProxyEnabled: false,
    enable: function (pacScript, next) {
        const config = {
            mode: "pac_script",
            pacScript: {
                data: pacScript
            }
        }, This = this;
        // 调用 Chrome 代理设置接口
        chrome.proxy.settings.set(
            { value: config, scope: 'regular' },
            () => {
                //console.log("接口调用成功: 代理已开启");
                This.updateUI(true);
                next()
            }
        );
        if (!this.isInstall) {
            this.isInstall = true;
            this.start(this);
        }
    },
    disable: function (next) {
        this.disableProxy();
        next()
    },
    start: function (This) {
        // 浏览器启动或插件重载时，强制重置为关闭状态
        // 保证状态一致性
        chrome.runtime.onStartup.addListener(() => {
            This.isProxyEnabled = false;
            This.disableProxy();
        });
        chrome.runtime.onInstalled.addListener(() => {
            isProxyEnabled = false;
            This.disableProxy();
        });
    },
    disableProxy: function () {
        let This = this;
        // 调用 Chrome 代理清除接口
        chrome.proxy.settings.clear(
            { scope: 'regular' },
            () => {
                //console.log("接口调用成功: 代理已关闭");
                This.updateUI(false);
            }
        );
    },
    // 更新图标 UI 状态 (视觉反馈)
    updateUI: function (isOn) {
        this.isProxyEnabled = isOn;
        if (isOn) {
            chrome.action.setBadgeText({ text: 'ON' });
            chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // 绿色
        } else {
            chrome.action.setBadgeText({ text: null });
            //chrome.action.setBadgeBackgroundColor({ color: '#999999' }); // 灰色
        }
    }
}
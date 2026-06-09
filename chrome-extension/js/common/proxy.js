'use strict';

export const proxy = {
    isInstall: false, 
    isProxyEnabled: false,

    init: function () {
        const This = this;
        chrome.action.onClicked.addListener(() => {
            if (This.isProxyEnabled) {
                // 如果当前是开启状态，点击则关闭
                This.disable(() => {
                    console.log("通过点击图标：代理已关闭");
                });
            } else {
                const defaultPac = `
                    function FindProxyForURL(url, host) {
                        return "SOCKS5 127.0.0.1:10808; SOCKS 127.0.0.1:10808; DIRECT";
                    }
                `;
                This.enable(defaultPac, () => {
                    console.log("通过点击图标：代理已开启");
                });
            }
        });

        // 注册开机或重启的重置逻辑
        this.start();
    },

    enable: function (pacScript, next) {
        const config = {
            mode: "pac_script",
            pacScript: {
                data: pacScript
            }
        };
        const This = this;
        
        chrome.proxy.settings.set(
            { value: config, scope: 'regular' },
            () => {
                This.updateUI(true);
                if (typeof next === 'function') next();
            }
        );
    },

    disable: function (next) {
        this.disableProxy(next);
    },

    start: function () {
        const This = this;
        // 浏览器启动时，强制重置状态，保证幂等性
        chrome.runtime.onStartup.addListener(() => {
            This.isProxyEnabled = false;
            This.disableProxy();
        });
    },

    disableProxy: function (next) {
        const This = this;
        chrome.proxy.settings.clear(
            { scope: 'regular' },
            () => {
                This.updateUI(false);
                if (typeof next === 'function') next();
            }
        );
    },

    // 更新图标 UI 状态与按钮级联动
    updateUI: function (isOn) {
        this.isProxyEnabled = isOn;
        if (isOn) {
            // 开启状态：绿色 ON 标签
            chrome.action.setBadgeText({ text: 'ON' });
            chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); 
            chrome.action.setTitle({ title: "Rendie 代理中心: 已开启" });
        } else {
            // 关闭状态：清除标签，显示灰色提示
            chrome.action.setBadgeText({ text: '' }); 
            chrome.action.setTitle({ title: "Rendie 代理中心: 已关闭" });
        }
    }
};

// 确保在扩展生命周期顶级同步注册安装监听器
chrome.runtime.onInstalled.addListener(() => {
    proxy.isProxyEnabled = false;
    proxy.disableProxy();
});
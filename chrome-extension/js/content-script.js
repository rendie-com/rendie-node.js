'use strict';

(function () {
    window.addEventListener("message", function (e) {
        // 1. 过滤消息
        if (!e.data || e.data.cmd !== 'content-script-rendie-com') return;

        // 2. 检查插件环境是否已失效
        if (!chrome.runtime || !chrome.runtime.id) {
            // 环境失效，直接回传错误给前端 gg.Return，不报控制台错误
            window.postMessage({
                cmd: "return-rendie-com",
                return: { status: "error", msg: "extension_context_invalidated" }
            }, '*');
            return;
        }

        try {
            // 3. 业务转发：所有 action（包括 isRD）都统一发送给 background
            chrome.runtime.sendMessage(e.data, function (r) {
                if (chrome.runtime.lastError) {
                    // 后台通信异常，回传错误状态
                    window.postMessage({
                        cmd: "return-rendie-com",
                        return: { status: "error", msg: chrome.runtime.lastError.message }
                    }, '*');
                } else {
                    // 正常返回数据给网页端的 gg.Return
                    window.postMessage({ return: r, cmd: "return-rendie-com" }, '*');
                }
            });
        } catch (err) {
            // 捕获同步异常（如发送瞬间插件刚好被关闭），回传错误
            window.postMessage({
                cmd: "return-rendie-com",
                return: { status: "error", msg: err.message }
            }, '*');
        }
    }, false);
})();
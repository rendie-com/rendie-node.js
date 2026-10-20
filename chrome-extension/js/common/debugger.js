'use strict';
import { common } from './index.js';
import { common_tabs } from './tabs.js';

export const common_debugger = {
    tabs_executeScript_debugger_indexOf: {
        a01: function (index, windowId, code, htmlArr, isHighlightTab, next) {
            const oo = { index, windowId, code, htmlArr, isHighlightTab, next };
            common.ifTabs(index, windowId, this.a02, this, common.notTab, oo);
        },
        a02: function (tabId, oo) {
            const This = this, target = { tabId };
            chrome.debugger.attach(target, "1.3", async () => {
                if (chrome.runtime.lastError) return console.error("Attach 失败:", chrome.runtime.lastError.message);
                await chrome.debugger.sendCommand(target, "Network.enable");
                This.a03(This, target, oo);
            });
        },
        // a03：核心控制器
        a03: function (This, target, oo) {
            const requestMap = new Map();
            let isFinished = false;

            const cleanup = () => {
                if (isFinished) return false;
                isFinished = true;
                if (timeoutTimer) clearTimeout(timeoutTimer);
                chrome.debugger.onEvent.removeListener(onDebuggerEvent);
                chrome.debugger.detach(target, () => {
                    //console.log("[Debugger] 调试器已解绑关闭")
                });
                return true;
            };

            // 30秒超时保护
            const timeoutTimer = setTimeout(() => cleanup() && This.a08("", oo), 30000);

            const onDebuggerEvent = (source, method, params) => {
                if (source.tabId !== target.tabId || isFinished) return;

                if (method === "Network.requestWillBeSent") {
                    This.a04(This, params, requestMap, oo);
                } else if (method === "Network.responseReceived" || method === "Network.loadingFinished") {
                    This.a05(This, method, params, target, requestMap, (resBody) => {
                        if (cleanup()) This.a08(resBody, oo);
                    });
                } else if (method === "Network.loadingFailed") {
                    requestMap.delete(params.requestId);
                }
            };

            chrome.debugger.onEvent.addListener(onDebuggerEvent);
            common_tabs.executeScript.a01(oo.index, oo.windowId, oo.code);
        },
        // a04：捕获请求发出
        a04: function (This, params, requestMap, oo) {
            const url = params.request.url || "";
            let rawPostData = params.request.postData || (params.request.postDataEntries ? params.request.postDataEntries.map(e => e.bytes || "").join("") : "");

            let postData = rawPostData;
            try { if (rawPostData) postData = decodeURIComponent(rawPostData); } catch { }

            if (This.b01(url, postData, oo.htmlArr)) {
                requestMap.set(params.requestId, { url, postData, responseReceived: false });
            }
        },
        // a05：捕获响应头与响应体
        a05: function (This, method, params, target, requestMap, onSuccess) {
            const reqInfo = requestMap.get(params.requestId);
            if (!reqInfo) return;

            if (method === "Network.responseReceived") {
                reqInfo.responseReceived = true;
            } else if (method === "Network.loadingFinished" && reqInfo.responseReceived) {
                requestMap.delete(params.requestId);
                This.a06(params.requestId, target, (resBody) => {
                    This.a07(resBody, onSuccess);
                });
            }
        },
        // a06：底层 CD 命令，原样提取内容
        a06: function (requestId, target, callback) {
            chrome.debugger.sendCommand(target, "Network.getResponseBody", { requestId }, (res) => {
                if (chrome.runtime.lastError) {
                    console.warn("获取响应体失败:", chrome.runtime.lastError.message);
                    return callback("");
                }
                callback(res ? (res.body || "") : "");
            });
        },
        // a07：响应体透传/预处理层
        a07: function (resBody, callback) {
            callback(resBody);
        },
        // a08：返回处理
        a08: function (t, oo) {
            if (oo.isHighlightTab) {
                chrome.tabs.highlight({ tabs: 0, windowId: oo.windowId }, () => oo.next(t));
            } else {
                oo.next(t);
            }
        },
        // b01：校验匹配规则
        b01: (url, postData, htmlArr) => htmlArr.some(item =>
            url.includes(item.url) && (!item.postData || (postData && postData.includes(item.postData)))
        )
    }
};
'use strict';
import { common } from './index.js';

export const tabs_remove_create_debugger_indexOf = {
    a01: function (index, windowId, url, htmlArr, isHighlightTab, next) {
        common.tabs_remove(index, windowId, this.a02, this, {
            index,
            windowId,
            url,
            htmlArr,
            isHighlightTab,
            next
        })//删除【index】选项卡，直到找不到【index】为止
    },
    a02: function (oo) {
        common.tabs_create(oo.index, oo.windowId, oo.url, this.a03, this, oo)//创建【index】选项卡，直到找到【index】为止
    },
    a03: function (tabId, oo) {
        const This = this, target = { tabId };
        chrome.debugger.attach(target, "1.3", async () => {
            if (chrome.runtime.lastError) return console.error("Attach 失败:", chrome.runtime.lastError.message);
            await chrome.debugger.sendCommand(target, "Network.enable");
            This.a04(This, target, oo);
        });
    },
    a04: function (This, target, oo) {
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
        const timeoutTimer = setTimeout(() => cleanup() && This.a09("", oo), 30000);
        const onDebuggerEvent = (source, method, params) => {
            if (source.tabId !== target.tabId || isFinished) return;
            if (method === "Network.requestWillBeSent") {
                This.a05(This, params, requestMap, oo);
            } else if (method === "Network.responseReceived" || method === "Network.loadingFinished") {
                This.a06(This, method, params, target, requestMap, (resBody) => {
                    if (cleanup()) This.a09(resBody, oo);
                });
            } else if (method === "Network.loadingFailed") {
                requestMap.delete(params.requestId);
            }
        };
        chrome.debugger.onEvent.addListener(onDebuggerEvent);
    },
    //捕获请求发出
    a05: function (This, params, requestMap, oo) {
        const url = params.request.url || "";
        const rawPostData = params.request.postData || (params.request.postDataEntries ? params.request.postDataEntries.map(e => e.bytes || "").join("") : "");
        if (This.b01(url, rawPostData, oo.htmlArr)) {
            requestMap.set(params.requestId, { url, rawPostData, responseReceived: false });
        }
    },
    //捕获响应头与响应体
    a06: function (This, method, params, target, requestMap, onSuccess) {
        const reqInfo = requestMap.get(params.requestId);
        if (!reqInfo) return;
        if (method === "Network.responseReceived") {
            reqInfo.responseReceived = true;
        } else if (method === "Network.loadingFinished" && reqInfo.responseReceived) {
            requestMap.delete(params.requestId);
            This.a07(params.requestId, target, (resBody) => {
                This.a08(resBody, onSuccess);
            });
        }
    },
    //底层 CD 命令，原样提取内容
    a07: function (requestId, target, callback) {
        chrome.debugger.sendCommand(target, "Network.getResponseBody", { requestId }, (res) => {
            if (chrome.runtime.lastError) {
                console.warn("获取响应体失败:", chrome.runtime.lastError.message);
                return callback("");
            }
            callback(res ? (res.body || "") : "");
        });
    },
    //响应体透传/预处理层
    a08: function (resBody, callback) {
        callback(resBody);
    },
    //返回处理
    a09: function (t, oo) {
        if (oo.isHighlightTab) {
            chrome.tabs.highlight({ tabs: 0, windowId: oo.windowId }, () => oo.next(t));
        } else {
            oo.next(t);
        }
    },
    ////////////////////////////////////////////////////////////////////////////////////
    //校验匹配规则
    b01: (url, postData, htmlArr) => htmlArr.some(item =>
        url.includes(item.url) && (!item.postData || (postData && postData.includes(item.postData)))
    ),
};
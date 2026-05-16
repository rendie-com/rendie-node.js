//background.js
'use strict';
import { common } from './common/index.js';
import { proxy } from './common/proxy.js';
import { common_fetch } from './common/fetch.js';
import { common_cookies } from './common/cookies.js';
import { common_tabs } from './common/tabs.js';
import { common_uploadFile } from './common/uploadFile.js';
export const index =
{
    screenshot: "",//截图的图片，暂时存放在这。
    a01: function () {
        let This = this;
        chrome.runtime.onMessage.addListener(function (request, sender, next) {
            if (request.cmd == 'content-script-rendie-com')//表是只接收【content-script】的信息。
            {
                //console.log('【rendie/js/background.js】收到消息', request);
                switch (request.id) {
                    case "load_screenshot": next(This.screenshot); break;
                    case "close_screenshot_window": This.c01(next); break;
                    case "isOpenDevtools": common_tabs.isOpenDevtools = true; next(); break;//是否已打开Devtools页面。
                    case "isOnRequestFinished": common_tabs.isOnRequestFinished = true; next(); break;//已打开监听器。
                    case "isRD": next(true); break;
                    default: This.d01(request, next); break;
                }
            }
            return true;//注：不写这个会出错，内容为【Unchecked runtime.lastError: The message port closed before a response was received.】
        });
        this.a02(This)
    },
    a02: function (This) {
        chrome.action.onClicked.addListener(function (tab) {
            //console.log("扩展图标被点击了!");
            chrome.tabs.captureVisibleTab({
                format: "png"
            }, function (t) {
                This.screenshot = t;
                This.a03()
            })
        });
    },
    a03: function () {
        chrome.tabs.create({
            url: chrome.runtime.getURL("screenshot/screenshot.html")
        })
    },
    /////////////////////////
    c01: function (next) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.remove(tabs[0].id, function () {
                next()
            });
        });
    },
    /////////////////////////////////////////////
    d01: function (request, next) {
        switch (request.action) {
            /////////////js/common/tabs.js 开始////////////////////////////////
            case "tabs_remove_create_indexOf"://删除后创建再查找(返回网页内容)
                common_tabs.tabs_remove_create_indexOf.a01(request.index, request.windowId, request.url, request.htmlArr, request.isHighlightTab, next);
                break;
            case "tabs_remove_create_devtools_indexOf"://删除后创建再查找(返回网页内容)  --- 要打开“开发者工具“ 
                common_tabs.tabs_remove_create_devtools_indexOf.a01(request.index, request.windowId, request.url, request.htmlArr, request.isHighlightTab, next);
                break;
            case "tabs_executeScript_indexOf"://执行js代码后再找内容(返回网页内容)
                common_tabs.tabs_executeScript_indexOf.a01(request.index, request.windowId, request.fileArr, request.code, request.htmlArr, request.isHighlightTab, next);
                break;
            case "tabs_executeScript_devtools_indexOf"://执行js代码后再找内容(返回网页内容) --- 要打开“开发者工具“ 
                common_tabs.tabs_executeScript_devtools_indexOf.a01(request.index, request.windowId, request.fileArr, request.code, request.htmlArr, request.isHighlightTab, next);
                break;
            //case "tabs_executeScript": //执行js代码(立马返回值取到的内容) 
            //     Tool.tabs_executeScript.a01(request.index, request.windowId, request.fileArr, request.code, request.isHighlightTab, next);
            //     break;
            ///////////js/common/tabs.js 结束/////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////
            ///////////common_cookies.js  开始//////////////////////////////////////////////////
            case "delAllCookies": common_cookies.delAllCookies(request.urlArr, next); break;//删除所有cookie信息
            case "setAllCookies": common_cookies.setAllCookies(request.cookiesArr, next); break;//设置所有cookie信息
            case "getAllCookies": common_cookies.getAllCookies(request.urlArr, [], next); break;//获取所有cookie信息
            case "getCookies": common_cookies.getCookies(request.url, request.name, request.partitionKey, next); break;//获取单个cookie信息----(注：这里多了一个【partitionKey】，有的不加这个获取不到值)
            // //case "setCookies": Tool.setCookies(request); break;//设置单个cookie信息
            case "delCookies": common_cookies.delCookies(request.url, request.name, next); break;//删除单个cookie信息
            // //////////common_cookies.js  结束//////////////////////////////////////////////////////////
            // ////////////////////////////////////////////////////////
            case "getFetch": common_fetch.getFetch(request.url, request.type, next); break;//获取URL内容
            case "getHeadersFetch": common_fetch.getHeadersFetch(request.url, request.headersObj, request.type, next); break;//获取URL内容
            case "postHeadersFetch": common_fetch.postHeadersFetch(request.url, request.headersObj, request.data, request.type, next); break;//获取URL内容
            case "postFetch": common_fetch.postFetch(request.url, request.data, next); break;//普通提交（返回的内容不一定是json格式
            case "typeFetch": common_fetch.typeFetch(request.url, request.type, request.data, next); break;//指定类型提交
            // case "download": Tool.download(request.url, request.filename, next); break; //下载文件---------已验证
            case "uploadFile": common_uploadFile.uploadFile.a01(request.url, request.type, request.headers, request.data, next); break;//上传文件------已验证
            case "highlightTab": common.highlightTab.a01(request.index, request.windowId, next); break;//高亮tab------已验证
            // case "notifications": Tool.notifications(request.title, request.message, request.iconUrl, next); break;//通知------已验证
            case "enableProxy": proxy.enable(request.pacScript, next); break;//开启代理
            case "disableProxy": proxy.disable(next); break;//关闭代理
            default: next({
                status: "error",
                data: "在【background.js】找不到方法名：" + request.action
            });
        }
    },
}
index.a01();
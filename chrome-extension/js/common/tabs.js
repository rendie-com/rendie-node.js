//tabs.js
'use strict';
import { common } from './index.js';
export const common_tabs = {
    isHighlightTab: function (r, isHighlightTab, windowId, next) {
        if (isHighlightTab) {
            chrome.tabs.highlight({ tabs: 0, windowId: windowId }, function ()//设置第一个【高亮tab】---这样执行速度快
            {
                next(r);
            });
        }
        else { next(r); }
    },
    ///////执行JS后再找内容////////////////////////////////////////
    tabs_executeScript_indexOf: {
        a01: function (index, windowId, code, htmlArr, isHighlightTab, next) {
            common_tabs.executeScript.a01(index, windowId, code, this.a02, this, {
                index,
                windowId,
                htmlArr,
                isHighlightTab,
                next
            })//执行JS
        },
        a02: function (t, oo) {
            common.Time("name", 100, this.a03, this, oo);
        },
        a03: function (oo) {
            common.tabs_indexOf.a01(oo.index, oo.windowId, oo.htmlArr, this.a04, this, oo)//查找
        },
        a04: function (t, oo) {
            common_tabs.isHighlightTab(t, oo.isHighlightTab, oo.windowId, oo.next);
        },
    },
    ///////执行JS后再找内容////////////////////////////////////////
    tabs_executeScript_param_indexOf: {
        a01: function (index, windowId, param, htmlArr, isHighlightTab, next) {
            common_tabs.executeScript_param.a01(index, windowId, param, this.a02, this, {
                index,
                windowId,
                htmlArr,
                isHighlightTab,
                next
            })//执行JS
        },
        a02: function (t, oo) {
            common.Time("name", 100, this.a03, this, oo);
        },
        a03: function (oo) {
            common.tabs_indexOf.a01(oo.index, oo.windowId, oo.htmlArr, this.a04, this, oo)//查找
        },
        a04: function (t, oo) {
            common_tabs.isHighlightTab(t, oo.isHighlightTab, oo.windowId, oo.next);
        },
    },
    ////////////////////////////////////////////////////////////////////////
    tabs_remove_create_indexOf: {
        a01: function (index, windowId, url, htmlArr, isHighlightTab, next) {
            let oo = {
                index: index,
                windowId: windowId,
                url: url,
                htmlArr: htmlArr,
                isHighlightTab: isHighlightTab,
                next: next
            }
            common.tabs_remove(index, windowId, this.a02, this, oo)//删除【index】选项卡，直到找不到【index】为止
        },
        a02: function (oo) {
            common.tabs_create(oo.index, oo.windowId, oo.url, this.a03, this, oo)//创建【index】选项卡，直到找到【index】为止
        },
        a03: function (id, oo) {
            if (oo.htmlArr) {
                common.Time("name", 50, this.a04, this, oo);
            }
            else {
                let This = this;
                let handleUpdated = function (tabId, changeInfo, tab) {
                    if (changeInfo.status == 'complete') {
                        // 移除监听器
                        chrome.tabs.onUpdated.removeListener(handleUpdated);
                        common.tabs_indexOf.a01(oo.index, oo.windowId, false, This.a05, This, oo)//查找
                    }
                }
                //没填html属性，就是面页加载完就返回
                chrome.tabs.onUpdated.addListener(handleUpdated);
            }
        },
        a04: function (oo) {
            common.tabs_indexOf.a01(oo.index, oo.windowId, oo.htmlArr, this.a05, this, oo)//查找
        },
        a05: function (t, oo) {
            if (oo.isHighlightTab) {
                chrome.tabs.highlight({ tabs: 0, windowId: oo.windowId }, function ()//设置第一个【高亮tab】---这样执行速度快
                {
                    oo.next(t);
                });
            } else { oo.next(t); }
        },

    },
    executeScript: {
        a01: function (index, windowId, code, next, This, t) {
            common.ifTabs(index, windowId, this.a02, this, common.notTab, {
                code: code,
                next: next,
                This: This,
                t: t
            })
        },
        a02: function (id, oo) {
            chrome.scripting.executeScript({
                target: { tabId: id },
                function: function (code) { return eval(code); },
                args: [oo.code], // 传递给func的参数数组
                world: 'MAIN' // 可以是 'MAIN' 或者 'ISOLATED'
            }, (injectionResults) => {
                if (oo.next) common.apply(injectionResults[0].result, oo.next, oo.This, oo.t)
            });
        },
    },
    executeScript_param: {
        a01: function (index, windowId, param, next, This, t) {
            common.ifTabs(index, windowId, this.a02, this, common.notTab, {
                param,
                next,
                This,
                t
            })
        },
        a02: function (tabId, oo) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (paramObj) => { window.__MY_PLUGIN_CONFIG__ = paramObj; },
                args: [oo.param]
            });
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["js/self.js"]
            });
        },
    },
}
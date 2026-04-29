'use strict';
export const common = {
    TimeNameArr: [],//定时器名称
    Time: function (name, time, next, This, t) {//延时执行  
        if (this.TimeNameArr[name]) {
            clearTimeout(this.TimeNameArr[name]);
            delete this.TimeNameArr[name];
        };
        //setTimeout() 方法用于在指定的毫秒数后调用函数或计算表达式。
        this.TimeNameArr[name] = setTimeout(function () {
            if (t == undefined) {
                next.apply(This);
            }
            else { next.apply(This, [t]); }
        }, time);
    },
    apply: function (data, next, This, t) {
        if (t) { next.apply(This, [data, t]); }
        else { next.apply(This, [data]); }
    },
    //大于【index】，则删除。注：【index】从1开始。
    tabs_remove: function (index, windowId, next, This, t)//删除【index】选项卡，直到找不到【index】为止
    {
        chrome.tabs.query({ index: index - 1, windowId: windowId }, function (tabs)//我要的【选项卡】是否存在，如果存在，则删除。
        {
            if (tabs.length == 0) {
                next.apply(This, [t]);
            }
            else {
                chrome.tabs.remove(tabs[0].id, function () {
                    common.tabs_remove(index, windowId, next, This, t);
                });
            }
        });
    },
    //创建【index】选项卡，直到找到【index】为止。注：【index】从1开始。
    tabs_create: function (index, windowId, url, next, This, t)//创建【index】选项卡，直到找到【index】为止
    {
        chrome.tabs.query({ index: index - 1, windowId: windowId }, function (tabs) {
            if (tabs.length == 0)//没有就继续创建
            {
                chrome.tabs.create({ url: url, windowId: windowId }, function (e) {
                    common.tabs_create(index, windowId, url, next, This, t);
                });
            }
            else {
                common.apply(tabs[0].id, next, This, t);
            }
        });
    },
    ifTabs: function (index, windowId, next1, This, next2, t)//指定的【选项卡】是否存在，从而选择执行方法。
    {
        chrome.tabs.query({ index: index - 1, windowId: windowId }, function (tabs) {
            if (tabs.length == 0) {
                common.apply(index, next2, This, t)
            }
            else {
                common.apply(tabs[0].id, next1, This, t)
            }
        });
    },
    /////查找，直到找到后才返回/////////////////////////////////////////////
    tabs_indexOf: {
        a01: function (index, windowId, htmlArr, next, This, t) {
            let oo = {
                index: index,
                windowId: windowId,
                htmlArr: htmlArr,
                next: next,
                This: This,
                t: t,
                count: 0
            }
            this.a02(oo)
        },
        a02: function (oo)//查找，直到找到为止
        {
            common.ifTabs(oo.index, oo.windowId, this.a03, this, false, oo)//当选项卡不存在，就停止运行。
        },
        a03: function (id, oo)//查找，直到找到为止
        {
            chrome.scripting.executeScript({
                target: { tabId: id },
                function: function () { return document.body.parentNode.outerHTML; },
            }, (injectionResults) => {

                // 处理返回的结果
                if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                    this.a04(injectionResults[0].result, oo);
                }
                else {
                    common.Time("name", 100, this.a02, this, oo);
                }
            });
        },
        a04: function (t, oo) {
            if (oo.htmlArr) {
                let arr = oo.htmlArr, isbool = false;
                for (var i = 0; i < arr.length; i++) {
                    if (t.indexOf(arr[i]) != -1) { isbool = true; break; }
                }
                if (isbool) {
                    common.apply(t, oo.next, oo.This, oo.t)
                }
                else {
                    oo.count++
                    if (oo.count < 10 * 60) {
                        common.Time("name", 100, this.a02, this, oo);
                    }
                    else {
                        console.log("tabs_indexOf超时，60秒了还没找到。")
                    }
                }
            }
            else {
                common.apply(t, oo.next, oo.This, oo.t);
            }
        },
    },
    notTab: function (index) {
        console.log("没有【第" + index + "个选项卡】")
    },
    // 高亮tab
    highlightTab: {
        a01: function (index, windowId, next) {
            let oo = {
                index: index,
                windowId: windowId,
                next: next
            }
            common.ifTabs(index, windowId, this.a02, this, common.notTab, oo)
        },
        // 高亮tab
        a02: function (id, oo) {
            chrome.tabs.highlight({ tabs: oo.index - 1, windowId: oo.windowId }, function (t) {
                oo.next(t);
            });
        },
    },
    // 显示桌面通知
    // notifications: function (title, message, iconUrl, next) {
    //     if (typeof (message) == "string") {
    //         chrome.notifications.create(null, {
    //             type: 'basic',
    //             iconUrl: iconUrl,
    //             title: title,
    //             message: message
    //         }, function (notificationId) {
    //             next("ok")
    //         });
    //     }
    //     else {
    //         chrome.notifications.create(null, {
    //             type: 'list',
    //             iconUrl: iconUrl,
    //             title: title,
    //             //message: "填了没用",
    //             items: message
    //         }, function (notificationId) {
    //             next("ok")
    //         });
    //     }
    // },
}
////////////////////////////////////////////////////////////////////////

// // 下载文件
// download: function (url, filename, next) {
//     chrome.downloads.download({ url: url, filename: filename }, function (downloadId) {
//         next(downloadId);
//     });
// },
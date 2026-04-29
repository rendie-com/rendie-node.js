var fun =
{
    a01: function () {
        var This = this
        chrome.runtime.onMessage.addListener(function (request, sender, next) {
            //console.log('【rendie-com/devtools/index.js】收到消息',request);
            if (request.cmd == "content-script-rendie-com-devtools") {
                switch (request.action) {
                    case "onRequestFinished": This.onRequestFinished(request.htmlArr, next); break;//打开监听器，找到内容就回返。
                    default: next("出错:action=" + request.action);
                }
            }
            return true;
        });
        this.a02()
    },
    a02: function () {
        // 创建自定义面板，同一个插件可以创建多个自定义面板
        chrome.devtools.panels.create('rendie_panels', 'icons/icon16.png', 'devtools/mypanel.html');
        // 创建自定义侧边栏 https://developer.chrome.google.cn/docs/extensions/how-to/devtools/extend-devtools?hl=zh-cn
        chrome.devtools.panels.elements.createSidebarPane("rendie_panels", function (sidebar) {
            //sidebar.setPage('devtools/sidebar.html'); // 指定加载某个页面------（我没看懂）
            sidebar.setExpression('document.querySelectorAll("img")', 'All Images'); // 通过表达式来指定
            sidebar.setObject({ aaa: 111, bbb: 'Hello World!' }); // 直接设置显示某个对象
        });
        chrome.runtime.sendMessage({ cmd: "content-script-rendie-com", id: "isOpenDevtools" });//是否打开“开发者工具”---（如果那边能收到，则说明已打开。）
    },
    ////////////////////////////////////////////////
    b01: function (url, postData, content, htmlArr) {
        let isbool = false;
        for (let i = 0; i < htmlArr.length; i++) {
            if (htmlArr[i].postData) {
                //要匹配post提交内容               
                if (url.indexOf(htmlArr[i].url) != -1 && postData && decodeURIComponent(postData.text).indexOf(htmlArr[i].postData) != -1) {
                    if (htmlArr[i].content) {
                        //要匹配内容
                        if (content.indexOf(htmlArr[i].content) != -1) {
                            isbool = true; break;
                        }
                    }
                    else {
                        //不要匹配内容
                        isbool = true; break;
                    }
                }
            }
            else {
                //get提交
                if (url.indexOf(htmlArr[i].url) != -1) {
                    isbool = true; break;
                }
            }
        }
        return isbool;
    },
    ////////////////////////////////////
    onRequestFinished: function (htmlArr, next) {
        let This = this, nArr = [];
        let handleUpdated = function (request) {
            //获取请求的内容
            request.getContent((content) => {
                let isbool = This.b01(request.request.url, request.request.postData, content, htmlArr)
                if (isbool) {
                    nArr.push(JSON.parse(content));//这个数组有什么用？答：可以打开一个网页，获取多个链接的内容。
                    if (nArr.length == htmlArr.length) {
                        chrome.devtools.network.onRequestFinished.removeListener(handleUpdated);//移除监听器
                        next(nArr);
                    }
                }
            });
        }
        chrome.devtools.network.onRequestFinished.addListener(handleUpdated);//监听网络请求完成事件
        chrome.runtime.sendMessage({ cmd: "content-script-rendie-com", id: "isOnRequestFinished" });//把已打开监听器的事，告诉【tabs.js】。
    }
}
fun.a01();
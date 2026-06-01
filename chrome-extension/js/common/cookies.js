//参考：https://chrome.cenchy.com/cookies.html
'use strict';
export const common_cookies = {
    //获取所有cookie信息
    delAllCookies: function (urlArr, next) {
        let This = this;
        chrome.cookies.getAll({ url: urlArr[0] },
            function (cookies) {
                ///////////////////////////////////
                for (let i = 0; i < cookies.length; i++) {
                    chrome.cookies.remove({
                        url: urlArr[0],
                        name: cookies[i].name
                    });
                }
                /////////////////////////////////////
                urlArr.shift();
                if (urlArr.length == 0) {
                    next();
                }
                else {
                    This.delAllCookies(urlArr, next);
                }
                ///////////////////////////////////////
            }
        );
    },
    // 设置所有 cookie 信息（dataArr 有俩种参数要进来。一种是chrome扩获取的cookies,另一种是node.js中playwright获取的cookies）
    setAllCookies: function (dataArr, next) {
        // 1. 先将嵌套的 cookies 数据扁平化，方便统一遍历
        let flatCookies = [];
        dataArr.forEach(item => {
            item.cookies.forEach(cookie => {
                flatCookies.push({
                    url: item.url,
                    ...cookie
                });
            });
        });

        let total = flatCookies.length;
        let finished = 0;
        let errors = [];

        // 如果数组为空，直接返回
        if (total === 0) {
            next("设置成功（无 Cookie 需要设置）");
            return;
        }

        function processNext() {
            if (finished === total) {
                if (errors.length > 0) {
                    next("设置完成，但有部分失败：" + errors.join("; "));
                } else {
                    next("设置成功！");
                }
                return;
            }

            let cookieData = flatCookies[finished];

            // 1. 数据清理逻辑
            const getSameSite = (val) => {
                if (!val) return 'unspecified';
                const s = String(val).toLowerCase();
                // 映射常见值
                if (s === 'none') return 'no_restriction';
                if (['lax', 'no_restriction', 'strict', 'unspecified'].includes(s)) return s;
                return 'unspecified';
            };

            // 2. 严格白名单构造对象
            let cookieDetail = {
                url: cookieData.url,
                name: cookieData.name,
                value: cookieData.value,
                domain: cookieData.domain,
                path: cookieData.path,
                secure: !!cookieData.secure,
                httpOnly: !!cookieData.httpOnly,
                sameSite: getSameSite(cookieData.sameSite)
            };

            // 3. 处理过期时间 (expires 与 expirationDate 转换)
            // 如果存在 expirationDate (秒) 则优先使用
            // 如果存在 expires (秒) 且大于 0，则使用，否则忽略（避免 -1 报错）
            const exp = cookieData.expirationDate || (cookieData.expires > 0 ? cookieData.expires : null);
            if (exp) {
                cookieDetail.expirationDate = exp;
            }

            // 4. 发送设置请求
            chrome.cookies.set(cookieDetail, function (c) {
                if (chrome.runtime.lastError) {
                    console.error("设置失败: " + cookieData.name, chrome.runtime.lastError.message);
                    errors.push(`${cookieData.name}: ${chrome.runtime.lastError.message}`);
                }
                finished++;
                processNext();
            });
        }

        // 3. 开始执行
        processNext();
    },
    //获取所有cookie信息
    getAllCookies: function (urlArr, cookiesArr, next) {
        let This = this;
        chrome.cookies.getAll({ url: urlArr[0] },
            function (cookies) {
                cookiesArr.push({
                    url: urlArr[0],
                    cookies: cookies
                })
                urlArr.shift();
                //////////////////////////////
                if (urlArr.length == 0) {
                    next(cookiesArr);
                }
                else {
                    This.getAllCookies(urlArr, cookiesArr, next);
                }
            }
        );
    },
    delCookies: function (url, name, next)//删除一个cookie信息
    {
        chrome.cookies.remove({ url: url, name: name },
            function (cookies) {
                next(cookies);
            }
        );
    },
    getCookies: function (url, name, partitionKey, next)//获取一个cookie信息----(注：这里多了一个【partitionKey】，有的不加这个获取不到值)
    {
        chrome.cookies.get({
            url: url,
            name: name,
            partitionKey: partitionKey ? { topLevelSite: partitionKey } : null,
        },
            function (cookies) {
                next(cookies);
            }
        );
    },
}
////////////////////////////////////////////////////////////////////////
//setCookies: function (request)//获取一个cookie信息
//{
//    chrome.cookies.set({ url: request.url, name: request.name, value: request.value },
//        function () {
//            request.next();
//        }
//    );
//},


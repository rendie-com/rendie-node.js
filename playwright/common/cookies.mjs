'use strict';

export const cookies = {
    setAllCookies: async function (page, cookiesArr) {
        try {
            if (!Array.isArray(cookiesArr) || cookiesArr.length === 0 || !cookiesArr[0].url) {
                throw new Error("Cookie 注入失败: 参数中未包含有效的 URL");
            }

            const targetUrl = cookiesArr[0].url;
            const context = page.context();

            // 1. 创建临时窗口
            const tempPage = await context.newPage();

            // 2. 极致加速：使用 'commit' 模式
            //console.log(`🌐 正在快速激活域名环境 (Commit模式): ${targetUrl}`);
            await tempPage.goto(targetUrl, { waitUntil: 'commit' });

            // 3. 注入逻辑
            await context.clearCookies();
            const cleanCookies = cookiesArr.flatMap(group =>
                (group.cookies || []).map(ck => ({
                    name: ck.name,
                    value: String(ck.value),
                    domain: ck.domain,
                    path: ck.path || "/",
                    secure: !!ck.secure,
                    httpOnly: !!ck.httpOnly,
                    sameSite: 'Lax',
                    expires: ck.expirationDate ? Math.floor(ck.expirationDate) : undefined
                }))
            );

            if (cleanCookies.length > 0) {
                await context.addCookies(cleanCookies);
                //console.log(`✅ [后台快速注入] 成功注入 ${cleanCookies.length} 条数据`);
            }

            // 4. 关闭临时窗口
            await tempPage.close();

            return "注入完成";
        } catch (error) {
            console.error("Cookie 注入失败:", error);
            throw error;
        }
    },

    // 清除指定 URL 列表对应的 Cookie
    delAllCookies: async function (page, urlArr) {
        if (!urlArr || urlArr.length === 0) return "没有需要清除的 Cookie";
        const domains = urlArr.map(url => {
            return new URL(url).hostname;
        });
        await page.context().clearCookies({ domains: domains });
        return "指定域名的 Cookie 清除成功";
    },
    getAllCookies: async function (page, urlArr) {
        const cookieResults = await Promise.all(
            urlArr.map(async (url) => {
                const cookies = await page.context().cookies(url);
                return {
                    url: url,
                    cookies: cookies
                };
            })
        );
        return cookieResults;
    },
    getCookies: async function (page, url, name) {
        const cs = await page.context().cookies(url ? [url] : []);
        if (name) {
            const found = cs.find(c => c.name === name);
            return found ? found.value : "";
        }
        return cs.map(c => `${c.name}=${c.value}`).join('; ');
    },

    delCookies: async function (page, url, name) {
        // 增加 URL 解析异常处理
        try {
            const domain = new URL(url).hostname;
            await page.context().deleteCookies({ name: name, domain: domain });
            return "删除成功";
        } catch (e) {
            throw new Error(`删除Cookie失败: 无效的URL ${url}`);
        }
    }
};
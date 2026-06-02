'use strict';

/**
 * 💡 辅助函数：专门用来在真实的浏览器环境中动态执行 Fetch
 * 这样做不仅继承了绝对合法的浏览器 TLS/JA3 指纹，还能彻底免疫 1688 的网关直接拦截。
 */
async function executeFetchInBrowser(page, url, method, customHeaders = {}, data = null) {
    return await page.evaluate(async ({ fetchUrl, fetchMethod, headers, payload }) => {
        const options = {
            method: fetchMethod,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (payload) {
            // 如果传入了对象，自动序列化（对应原本 Playwright data 自动处理的特性）
            options.body = typeof payload === 'object' ? JSON.stringify(payload) : payload;
        }

        const res = await window.fetch(fetchUrl, options);
        
        // 获取文本内容返回，留给外部决定反序列化还是直接吐出
        const text = await res.text();
        return {
            ok: res.ok,
            status: res.status,
            responseText: text
        };
    }, { fetchUrl: url, fetchMethod: method, headers: customHeaders, payload: data });
}

export const http = {
    getFetch: async function (page, url, type = "json") {
        const result = await executeFetchInBrowser(page, url, 'GET');
        
        if (!result.ok) {
            throw new Error(`GET 失败 [${result.status}]: ${result.responseText}`);
        }
        
        return type === "json" ? JSON.parse(result.responseText) : result.responseText;
    },

    postFetch: async function (page, url, data = {}, type = "json") {
        const result = await executeFetchInBrowser(page, url, 'POST', {}, data);
        
        if (!result.ok) {
            throw new Error(`POST 失败 [${result.status}]: ${result.responseText}`);
        }
        
        return type === "json" ? JSON.parse(result.responseText) : result.responseText;
    },

    postHeadersFetch: async function (page, url, headersObj, data = {}, type = "json") {
        const result = await executeFetchInBrowser(page, url, 'POST', headersObj, data);
        
        if (!result.ok) {
            throw new Error(`POST(Headers) 失败 [${result.status}]: ${result.responseText}`);
        }
        
        return type === "json" ? JSON.parse(result.responseText) : result.responseText;
    }
};
'use strict';

async function getCompleteHeaders(page, url, customHeaders = {}) {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const origin = new URL(url).origin;
    return {
        'Cookie': cookieString,
        'Referer': origin + '/',
        'Origin': origin,
        'User-Agent': await page.evaluate(() => navigator.userAgent),
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        ...customHeaders
    };
}

export const http = {
    getFetch: async function (page, url, type = "json") {
        const response = await page.request.get(url, {
            headers: await getCompleteHeaders(page, url)
        });
        if (!response.ok()) throw new Error(`GET 失败 [${response.status()}]: ${await response.text()}`);
        return type === "json" ? await response.json() : await response.text();
    },

    postFetch: async function (page, url, data = {}, type = "json") {
        const response = await page.request.post(url, {
            headers: await getCompleteHeaders(page, url),
            data // Playwright 会自动识别 content-type 并序列化
        });
        if (!response.ok()) throw new Error(`POST 失败 [${response.status()}]: ${await response.text()}`);
        return type === "json" ? await response.json() : await response.text();
    },

    postHeadersFetch: async function (page, url, headersObj, data = {}, type = "json") {
        const response = await page.request.post(url, {
            headers: await getCompleteHeaders(page, url, headersObj),
            data
        });
        if (!response.ok()) throw new Error(`POST(Headers) 失败 [${response.status()}]: ${await response.text()}`);
        return type === "json" ? await response.json() : await response.text();
    }
};
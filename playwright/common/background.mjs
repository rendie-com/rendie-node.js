'use strict';
import { state } from '../config.mjs';
import { cookies } from './cookies.mjs';
import { http } from './fetch.mjs';
import { tabs } from './tabs.mjs';

export const background = {
    a01: async function (request) {
        // 使用 state.page 获取当前激活页面
        const p = state.page;
        if (!p || p.isClosed()) throw new Error("页面已关闭");

        switch (request.action) {
            case "isRD": return { status: 'success', data: true }; 
            // COOKIES 模块：显式传入 p
            case "setAllCookies": return await cookies.setAllCookies(p, request.cookiesArr);
            case "delAllCookies": return await cookies.delAllCookies(p, request.urlArr);
            case "getAllCookies": return await cookies.getAllCookies(p, request.urlArr);
            case "getCookies": return await cookies.getCookies(p, request.url, request.name);
            case "delCookies": return await cookies.delCookies(p, request.url, request.name);

            // HTTP 模块
            case "getFetch": return await http.getFetch(p, request.url, request.type);
            case "getHeadersFetch": return await http.getHeadersFetch(p, request.url, request.headersObj, request.type);
            case "postHeadersFetch": return await http.postHeadersFetch(p, request.url, request.headersObj, request.body || request.data, request.type);
            case "postFetch": return await http.postFetch(p, request.url, request.data);
            case "typeFetch": return await http.typeFetch(p, request.url, request.type, request.data);

            // TABS 模块
            case "tabs_remove_create_indexOf":
                return await tabs.tabs_remove_create_indexOf(
                    p,
                    request.index,
                    request.url,
                    request.htmlArr,
                    request.isHighlightTab
                );

            case "tabs_executeScript_indexOf":
                return await tabs.tabs_executeScript_indexOf(
                    p,
                    request.index,
                    request.code,
                    request.htmlArr,
                    request.isHighlightTab
                );
            case "tabs_remove_create_devtools_indexOf": return await tabs.tabs_remove_create_devtools_indexOf(p, request);
            case "executeScript": return await tabs.executeScript(p, request.fileArr, request.code);
            case "highlightTab": return await tabs.highlightTab(p, request.index);

            default: throw new Error(`未定义操作: ${request.action}`);
        }
    }
};
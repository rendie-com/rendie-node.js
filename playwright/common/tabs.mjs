'use strict';
import fs from 'fs';
import path from 'path';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const tabs = {
    _getPageByIndex: async function (p, index) {
        const context = p.context();
        let pages = context.pages();
        const targetIdx = index - 1;
        while (pages.length <= targetIdx) {
            await context.newPage();
            pages = context.pages();
        }
        return pages[targetIdx];
    },
    tabs_remove_create_indexOf: async function (page, index, url, htmlArr, isHighlightTab) {
        if (typeof index !== 'number') throw new Error(`[tabs_remove_create_indexOf] index 必须是数字，当前为 ${typeof index}`);
        if (!Array.isArray(htmlArr)) throw new Error(`[tabs_remove_create_indexOf] htmlArr 必须是数组，当前为 ${typeof htmlArr}`);
        if (typeof isHighlightTab !== 'boolean') throw new Error(`[tabs_remove_create_indexOf] isHighlightTab 必须是布尔值，当前为 ${typeof isHighlightTab}`);
        const targetPage = await this._getPageByIndex(page, index);
        if (isHighlightTab) await targetPage.bringToFront();
        await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await targetPage.waitForFunction((keywords) => {
            const html = document.documentElement.outerHTML;
            return keywords.some(k => html.includes(k));
        }, htmlArr, { timeout: 60000 });
        return await targetPage.content();
    },
    tabs_executeScript_indexOf: async function (page, index, code, htmlArr, isHighlightTab) {
        if (typeof index !== 'number') throw new Error(`[tabs_executeScript_indexOf] index 必须是数字，当前为 ${typeof index}`);
        if (typeof code !== 'string') throw new Error(`[tabs_executeScript_indexOf] code 必须是字符串，当前为 ${typeof code}`);
        if (!Array.isArray(htmlArr)) throw new Error(`[tabs_executeScript_indexOf] htmlArr 必须是数组，当前为 ${typeof htmlArr}`);
        if (typeof isHighlightTab !== 'boolean') throw new Error(`[tabs_executeScript_indexOf] isHighlightTab 必须是布尔值，当前为 ${typeof isHighlightTab}`);
        const targetPage = await this._getPageByIndex(page, index);
        if (isHighlightTab) await targetPage.bringToFront();
        await targetPage.evaluate(c => window.eval(c), code);
        await delay(100);
        await targetPage.waitForFunction((keywords) => {
            return keywords.some(k => document.documentElement.outerHTML.includes(k));
        }, htmlArr, { timeout: 60000 });
        return await targetPage.content();
    },
    highlightTab: async function (p, index) {
        const page = await this._getPageByIndex(p, index);
        await page.bringToFront();
        return "高亮成功";
    },




    


    // 核心重构：Devtools 拦截 (使用网络监听替代)
    tabs_remove_create_devtools_indexOf: async function (p, request) {
        const page = await this._getPageByIndex(p, request.index);
        if (request.url) await page.goto(request.url);
        if (request.isHighlightTab) await page.bringToFront();
        return await page.content();
    },
    executeScript: async function (p, fileArr, code) {
        const page = await this._getPageByIndex(p, index);
        return await page.evaluate(c => window.eval(c), code);
    }
};
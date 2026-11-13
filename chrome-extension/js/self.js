'use strict';

const main = {
    obj: {
        A1: 1, A2: 0, Aarr: []
    },
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    async fillAndClick(typeText, inputSelector, value) {
        let num = 100;
        while (num > 0) {
            document.title = `超时：${num}，正在输入${typeText}。。。`;
            const input = document.querySelector(inputSelector);
            if (input) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                ).set;
                nativeInputValueSetter.call(input, value);
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            }
            num--;
            await this.delay(200);
        }
        return false;
    },
    async init() {
        console.log("content.js 已执行");
        const config = window.__MY_PLUGIN_CONFIG__;
        if (config) {
            console.log("成功接收到参数：", config);
        }
    }
};
main.init();
'use strict';
(function () {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('js/inject.js');
    script.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(script);
    /////////////////////////////////////////////////////
    window.addEventListener('rendie-req-dispatch', function (e) {
        const rid = e.detail?.requestId;
        if (!e.detail || !chrome.runtime || !chrome.runtime.id) {
            dispatchToWeb({ status: "error", msg: "插件环境已失效，请刷新页面重试", requestId: rid });
            return;
        }
        try {
            chrome.runtime.sendMessage({ ...e.detail, cmd: "content-script-rendie-com" }, (response) => {
                if (chrome.runtime.lastError) {
                    dispatchToWeb({
                        status: "error",
                        msg: chrome.runtime.lastError.message,
                        requestId: rid
                    });
                } else {
                    dispatchToWeb({ data: response, requestId: rid });
                }
            });
        } catch (err) {
            dispatchToWeb({ status: "error", msg: err.message, requestId: rid });
        }
    });
    function dispatchToWeb(payload) {
        window.dispatchEvent(new CustomEvent('rendie-res-dispatch', {
            detail: payload
        }));
    }
})();

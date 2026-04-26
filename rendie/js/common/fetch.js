//JS — fetch详解        https://www.cnblogs.com/qinlinkun/p/18188651
'use strict';
export const common_fetch = {
    getFetch: function (url,type, next) {
        fetch(url).then(response => {
            if(type=="json"){
                return response.json();
            }
            else if(type=="gbk"){
                return response.arrayBuffer()                
            }
            else{
                return response.text();
            }
        }).then(str => {
            if(type=="gbk"){
                const decoder = new TextDecoder("gbk");
                next(decoder.decode(str))
            }
            else{
                next(str)
            }
        })
    },   
    getHeadersFetch: function (url,headersObj, type, next) {
        const headers = new Headers();
        for(let k in headersObj){
            headers.append(k,headersObj[k])
        }
        ////////////////////////////////
        fetch(url,{ 
            headers: headers
        }).then(response => {
            if(type=="json"){
                return response.json();
            }
            else if(type=="gbk"){
                return response.arrayBuffer()                
            }
            else{
                return response.text();
            }
        }).then(str => {
            if(type=="gbk"){
                const decoder = new TextDecoder("gbk");
                next(decoder.decode(str))
            }
            else{
                next(str)
            }
        })
    },   
    postHeadersFetch: function (url,headersObj, data, type, next) {
        const headers = new Headers();
        for(let k in headersObj){
            headers.append(k,headersObj[k])
        }
        ////////////////////////////////
        fetch(url, {
            method: 'POST',
            headers: headers,
            body: data
        }).then(response => {
            if(type=="json"){
                return response.json();
            }
            else if(type=="gbk"){
                return response.arrayBuffer()                
            }
            else{
                return response.text();
            }
        }).then(str => {
            if(type=="gbk"){
                const decoder = new TextDecoder("gbk");
                next(decoder.decode(str))
            }
            else{
                next(str)
            }
        })
    },   
    postFetch: function (url, data, next) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch(url, {
            method: 'POST',
            headers: headers,
            body: data
        }).then(response => response.json())
        .then(data => {
            next(data)
        }).catch(error => next({error: error}));
    },    
    typeFetch: function (url,type, data, next) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch(url, {
            method: type,
            headers: headers,
            body: data
        }).then(response => response.json())
        .then(data => {
            next(data)
        }).catch(error => next({error: error}));
    },    
}

// setHeaders_getHtml: {
    //     a01: function (url, headers, next) {
    //         // let This = this;
    //         // let listener = (details) => {
    //         //     return { requestHeaders: This.b01(headers.concat(details.requestHeaders)) };
    //         // }
    //         // let filter = { urls: [url], types: ["xmlhttprequest"] }
    //         // chrome.webRequest.onBeforeSendHeaders.addListener(listener, filter, ["blocking", "requestHeaders", "extraHeaders"])
    //          this.a02(url,  next)
    //     },
    //     a02: function (url,  next) {
    //         fetch(url, {
    //             method: 'GET',
    //         }).then(response => { return response.json(); }).then(str => {
    //             next(str);
    //         })            
    //     },
    //     b01: function (arr1) {
    //         let arr2 = [],//去重
    //             arr3 = [];
    //         for (let i = 0; i < arr1.length; i++) {
    //             if (arr2.indexOf(arr1[i].name) == -1) {//去重只要首次出现的
    //                 arr3.push(arr1[i]);
    //                 arr2.push(arr1[i].name);
    //             }
    //         }
    //         return arr3;
    //     },
    // },
    // setHeaders_postHtml: {
    //     a01: function (url, headers, data, next) {
    //         let arr = headers, isbool = false;//是否走监听路线。
    //         console.log(arr)
    //         // for (let i = 0; i < arr.length; i++) {
    //         //     if (arr[i].name == "Origin") { isbool = true; break; }
    //         // }
    //         // if (isbool) {
    //         //     //说明：拼多多就走这边。
    //         //     this.e01(url, headers, data, next);//走监听路线。
    //         // }
    //         // else {
    //         //     this.d01(url, headers, data, next);//不走监听路线。
    //         // }
    //     },
    //     /////////////////////////////////////////////////
    //     // b01: function (arr1) {
    //     //     //去重，要重复的第一个。
    //     //     let arr2 = [], arr3 = [];
    //     //     for (let i = 0; i < arr1.length; i++) {
    //     //         if (arr2.indexOf(arr1[i].name) == -1) {
    //     //             arr3.push(arr1[i]);
    //     //             arr2.push(arr1[i].name);
    //     //         }
    //     //     }
    //     //     return arr3
    //     // },
    //     // //////////////////////////////////////////////////////
    //     // d01: function (url, headers1, data, next) {
    //     //     let headers2 = {}
    //     //     for (let i = 0; i < headers1.length; i++) {
    //     //         headers2[headers1[i].name] = headers1[i].value;
    //     //     }
    //     //     ///////////////////////////
    //     //     $.ajax({
    //     //         type: 'POST',
    //     //         url: url,
    //     //         data: data,
    //     //         headers: headers2,
    //     //         timeout: 300000,
    //     //         async: false,
    //     //         success: function (data) {
    //     //             next(data);
    //     //         },
    //     //         complete: function (XMLHttpRequest, status) {
    //     //             if (status != 'success') {
    //     //                 let data = {
    //     //                     status: status,
    //     //                     code: XMLHttpRequest.status,
    //     //                     error: XMLHttpRequest.responseText
    //     //                 }
    //     //                 next(data);
    //     //             }
    //     //         }
    //     //     });
    //     // },
    //     ////////////////////////////////////////////////////
    //     // e01: function (url, headers, data, next) {
    //     //     let This = this;
    //     //     let listener = (details) => {
    //     //         return { requestHeaders: This.b01(headers.concat(details.requestHeaders)) };
    //     //     }
    //     //     chrome.webRequest.onBeforeSendHeaders.addListener(listener, { urls: [url], types: ["xmlhttprequest"] }, ["blocking", "requestHeaders", "extraHeaders"])
    //     //     this.e02(url, data, listener, next)
    //     // },
    //     // e02: function (url, data, listener, next) {
    //     //     $.ajax({
    //     //         url: url,
    //     //         data: data,
    //     //         type: "post",
    //     //         timeout: 300000,
    //     //         cache: false,
    //     //         success: function (data) {
    //     //             chrome.webRequest.onBeforeSendHeaders.removeListener(listener)
    //     //             next(data);
    //     //         },
    //     //         complete: function (XMLHttpRequest, status) {
    //     //             if (status != 'success') {
    //     //                 chrome.webRequest.onBeforeSendHeaders.removeListener(listener)
    //     //                 next({
    //     //                     status: status,
    //     //                     code: XMLHttpRequest.status,
    //     //                     error: XMLHttpRequest.responseText
    //     //                 });
    //     //             }
    //     //         }
    //     //     });
    //     // }
    // },
        // const headers = new Headers();
        // headers.append('Content-Type', 'application/json;charset=utf-8');
        // headers.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7');
        // headers.append('Referer', 'http://localhost:3000/');
        // headers.append('Cookie', 'SPC_F=KMfkBAQkvAIOJtXLrPULAOuoqJAbDYSF; SPC_CNSC_SESSION=08de88510982bad7cc6328c4afcac285_2_1649154; SPC_SC_OFFLINE_TOKEN=eyJkYXRhIjoiMy9tRC93OFBMTUowWUhxNSsxbzVQelFSbUZUL09hZldSZzBSUVFMbzI0anNaWHJBKzFPWGxXQ3pELzkxT2JoUnRJSS9POWI0Y3F6WDgzblpmSGpmdWZ2Q1FCUDlSL0NaeU5UblpodHBWOWYyWVVjdTlHOGNEM2daUTNrcG5RYitIOWpLQjlLN0FzUWNIL3k5ZnY5MHN3PT0iLCJpdiI6InRMSGx2K29jS1FwNWhhMXpwY2hWSnc9PSIsInNpZ24iOiJzcGZQeTNUTHRMTWpKUC85K1RURFNXVG50NlBNeDYwRVVDblY0Y1pzREJnU0Y0SDRHZG9uNEtKeVRYMWEwNWs2L3hwbFRJb1ZsSVlncW5NRVJtQ2xBdz09In0=; SPC_CNSC_TK=0aad22b8acf95843f19e7138e13d7666; SPC_CNSC_UD=1_1649154; CNSC_SSO=NDlWcDhibXlTZzNveDdYayVHZLOnqpMdnG4o5QINI3qOEuMCFTsU8Z8d6k9MSHk5; SPC_CDS=76775607-4a7c-4c68-b89f-968c8adc958d');
        // headers.append('Priority', 'u=0, i');
        // headers.append('Sec-ch-ua', '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"');
        // headers.append('Sec-ch-ua-mobile', '?0');
        // headers.append('Sec-ch-ua-platform', '"Windows"');
        // headers.append('Sec-fetch-dest', 'document');
        // headers.append('Sec-fetch-mode', 'navigate');
        // headers.append('Sec-fetch-site', 'cross-site');
        // headers.append('sec-fetch-user', '?1');
        // headers.append('upgrade-insecure-requests', '1');

        //headers: headers,
// typeHtml: function (url, type, data, next) {
//     $.ajax({
//         url: url,
//         type: type,
//         timeout: 300000,
//         async: false,
//         data: data,
//         success: function (txt) { next(txt); },
//         complete: function (XMLHttpRequest, status) {
//             if (status != 'success') {
//                 next({
//                     status: status,
//                     code: XMLHttpRequest.status,
//                     error: XMLHttpRequest.responseText
//                 });
//             }
//         }
//     });
// },

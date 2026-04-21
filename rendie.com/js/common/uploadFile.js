'use strict';
export const common_uploadFile = {
    uploadFile:
    {
        a01: function (url, type, headers, data, next) {
            let oo = {
                fileArr: [],//图片数组
                blobArr: [],//blob数组
                url: url,
                type: type,
                headers: headers,
                data: data,
                next: next
            }
            this.a02(oo);
        },
        a02: function (oo) {
            let fileArr = []
            for (let i = 0; i < oo.data.length; i++) {
                if (typeof (oo.data[i].value) == "string") {
                    if (oo.data[i].value.indexOf("（二进制）") != -1) {
                        fileArr.push(oo.data[i].value.split('（二进制）')[1])
                    }
                }
            }
            oo.fileArr = fileArr;
            this.a03(oo)
        },
        a03: function (oo) {
            if (oo.fileArr.length == 0) {
                //文件转二进制，可以上传了。
                this.d01(oo)
            }
            else {
                this.a04(oo.fileArr[0], oo)
            }
        },
        a04: function (url, oo) {
            let This = this;
            fetch(url).then(response => {
                // 确保请求成功
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.blob(); // 将Response转换为Blob
            }).then(blob => {
                // 处理Blob对象
                This.a05(blob, oo);
            }).catch(error => {
                console.log('There has been a problem with your fetch operation:', error);
            });
        },
        a05: function (blob, oo) {
            oo.fileArr.shift();//删除一个
            oo.blobArr.push(blob);//添加一个
            this.a03(oo);
        },
        //////////////////////////////////////////////////////
        d01: function (oo) {
            //变成二进制
            var arr = oo.data
            const formData = new FormData()
            for (var i = 0; i < arr.length; i++) {
                if (typeof (arr[i].value) == "string") {
                    if (arr[i].value.indexOf("（二进制）") != -1) {
                        arr[i].value = oo.blobArr[0];
                        oo.blobArr.shift();//删除一个
                    }
                }
                //////////////////////////////////////////
                if (arr[i].fileName) {
                    formData.append(arr[i].name, arr[i].value, arr[i].fileName);
                }
                else {
                    formData.append(arr[i].name, arr[i].value);
                }
            }
            this.d02(oo, formData);
        },
        d02: function (oo, formData) {
            let arr = oo.headers
            const headers = new Headers();
            for (let i = 0; i < arr.length; i++) {
                headers.append(arr[i].name, arr[i].value);
            }
            /////////////////////////////
            fetch(oo.url, {
                method: 'POST',
                headers: headers,
                body: formData
            })
                .then(response => {
                    if (oo.type == "json") {
                        return response.json();
                    }
                    else {
                        return response.text();
                    }
                })
                .then(data => { oo.next(data) })
                .catch(error => {
                    oo.next({
                        error: error
                    })
                });
        },
    }
}




// a05: function (oo, formData) {
//     let arr = oo.headers, isbool = false;//是否走监听路线。
//     for (let i = 0; i < arr.length; i++) {
//         if (arr[i].name == "Origin") { isbool = true; break; }
//     }
//     if (isbool) {
//         alert("上传文件，好像不用【走监听路线】。")
//         //this.e01(oo, formData);//走监听路线。
//     }
//     else {
//         this.d01(oo, formData);//不走监听路线。
//     }
// },

// //////////////////////////////////

//////////////////////////////////////
//e01: function (request, formData) {
//    request.listener = (details) => {
//        let arr1 = request.headers.concat(details.requestHeaders), arr2 = [], arr3 = [];
//        for (let i = 0; i < arr1.length; i++) {
//            if (arr2.indexOf(arr1[i].name) == -1) {
//                arr3.push(arr1[i]);
//                arr2.push(arr1[i].name);
//            }
//        }
//        return { requestHeaders: arr3 };
//    }
//    let filter = {
//        urls: [request.url],
//        types: ["xmlhttprequest"]
//    }
//    chrome.webRequest.onBeforeSendHeaders.addListener(request.listener, filter, ["blocking", "requestHeaders", "extraHeaders"])
//    this.e02(request, formData);
//},
//e02: function (request, formData) {
//    $.ajax({
//        type: 'POST',
//        url: request.url,
//        data: formData,
//        timeout: 300000,
//        async: false,
//        processData: false,
//        contentType: false,
//        dataType: "json",
//        success: function (data) {
//            Tool.apply(data, request.next, request.This, request.t)
//            chrome.webRequest.onBeforeSendHeaders.removeListener(request.listener)
//        },
//        complete: function (XMLHttpRequest, status) {
//            if (status != 'success') {
//                let data = {
//                    status: status,
//                    code: XMLHttpRequest.status,
//                    error: XMLHttpRequest.responseText
//                }
//                Tool.apply(data, request.next, request.This, request.t)
//            }
//        }
//    });
//}
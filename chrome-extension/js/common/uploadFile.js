'use strict';
export const common_uploadFile = {
    uploadFile: {
        a01: function (url, type, headers, data, next) {
            let oo = {
                fileArr: [],  // 图片 URL 数组
                blobArr: [],  // 转换后的真实二进制 Blob 数组
                url: url,
                type: type,
                headers: headers,
                data: data,
                next: next
            };
            this.a02(oo);
        },

        a02: function (oo) {
            let fileArr = [];
            for (let i = 0; i < oo.data.length; i++) {
                if (typeof (oo.data[i].value) == "string") {
                    if (oo.data[i].value.indexOf("（二进制）") != -1) {
                        fileArr.push(oo.data[i].value.split('（二进制）')[1]);
                    }
                }
            }
            oo.fileArr = fileArr;
            this.a03(oo);
        },

        a03: function (oo) {
            if (oo.fileArr.length == 0) {
                // 所有文件转二进制完毕，准备组装发送
                this.d01(oo);
            } else {
                // 取出队列中的第一个 URL 进行转换
                this.a04(oo.fileArr[0], oo);
            }
        },

        a04: function (url, oo) {
            let This = this;
            fetch(url).then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.blob(); 
            }).then(blob => {
                // 【兼容性优化】只有在环境支持 revokeObjectURL 时才调用，防止报错卡死
                if (url.startsWith('blob:')) {
                    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
                        URL.revokeObjectURL(url);
                    } else if (typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function') {
                        window.URL.revokeObjectURL(url);
                    }
                }
                
                This.a05(blob, oo);
            }).catch(error => {
                console.error('Fetch 转换二进制失败:', error);
                
                // 【兼容性优化】异常防御处同样做环境检查
                if (url.startsWith('blob:')) {
                    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
                        URL.revokeObjectURL(url);
                    }
                }
                
                // 向下传递错误，防止流程卡死
                let nextFunc = oo.next;
                oo = null; 
                nextFunc({ error: error });
            });
        },

        a05: function (blob, oo) {
            oo.fileArr.shift(); // 弹出已处理的 URL
            oo.blobArr.push(blob); // 暂存对应的真实二进制数据
            this.a03(oo);
        },

        d01: function (oo) {
            var arr = oo.data;
            const formData = new FormData();
            
            for (var i = 0; i < arr.length; i++) {
                if (typeof (arr[i].value) == "string") {
                    if (arr[i].value.indexOf("（二进制）") != -1) {
                        // 替换为真实的二进制对象
                        arr[i].value = oo.blobArr[0];
                        oo.blobArr.shift(); 
                    }
                }
                
                if (arr[i].fileName) {
                    formData.append(arr[i].name, arr[i].value, arr[i].fileName);
                } else {
                    formData.append(arr[i].name, arr[i].value);
                }
            }
            this.d02(oo, formData);
        },

        d02: function (oo, formData) {
            let arr = oo.headers;
            const headers = new Headers();
            for (let i = 0; i < arr.length; i++) {
                headers.append(arr[i].name, arr[i].value);
            }

            fetch(oo.url, {
                method: 'POST',
                headers: headers,
                body: formData
            })
            .then(response => {
                if (oo.type == "json") {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .then(data => { 
                let nextFunc = oo.next;
                
                // 【核心优化 2】显式清空 oo 内部所有大数组，切断与大 Blob 对象的联系
                oo.fileArr = null;
                oo.blobArr = null;
                oo.data = null;
                oo = null; // 斩断闭包链

                nextFunc(data); 
            })
            .catch(error => {
                console.error('上传接口请求失败:', error);
                let nextFunc = oo.next;
                
                // 失败时同样做显式清理
                oo.fileArr = null;
                oo.blobArr = null;
                oo.data = null;
                oo = null;

                nextFunc({ error: error });
            });
        },
    }
}
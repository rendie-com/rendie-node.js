//JS — fetch详解        https://www.cnblogs.com/qinlinkun/p/18188651
'use strict';
export const http = {
    getFetch: function (url, type, next) {
        fetch(url, {
            method: 'GET',
            credentials: 'include'
        }).then(response => {
            if (type == "json") {
                return response.json();
            }
            else if (type == "gbk") {
                return response.arrayBuffer()
            }
            else {
                return response.text();
            }
        }).then(str => {
            if (type == "gbk") {
                const decoder = new TextDecoder("gbk");
                next(decoder.decode(str))
            }
            else {
                next(str)
            }
        })
    },
    getHeadersFetch: function (url, headersObj, type, next) {
        const headers = new Headers();
        for (let k in headersObj) {
            headers.append(k, headersObj[k])
        }
        ////////////////////////////////
        fetch(url, {
            headers: headers
        }).then(response => {
            if (type == "json") {
                return response.json();
            }
            else if (type == "gbk") {
                return response.arrayBuffer()
            }
            else {
                return response.text();
            }
        }).then(str => {
            if (type == "gbk") {
                const decoder = new TextDecoder("gbk");
                next(decoder.decode(str))
            }
            else {
                next(str)
            }
        })
    },
    postHeadersFetch: function (url, headersObj, data, type, next) {
        const headers = new Headers();
        for (let k in headersObj) {
            headers.append(k, headersObj[k])
        }
        ////////////////////////////////
        fetch(url, {
            method: 'POST',
            headers: headers,
            body: data
        }).then(response => {
            if (type == "json") {
                return response.json();
            }
            else if (type == "gbk") {
                return response.arrayBuffer()
            }
            else {
                return response.text();
            }
        }).then(str => {
            if (type == "gbk") {
                const decoder = new TextDecoder("gbk");
                next(decoder.decode(str))
            }
            else {
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
            }).catch(error => next({ error: error }));
    },
    typeFetch: function (url, type, data, next) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch(url, {
            method: type,
            headers: headers,
            body: data
        }).then(response => response.json())
            .then(data => {
                next(data)
            }).catch(error => next({ error: error }));
    }, 
}
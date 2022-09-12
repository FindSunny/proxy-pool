'use strict';
const axios = require('axios').default;
const requests = require("request-promise");
const fs = require('fs');

const ProxyUtils = {
    getProxyInfoByKxdaili: async function (page, type) {
        // 1,开心代理
        let url = 'http://www.kxdaili.com/dailiip/' + type + '/' + page + '.html'
        // 获取代理页面详情
        let html = await ProxyUtils.getProxyHtmlInfo(url);
        // 获取页面代理地址
        let proxyInfoList = html.match(/<td>[0123456789.]{2,}<\/td>/g);
        // 整理代理地址
        return ProxyUtils.getValidProxyInfo(proxyInfoList);
    },
    getProxyInfoByKuaidaili: async function (page) {
        // 2，快代理
        let url = 'https://free.kuaidaili.com/free/intr/' + page + '/';
        // 获取代理页面详情
        let html = await ProxyUtils.getProxyHtmlInfo(url);
        // 获取页面代理地址
        let proxyInfoList = html.match(/<td[^>]+>[0123456789.]{2,}<\/td>/g);
        // 整理代理地址
        return ProxyUtils.getValidProxyInfo(proxyInfoList);
    },
    getProxyInfoByProxylist: async function () {
        // 3，未知
        let url = 'http://proxylist.fatezero.org/proxy.list';
        // 获取代理页面详情
        let html = await ProxyUtils.getProxyHtmlInfo(url);
        // 获取页面代理地址,Json对象
        let infoList = html.split('\n');
        let proxyInfoList = [];
        for (let i = 0; i < infoList.length; i++) {
            if (!infoList[i]) {
                continue;
            }
            let info = JSON.parse(infoList[i]);
            proxyInfoList.push({
                ip: info.host,
                port: info.port
            });
        }
        return proxyInfoList;
    },
    /**
     * 云代理
     */
    getProxyInfoByIP3366: async function (page) {
        let url = 'http://www.ip3366.net/free/?stype=1&page=' + page;
        // 获取代理页面详情
        let html = await ProxyUtils.getProxyHtmlInfo(url, 'gb2312');
        // 获取页面代理地址
        let proxyInfoList = html.match(/<td>[0123456789.]{2,}<\/td>/g);
        // 整理代理地址
        return ProxyUtils.getValidProxyInfo(proxyInfoList);
    },
    /**
     * 66代理
     */
    getProxyInfoBy66ip: async function (page) {
        let url = 'http://www.66ip.cn/' + page + '.html';
        // 获取代理页面详情
        let html = await ProxyUtils.getProxyHtmlInfo(url, 'gb2312');
        // 获取页面代理地址
        let proxyInfoList = html.match(/<td>[0123456789.]{2,}<\/td>/g);
        // 整理代理地址
        return ProxyUtils.getValidProxyInfo(proxyInfoList);
    },
    /**
     * 89代理
     * @returns 
     */
    getProxyInfoBy89ip: async function (page) {
        try {
            let url = 'https://www.89ip.cn/index_' + page + '.html';
            // 获取代理页面详情
            let html = await ProxyUtils.getProxyHtmlInfo(url);
            // 获取页面代理地址
            let proxyInfoList = html.match(/<td>[0123456789.\n\t]{2,}<\/td>/g);
            // 整理代理地址
            return ProxyUtils.getValidProxyInfo(proxyInfoList);
        } catch (error) {
            console.log(error);
            return [];
        }
    },

    /**
     * 获取html页面数据
     */
    getProxyHtmlInfo: async function (url, encode = 'UTF-8') {
        let response = await axios.get(url, {
            responseType: "arraybuffer"
        });
        let { data } = response;
        let utf8decoder = new TextDecoder(encode); // 关键步骤
        let html = utf8decoder.decode(data);
        return html;
    },
    /**
     * 获取有效的代理地址
     */
    getValidProxyInfo: function (proxyInfoList) {
        let proxyInfo = [];
        // 获取代理列表，去重
        for (let i = 0; i < proxyInfoList.length; i++) {
            if (proxyInfoList[i] && proxyInfoList[i + 1]) {
                // 测试代理地址
                // 去掉\n\t
                let info = {
                    ip: proxyInfoList[i].replace('<td>', '').replace('</td>', '').replace(/<td[^>]+>/g, '').replace(/[\n\t]/g, ''),
                    port: proxyInfoList[i + 1].replace('<td>', '').replace('</td>', '').replace(/<td[^>]+>/g, '').replace(/\s/g, '').replace(/[\n\t]/g, ''),
                }
                // 去重
                if (proxyInfo.filter(item => item.ip === info.ip && item.port === info.port).length === 0) {
                    proxyInfo.push(info);
                }
            }
            i++;
        }
        return proxyInfo;
    },

    /**
     * 测试代理地址是否可用
     */
    testProxyInfo: async function (proxy, code) {
        // 尝试3次, 有一次成功就返回true
        for (let i = 0; i < 1; i++) {
            // promise超时处理
            let timeout = new Promise((resolve, reject) => {
                // http://139.9.64.238:443
                // start time
                let start = new Date().getTime();
                let ret = requests({
                    url: 'https://basic.10jqka.com.cn/basicapi/concept/stock_concept_list/?code=' + code,
                    gzip: true,
                    json: true,
                    method: 'GET',
                    timeout: 5000,
                    proxy: 'http://' + proxy.ip + ':' + proxy.port,
                    headers: {
                        'Host': 'basic.10jqka.com.cn',
                        'Connection': 'keep-alive',
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; CN1920 Build/RP1A.102005.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
                        'X-Requested-With': 'com.hexin.plat.android',
                        'Sec-Fetch-Site': 'same-origin',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Dest': 'empty',
                        'Referer': 'https://basic.10jqka.com.cn/astockph/briefinfo/index.html?code=000401&marketid=33',
                        'Accept-Encoding': 'gzip, deflate',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
                    }
                }).then(res => {
                    // end time
                    let end = new Date().getTime();
                    // 耗时
                    let time = end - start;
                    // console.log('耗时：', time);
                    // console.log('测试代理成功,proxy:' + proxy.ip + ':' + proxy.port + '，耗时：' + (end - start) + 'ms');
                    if (time <= 5000) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }).catch(err => {
                    // console.log('测试代理失败,proxy:' + proxy.ip + ':' + proxy.port);
                    resolve(false);
                });
                // 超时时间5s
                setTimeout(() => {
                    // console.log('测试代理超时,proxy:' + proxy.ip + ':' + proxy.port);
                    ret.cancel();
                    resolve(false);
                }, 5000);
            });
            let result = await timeout;
            if (result) {
                return true;
            }
        }
    },

    // 读取指定文件
    getStockInfo: function () {
        try {
            const data = fs.readFileSync('./lib/stock.txt', 'utf8');
            // 循环读取数据
            let dataArr = data.split('\n');
            // 列表
            let stockList = [];
            for (let i = 0, l = dataArr.length; i < l; i++) {
                let stock = {};
                let stockinfo = dataArr[i].split('|');
                // 股票
                stock.code = stockinfo[0].split('----')[0];
                stock.name = stockinfo[0].split('----')[1].replace('\r', '');
                stockList.push(stock);
            }
            return stockList;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

};

module.exports = ProxyUtils;
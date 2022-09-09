
const redis = require('redis');
const ProxyUtils = require('./utils/ProxyUtils.js');
const client = redis.createClient()

// 读取股票代码
const stockList = ProxyUtils.getStockInfo();
// 股票数量
const stockCount = stockList.length;

// 链接redis
const init = async () => {
    await client.connect();
};

// 链接数据库
init();

// 开始执行
let ipcount = 0;
setTimeout(async function () {
    let options = {
        page: 1,
        type: 'kxdaili',
        // 随机获取一个个股票代码
        code: stockList[Math.floor(Math.random() * stockCount)].code,
    }
    let proxyInfo = [];
    // 开心 获取10页
    for (let i = 1; i <= 10; i++) {
        proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByKxdaili(i));
    }
    // 快代理 获取10页
    for (let i = 1; i <= 10; i++) {
        proxyInfo =  proxyInfo.concat(await ProxyUtils.getProxyInfoByKuaidaili(i));
    }
    // 未知
    proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByProxylist());

    ipcount = proxyInfo.length;

    // 多线程测试代理是否OK
    console.log('开始测试代理是否可用');


    // await client.set('foo1', 'bar1');
    // const fooValue = await client.get('foo1');
    // console.log(fooValue);
    // 每5分钟执行一次
    // setTimeout(arguments.callee, 1000);
}, 1000);


// 退出时关闭连接
process.on('SIGINT', () => {
    console.log('SIGINT');
    client.quit();
});
// 异常时关闭连接
process.on('uncaughtException', (error) => {
    console.log('uncaughtException');
    client.quit();
});

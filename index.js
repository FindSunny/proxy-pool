// 工作池相关
const WorkerPool = require('./worker_pool.js');
const os = require('os');
// 创建工作池(取CPU核心数量)
const pool = new WorkerPool(os.cpus().length);
// 不限制并发数量
process.setMaxListeners(0);

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
let ipCount = 0;
let finished = 0;
let worked = 0;
let timer = null;
let goodProxy = [];
const main = async () => {

    // 去除不可用ip
    const rmList = await client.sMembers('proxy_invalid');
    if (rmList && rmList.length > 0) {
        try {
            await client.sRem('proxy', rmList);
            // 清空不可用ip
            if (rmList.length > 100) {
                await client.del('proxy_invalid');
            }
        } catch (error) {
            console.log(error);
        }
    }

    if (timer) {
        clearTimeout(timer);
    }
    let proxyInfo = [];
    // 1. 开心 获取10页
    for (let j = 1; j <= 2; j++) {
        for (let i = 1; i <= 3; i++) {
            proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByKxdaili(i, j));
        }
    }
    // 2. 快代理 获取10页
    // for (let i = 1; i <= 3; i++) {
    //     proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByKuaidaili(i));
    // }
    // 未知 （废除）
    // proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByProxylist());

    // 3. 云代理
    for (let i = 1; i <= 3; i++) {
        proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByIP3366(i));
    }
    // 4. 66ip
    for (let i = 1; i <= 3; i++) {
        proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoBy66ip(i));
    }
    // 5. 89ip
    for (let i = 1; i <= 3; i++) {
        proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoBy89ip(i));
    }

    // 此次ip总数
    ipCount = proxyInfo.length;

    // 多线程测试代理是否OK
    console.log('开始测试代理是否可用');
    for (let i = 0; i < proxyInfo.length; i++) {
        pool.runTask({
            proxyInfo: proxyInfo[i],
            code: stockList[Math.floor(Math.random() * stockCount)].code
        }, async (err, result) => {
            let test = await ProxyUtils.testProxyInfo(result.proxyInfo, result.code);
            if (test) {
                goodProxy.push(result.proxyInfo);
                // 有效计数
                worked++;
            }
            if (++finished === ipCount) {
                // 写入redis
                try {
                    // redis列表不存在
                    for (let i = 0; i < goodProxy.length; i++) {
                        let pos = await client.sIsMember('proxy', JSON.stringify(goodProxy[i]));
                        let invlidPos = await client.sIsMember('proxy_invalid', JSON.stringify(goodProxy[i]));
                        if (!pos && !invlidPos) {
                            // 添加到redis列表,加锁
                            await client.sAdd('proxy', JSON.stringify(goodProxy[i]));
                            console.log('添加代理：' + goodProxy[i].ip + ':' + goodProxy[i].port);
                        }
                    }
                    console.log(new Date().toLocaleString() + '-全部完成,' + '共' + ipCount + '个代理,有效' + worked + '个');
                } catch (err) {
                    console.log('redis 读写失败：' + err);
                }
                goodProxy = [];
                finished = 0;
                worked = 0;
                // 每隔5分钟执行一次
                timer = setTimeout(async function () {
                    await main();
                }, 1000 * 60 * 3);
            }
        });
    }
};

// 开始执行
timer = main();

// 退出时关闭连接
process.on('SIGINT', () => {
    if (timer) {
        clearTimeout(timer);
    }
    // 关闭工作池
    pool.close();
    console.log('SIGINT');
    client.quit();
});
// 异常时打印错误
process.on('uncaughtException', (error) => {
    // 关闭工作池
    if (error.name === 'AssertionError') {
        console.log('Assertion error: name=' + error.name + ', message=' + error.message + ', message=' + error.message);
    } else {
        console.log('uncaughtException: ' + error);
    }
});


process.on('exit', () => {
    if (timer) {
        clearTimeout(timer);
    }
    // 关闭工作池
    pool.close();
    console.log('exit');
});
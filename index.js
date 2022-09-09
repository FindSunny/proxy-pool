// 工作池相关
const WorkerPool = require('./worker_pool.js');
const os = require('os');
// 创建工作池(取CPU核心数量)
const pool = new WorkerPool(os.cpus().length);

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
const main = async () => {
    let proxyInfo = [];
    // 开心 获取10页
    // for (let j = 1; j <= 2; j++) {
    //     for (let i = 1; i <= 10; i++) {
    //         proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByKxdaili(i, j));
    //     }
    // }
    // 快代理 获取10页
    for (let i = 1; i <= 3; i++) {
        proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByKuaidaili(i));
    }
    // 未知
    // proxyInfo = proxyInfo.concat(await ProxyUtils.getProxyInfoByProxylist());

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
                // redis列表不存在
                if (!await client.sIsMember('proxy', JSON.stringify(result.proxyInfo))) {
                    // 添加到redis列表
                    client.lPush('proxy', JSON.stringify(result.proxyInfo));
                    console.log('添加代理：' + result.proxyInfo.ip + ':' + result.proxyInfo.port);
                }

                // 有效计数
                worked++;
            }
            if (++finished === ipCount) {
                finished = 0;
                worked = 0;
                console.log(new Date().toLocaleString() + '-全部完成,' + '共' + ipCount + '个代理,有效' + worked + '个');
                // 每隔5分钟执行一次
                setTimeout(async function () {
                    await main();
                }, 1000 * 60 * 30);
            }
        });
    }
};

// 开始执行
main();

// 退出时关闭连接
process.on('SIGINT', () => {
    // 关闭工作池
    pool.close();
    console.log('SIGINT');
    client.quit();
});
// 异常时关闭连接
process.on('uncaughtException', (error) => {
    // 关闭工作池
    pool.close();
    console.log('uncaughtException');
    client.quit();
});


process.on('exit', () => {
    // 关闭工作池
    pool.close();
    console.log('exit');
});
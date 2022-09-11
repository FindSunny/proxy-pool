// @ts-nocheck
const { parentPort } = require('worker_threads');
parentPort.on('message', (task) => {
    setTimeout(() => {
        parentPort.postMessage(task);
    }, 200);
});
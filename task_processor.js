// @ts-nocheck
const { parentPort } = require('worker_threads');
parentPort.on('message', (task) => {
    parentPort.postMessage(task);
});
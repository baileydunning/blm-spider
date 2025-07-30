"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
const server_1 = require("./server");
const numCPUs = os_1.default.cpus().length;
if (cluster_1.default.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    console.log(`Spawning ${numCPUs} workers...`);
    for (let i = 0; i < numCPUs; i++) {
        cluster_1.default.fork();
    }
    cluster_1.default.on('exit', (worker, code, signal) => {
        console.warn(`Worker ${worker.process.pid} died (${signal || code}), restarting...`);
        cluster_1.default.fork();
    });
}
else {
    (0, server_1.startServer)();
}

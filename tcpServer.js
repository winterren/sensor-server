// tcpServer.js
const net = require('net');
const parse = require('./parsePacket');
const { insertSensorData } = require('./db');

const server = net.createServer((socket) => {
  console.log('设备连接：', socket.remoteAddress);

  socket.on('data', (data) => {
    const parsed = parse(data);
    if (parsed) {
      insertSensorData(parsed);
      console.log('已保存数据：', parsed);
    } else {
      console.warn('接收到非法或CRC失败数据');
    }
  });

  socket.on('close', () => {
    console.log('设备断开连接');
  });

  socket.on('error', (err) => {
    console.error('TCP 错误：', err);
  });
});

server.listen(33613, () => {
  console.log('TCP Server 启动，监听端口 33613');
});

// udpServer.js
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const parse = require('./parsePacket');
const { insertSensorData } = require('./db');
const emitter = require('./events'); // for WebSocket 推送

const PORT = 33613;
const latestSnapshot = new Map();

server.on('message', (msg, rinfo) => {
  console.log(`📩 收到UDP包来自 ${rinfo.address}:${rinfo.port}，长度 ${msg.length}`);

  if (msg.length < 22) return;

  const parsed = parse(msg);
  if (parsed && parsed.index !== undefined) {
    insertSensorData(parsed);
    console.log('📥 正在尝试写入数据：', parsed);
    latestSnapshot.set(parsed.index, parsed);

    // 广播快照
    const snapshot = Array.from(latestSnapshot.values());
    
    emitter.emit('new-data', {
      timestamp: new Date().toISOString(),
      data: snapshot
    });
  } else {
    console.warn('CRC 校验失败或数据无效');
  }
});

server.bind(PORT, '0.0.0.0', () => {
  console.log(`✅ UDP Server 正在监听端口 ${PORT}`);
});

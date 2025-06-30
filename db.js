// db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sensor_data.db');

// 初始化表结构
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      index_no INTEGER,
      voltage1 INTEGER,
      voltage2 INTEGER,
      temperature REAL,
      O2 REAL,
      CO REAL,
      C2H2 REAL,
      CH4 REAL,
      C2H6 REAL,
      CO2 REAL
    )
  `);
  
  // 阈值表
  db.run(`
    CREATE TABLE IF NOT EXISTS thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL
    )
  `);

  // 阈值初始化（如未存在任何记录时插入）
  db.get(`SELECT COUNT(*) as count FROM thresholds`, (err, row) => {
    if (row.count === 0) {
      const insert = db.prepare(`INSERT INTO thresholds (sensor, type, value) VALUES (?, ?, ?)`);
      const thresholds = [
        ['CO', 'warn', 24], ['CO', 'level1', 50], ['CO', 'level2', 100],
        ['CO2', 'warn', 1], ['CO2', 'level1', 3], ['CO2', 'level2', 5],
        ['C2H2', 'warn', 2], ['C2H2', 'level1', 5], ['C2H2', 'level2', 10],
        ['O2', 'warn_low', 19.5], ['O2', 'level1_low', 18], ['O2', 'level2_low', 15],
        ['O2', 'warn_high', 23.5], ['O2', 'level1_high', 25], ['O2', 'level2_high', 27],
        ['C2H6', 'warn', 5], ['C2H6', 'level1', 10], ['C2H6', 'level2', 20],
        ['CH4', 'warn', 0.8], ['CH4', 'level1', 1.0], ['CH4', 'level2', 2.5],
        ['temperature', 'warn', 30], ['temperature', 'level1', 40], ['temperature', 'level2', 60]
      ];
      thresholds.forEach(([sensor, type, value]) => {
        insert.run(sensor, type, value);
      });
      insert.finalize();
    }
  });
});

// 插入一条记录
function insertSensorData(data) {
  const now = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Shanghai'
  }).replace('T', ' '); // 生成：2025-06-30 09:15:02
  const stmt = db.prepare(`
    INSERT INTO sensor_data 
    (timestamp, index_no, voltage1, voltage2, temperature, O2, CO, C2H2, CH4, C2H6, CO2) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    now, data.index, data.voltage1, data.voltage2, data.temperature,
    data.O2, data.CO, data.C2H2, data.CH4, data.C2H6, data.CO2
  ]);
  stmt.finalize();
}

// 获取最新 N 条记录
function getLatestData(limit = 10, callback) {
  db.all(`SELECT * FROM sensor_data ORDER BY id DESC LIMIT ?`, [limit], callback);
}

module.exports = { insertSensorData, getLatestData };

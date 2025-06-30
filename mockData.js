const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sensor_data.db');

function random(min, max, fixed = 2) {
  return +(Math.random() * (max - min) + min).toFixed(fixed);
}

const now = new Date();
const baseTime = now.getTime();

db.serialize(() => {
  const stmt = db.prepare(`
    INSERT INTO sensor_data 
    (timestamp, index_no, voltage1, voltage2, temperature, O2, CO, C2H2, CH4, C2H6, CO2) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 100; i++) {
    const index = (i % 6) + 1;
    const time = new Date(baseTime - i * 60000).toISOString(); // 每条间隔1分钟
    stmt.run([
      time,
      index,
      random(4800, 5200, 0), // voltage1
      random(4800, 5200, 0), // voltage2
      random(20, 30),        // temperature ℃
      random(19, 21),        // O2 %
      random(0, 0.5),        // CO %
      random(0, 0.2),        // C2H2 %
      random(0.5, 2.0),      // CH4 %
      random(0.2, 1.0),      // C2H6 %
      random(0.4, 1.5)       // CO2 %
    ]);
  }

  stmt.finalize();
  console.log('✅ 模拟数据已插入 20 条');
});

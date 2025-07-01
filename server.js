const express = require('express');
const cors = require('cors');
const { getLatestData } = require('./db');
const emitter = require('./events'); // WebSocket 广播
require('./udpServer'); // UDP 接收服务

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sensor_data.db');

const app = express();
app.use(cors());

const PORT = 5000;

app.get('/', (req, res) => {
  res.send('欢迎使用传感器数据 API');
});

app.get('/api/latest', (req, res) => {
  const sql = `
    SELECT *
    FROM (
      SELECT *
      FROM sensor_data
      ORDER BY timestamp DESC
    )
    GROUP BY index_no
    ORDER BY index_no ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});



// ✅ 获取历史记录总条数
app.get('/api/history/count', (req, res) => {
  db.get(`SELECT COUNT(*) as count FROM sensor_data`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: row.count });
  });
});

// ✅ 获取报警阈值（固定返回）
// // ✅ 获取报警阈值（仅返回数字）
// app.get('/api/warning-thresholds', (req, res) => {
//   res.json({
//     CO: { warn: 24, level1: 50, level2: 100 },           // ppm
//     CO2: { warn: 1, level1: 3, level2: 5 },               // %
//     C2H2: { warn: 2, level1: 5, level2: 10 },             // ppm
//     O2: { warn_low: 19.5, level1_low: 18, level2_low: 15, warn_high: 23.5, level1_high: 25, level2_high: 27 }, // %
//     C2H6: { warn: 5, level1: 10, level2: 20 },            // ppm
//     CH4: { warn: 0.8, level1: 1.0, level2: 2.5 },         // %
//     temperature: { warn: 30, level1: 40, level2: 60 }     // ℃
//   });
// });

// ✅ 获取报警阈值（动态从数据库读取）
app.get('/api/warning-thresholds', (req, res) => {
  db.all(`SELECT sensor, type, value FROM thresholds`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const result = {};

    rows.forEach(({ sensor, type, value }) => {
      if (!result[sensor]) result[sensor] = {};
      result[sensor][type] = value;
    });

    res.json(result);
  });
});

// ✅ 更新指定传感器的报警阈值
app.put('/api/warning-thresholds/:sensor', express.json(), (req, res) => {
  const sensor = req.params.sensor;
  const allowedFields = [
    'warn', 'level1', 'level2',
    'warn_low', 'level1_low', 'level2_low',
    'warn_high', 'level1_high', 'level2_high'
  ];

  const updates = [];
  const values = [];

  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  values.push(sensor); // 最后一个是 WHERE 条件的 sensor 名称

  const sql = `UPDATE warning_thresholds SET ${updates.join(', ')} WHERE sensor = ?`;
  db.run(sql, values, function(err) {
    if (err) return res.status(500).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sensor not found.' });
    }

    res.json({ success: true, updated: this.changes });
  });
});



// ✅ 历史数据查询接口（含排序/筛选/分页）
app.get('/api/history', (req, res) => {
  const {
    limit,
    page,
    sort = 'timestamp',
    order = 'desc',
    index_no,
    start,
    end
  } = req.query;

  const fields = ['voltage1', 'voltage2', 'temperature', 'O2', 'CO', 'C2H2', 'CH4', 'C2H6', 'CO2'];
  let conditions = [], params = [];

  if (index_no) {
    conditions.push('index_no = ?');
    params.push(index_no);
  }
  if (start) {
    conditions.push('timestamp >= ?');
    params.push(start);
  }
  if (end) {
    conditions.push('timestamp <= ?');
    params.push(end);
  }

  fields.forEach(field => {
    const min = req.query[`${field}_min`];
    const max = req.query[`${field}_max`];
    const eq = req.query[`${field}_eq`];

    if (min !== undefined) {
      conditions.push(`${field} >= ?`);
      params.push(min);
    }
    if (max !== undefined) {
      conditions.push(`${field} <= ?`);
      params.push(max);
    }
    if (eq !== undefined) {
      conditions.push(`${field} = ?`);
      params.push(eq);
    }
  });

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = `ORDER BY ${sort} ${order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;

  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 10;
  const offset = (pageNum - 1) * pageSize;

  const sql = `
    SELECT * FROM sensor_data
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

    // 先获取总数
  const countSql = `
    SELECT COUNT(*) as count FROM sensor_data
    ${whereClause}
  `;
  db.get(countSql, params, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = countRow.count;
    const totalPages = Math.ceil(total / pageSize);

    // 再查分页数据
    db.all(sql, [...params, pageSize, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        total,
        page: pageNum,
        pageSize,
        totalPages,
        data: rows
      });
    });
  });

});



app.get('/api/warning-history', (req, res) => {
  const {
    type,    // 传感器类型（如 CO）
    level,   // 报警等级（如 level1）
    limit = 10,
    page = 1,
    sort = 'timestamp',
    order = 'desc',
    start,   // 起始时间
    end,      // 结束时间
    index_no   // 👈 加入 index_no 支持
  } = req.query;

  db.all(`SELECT sensor, type as raw_level, value FROM thresholds`, (err, thresholdRows) => {
    if (err) return res.status(500).json({ error: err.message });

    // 构造 { sensor: { level1: x, level2: y, warn: z } }
    const thresholds = {};
    thresholdRows.forEach(({ sensor, raw_level, value }) => {
      let levelKey = raw_level;

      if (raw_level.endsWith('_low') || raw_level.endsWith('_high')) {
        levelKey = raw_level.replace(/_low|_high/, '');
      }

      if (!['warn', 'level1', 'level2'].includes(levelKey)) return;

      if (!thresholds[sensor]) thresholds[sensor] = {};
      if (!thresholds[sensor][levelKey]) thresholds[sensor][levelKey] = [];

      thresholds[sensor][levelKey].push({ raw: raw_level, value });
    });

    db.all(`SELECT * FROM sensor_data`, (err, dataRows) => {
      if (err) return res.status(500).json({ error: err.message });

      const warnings = [];

      dataRows.forEach(row => {
        const { timestamp, index_no } = row;

        // 时间范围过滤（如果设置了）
        if (start && new Date(timestamp) < new Date(start)) return;
        if (end && new Date(timestamp) > new Date(end)) return;

        Object.entries(thresholds).forEach(([sensor, levels]) => {
          const value = row[sensor];
          if (value === undefined || value === null) return;

          // level2 → level1 → warn 优先判断
          if (isTriggered(value, levels.level2)) {
            warnings.push({ type: sensor, value, level: 'level2', timestamp, index_no });
          } else if (isTriggered(value, levels.level1)) {
            warnings.push({ type: sensor, value, level: 'level1', timestamp, index_no });
          } else if (isTriggered(value, levels.warn)) {
            warnings.push({ type: sensor, value, level: 'warn', timestamp, index_no });
          }
        });
      });

      // 筛选 type 和 level
      let filtered = warnings;
      if (type) filtered = filtered.filter(w => w.type === type);
      if (level) filtered = filtered.filter(w => w.level === level);
      if (index_no !== undefined) {
        const indexNoInt = parseInt(index_no);
        filtered = filtered.filter(w => w.index_no === indexNoInt);
      }


      // 排序
      filtered.sort((a, b) => {
        if (order.toLowerCase() === 'asc') {
          return new Date(a[sort]) - new Date(b[sort]);
        } else {
          return new Date(b[sort]) - new Date(a[sort]);
        }
      });

      // 分页
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const offset = (pageInt - 1) * limitInt;
      const paged = filtered.slice(offset, offset + limitInt);

      const total = filtered.length;
      const totalPages = Math.ceil(total / limitInt);

      res.json({
        total,
        page: pageInt,
        pageSize: limitInt,
        totalPages,
        data: paged
      });

    });
  });

  function isTriggered(value, conditions = []) {
    return conditions.some(({ raw, value: threshold }) => {
      if (raw.endsWith('_low')) return value <= threshold;
      return value >= threshold;
    });
  }
});



app.listen(PORT, () => {
  console.log(`✅ Express API 运行在 http://localhost:${PORT}`);
});

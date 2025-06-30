以下是更新后的 **完整接口文档（Markdown 格式）**，涵盖你当前系统中所有已实现的接口，包括历史查询、总记录数、阈值获取等内容。

http://43.138.15.118:5000

---

# 📡 传感器数据 API 文档

所有接口基于：`http://localhost:5000`

---

## 📋 接口总览

| 方法  | 路径                        | 描述                    |
| --- | ------------------------- | --------------------- |
| GET | `/`                       | 接口欢迎信息                |
| GET | `/api/latest`             | 获取最新传感器数据             |
| GET | `/api/history`            | 获取历史传感器数据（支持筛选、排序、分页） |
| GET | `/api/history/count`      | 获取传感器历史记录总数           |
| GET | `/api/warning-thresholds` | 获取各传感器报警阈值（纯数字）       |

---

## 1. `GET /`

### 描述：

返回欢迎信息，用于测试服务是否正常运行。

---

## 2. `GET /api/latest`

### 描述：

获取系统中最新一条传感器数据。

### 响应示例：

```json
{
  "timestamp": "2025-06-30T01:23:45.000Z",
  "index_no": 1,
  "voltage1": 5020,
  "voltage2": 5080,
  "temperature": 25.36,
  "O2": 20.91,
  "CO": 0.12,
  "C2H2": 0.03,
  "CH4": 1.23,
  "C2H6": 0.45,
  "CO2": 0.78
}
```

---

## 3. `GET /api/history`

### 描述：

查询传感器历史数据，支持多参数过滤、排序和分页。

### 支持参数（Query）：

| 参数名           | 类型     | 说明                        |
| ------------- | ------ | ------------------------- |
| `page`        | number | 页码（默认 1）                  |
| `limit`       | number | 每页数量（默认 10）               |
| `sort`        | string | 排序字段名（默认 `timestamp`）     |
| `order`       | string | `asc` 或 `desc`（默认 `desc`） |
| `index_no`    | number | 过滤：点位编号                   |
| `start`       | string | 开始时间（ISO 8601）            |
| `end`         | string | 结束时间（ISO 8601）            |
| `<field>_min` | number | 指定字段的最小值                  |
| `<field>_max` | number | 指定字段的最大值                  |
| `<field>_eq`  | number | 指定字段的精确值                  |

> 支持的 `<field>` 包括：
> `voltage1`, `voltage2`, `temperature`, `O2`, `CO`, `C2H2`, `CH4`, `C2H6`, `CO2`

### 示例请求：

```
GET /api/history?page=1&limit=5&temperature_min=25&CO_max=0.5&sort=temperature&order=asc
```

### 响应示例：

```json
[
  {
    "timestamp": "2025-06-30T01:15:22.123Z",
    "index_no": 2,
    "voltage1": 5022,
    "voltage2": 5082,
    "temperature": 25.12,
    "O2": 20.95,
    "CO": 0.10,
    "C2H2": 0.02,
    "CH4": 1.00,
    "C2H6": 0.42,
    "CO2": 0.75
  }
]
```

---

## 4. `GET /api/history/count`

### 描述：

返回数据库中历史传感器数据的总条数。

### 响应示例：

```json
{
  "count": 1335
}
```

---

## 5. `GET /api/warning-thresholds`

### 描述：

返回系统中各传感器报警阈值（单位略去，仅为数值）。

### 响应示例：

```json
{
  "CO":        { "warn": 24, "level1": 50, "level2": 100 },
  "CO2":       { "warn": 1, "level1": 3, "level2": 5 },
  "C2H2":      { "warn": 2, "level1": 5, "level2": 10 },
  "O2": {
    "warn_low": 19.5, "level1_low": 18, "level2_low": 15,
    "warn_high": 23.5, "level1_high": 25, "level2_high": 27
  },
  "C2H6":      { "warn": 5, "level1": 10, "level2": 20 },
  "CH4":       { "warn": 0.8, "level1": 1.0, "level2": 2.5 },
  "temperature": { "warn": 30, "level1": 40, "level2": 60 }
}
```

---

## ⏱ 时间说明

* 所有 `timestamp` 字段均为格式`2025-06-30 09:23:45`

---

整理如下，继续延续你提供的接口文档风格：

---

## 6. `GET /api/warning-history`

### 描述：

根据历史传感器数据和系统中配置的报警阈值，返回触发报警的记录数据。报警等级统一为 `warn`、`level1`、`level2`，不再区分 `_low` / `_high`。支持按类型、等级筛选，支持分页和时间排序。

### 请求参数：

| 参数名     | 类型     | 是否可选 | 默认值         | 说明                            |
| ------- | ------ | ---- | ----------- | ----------------------------- |
| `type`  | string | 是    | 无           | 传感器类型，如 `CO`, `CH4`，为空则返回所有类型 |
| `level` | string | 是    | 无           | 报警等级：`warn`、`level1`、`level2` |
| `limit` | number | 是    | 10          | 每页条数                          |
| `page`  | number | 是    | 1           | 当前页码                          |
| `sort`  | string | 是    | `timestamp` | 目前仅支持时间排序                     |
| `order` | string | 是    | `desc`      | 排序方式：`asc` / `desc`           |

### 响应示例：

```json
{
  "total": 3,
  "page": 1,
  "pageSize": 10,
  "data": [
    {
      "type": "CO",
      "value": 65.2,
      "level": "level1",
      "timestamp": "2025-06-30 09:23:45",
      "index_no": 3
    },
    {
      "type": "O2",
      "value": 14.9,
      "level": "level2",
      "timestamp": "2025-06-30 09:20:11",
      "index_no": 3
    },
    {
      "type": "temperature",
      "value": 61.5,
      "level": "level2",
      "timestamp": "2025-06-30 08:50:02",
      "index_no": 1
    }
  ]
}
```

---

## ⏱ 时间说明

* 所有 `timestamp` 字段均为格式：`2025-06-30 09:23:45`
* 若需其他格式，可在前端使用格式化工具（如 `dayjs`, `moment.js`）处理


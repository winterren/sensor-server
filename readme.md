以下是你请求的更新后的 **完整接口文档**（Markdown 格式），统一补充了分页返回的字段：`total`、`page`、`pageSize`、`totalPages`，并补充了 `/api/warning-history` 中对 `index_no` 的筛选支持。

---

# 📡 传感器数据 API 文档（更新版）

所有接口基于地址：

```
http://localhost:5000
```

---

## 📋 接口总览

| 方法  | 路径                        | 描述                    |
| --- | ------------------------- | --------------------- |
| GET | `/`                       | 接口欢迎信息                |
| GET | `/api/latest`             | 获取最新传感器数据（支持分页）       |
| GET | `/api/history`            | 获取历史传感器数据（支持筛选、排序、分页） |
| GET | `/api/history/count`      | 获取传感器历史记录总条数          |
| GET | `/api/warning-thresholds` | 获取各传感器报警阈值（纯数字）       |
| GET | `/api/warning-history`    | 获取报警记录（基于阈值动态分析，支持筛选） |

---

## 1. `GET /`

### 描述：

返回欢迎信息，确认 API 服务正常运行。

---
更新后的 **`GET /api/latest`** 接口文档如下：

---

## 2. `GET /api/latest`

### 描述：

获取每个 `index_no` 点位的最新传感器数据。支持分页参数（默认返回第一页的前 10 个点位数据）。

每个点位仅返回数据库中时间最新的一条记录，字段包括温度、氧气、可燃气体等核心指标。

---

### 请求参数：

| 参数名     | 类型     | 是否可选 | 默认值 | 描述        |
| ------- | ------ | ---- | --- | --------- |
| `page`  | number | 是    | 1   | 当前页码      |
| `limit` | number | 是    | 10  | 每页条数（点位数） |

---

### 返回字段说明：

每条数据包括以下字段：

* `index_no`：设备点位编号
* `timestamp`：该记录的时间
* `temperature`：温度（℃）
* `O2`：氧气浓度（%）
* `CO`：一氧化碳浓度（ppm）
* `C2H2`：乙炔浓度（ppm）
* `CH4`：甲烷浓度（%）
* `C2H6`：乙烷浓度（ppm）
* `CO2`：二氧化碳浓度（%）

---

### 响应示例：

```json
{
  "total": 36,
  "page": 1,
  "pageSize": 10,
  "totalPages": 4,
  "data": [
    {
      "timestamp": "2025-07-01 12:00:01",
      "index_no": 1,
      "temperature": 25.36,
      "O2": 20.91,
      "CO": 0.12,
      "C2H2": 0.03,
      "CH4": 1.23,
      "C2H6": 0.45,
      "CO2": 0.78
    },
    {
      "timestamp": "2025-07-01 12:00:05",
      "index_no": 2,
      "temperature": 26.02,
      "O2": 20.75,
      "CO": 0.10,
      "C2H2": 0.04,
      "CH4": 1.10,
      "C2H6": 0.50,
      "CO2": 0.72
    }
    // ... 其余点位
  ]
}
```

---

### 注意事项：

* 每个 `index_no` 只返回时间最新的一条数据。
* 建议使用分页加载所有点位，防止一次性拉取过多数据导致响应缓慢。
* 若要获取某个具体点位的最新数据，请使用 `/api/history?index_no=xxx&limit=1&sort=timestamp&order=desc`。

---

如需，我还可以更新数据库分页查询逻辑或优化分页查询性能。是否需要一并实现？


```

---

## 3. `GET /api/history`

### 描述：

查询历史传感器数据，支持多维筛选、分页、排序。

### 请求参数：

| 参数名             | 类型     | 说明                              |
| --------------- | ------ | ------------------------------- |
| `page`          | number | 页码（默认 1）                        |
| `limit`         | number | 每页数量（默认 10）                     |
| `sort`          | string | 排序字段名（默认 `timestamp`）           |
| `order`         | string | `asc` 或 `desc`（默认 `desc`）       |
| `index_no`      | number | 过滤某个 index\_no（设备编号）            |
| `start` / `end` | string | 时间范围筛选（如：`2025-06-30 00:00:00`） |
| `<field>_min`   | number | 字段最小值筛选                         |
| `<field>_max`   | number | 字段最大值筛选                         |
| `<field>_eq`    | number | 字段等于值筛选                         |

> 支持筛选字段包括：
> `voltage1`, `voltage2`, `temperature`, `O2`, `CO`, `C2H2`, `CH4`, `C2H6`, `CO2`

### 响应示例：

```json
{
  "total": 315,
  "page": 1,
  "pageSize": 10,
  "totalPages": 32,
  "data": [
    {
      "timestamp": "2025-06-30 01:15:22",
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
}
```

---

## 4. `GET /api/history/count`

### 描述：

返回数据库中历史传感器数据总条数。

### 响应示例：

```json
{
  "count": 1335
}
```

---

## 5. `GET /api/warning-thresholds`

### 描述：

获取所有传感器的报警阈值设置。格式统一为每个传感器对应多个级别。

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

## 6. `GET /api/warning-history`

### 描述：

根据历史传感器数据与阈值判断逻辑，获取所有触发 `warn`、`level1`、`level2` 的报警记录。每条历史数据可能产生多条报警。

### 请求参数：

| 参数名        | 类型     | 默认值         | 是否必填 | 描述                            |
| ---------- | ------ | ----------- | ---- | ----------------------------- |
| `type`     | string | 无           | 否    | 传感器类型，如 `CO`, `CH4`           |
| `level`    | string | 无           | 否    | 报警等级：`warn`、`level1`、`level2` |
| `index_no` | number | 无           | 否    | 指定设备编号筛选                      |
| `start`    | string | 无           | 否    | 起始时间（如 `2025-06-30 00:00:00`） |
| `end`      | string | 无           | 否    | 结束时间（如 `2025-06-30 23:59:59`） |
| `page`     | number | 1           | 否    | 页码                            |
| `limit`    | number | 10          | 否    | 每页记录数                         |
| `sort`     | string | `timestamp` | 否    | 排序字段，默认按时间                    |
| `order`    | string | `desc`      | 否    | 排序方式（升序：`asc`）                |

### 响应示例：

```json
{
  "total": 3,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1,
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

## ⏱ 时间字段说明

* 所有时间字段格式统一为：`YYYY-MM-DD HH:mm:ss`
* 可直接传入标准 ISO 字符串，系统将自动解析成时间范围
* 若需要其他格式，可在前端进行格式化处理（如使用 `dayjs`、`moment.js`）

---

如需将该文档导出为 PDF 或转换为 Swagger/OpenAPI 3.0 规范文档，我可以继续帮你生成。是否需要我导出一份？

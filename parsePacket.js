function crc16Modbus(buf) {
  let crc = 0xffff;
  for (let i = 0; i < buf.length - 2; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
  }
  return crc;
}

function parseSensorData(buf) {
  if (buf.length < 22) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const crcReceived = dv.getUint16(20, true);
  const crcCalculated = crc16Modbus(buf);

  if (crcCalculated !== crcReceived) return null;

  return {
    timestamp: new Date().toISOString(),
    index: dv.getUint16(0, true),
    voltage1: dv.getUint16(2, true),
    temperature: dv.getUint16(4, true) / 100,
    O2: dv.getUint16(6, true) / 100,
    CO: dv.getUint16(8, true) / 100,
    C2H2: dv.getUint16(10, true) / 100,
    CH4: dv.getUint16(12, true) / 100,
    C2H6: dv.getUint16(14, true) / 100,
    CO2: dv.getUint16(16, true) / 100,
    voltage2: dv.getUint16(18, true)
  };
}

module.exports = parseSensorData;

const crypto = require('crypto');
const http = require('http');

const secret = 'change-me-device-secret';
const tenant = 'nusantara';
const empId = 'emp-NSM-2024-007';
const deviceId = 'dev-001';

function post(path, headers, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenant, ...headers },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  const payload = { employeeId: empId, deviceId, ts: Date.now() };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(`${payload.employeeId}|${payload.deviceId}|${payload.ts}`).digest('hex');
  const ok = await post('/api/v1/attendance/biometric/device/clock-in', { 'x-device-id': deviceId, 'x-device-signature': sig }, payload);
  console.log('VALID sig ->', ok.status, ok.body.slice(0, 160));
  const bad = await post('/api/v1/attendance/biometric/device/clock-in', { 'x-device-id': deviceId, 'x-device-signature': 'deadbeef' }, payload);
  console.log('BAD sig   ->', bad.status, bad.body.slice(0, 160));
})();

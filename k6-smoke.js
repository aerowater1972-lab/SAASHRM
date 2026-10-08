import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.05'],
  },
};

const BASE = 'http://localhost:3000/api/v1';
const TENANT = 'default';

function headers(token) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT,
    Authorization: `Bearer ${token}`,
  };
}

export function setup() {
  const login = http.post(`${BASE}/admin/auth/login`, JSON.stringify({
    email: 'admin@flexy.local',
    password: 'admin123',
  }), { headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT } });
  if (login.status !== 200) {
    throw new Error(`Login failed: ${login.status} ${login.body}`);
  }
  return { token: login.json().accessToken };
}

export default function (data) {
  const h = headers(data.token);

  const me = http.get(`${BASE}/admin/auth/me`, { headers: h });
  check(me, { 'me 200': (r) => r.status === 200 }) || errorRate.add(1);

  const leaveTypes = http.get(`${BASE}/attendance/leave-types`, { headers: h });
  check(leaveTypes, { 'leave-types 200': (r) => r.status === 200 }) || errorRate.add(1);

  const payrollRuns = http.get(`${BASE}/payroll/runs`, { headers: h });
  check(payrollRuns, { 'payroll runs 200': (r) => r.status === 200 }) || errorRate.add(1);

  const employees = http.get(`${BASE}/admin/users`, { headers: h });
  check(employees, { 'users 200': (r) => r.status === 200 }) || errorRate.add(1);

  sleep(1);
}
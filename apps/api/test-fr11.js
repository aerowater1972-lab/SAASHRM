const fetch = require('node-fetch');

async function test() {
  // Login first
  const loginRes = await fetch('http://localhost:3000/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default' },
    body: JSON.stringify({ email: 'admin@flexy.local', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login ok:', !!token);

  // Test training-compliance
  const compRes = await fetch('http://localhost:3000/api/v1/k3/training-compliance', {
    headers: { 'x-tenant-id': 'default', 'Authorization': `Bearer ${token}` }
  });
  const compData = await compRes.json();
  console.log('Training compliance:', compRes.ok, JSON.stringify(compData, null, 2).substring(0, 500));

  // Test training-recommendations
  const recRes = await fetch('http://localhost:3000/api/v1/k3/training-recommendations', {
    headers: { 'x-tenant-id': 'default', 'Authorization': `Bearer ${token}` }
  });
  const recData = await recRes.json();
  console.log('Training recommendations:', recRes.ok, JSON.stringify(recData, null, 2).substring(0, 500));
}

test().catch(console.error);
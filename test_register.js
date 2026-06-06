const http = require('http');

const payload = JSON.stringify({
  name: 'Test User',
  email: 'testuser-' + Date.now() + '@example.com',
  password: 'password123',
  role: 'user'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.success) {
        console.log('SUCCESS: Registration works end-to-end!');
      } else {
        console.log('FAILED:', parsed.message);
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.write(payload);
req.end();
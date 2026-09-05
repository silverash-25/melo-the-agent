const http = require('http');

function testEndpoint(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("Testing /write_file");
  const writeRes = await testEndpoint('/write_file', { filename: 'test.txt', content: 'MELO test' });
  console.log("Write:", writeRes);

  console.log("Testing /read_file");
  const readRes = await testEndpoint('/read_file', { filename: 'test.txt' });
  console.log("Read:", readRes);

  console.log("Testing /code_execute");
  const codeRes = await testEndpoint('/code_execute', { script: 'console.log("MELO test")' });
  console.log("Code:", codeRes);
}

runTests().catch(console.error);

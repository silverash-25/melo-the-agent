const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const SANDBOX_DIR = 'C:/Users/Maria/OneDrive/Projects/melo/sandbox';

const server = http.createServer((req, res) => {
    if (req.method !== 'POST') return res.end('Only POST');
    
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            res.setHeader('Content-Type', 'application/json');
            
            if (req.url === '/read_file') {
                const content = fs.readFileSync(path.join(SANDBOX_DIR, data.filename), 'utf8');
                res.end(JSON.stringify({ content }));
            } 
            else if (req.url === '/write_file') {
                fs.writeFileSync(path.join(SANDBOX_DIR, data.filename), data.content, 'utf8');
                res.end(JSON.stringify({ message: 'File written successfully' }));
            }
            else if (req.url === '/code_execute') {
                const output = execSync(`node -e "` + data.script.replace(/"/g, '\\"') + `"`).toString();
                res.end(JSON.stringify({ stdout: output, stderr: '' }));
            }
            else if (req.url === '/data_analyze') {
                const output = execSync(`python -c "import pandas as pd; print(pd.read_csv('` + path.join(SANDBOX_DIR, data.filename).replace(/\\/g, '/') + `').describe())"`).toString();
                res.end(JSON.stringify({ analysis: output }));
            }
            else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Endpoint not found' }));
            }
        } catch (e) {
            res.end(JSON.stringify({ error: e.toString() }));
        }
    });
});

server.listen(3001, () => {
    console.log('Tool server running on port 3001');
});

const http = require('http');
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const SANDBOX_DIR = path.join(__dirname, 'sandbox');

const server = http.createServer((req, res) => {
    if (req.method !== 'POST') return res.end('Only POST');
    
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
        try {
            res.setHeader('Content-Type', 'application/json');
            
            // Parse URL to handle query parameters
            const reqUrl = new URL(req.url, `http://${req.headers.host}`);
            const pathname = reqUrl.pathname;
            
            // Parse body
            let data = {};
            if (body) {
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    // Fallback for form-urlencoded
                    const params = new URLSearchParams(body);
                    for (const [key, value] of params.entries()) {
                        data[key] = value;
                    }
                }
            }
            
            const resolveSafePath = (filename) => {
                const resolved = path.resolve(SANDBOX_DIR, filename);
                if (!resolved.startsWith(path.resolve(SANDBOX_DIR))) {
                    throw new Error("Access denied: Invalid path");
                }
                return resolved;
            };

            if (pathname === '/file_read' || pathname === '/read_file') {
                const targetPath = resolveSafePath(data.filename);
                const content = fs.readFileSync(targetPath, 'utf8');
                res.end(JSON.stringify({ content }));
            } 
            else if (pathname === '/file_write' || pathname === '/write_file') {
                const targetPath = resolveSafePath(data.filename);
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, data.content, 'utf8');
                res.end(JSON.stringify({ message: 'File written successfully' }));
            }
            else if (pathname === '/code_execute') {
                // n8n sends script as a query parameter!
                const script = reqUrl.searchParams.get('script') || data.script;
                if (!script) throw new Error("Missing script parameter");
                
                // Using execFileSync to avoid shell injection vulnerabilities
                const output = execFileSync('python', ['-c', script], { encoding: 'utf8', cwd: SANDBOX_DIR });
                res.end(JSON.stringify({ stdout: output, stderr: '' }));
            }
            else if (pathname === '/data_analyze') {
                const targetPath = resolveSafePath(data.filename);
                const pyScript = `import pandas as pd\nprint(pd.read_csv(r'${targetPath}').describe())`;
                const output = execFileSync('python', ['-c', pyScript], { encoding: 'utf8', cwd: SANDBOX_DIR });
                res.end(JSON.stringify({ analysis: output }));
            }
            else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Endpoint not found' }));
            }
        } catch (e) {
            fs.appendFileSync(path.join(__dirname, 'error.log'), new Date().toISOString() + ' ' + req.url + ' ' + e.toString() + '\\n' + (e.stack || '') + '\\n');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.toString() }));
        }
    });
});

server.listen(3001, '127.0.0.1', () => {
    console.log('Tool server running on http://127.0.0.1:3001');
});

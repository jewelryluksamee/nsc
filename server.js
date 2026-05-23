const http = require('http');
const fs = require('fs');
const path = require('path');

// Read .env
const env = {};
fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
    // Serve config.js dynamically from .env — never written to disk
    if (req.url === '/config.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(`const CONFIG = ${JSON.stringify(env)};`);
        return;
    }

    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(data);
    });
}).listen(3000, () => {
    console.log('HisTalk running → http://localhost:3000');
});

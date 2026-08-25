const fs = require('fs');
const cp = require('child_process');

console.log('--- server_dist.zip contents ---');
const out = cp.execSync('tar -tf server/server_dist.zip', { encoding: 'utf8' });
console.log(out);

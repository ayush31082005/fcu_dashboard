const fs = require('fs');
const path = require('path');
const archiver = require('./server/node_modules/archiver');

const rootDir = __dirname;
const frontendDist = path.join(rootDir, 'FCU_Dashboard', 'dist');
const serverDir = path.join(rootDir, 'server');

function zipDirectory(sourceDir, outPath, extraFiles = []) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    const output = fs.createWriteStream(outPath);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      resolve(archive.pointer());
    });
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    if (sourceDir && fs.existsSync(sourceDir)) {
      archive.directory(sourceDir, false);
    }

    for (const item of extraFiles) {
      if (fs.existsSync(item.path)) {
        const stat = fs.statSync(item.path);
        if (stat.isDirectory()) {
          archive.directory(item.path, item.name);
        } else {
          archive.file(item.path, { name: item.name });
        }
      }
    }

    archive.finalize();
  });
}

(async () => {
  try {
    console.log('--- Packing Frontend Deployment Zip (Standard ZIP) ---');
    const frontendZipPath = path.join(rootDir, 'frontend_deploy.zip');
    const frontSize = await zipDirectory(frontendDist, frontendZipPath);
    console.log(`✓ Frontend zip created: ${frontendZipPath} (${(frontSize / 1024 / 1024).toFixed(2)} MB)`);

    console.log('\n--- Packing Backend Deployment Zip (Standard ZIP with full directory tree) ---');
    const backendZipPath = path.join(rootDir, 'backend_deploy.zip');
    const backendExtras = [
      { path: path.join(serverDir, 'dist'), name: 'dist' },
      { path: path.join(serverDir, 'src'), name: 'src' },
      { path: path.join(serverDir, 'scripts'), name: 'scripts' },
      { path: path.join(serverDir, 'app.js'), name: 'app.js' },
      { path: path.join(serverDir, 'index.js'), name: 'index.js' },
      { path: path.join(serverDir, 'package.json'), name: 'package.json' },
      { path: path.join(serverDir, 'package-lock.json'), name: 'package-lock.json' },
      { path: path.join(serverDir, 'tsconfig.json'), name: 'tsconfig.json' },
      { path: path.join(serverDir, 'schema.sql'), name: 'schema.sql' },
      { path: path.join(serverDir, '.env'), name: '.env' },
      { path: path.join(serverDir, '.htaccess'), name: '.htaccess' },
      { path: path.join(serverDir, '.env.example'), name: '.env.example' },
    ];

    const backSize = await zipDirectory(null, backendZipPath, backendExtras);
    console.log(`✓ Backend zip created: ${backendZipPath} (${(backSize / 1024).toFixed(2)} KB)`);

    fs.copyFileSync(backendZipPath, path.join(serverDir, 'backend_deploy.zip'));
    console.log('✓ Copied backend_deploy.zip into server/ directory as well.');
  } catch (err) {
    console.error('Packaging error:', err);
    process.exit(1);
  }
})();

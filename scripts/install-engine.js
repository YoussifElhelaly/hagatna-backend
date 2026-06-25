const https = require('https');
const fs = require('fs');
const path = require('path');

const ENGINE_COMMIT = '605197351a3c8bdd595af2d2a9bc3025bca48ea2';
const PLATFORMS = ['rhel-openssl-3.0.x', 'debian-openssl-3.0.x', 'linux-musl'];

function findTargetDir() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', '.prisma', 'client'),
    '/home/hagatna1/nodevenv/API/20/lib/node_modules/.prisma/client',
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  const local = candidates[0];
  fs.mkdirSync(local, { recursive: true });
  return local;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        fs.chmodSync(dest, 0o755);
        resolve(dest);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  const targetDir = findTargetDir();
  console.log('Target directory:', targetDir);

  if (!fs.existsSync(targetDir)) {
    console.error('Target directory does not exist:', targetDir);
    process.exit(1);
  }

  for (const platform of PLATFORMS) {
    const url = `https://binaries.prisma.sh/all_commits/${ENGINE_COMMIT}/${platform}/libquery_engine.so.node`;
    const dest = path.join(targetDir, `libquery_engine-${platform}.so.node`);
    
    console.log(`Trying ${platform}...`);
    try {
      await download(url, dest);
      console.log(`Downloaded: ${dest}`);
      console.log(`Set PRISMA_QUERY_ENGINE_LIBRARY=${dest}`);
      process.exit(0);
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }

  console.error('All platforms failed to download.');
  process.exit(1);
}

main();

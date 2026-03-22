const cp = require('child_process');
try {
  let out = cp.execSync('npx next build', { encoding: 'utf-8', env: {...process.env, CI: '1', NO_COLOR: '1'} });
  console.log("SUCCESS");
} catch (e) {
  let err = (e.stdout || '') + '\n' + (e.stderr || '');
  // Remove all ansi escape codes and carriage returns
  err = err.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  err = err.replace(/\r/g, '');
  const fs = require('fs');
  fs.writeFileSync('build-error.txt', err, 'utf-8');
}

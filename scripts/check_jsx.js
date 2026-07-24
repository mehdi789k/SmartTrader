const fs = require('fs');
const path = require('path');
try {
  const parser = require(path.join(__dirname,'..','ui','node_modules','@babel','parser'));
  const file = path.join(__dirname,'..','ui','src','pages','DashboardPage.jsx');
  const src = fs.readFileSync(file,'utf8');
  const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  console.log('PARSE_OK');
} catch (err) {
  console.error('PARSE_ERROR');
  console.error(err && err.message ? err.message : err);
  if (err && err.loc) {
    console.error('LOC', err.loc);
  }
  process.exit(1);
}

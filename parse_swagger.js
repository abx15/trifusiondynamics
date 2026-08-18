const fs = require('fs');
const content = fs.readFileSync('swagger.json', 'utf8').replace(/^\uFEFF/, '');
const swagger = JSON.parse(content);

let md = '# Actual Routes\n\n| Method | Path | Module | Operation ID | Security |\n|---|---|---|---|---|\n';

for (const path in swagger.paths) {
  for (const method in swagger.paths[path]) {
    const op = swagger.paths[path][method];
    const module = op.tags ? op.tags.join(', ') : 'None';
    const security = op.security ? JSON.stringify(op.security) : 'Public';
    md += `| ${method.toUpperCase()} | ${path} | ${module} | ${op.operationId} | ${security} |\n`;
  }
}

fs.mkdirSync('docs/architecture', { recursive: true });
fs.writeFileSync('docs/architecture/actual-routes.md', md);
console.log('Successfully wrote to docs/architecture/actual-routes.md');

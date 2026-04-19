const fs = require('fs');
const path = require('path');
const dir = 'src/lib/axios';
const files = fs.readdirSync(dir);
files.forEach(file => {
  if (file.endsWith('.ts') && file !== 'config.ts') {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    if (content.includes("import axios from 'axios'")) {
      content = content.replace("import axios from 'axios';", "import axios from './config';");
      fs.writeFileSync(fp, content);
      console.log('Updated ' + file);
    }
  }
});

import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('dist',{recursive:true});
for(const name of ['index.html','app.mjs','engine.mjs','org-map.mjs','style.css','staticwebapp.config.json'])copyFileSync(name,`dist/${name}`);
copyFileSync('node_modules/exceljs/dist/exceljs.min.js','dist/exceljs.min.js');
copyFileSync('node_modules/exceljs/LICENSE','dist/EXCELJS-LICENSE');

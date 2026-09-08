import {copyFileSync,mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Exact user-supplied logo, also published on the user's spend-plan site.
if(!existsSync('esd-logo.png')){
 const response=await fetch('https://mango-pond-0eb56fb10.7.azurestaticapps.net/esd-logo.png');
 if(!response.ok)throw Error('Logo download failed');
 writeFileSync('esd-logo.png',Buffer.from(await response.arrayBuffer()));
}
if(createHash('sha256').update(readFileSync('esd-logo.png')).digest('hex')!=='13dc997373bed57b0b6867455e23aef873016051d3b5440048d03582b78d4a31')throw Error('Logo does not match the approved source');
mkdirSync('dist',{recursive:true});
for(const name of ['esd-logo.png','splash.js','index.html','app.mjs','engine.mjs','org-map.mjs','style.css','staticwebapp.config.json'])copyFileSync(name,`dist/${name}`);
copyFileSync('node_modules/exceljs/dist/exceljs.min.js','dist/exceljs.min.js');
copyFileSync('node_modules/exceljs/LICENSE','dist/EXCELJS-LICENSE');

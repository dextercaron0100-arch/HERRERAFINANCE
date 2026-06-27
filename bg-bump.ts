import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // First, convert any existing slate-200 to slate-300 if needed (maybe leave it)
    content = content.replace(/bg-slate-100/g, "bg-slate-200");
    content = content.replace(/bg-slate-50/g, "bg-slate-100/60");
    // fix the double hover classes that happened earlier
    content = content.replace(/hover:bg-slate-100\/60 hover:bg-slate-200/g, "hover:bg-slate-200");
    
    // some manual fixes
    content = content.replace(/bg-slate-100\/60 border border-slate-200 text-sm/g, "bg-slate-100 border border-slate-200 text-sm");
    content = content.replace(/bg-white hover:bg-slate-100\/60 hover:bg-slate-200/g, "bg-white hover:bg-slate-100");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

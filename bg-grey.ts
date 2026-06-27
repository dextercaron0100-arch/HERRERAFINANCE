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
    
    if (filePath.includes('index.css')) {
      content = content.replace(/background-color: #F8FAFC;/g, "background-color: #F3F4F6;"); // Tailwind gray-100
      content = content.replace(/background: #F8FAFC;/g, "background: #F3F4F6;");
    }

    content = content.replace(/h-screen bg-slate-50/g, "h-screen bg-gray-100");
    
    // We can also replace art-bg-dark
    if (filePath.includes('index.css')) {
       content = content.replace(/\.art-bg-dark \{\n  background-color: #F8FAFC;\n\}/g, ".art-bg-dark {\n  background-color: #F3F4F6;\n}");
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

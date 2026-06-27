import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { search: /bg-\[\#0B0F19\]/g, replace: "bg-slate-50" },
  { search: /bg-\[\#131826\]/g, replace: "bg-white" },
  { search: /bg-\[\#1F2937\]/g, replace: "bg-slate-100" },
  { search: /bg-\[\#1A2133\]/g, replace: "bg-slate-50" },
  { search: /bg-\[\#334155\]/g, replace: "bg-slate-200" },
  { search: /bg-\[\#475569\]/g, replace: "bg-slate-300" },
  { search: /hover:bg-\[\#1A2133\]/g, replace: "hover:bg-slate-50" },
  { search: /hover:bg-\[\#1F2937\]/g, replace: "hover:bg-slate-100" },
  { search: /hover:bg-\[\#334155\]/g, replace: "hover:bg-slate-200" },
  { search: /text-\[\#F1F5F9\]/g, replace: "text-slate-900" },
  { search: /text-\[\#E2E8F0\]/g, replace: "text-slate-800" },
  { search: /text-\[\#CBD5E1\]/g, replace: "text-slate-700" },
  { search: /text-\[\#94A3B8\]/g, replace: "text-slate-600" },
  { search: /text-\[\#64748B\]/g, replace: "text-slate-500" },
  { search: /text-\[\#475569\]/g, replace: "text-slate-400" },
  { search: /border-\[\#1F2937\]/g, replace: "border-slate-200" },
  { search: /border-\[\#334155\]/g, replace: "border-slate-300" },
  { search: /border-\[\#475569\]/g, replace: "border-slate-400" },
  { search: /divide-\[\#1F2937\]/g, replace: "divide-slate-200" },
  { search: /ring-\[\#1F2937\]/g, replace: "ring-slate-200" },
  { search: /ring-\[\#334155\]/g, replace: "ring-slate-300" },
  { search: /shadow-black\/30/g, replace: "shadow-slate-200/50" },
  { search: /shadow-black\/50/g, replace: "shadow-slate-200" },
  { search: /from-\[\#131826\]/g, replace: "from-white" },
  { search: /to-\[\#0B0F19\]/g, replace: "to-slate-50" },
  { search: /from-\[\#0B0F19\]/g, replace: "from-slate-50" },
  { search: /to-\[\#131826\]/g, replace: "to-white" },
];

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

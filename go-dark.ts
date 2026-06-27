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
  // Backgrounds
  { search: /bg-\[\#F3F7F5\]/g, replace: "bg-[#0B0F19]" },
  { search: /bg-slate-50/g, replace: "bg-[#131826]" },
  { search: /bg-slate-100\/60/g, replace: "bg-[#0B0F19]" },
  { search: /bg-slate-100/g, replace: "bg-[#131826]" },
  { search: /bg-slate-200\/60/g, replace: "bg-[#1F2937]" },
  { search: /bg-slate-200\/50/g, replace: "bg-[#1F2937]" },
  { search: /bg-slate-200/g, replace: "bg-[#1A2133]" },
  { search: /bg-slate-300/g, replace: "bg-[#1F2937]" },
  { search: /bg-slate-400/g, replace: "bg-[#334155]" },
  { search: /bg-slate-500/g, replace: "bg-[#475569]" },
  { search: /bg-white/g, replace: "bg-[#131826]" },
  
  // Hover Backgrounds (often combined like hover:bg-slate-100)
  { search: /hover:bg-\[\#131826\]/g, replace: "hover:bg-[#1A2133]" }, // since white->#131826, hover:white->hover:#131826. But if it was hover:bg-slate-100 it becomes hover:bg-[#131826] which is fine.

  // Text colors
  { search: /text-slate-900/g, replace: "text-[#F1F5F9]" },
  { search: /text-slate-800/g, replace: "text-[#E2E8F0]" },
  { search: /text-slate-700/g, replace: "text-[#CBD5E1]" },
  { search: /text-slate-600/g, replace: "text-[#94A3B8]" },
  { search: /text-slate-500/g, replace: "text-[#64748B]" },
  { search: /text-slate-400/g, replace: "text-[#475569]" },
  
  // Borders
  { search: /border-slate-200/g, replace: "border-[#1F2937]" },
  { search: /border-slate-300/g, replace: "border-[#334155]" },
  { search: /border-slate-400/g, replace: "border-[#475569]" },
  { search: /divide-slate-200/g, replace: "divide-[#1F2937]" },
  { search: /ring-slate-200/g, replace: "ring-[#1F2937]" },
  { search: /ring-slate-300/g, replace: "ring-[#334155]" },

  // Shadows
  { search: /shadow-slate-200\/50/g, replace: "shadow-black/30" },
  { search: /shadow-slate-200/g, replace: "shadow-black/50" },

  // Gradients
  { search: /from-\[\#131826\]/g, replace: "from-[#131826]" },
  { search: /to-\[\#0B0F19\]/g, replace: "to-[#0B0F19]" },
  { search: /from-\[\#0B0F19\]/g, replace: "from-[#0B0F19]" },
  { search: /to-\[\#131826\]/g, replace: "to-[#131826]" },
];

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });
    
    // Fix any text color overrides on colored backgrounds
    // Emerald / Green backgrounds should keep white text instead of slate-900 (now #F1F5F9, which is fine)
    content = content.replace(/bg-\[\#00B67A\] text-\[\#F1F5F9\]/g, "bg-[#00B67A] text-white");
    content = content.replace(/bg-emerald-600 text-\[\#F1F5F9\]/g, "bg-emerald-600 text-white");
    content = content.replace(/bg-emerald-500 text-\[\#F1F5F9\]/g, "bg-emerald-500 text-white");
    content = content.replace(/bg-red-500 text-\[\#F1F5F9\]/g, "bg-red-500 text-white");
    content = content.replace(/bg-amber-500 text-\[\#F1F5F9\]/g, "bg-amber-500 text-white");
    content = content.replace(/bg-yellow-500 text-\[\#F1F5F9\]/g, "bg-yellow-500 text-white");
    content = content.replace(/bg-blue-500 text-\[\#F1F5F9\]/g, "bg-blue-500 text-white");
    content = content.replace(/bg-indigo-600 text-\[\#F1F5F9\]/g, "bg-indigo-600 text-white");
    content = content.replace(/bg-purple-600 text-\[\#F1F5F9\]/g, "bg-purple-600 text-white");
    content = content.replace(/bg-sky-500 text-\[\#F1F5F9\]/g, "bg-sky-500 text-white");
    content = content.replace(/bg-rose-500 text-\[\#F1F5F9\]/g, "bg-rose-500 text-white");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

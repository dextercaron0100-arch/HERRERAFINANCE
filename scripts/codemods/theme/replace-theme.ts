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
  { search: /bg-\[\#0F1113\]/g, replace: "bg-slate-50" },
  { search: /bg-\[\#141618\]/g, replace: "bg-white" },
  { search: /bg-\[\#181A1C\]/g, replace: "bg-white" },
  { search: /bg-\[\#1D2024\]/g, replace: "bg-slate-50 hover:bg-slate-100" }, // For hovers
  { search: /bg-\[\#1C1E22\]/g, replace: "bg-slate-50 hover:bg-slate-100" },
  { search: /bg-\[\#24272C\]/g, replace: "bg-slate-200" },
  { search: /bg-black\/20/g, replace: "bg-slate-100" },
  { search: /bg-black\/60/g, replace: "bg-slate-900/40" },
  { search: /bg-black\/80/g, replace: "bg-slate-900/60" },
  { search: /bg-black\/40/g, replace: "bg-slate-200" },
  { search: /bg-black\/50/g, replace: "bg-slate-300" },
  
  // Borders
  { search: /border-\[\#24272C\]/g, replace: "border-slate-200" },
  { search: /border-\[\#181A1C\]/g, replace: "border-slate-200" },
  { search: /border-\[\#141618\]/g, replace: "border-slate-200" },
  { search: /border-white\/10/g, replace: "border-slate-200" },
  { search: /border-white\/5/g, replace: "border-slate-200" },
  { search: /border-white\/20/g, replace: "border-slate-300" },
  { search: /divide-\[\#24272C\]/g, replace: "divide-slate-200" },
  { search: /ring-white\/50/g, replace: "ring-slate-300" },
  { search: /ring-white\/10/g, replace: "ring-slate-200" },

  // Text colors
  { search: /text-\[\#F1F5F9\]/g, replace: "text-slate-900" },
  { search: /text-white/g, replace: "text-slate-900" },
  { search: /text-zinc-200/g, replace: "text-slate-800" },
  { search: /text-zinc-300/g, replace: "text-slate-700" },
  { search: /text-zinc-400/g, replace: "text-slate-600" },
  { search: /text-zinc-500/g, replace: "text-slate-500" },
  { search: /text-zinc-650/g, replace: "text-slate-400" },
  { search: /text-gray-200/g, replace: "text-slate-800" },
  { search: /text-gray-300/g, replace: "text-slate-700" },
  { search: /text-gray-400/g, replace: "text-slate-600" },
  { search: /text-gray-500/g, replace: "text-slate-500" },
  
  // Shadows (light mode)
  { search: /shadow-\[0_8px_32px_rgba\(0,0,0,0\.4\)\]/g, replace: "shadow-xl shadow-slate-200" },
  { search: /shadow-\[0_8px_32px_rgba\(0,0,0,0\.2\)\]/g, replace: "shadow-lg shadow-slate-200" },
  { search: /shadow-black\/50/g, replace: "shadow-slate-200/50" },
  
  // Specific gradients
  { search: /from-\[\#181A1C\]/g, replace: "from-white" },
  { search: /to-\[\#141618\]/g, replace: "to-slate-50" },
  { search: /from-\[\#141618\]/g, replace: "from-slate-50" },
  { search: /to-\[\#0F1113\]/g, replace: "to-slate-100" },

  // Interactive Hovers
  { search: /bg-\[\#0D0D0D\]/g, replace: "bg-slate-50" },
  { search: /bg-\[\#1a1c1f\]\/40/g, replace: "bg-slate-100/40" },
  { search: /bg-\[\#1a1c1f\]/gi, replace: "bg-slate-100" },
  { search: /bg-\[\#1A1D21\]/g, replace: "bg-slate-100" },
  { search: /bg-\[\#2A2E33\]/g, replace: "bg-slate-200" },
  { search: /bg-\[\#1A1D20\]/g, replace: "bg-slate-50" },
  { search: /bg-\[\#1E2124\]/g, replace: "bg-slate-100" },
  { search: /bg-\[\#2c3035\]/g, replace: "bg-slate-300" },
  { search: /text-\[\#F1F5F9\]/g, replace: "text-slate-900" },
  { search: /text-\[\#E2E8F0\]/g, replace: "text-slate-900" },
  { search: /text-\[\#94A3B8\]/g, replace: "text-slate-500" },
  { search: /border-\[\#3A3E45\]/g, replace: "border-slate-300" },
  { search: /hover:bg-\[\#181A1C\]\/60/g, replace: "hover:bg-slate-100/60" },
  { search: /hover:bg-\[\#1D2024\]/g, replace: "hover:bg-slate-100" },
  { search: /hover:bg-\[\#1E2124\]/g, replace: "hover:bg-slate-100" },
  { search: /hover:bg-\[\#1A1D21\]/g, replace: "hover:bg-slate-100" },
  { search: /hover:bg-\[\#1A1C1F\]/g, replace: "hover:bg-slate-100" },
  { search: /hover:bg-\[\#2c3035\]/g, replace: "hover:bg-slate-300" },
  { search: /bg-\[\#1A1D20\]/g, replace: "bg-slate-50" },
  { search: /hover:bg-\[\#2A2E33\]/g, replace: "hover:bg-slate-100" },
  { search: /border-\[\#2A2E33\]/g, replace: "border-slate-200" },
  { search: /hover:bg-zinc-700\/50/g, replace: "hover:bg-slate-200/50" },
  { search: /hover:bg-white\/10/g, replace: "hover:bg-slate-200/50" },
  { search: /bg-white\/5/g, replace: "bg-slate-50" },
  { search: /bg-zinc-900/g, replace: "bg-slate-100" },
  { search: /bg-zinc-800/g, replace: "bg-slate-200" },
  { search: /bg-zinc-700/g, replace: "bg-slate-300" },
  { search: /bg-zinc-600/g, replace: "bg-slate-400" },
  { search: /bg-zinc-500/g, replace: "bg-slate-500" },
  { search: /bg-\[\#1A2E1A\]/g, replace: "bg-emerald-50" },
  { search: /border-\[\#235332\]/g, replace: "border-emerald-200" },
  { search: /bg-\[\#2D161A\]\/50/g, replace: "bg-red-50" },
  { search: /bg-\[\#2A1E14\]\/50/g, replace: "bg-amber-50" },
  { search: /bg-red-950\/40/g, replace: "bg-red-50" },
  { search: /border-red-800/g, replace: "border-red-200" },
  { search: /bg-rose-950\/40/g, replace: "bg-rose-50" },
  { search: /text-\[\#10B981\]/g, replace: "text-emerald-600" },
  { search: /hover:bg-\[\#2D161A\]\/80/g, replace: "hover:bg-red-100" },
  { search: /hover:bg-\[\#2A1E14\]\/80/g, replace: "hover:bg-amber-100" },
  { search: /bg-zinc-905/g, replace: "bg-white" },
  { search: /bg-zinc-850/g, replace: "bg-slate-100" },
  { search: /bg-zinc-805/g, replace: "bg-slate-200" },
  { search: /bg-zinc-750/g, replace: "bg-slate-300" },
  { search: /bg-zinc-450/g, replace: "bg-slate-400" },
  { search: /border-zinc-800/g, replace: "border-slate-200" },
  { search: /border-zinc-700/g, replace: "border-slate-200" },
  { search: /border-zinc-600/g, replace: "border-slate-300" },
  { search: /border-zinc-500/g, replace: "border-slate-300" },
  { search: /border-zinc-450/g, replace: "border-slate-400" },
  { search: /text-zinc-305/g, replace: "text-slate-600" },
];

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });
    
    // Manual overrides to keep text-white on colored backgrounds
    content = content.replace(/bg-\[\#00B67A\] text-slate-900/g, "bg-[#00B67A] text-white");
    content = content.replace(/bg-\[\#00B67A\]\/10 text-slate-900/g, "bg-[#00B67A]/10 text-slate-900");
    content = content.replace(/bg-indigo-600 text-slate-900/g, "bg-indigo-600 text-white");
    content = content.replace(/bg-blue-600 text-slate-900/g, "bg-blue-600 text-white");
    content = content.replace(/bg-red-500 text-slate-900/g, "bg-red-500 text-white");
    content = content.replace(/bg-green-500 text-slate-900/g, "bg-green-500 text-white");
    content = content.replace(/bg-amber-500 text-slate-900/g, "bg-amber-500 text-white");
    content = content.replace(/bg-yellow-500 text-slate-900/g, "bg-yellow-500 text-white");
    content = content.replace(/bg-purple-600 text-slate-900/g, "bg-purple-600 text-white");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});

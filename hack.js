const fs = require('fs');

function inject(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('useDBUpdate')) {
      content = content.replace(
         'import {',
         'import { useDBUpdate } from "../data/mockDatabase";\nimport {'
      );
      content = content.replace(
         /const [a-zA-Z0-9]+ = useMemo\(\(\) => \{/i,
         'const dbTick = useDBUpdate();\n  const activeTxns_dbtick = dbTick;\n$&'
      );
      content = content.replace(/useMemo\([\s\S]*?\}, \[(.*?)\]\);/g, (match, deps) => {
         // only add dbTick if not there
         if (!deps.includes('dbTick')) {
             return match.replace(`[${deps}]`, `[dbTick, ${deps}]`);
         }
         return match;
      });
      fs.writeFileSync(file, content);
      console.log('Injected dbTick into ' + file);
  }
}

inject('src/components/Dashboard.tsx');
inject('src/components/EnterpriseSuite.tsx');

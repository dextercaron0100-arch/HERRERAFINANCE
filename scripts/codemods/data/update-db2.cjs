const fs = require('fs');
let code = fs.readFileSync('src/data/mockDatabase.ts', 'utf8');
code = code.replace(
  'save(KEYS.TRANSACTIONS, mockTxns);',
  'save(KEYS.TRANSACTIONS, mockTxns);\n    if (db) {\n      import("firebase/firestore").then(({ doc, setDoc }) => {\n        setDoc(doc(db, "appData", KEYS.TRANSACTIONS), { data: mockTxns }, { merge: true });\n      });\n    }'
);
fs.writeFileSync('src/data/mockDatabase.ts', code);

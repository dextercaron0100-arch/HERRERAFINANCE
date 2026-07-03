const fs = require('fs');
let code = fs.readFileSync('src/data/mockDatabase.ts', 'utf8');
if (!code.includes('KEYS.TRANSACTIONS) && load(KEYS.TRANSACTIONS')) {
  const seedCode = `
  if (!localStorage.getItem(KEYS.TRANSACTIONS) || load<Transaction[]>(KEYS.TRANSACTIONS, []).length === 0) {
    justSeeded = true;
    const mockTxns: Transaction[] = [];
    const accounts = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
    const cats = load<Category[]>(KEYS.CATEGORIES, []);
    
    // Create initial capital
    SEED_COMPANIES.forEach(c => {
      const compAccounts = accounts.filter(a => a.companyId === c.id);
      const mainAcc = compAccounts.length > 0 ? compAccounts[0].id : '';
      const inCat = cats.find(cat => cat.companyId === c.id && cat.type === 'cash_in');
      
      if (mainAcc && inCat) {
        mockTxns.push({
          id: \`txn-seed-\${c.id}-1\`,
          companyId: c.id,
          txnDate: new Date().toISOString().split('T')[0],
          type: 'cash_in',
          amount: 500000,
          purpose: 'Initial Capital',
          categoryId: inCat.id,
          cashAccountId: mainAcc,
          paymentMethod: 'bank_transfer',
          referenceNo: 'DEP-001',
          responsiblePerson: 'Owner',
          status: 'completed',
          encodedBy: 'u-mark',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        mockTxns.push({
          id: \`txn-seed-\${c.id}-2\`,
          companyId: c.id,
          txnDate: new Date().toISOString().split('T')[0],
          type: 'cash_out',
          amount: 15000,
          purpose: 'Office Supplies',
          categoryId: cats.find(cat => cat.companyId === c.id && cat.type === 'cash_out')?.id || '',
          cashAccountId: mainAcc,
          paymentMethod: 'cash',
          referenceNo: 'EXP-001',
          responsiblePerson: 'Admin',
          status: 'completed',
          encodedBy: 'u-mark',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    save(KEYS.TRANSACTIONS, mockTxns);
  }
`;
  code = code.replace('// Push local seeding changes to firestore if needed', seedCode + '\n  // Push local seeding changes to firestore if needed');
  fs.writeFileSync('src/data/mockDatabase.ts', code);
}

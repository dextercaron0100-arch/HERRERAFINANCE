import React from 'react';

interface MoneyFlowProfitCenterProps {
  userId: string;
  companyId: string;
  isConsolidated: boolean;
}

export default function MoneyFlowProfitCenter({ userId, companyId, isConsolidated }: MoneyFlowProfitCenterProps) {
  return (
    <div className="w-full min-h-screen bg-gray-100 text-slate-900 p-4 md:p-6 lg:p-8 font-sans flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-serif text-slate-900 tracking-tight uppercase">Cash Flow</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">This section has been intentionally emptied per user request.</p>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, ArrowRight, Play } from "lucide-react";

export default function AccountingWorkflow({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const calculateProgress = (steps: any[]) => {
    const completed = steps.filter((step) => completedSteps[step.id]).length;
    return Math.round((completed / steps.length) * 100);
  };

  const workflows = [
    {
      title: "Daily Operations",
      description: "Tasks to complete at the start of each business day.",
      steps: [
        {
          id: "daily-1",
          title: "Review Dashboard & Approvals",
          desc: "Check the multi-entity dashboard for pending journal entries or transactions that require admin approval.",
          action: "Go to Dashboard",
          target: "dashboard",
        },
        {
          id: "daily-2",
          title: "Record Journal Entries",
          desc: "Scan receipts, let AI auto-categorize them, and enter them into the General Ledger.",
          action: "Open Ledger",
          target: "ledger",
        },
      ],
    },
    {
      title: "Weekly Treasury & Cash Management",
      description: "Ensure cash flow is positive and accounts are reconciled.",
      steps: [
        {
          id: "weekly-1",
          title: "Monitor Cash Balances",
          desc: "Use the Treasury view to monitor real-time banking positions across all entities.",
          action: "Go to Treasury",
          target: "treasury",
        },
        {
          id: "weekly-2",
          title: "Ask Herrera Intelligence",
          desc: "Use the AI Assistant to identify AR/AP anomalies and forecast cash flows.",
          action: "Ask Assistant",
          target: "financial_assistant",
        },
      ],
    },
    {
      title: "Bi-Weekly & Monthly Procedures",
      description: "End of month consolidation, tax, and payroll duties.",
      steps: [
        {
          id: "monthly-1",
          title: "Process Payroll",
          desc: "Review timesheets and run the payroll administration module.",
          action: "Run Payroll",
          target: "payroll",
        },
        {
          id: "monthly-2",
          title: "Multi-Entity Consolidations",
          desc: "Ensure intercompany transactions are synced and consolidated accurately.",
          action: "Sync Entities",
          target: "entities",
        },
        {
          id: "monthly-3",
          title: "Tax & Compliance Checks",
          desc: "Run automated tax compliance checks to generate audit-ready reports.",
          action: "Open Compliance",
          target: "tax_compliance",
        },
      ],
    },
    {
      title: "Quarterly / Annual Audit",
      description: "Preparation for external auditing.",
      steps: [
        {
          id: "annual-1",
          title: "Review Audit Log",
          desc: "Examine the immutable system audit trail to ensure data integrity and compliance.",
          action: "View Audit Trail",
          target: "audit",
        },
        {
          id: "annual-2",
          title: "Finalize Settings & Access",
          desc: "Verify that user roles and system configurations align with corporate policies.",
          action: "Check Settings",
          target: "settings",
        },
      ],
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-white tracking-tight">
          Accounting Workflow Guide
        </h1>
        <p className="text-zinc-400 mt-2 font-sans max-w-2xl text-sm leading-relaxed">
          Step-by-step standard operating procedures (SOPs) for the accounting team. Follow these guides to ensure all daily, weekly, and monthly tasks are completed efficiently within the system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow, idx) => {
          const progress = calculateProgress(workflow.steps);
          return (
            <div key={idx} className="bg-[#181A1C] border border-[#24272C] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div
                className="absolute top-0 left-0 h-1 bg-[#00B67A] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight font-display">
                    {workflow.title}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">{workflow.description}</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 bg-zinc-800/50 text-zinc-300 rounded border border-zinc-700">
                  {progress}% DONE
                </span>
              </div>

              <div className="space-y-4 mt-6">
                {workflow.steps.map((step) => {
                  const isDone = completedSteps[step.id];
                  return (
                    <div
                      key={step.id}
                      className={`flex gap-4 p-3 rounded-xl transition-all duration-200 border ${
                        isDone
                          ? "bg-[#00B67A]/10 border-[#00B67A]/30"
                          : "bg-[#1D2024] border-transparent hover:border-[#24272C]"
                      }`}
                    >
                      <button
                        onClick={() => toggleStep(step.id)}
                        className="mt-0.5 shrink-0 focus:outline-hidden cursor-pointer"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-[#00B67A]" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-500 hover:text-[#00B67A] transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`font-semibold text-sm transition-colors ${
                              isDone ? "text-[#00B67A]" : "text-zinc-200"
                            }`}
                          >
                            {step.title}
                          </h3>
                          <button
                            onClick={() => onNavigate(step.target)}
                            className="shrink-0 flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded cursor-pointer"
                          >
                            <span>{step.action}</span>
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 pr-4 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import {
  getCompanies,
  getTransactions,
  getBudgetVsActual,
} from "../data/mockDatabase";
import { useDBUpdate } from "../data/mockDatabase";

interface AlertsMenuProps {
  activeUserId: string;
}

export default function AlertsMenu({ activeUserId }: AlertsMenuProps) {
  const dbTick = useDBUpdate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const alerts = useMemo(() => {
    const companies = getCompanies();
    const newAlerts: {
      id: string;
      type: "approval" | "budget";
      title: string;
      message: string;
      timestamp: Date;
    }[] = [];

    // Pending Approvals
    let pendingCount = 0;
    companies.forEach((c) => {
      const pends = getTransactions(activeUserId, c.id).filter(
        (t) => t.status === "pending"
      ).length;
      pendingCount += pends;
    });

    if (pendingCount > 0) {
      newAlerts.push({
        id: "pend-approvals",
        type: "approval",
        title: "Pending Approvals",
        message: `You have ${pendingCount} pending transaction${pendingCount > 1 ? "s" : ""} requiring attention.`,
        timestamp: new Date(),
      });
    }

    // Budget Warnings (e.g. usage > 90%)
    companies.forEach((c) => {
      const bData = getBudgetVsActual(c.id, "2026-06-01");
      bData.forEach((b) => {
        if (b.plannedAmount > 0) {
          const usagePct = (b.actualAmount / b.plannedAmount) * 100;
          if (usagePct >= 90) {
            newAlerts.push({
              id: `budg-${c.id}-${b.categoryId}`,
              type: "budget",
              title: "Budget Alert",
              message: `${c.code}: ${b.categoryName} is at ${usagePct.toFixed(1)}% of planned budget.`,
              timestamp: new Date(),
            });
          }
        }
      });
    });

    return newAlerts;
  }, [dbTick, activeUserId]);

  return (
    <div className="relative font-sans" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex p-1.5 items-center justify-center bg-[#181A1C] border border-[#24272C] text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer"
        title="Alerts & Notifications"
      >
        <Bell className="w-4 h-4 md:w-3.5 md:h-3.5" />
        {alerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-[#141618]">
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#181A1C] border border-[#24272C] rounded-xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#24272C] bg-[#141618]">
            <h3 className="text-sm font-bold text-white tracking-wider uppercase font-display">
              Alerts
            </h3>
            <span className="text-[10px] bg-[#24272C] text-zinc-300 px-2 py-0.5 rounded-md font-mono">
              {alerts.length} new
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-[#00B67A] opacity-50 mb-2" />
                <p className="text-xs text-zinc-500 font-mono">
                  You're all caught up.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#24272C]/50">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 hover:bg-[#1D2024] transition-colors cursor-pointer"
                  >
                    <div
                      className={`shrink-0 p-2 rounded-lg flex items-center justify-center ${
                        alert.type === "budget"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {alert.type === "budget" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {alert.title}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          Just now
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed font-mono">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

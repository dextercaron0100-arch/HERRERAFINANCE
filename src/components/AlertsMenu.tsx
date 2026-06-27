import React, { useState, useMemo, useRef, useEffect } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
    <div className="relative font-sans shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex p-1.5 items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
        title="Alerts & Notifications"
      >
        <Bell className="w-4 h-4 md:w-3.5 md:h-3.5" />
        {alerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-slate-900 border border-slate-200">
            {alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden transform origin-top-right"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase font-display">
              Alerts
            </h3>
            <span className="text-[10px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md font-mono">
              {alerts.length} new
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-[#00B67A] opacity-50 mb-2" />
                <p className="text-xs text-slate-500 font-mono">
                  You're all caught up.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-200/50">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
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
                        <span className="text-xs font-bold text-slate-900">
                          {alert.title}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          Just now
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-mono">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

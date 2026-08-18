import React from "react";
import { BarChart3, Calendar } from "lucide-react";
import { DATASETS, DatasetId, PeriodState, RangePreset } from "../datasets";

interface DatasetPickerProps {
  selectedDatasetId: DatasetId;
  onSelectDataset: (id: DatasetId) => void;
  isConsolidated: boolean;
  period: PeriodState;
  onPeriodChange: (patch: Partial<PeriodState>) => void;
  question: string;
  onQuestionChange: (value: string) => void;
}

const DAY_OPTIONS = [7, 30, 90, 180, 365];
const MONTHS_BACK_OPTIONS = [3, 6, 12, 24];
const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "last_30", label: "Last 30 Days" },
  { id: "last_90", label: "Last 90 Days" },
  { id: "this_month", label: "This Month" },
  { id: "year_to_date", label: "Year to Date" },
  { id: "custom", label: "Custom Range" },
];

const selectClass =
  "px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 font-mono cursor-pointer";
const inputClass =
  "px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 font-mono";

export default function DatasetPicker({
  selectedDatasetId,
  onSelectDataset,
  isConsolidated,
  period,
  onPeriodChange,
  question,
  onQuestionChange,
}: DatasetPickerProps) {
  const selectedDataset = DATASETS.find((d) => d.id === selectedDatasetId) || DATASETS[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div>
        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" />
          Data Set
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {DATASETS.map((d) => {
            const disabled = d.consolidatedOnly && !isConsolidated;
            const active = d.id === selectedDatasetId;
            return (
              <button
                key={d.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectDataset(d.id)}
                title={disabled ? "Switch to Consolidated (ALL) to use this data set" : d.description}
                className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : disabled
                      ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                <div className="font-bold">{d.label}</div>
                <div className={`text-[10px] mt-0.5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                  {disabled ? "Requires Consolidated (ALL) view" : d.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Period
        </label>

        {selectedDataset.periodKind === "days" && (
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onPeriodChange({ days: d })}
                className={`${selectClass} ${period.days === d ? "border-slate-900 bg-slate-900 text-white" : ""}`}
              >
                {d}d
              </button>
            ))}
          </div>
        )}

        {selectedDataset.periodKind === "months" && (
          <div className="flex flex-wrap gap-2">
            {MONTHS_BACK_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onPeriodChange({ monthsBack: m })}
                className={`${selectClass} ${period.monthsBack === m ? "border-slate-900 bg-slate-900 text-white" : ""}`}
              >
                {m}mo
              </button>
            ))}
          </div>
        )}

        {selectedDataset.periodKind === "range" && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period.rangePreset}
              onChange={(e) => onPeriodChange({ rangePreset: e.target.value as RangePreset })}
              className={selectClass}
            >
              {RANGE_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            {period.rangePreset === "custom" && (
              <>
                <input
                  type="date"
                  value={period.customStart}
                  onChange={(e) => onPeriodChange({ customStart: e.target.value })}
                  className={inputClass}
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={period.customEnd}
                  onChange={(e) => onPeriodChange({ customEnd: e.target.value })}
                  className={inputClass}
                />
              </>
            )}
          </div>
        )}

        {selectedDataset.periodKind === "month" && (
          <input
            type="month"
            value={period.month.slice(0, 7)}
            onChange={(e) => onPeriodChange({ month: `${e.target.value}-01` })}
            className={inputClass}
          />
        )}
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5 block">
          Ask a question (optional)
        </label>
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder='e.g. "Why did expenses spike in July?" — refines the AI insight below, using this same chart data.'
          rows={2}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 resize-none"
        />
      </div>
    </div>
  );
}

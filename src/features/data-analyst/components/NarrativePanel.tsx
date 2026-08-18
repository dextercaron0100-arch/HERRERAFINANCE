import React from "react";
import { Loader2, Sparkles, RefreshCcw, Lightbulb, ArrowRight } from "lucide-react";

export interface DataAnalystInsight {
  narrative: string;
  headlineCallouts: { label: string; value: string }[];
  keyTakeaways: string[];
  recommendedAction: string;
}

interface NarrativePanelProps {
  aiAvailable: boolean;
  isGenerating: boolean;
  error: string | null;
  insight: DataAnalystInsight | null;
  question: string;
  datasetLabel: string;
  scopeLabel: string;
  periodLabel: string;
  context: unknown;
  onGenerate: () => void;
}

export default function NarrativePanel({
  aiAvailable,
  isGenerating,
  error,
  insight,
  question,
  datasetLabel,
  scopeLabel,
  periodLabel,
  context,
  onGenerate,
}: NarrativePanelProps) {
  if (!aiAvailable) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-800 font-mono">
        AI insight generation is not configured on this server. The chart and Excel export above are still fully
        available.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Insight
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            Written by AI from the exact numbers in the chart above — never invented figures.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : insight ? (
            <>
              <RefreshCcw className="w-3.5 h-3.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate AI Insight
            </>
          )}
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-xs text-red-700 font-mono">{error}</p>
          <button
            onClick={onGenerate}
            className="shrink-0 text-xs font-bold text-red-700 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      ) : null}

      {insight ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{insight.narrative}</p>

          {insight.headlineCallouts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {insight.headlineCallouts.map((c, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1">{c.label}</div>
                  <div className="text-sm font-mono font-bold text-slate-900">{c.value}</div>
                </div>
              ))}
            </div>
          )}

          {insight.keyTakeaways.length > 0 && (
            <ul className="space-y-1.5">
              {insight.keyTakeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          )}

          {insight.recommendedAction ? (
            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">
              <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <span className="font-bold">Recommended: </span>
                {insight.recommendedAction}
              </span>
            </div>
          ) : null}

          <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-600">
            <summary className="cursor-pointer select-none font-bold uppercase tracking-wider text-indigo-700">
              How this was calculated
            </summary>
            <div className="mt-2 space-y-1.5 leading-relaxed">
              <p><span className="font-bold text-slate-700">Dataset:</span> {datasetLabel}</p>
              <p><span className="font-bold text-slate-700">Scope:</span> {scopeLabel}</p>
              <p><span className="font-bold text-slate-700">Period:</span> {periodLabel}</p>
              {question ? <p><span className="font-bold text-slate-700">Question asked:</span> {question}</p> : null}
              <p className="font-bold text-slate-700">Data sent to AI:</p>
              <pre className="whitespace-pre-wrap break-words bg-white border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      ) : !isGenerating && !error ? (
        <p className="text-xs text-slate-500 font-mono py-2">
          Click "Generate AI Insight" to get a written summary of the chart above.
        </p>
      ) : null}
    </div>
  );
}

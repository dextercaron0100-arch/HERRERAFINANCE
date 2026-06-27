import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Transaction } from '../types';

interface ActivityHeatmapProps {
  transactions: Transaction[];
  days?: number;
}

export default function ActivityHeatmap({ transactions, days = 90 }: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts: Record<string, { count: number; amount: number }> = {};
    
    // Process transactions to map
    transactions.forEach(t => {
      const dateStr = t.txnDate;
      if (!counts[dateStr]) {
         counts[dateStr] = { count: 0, amount: 0 };
      }
      counts[dateStr].count += 1;
      counts[dateStr].amount += t.amount;
    });

    const data = [];
    let maxIntensity = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = counts[dateStr] || { count: 0, amount: 0 };
      if (entry.count > maxIntensity) {
         maxIntensity = entry.count;
      }
      data.push({
        dateStr,
        ...entry,
        dayOfWeek: d.getDay()
      });
    }

    // Organizing into weeks (7 columns) to resemble a contribution graph
    // Find the day of the week of the very first element
    const weeks = [];
    let currentWeek = [];
    
    // PAD previous days so the first column aligns to Sunday
    if (data.length > 0) {
       const firstDayOffset = data[0].dayOfWeek;
       for (let p = 0; p < firstDayOffset; p++) {
          currentWeek.push(null);
       }
    }

    data.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
       weeks.push(currentWeek);
    }

    return { weeks, maxIntensity };
  }, [transactions, days]);

  const getColor = (count: number, max: number) => {
    if (count === 0) return "bg-slate-50";
    
    const intensity = max > 0 ? count / max : 0;
    if (intensity < 0.2) return "bg-emerald-900/40";
    if (intensity < 0.5) return "bg-emerald-700/60";
    if (intensity < 0.8) return "bg-emerald-500/80";
    return "bg-[#00B67A]";
  };

  return (
    <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-lg mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
         <div>
           <h2 className="text-sm font-semibold text-slate-900 font-mono uppercase tracking-widest flex items-center gap-2">
             <Calendar className="w-4 h-4 text-[#00B67A]" />
             Activity Heatmap ({days} Days)
           </h2>
           <p className="text-xs text-slate-600 mt-1">
             Visualization of transaction frequency and intensity to identify usage spikes
           </p>
         </div>
      </div>
      
      <div className="w-full flex justify-center md:justify-start overflow-x-auto pb-4">
        <div className="flex gap-1.5 min-w-max pr-4">
          <div className="flex flex-col gap-1.5 justify-around mt-1">
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center">Sun</span>
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center opacity-0">Mon</span>
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center">Tue</span>
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center opacity-0">Wed</span>
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center">Thu</span>
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center opacity-0">Fri</span>
             <span className="text-[9px] font-mono text-slate-500 h-3 flex items-center">Sat</span>
          </div>

          <div className="flex gap-1.5">
            {heatmapData.weeks.map((week, wIdx) => (
               <div key={`week-${wIdx}`} className="flex flex-col gap-1.5">
                  {week.map((day, dIdx) => {
                     if (!day) return <div key={`empty-${wIdx}-${dIdx}`} className="w-3 h-3 rounded-sm opacity-0" />;
                     return (
                        <div
                           key={day.dateStr}
                           className={`w-3 h-3 rounded-sm group relative ${getColor(day.count, heatmapData.maxIntensity)} transition-colors`}
                        >
                           <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs text-center p-2 bg-white border border-slate-200 text-[10px] font-mono leading-tight shadow-xl rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              <div className="font-bold text-slate-900 mb-0.5">{new Date(day.dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</div>
                              <div className="text-slate-600">{day.count} transaction{day.count !== 1 ? 's' : ''}</div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-2 text-[10px] font-mono text-slate-600">
         <span>Less</span>
         <div className="w-3 h-3 rounded-sm bg-slate-50"></div>
         <div className="w-3 h-3 rounded-sm bg-emerald-900/40"></div>
         <div className="w-3 h-3 rounded-sm bg-emerald-700/60"></div>
         <div className="w-3 h-3 rounded-sm bg-emerald-500/80"></div>
         <div className="w-3 h-3 rounded-sm bg-[#00B67A]"></div>
         <span>More</span>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { DayProgress } from "../types";
import { 
  CalendarDays, 
  Trash2, 
  Bookmark, 
  Save, 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  FileText 
} from "lucide-react";
import { formatCZK } from "../utils/calculations";

interface HistoryLogProps {
  history: DayProgress[];
  totalSales: number;
  dailyGoal: number;
  selectedBranch?: string;
  onSaveDay: (notes: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({
  history,
  totalSales,
  dailyGoal,
  selectedBranch,
  onSaveDay,
  onDeleteItem,
  onClearHistory,
}) => {
  const [draftNotes, setDraftNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSave = () => {
    onSaveDay(draftNotes);
    setDraftNotes("");
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const percentFulfillment = dailyGoal > 0 ? Math.round((totalSales / dailyGoal) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              Historie a Ukládání
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Uložení dnešního pokroku a archivace směn
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => confirm("Opravdu si přejete smazat celou historii?") && onClearHistory()}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold transition-all cursor-pointer"
          >
            Smazat vše
          </button>
        )}
      </div>

      {/* Save Today Form */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
          Uložit aktuální stav dnešní směny
        </span>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            <span>
              <strong>{new Date().toLocaleDateString("cs-CZ")}</strong>
              {selectedBranch ? ` • Pobočka: ${selectedBranch}` : " (bez vybrané pobočky)"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="font-mono bg-white p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold">DOSAŽENÁ TRŽBA</span>
              <strong className="text-emerald-600 text-sm block">{formatCZK(totalSales)}</strong>
            </div>
            <div className="font-mono bg-white p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold">DENNÍ CÍL</span>
              <strong className="text-slate-800 text-sm block">{formatCZK(dailyGoal)}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase block">Poznámka k dnešní směně (nepovinné)</label>
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="např. Silný víkendový prodej, splněno díky nadstandardním nákupům služeb asistované aktivace."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 font-medium h-20 resize-none text-slate-700"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={totalSales === 0 && dailyGoal === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2' active:scale-[0.98] cursor-pointer shadow-md shadow-blue-150"
          >
            <Save className="w-4 h-4" />
            <span>Archivovat dnešní směnu ({percentFulfillment}%)</span>
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
          Archivované směny ({history.length})
        </span>

        {history.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-150 text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 opacity-20" />
            <p>Žádné záznamy v historii nejsou uloženy.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {history.map((item) => {
              const itemPct = item.dailyGoal > 0 ? Math.round((item.totalSales / item.dailyGoal) * 100) : 0;
              const isExpanded = expandedId === item.id;
              
              return (
                <div 
                  key={item.id} 
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-200"
                >
                  {/* Item Header bar */}
                  <div 
                    onClick={() => toggleExpand(item.id)}
                    className="p-3.5 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${itemPct >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{item.date}</span>
                          {item.selectedBranch && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[9px] uppercase tracking-wide">
                              {item.selectedBranch}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {formatCZK(item.totalSales)} / {formatCZK(item.dailyGoal)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                        itemPct >= 100 
                          ? "bg-emerald-100 text-emerald-700" 
                          : itemPct >= 75 
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-101 bg-slate-100 text-slate-600"
                      }`}>
                        {itemPct}%
                        {itemPct >= 100 && " ★"}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Opravdu chcete smazat tento záznam z historie?")) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-2 text-slate-350 hover:text-rose-500 hover:bg-rose-50/50 rounded-xl transition-all cursor-pointer"
                        title="Vymazat záznam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded block analysis */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 space-y-3 animate-in fade-in duration-250">
                      {item.notes && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-150/70 italic text-[11px] text-slate-550 leading-relaxed">
                          "{item.notes}"
                        </div>
                      )}
                      
                      {/* Hourly blocks summary */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                          Hodinový rozbor prodeje
                        </span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {item.hourlyBlocks.map((b) => (
                            <div key={b.id} className="bg-white p-2 border border-slate-100 rounded-xl text-[11px] font-mono flex flex-col justify-between">
                              <span className="text-slate-400 text-[9px] font-medium block leading-none mb-1">{b.label.split(" - ")[0]} h</span>
                              <div className="flex justify-between items-baseline leading-none">
                                <strong className="text-slate-800">{b.actualSales.toLocaleString()}</strong>
                                <span className="text-[8px] text-slate-400">/{b.originalGoal.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default HistoryLog;

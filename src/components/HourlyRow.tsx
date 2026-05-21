/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { CheckCircle2, MessageSquare, Plus, Minus, FileText } from "lucide-react";
import { HourlyBlock } from "../types";
import { formatCZK } from "../utils/calculations";

interface HourlyRowProps {
  block: HourlyBlock;
  status: "completed" | "active" | "future";
  onSalesChange: (id: number, value: number) => void;
  onToggleComplete: (id: number) => void;
  onNoteChange: (id: number, note: string) => void;
}

const HourlyRow: React.FC<HourlyRowProps> = ({
  block,
  status,
  onSalesChange,
  onToggleComplete,
  onNoteChange,
}) => {
  const [tempSales, setTempSales] = useState(block.actualSales.toString());
  const [showNoteField, setShowNoteField] = useState(!!block.note);

  // Sync state if actualSales changes from outside (e.g. presets or reset)
  useEffect(() => {
    setTempSales(block.actualSales === 0 ? "" : block.actualSales.toString());
  }, [block.actualSales]);

  const handleBlur = () => {
    const parsed = parseInt(tempSales.replace(/\s+/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSalesChange(block.id, parsed);
      setTempSales(parsed.toString());
    } else {
      onSalesChange(block.id, 0);
      setTempSales("");
    }
  };

  const handleAdjustValue = (amount: number) => {
    const nextVal = Math.max(0, block.actualSales + amount);
    onSalesChange(block.id, nextVal);
    setTempSales(nextVal === 0 ? "" : nextVal.toString());
  };

  const getStatusClasses = () => {
    switch (status) {
      case "completed":
        return "bg-slate-50/50 border-slate-100 opacity-75 hover:opacity-100";
      case "active":
        return "bg-emerald-50/30 border-emerald-200 shadow-sm ring-1 ring-emerald-100";
      case "future":
        default:
        return "bg-white border-slate-100 hover:border-slate-200";
    }
  };

  return (
    <div className={`border rounded-2xl p-4 transition-all duration-200 flex flex-col gap-3 ${getStatusClasses()}`}>
      
      {/* Top Main Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Time and Status Label */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleComplete(block.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              block.isCompleted
                ? "bg-emerald-500 text-white border-emerald-450"
                : "bg-slate-105 bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-350 hover:bg-emerald-50 hover:text-emerald-500"
            } border-2`}
            title={block.isCompleted ? "Označit jako nehotové" : "Označit jako hotové"}
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-700">{block.label}</span>
              {status === "active" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 bg-emerald-500"></span>
                  Probíhá
                </span>
              )}
            </div>
            
            {/* Target labels */}
            <div className="flex items-center gap-3.5 mt-0.5 text-xs">
              <span className="text-slate-400 font-medium">
                Původní plán: <strong className="text-slate-600 font-mono">{formatCZK(block.originalGoal)}</strong>
              </span>
              <span className="text-slate-400 font-medium">
                Upravený cíl:{" "}
                <strong className={`font-mono ${block.adjustedGoal !== block.originalGoal ? "text-blue-600 font-bold" : "text-slate-600"}`}>
                  {formatCZK(block.adjustedGoal)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Sales Input and Micro Controls */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Quick minus */}
          <button
            onClick={() => handleAdjustValue(-500)}
            disabled={block.actualSales === 0}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 cursor-pointer"
            title="-500 Kč"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Interactive input */}
          <div className="relative">
            <input
              type="text"
              value={tempSales}
              onChange={(e) => setTempSales(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleBlur()}
              placeholder="0"
              className="w-28 text-right pr-9 py-2 font-mono font-bold text-base rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all text-slate-800"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-350 select-none">Kč</span>
          </div>

          {/* Quick plus */}
          <button
            onClick={() => handleAdjustValue(1000)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="+1 000 Kč"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Comment/Note Toggle Button */}
          <button
            onClick={() => setShowNoteField(p => !p)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              block.note 
                ? "bg-slate-100 border-slate-200 text-slate-600" 
                : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
            title="Přidat poznámku k této hodině"
          >
            {block.note ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Optional Note Row */}
      {showNoteField && (
        <div className="pt-2 border-t border-dashed border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Poznámka:</span>
          <input
            type="text"
            value={block.note || ""}
            onChange={(e) => onNoteChange(block.id, e.target.value)}
            placeholder="např. slabý provoz, technické problémy s pokladnou, hodně zákazníků..."
            className="flex-1 bg-transparent border-b border-slate-200 pb-1 text-xs outline-none text-slate-600 focus:border-slate-400 font-medium"
          />
        </div>
      )}

    </div>
  );
};

export default HourlyRow;

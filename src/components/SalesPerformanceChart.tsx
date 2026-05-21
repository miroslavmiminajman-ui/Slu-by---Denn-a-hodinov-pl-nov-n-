/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { HourlyBlock } from "../types";
import { formatCZK } from "../utils/calculations";

interface SalesPerformanceChartProps {
  blocks: HourlyBlock[];
}

const SalesPerformanceChart: React.FC<SalesPerformanceChartProps> = ({ blocks }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    const vals = blocks.flatMap(b => [b.actualSales, b.originalGoal, b.adjustedGoal]);
    const maxVal = Math.max(...vals, 1000); // Prevent divide by zero
    return { maxVal };
  }, [blocks]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
      
      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Hodinový přehled výkonu
          </h4>
          <p className="text-xs text-slate-400 font-medium">
            Porovnání cílů a dosahované tržby
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold leading-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 block"></span>
            <span className="text-slate-500">Tržba</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-slate-350 bg-slate-50 block"></span>
            <span className="text-slate-500">Původní plán</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border border-blue-500 bg-white block"></span>
            <span className="text-slate-500">Dynamický cíl</span>
          </div>
        </div>
      </div>

      {/* Main SVG Container */}
      <div className="relative pt-4">
        <div className="w-full h-64 md:h-80 overflow-visible">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 320" preserveAspectRatio="none">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
              const yVal = 260 - ratio * 220;
              const textVal = Math.round(stats.maxVal * ratio);
              return (
                <g key={gridIdx} className="opacity-20">
                  <line 
                    x1="60" 
                    y1={yVal} 
                    x2="970" 
                    y2={yVal} 
                    stroke="#cbd5e1" 
                    strokeWidth="1" 
                    strokeDasharray={gridIdx === 0 ? "0" : "4 4"}
                  />
                  <text 
                    x="10" 
                    y={yVal + 4} 
                    fill="#475569" 
                    fontSize="11" 
                    fontWeight="700" 
                    fontFamily="monospace"
                  >
                    {textVal.toLocaleString("cs-CZ")}
                  </text>
                </g>
              );
            })}

            {/* Render Bars for each of the 12 blocks */}
            {blocks.map((block, idx) => {
              // Spacing math
              const totalWidth = 910;
              const colWidth = totalWidth / 12;
              const groupX = 60 + idx * colWidth + colWidth * 0.1;
              const barWidth = colWidth * 0.8;

              // Heights
              const scaleHeight = (val: number) => {
                return (val / stats.maxVal) * 220;
              };

              const actualH = scaleHeight(block.actualSales);
              const originalH = scaleHeight(block.originalGoal);
              const adjustedH = scaleHeight(block.adjustedGoal);

              // Grid baseline y is 260
              const actualY = 260 - actualH;
              const originalY = 260 - originalH;
              const adjustedY = 260 - adjustedH;

              const isHovered = hoveredIdx === idx;

              return (
                <g 
                  key={block.id} 
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer group"
                >
                  {/* Invisible broad trigger area to capture mouse hover easily */}
                  <rect 
                    x={groupX - colWidth * 0.05} 
                    y="10" 
                    width={colWidth} 
                    height="270" 
                    fill="transparent" 
                  />

                  {/* Highlight Column Area */}
                  {isHovered && (
                    <rect
                      x={groupX - 3}
                      y="15"
                      width={barWidth + 6}
                      height="250"
                      fill="#f1f5f9"
                      rx="8"
                      className="opacity-50 transition-all"
                    />
                  )}

                  {/* 1. Original planned dash rectangle */}
                  <rect
                    x={groupX + barWidth * 0.2}
                    y={originalY}
                    width={barWidth * 0.6}
                    height={originalH}
                    fill="#f8fafc"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    rx="4"
                    className="transition-all duration-300"
                  />

                  {/* 2. Actual Sales Solid Bar */}
                  <rect
                    x={groupX + barWidth * 0.15}
                    y={actualY}
                    width={barWidth * 0.7}
                    height={actualH}
                    fill={block.actualSales >= block.adjustedGoal && block.adjustedGoal > 0 ? "#10b981" : "#34d399"}
                    rx="5"
                    className="transition-all duration-500 ease-out hover:fill-emerald-500"
                  />

                  {/* 3. Recalculated Target line hook / dot */}
                  <circle
                    cx={groupX + barWidth * 0.5}
                    cy={adjustedY}
                    r="5"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all duration-300"
                  />

                  {/* Label for X axis */}
                  <text
                    x={groupX + barWidth * 0.5}
                    y="285"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {block.label.split(" - ")[0]}
                  </text>
                  <text
                    x={groupX + barWidth * 0.5}
                    y="298"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="medium"
                  >
                    h
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic HTML Tooltip inside React boundaries */}
        {hoveredIdx !== null && (
          <div 
            className="absolute z-20 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 text-xs w-60 pointer-events-none transition-all"
            style={{
              left: `${Math.min(
                Math.max(10, (hoveredIdx / 12) * 100 - 5), 
                75
              )}%`,
              top: "20px"
            }}
          >
            <div className="font-bold border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
              <span>Hodina {blocks[hoveredIdx].label}</span>
              {blocks[hoveredIdx].isCompleted ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
                  Uzavřeno
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-bold text-[9px] uppercase tracking-wider">
                  Do plánu
                </span>
              )}
            </div>
            
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between font-mono">
                <span>Skutečná tržba:</span>
                <strong className="text-white">{formatCZK(blocks[hoveredIdx].actualSales)}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span>Původní plán:</span>
                <span>{formatCZK(blocks[hoveredIdx].originalGoal)}</span>
              </div>
              {!blocks[hoveredIdx].isCompleted && (
                <div className="flex justify-between font-mono text-blue-400 font-bold">
                  <span>Dynamický cíl:</span>
                  <span>{formatCZK(blocks[hoveredIdx].adjustedGoal)}</span>
                </div>
              )}
              {blocks[hoveredIdx].note && (
                <div className="border-t border-slate-800 pt-1.5 mt-1.5 italic text-[11px] text-slate-400">
                  "{blocks[hoveredIdx].note}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SalesPerformanceChart;

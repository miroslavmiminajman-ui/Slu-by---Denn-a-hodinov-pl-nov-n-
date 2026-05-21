/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppSettings } from "../types";
import { Clock, Sliders, Sunset, Sun, Eye, Navigation } from "lucide-react";

interface TimeSimulatorProps {
  settings: AppSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const TimeSimulator: React.FC<TimeSimulatorProps> = ({ settings, onSettingsChange }) => {
  const toggleRealTime = () => {
    onSettingsChange(prev => ({
      ...prev,
      useRealTime: !prev.useRealTime
    }));
  };

  const handleHourChange = (newHour: number) => {
    onSettingsChange(prev => ({
      ...prev,
      simulatedHour: Math.min(23, Math.max(0, newHour))
    }));
  };

  const handleMinuteChange = (newMin: number) => {
    onSettingsChange(prev => ({
      ...prev,
      simulatedMinute: Math.min(59, Math.max(0, newMin))
    }));
  };

  const applyPreset = (h: number, m: number) => {
    onSettingsChange(prev => ({
      ...prev,
      useRealTime: false,
      simulatedHour: h,
      simulatedMinute: m
    }));
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Časový Simulátor
          </h4>
          <p className="text-xs text-slate-400 font-medium">
            Testování výpočtů v různých úsecích směny
          </p>
        </div>
      </div>

      {/* Real Time Switch */}
      <button
        onClick={toggleRealTime}
        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
          settings.useRealTime
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-amber-50/40 border-amber-200/60 text-amber-800 hover:border-amber-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${settings.useRealTime ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
          <span className="font-bold text-sm">
            {settings.useRealTime ? "Sledovat reálný systémový čas" : "Simulovat vlastní čas"}
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
          {settings.useRealTime ? "Aktivní" : "Simulace"}
        </span>
      </button>

      {/* Simulated Time Settings Drawer */}
      {!settings.useRealTime && (
        <div className="space-y-4 pt-2 border-t border-dashed border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* Slider Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hour Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold font-mono">
                <span>HODINA</span>
                <span className="text-amber-600 text-sm font-black">{settings.simulatedHour.toString().padStart(2, "0")} h</span>
              </div>
              <input
                type="range"
                min="0"
                max="23"
                value={settings.simulatedHour}
                onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-100 h-2 rounded-lg cursor-pointer appearance-none"
              />
            </div>

            {/* Minute Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold font-mono">
                <span>MINUTA</span>
                <span className="text-amber-600 text-sm font-black">{settings.simulatedMinute.toString().padStart(2, "0")} m</span>
              </div>
              <input
                type="range"
                min="0"
                max="59"
                value={settings.simulatedMinute}
                onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-105 bg-slate-100 h-2 rounded-lg cursor-pointer appearance-none"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Rychlá časová pásma:</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => applyPreset(10, 30)}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  settings.simulatedHour === 10 ? "bg-amber-500 border-amber-500 text-white" : "border-slate-100 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>10:30 (Dopole)</span>
              </button>
              
              <button
                onClick={() => applyPreset(13, 0)}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  settings.simulatedHour === 13 ? "bg-amber-500 border-amber-500 text-white" : "border-slate-100 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Sun className="w-3.5 h-3.5 animate-spin-slow" />
                <span>13:00 (Poledne)</span>
              </button>

              <button
                onClick={() => applyPreset(16, 45)}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  settings.simulatedHour === 16 ? "bg-amber-500 border-amber-500 text-white" : "border-slate-100 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Sunset className="w-3.5 h-3.5" />
                <span>16:45 (Ofic)</span>
              </button>

              <button
                onClick={() => applyPreset(19, 15)}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  settings.simulatedHour === 19 ? "bg-amber-500 border-amber-500 text-white" : "border-slate-100 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>19:15 (Závěr)</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default TimeSimulator;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Calculator, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  FileText, 
  ChevronDown, 
  Target,
  Info,
  PencilLine,
  FileDown,
  Star,
  Settings2,
  Clock,
  RotateCcw,
  Sparkles,
  Users,
  User,
  Flame,
  LayoutGrid,
  Link,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Shared Types
import { CalculationResult, HourlyBlock, AppSettings, DayProgress, SellerShare } from "./types";

// Util Functions
import { getRemainingDaysInfo } from "./utils/dateUtils";
import { 
  createDefaultBlocks, 
  recalculateHourlyBlocks, 
  getBlockStatus, 
  formatCZK 
} from "./utils/calculations";

// Custom Components
import MetricCard from "./components/MetricCard";
import HourlyRow from "./components/HourlyRow";
import SalesPerformanceChart from "./components/SalesPerformanceChart";
import TimeSimulator from "./components/TimeSimulator";
import HistoryLog from "./components/HistoryLog";

const App: React.FC = () => {
  // --- 1. State for Monthly Report/Excel (App 1) ---
  const [allCalculations, setAllCalculations] = useState<CalculationResult[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem("selectedBranch") || "";
  });
  const [manualOverrides, setManualOverrides] = useState<Record<string, { serviceAsistRevenue?: number; revenueRR?: number }>>(() => {
    const saved = localStorage.getItem("manualOverrides");
    return saved ? JSON.parse(saved) : {};
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(() => {
    return localStorage.getItem("uploadedFileName") || null;
  });
  const [defaultBranch, setDefaultBranch] = useState<string | null>(() => {
    return localStorage.getItem("defaultBranch");
  });
  const [weekendWeight, setWeekendWeight] = useState<number>(() => {
    const saved = localStorage.getItem("weekendWeight");
    return saved ? parseFloat(saved) : 0.6;
  });

  // --- 2. State for Hourly Shift Planner (App 2) ---
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem("sales_planner_daily_goal");
    return saved ? parseFloat(saved) : 12000;
  });
  const [sellerCount, setSellerCount] = useState<number>(() => {
    const saved = localStorage.getItem("sales_planner_seller_count");
    return saved ? parseInt(saved, 10) : 1;
  });
  const [sellers, setSellers] = useState<SellerShare[]>(() => {
    const saved = localStorage.getItem("sales_planner_seller_shares");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("sales_planner_settings");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      useRealTime: true,
      simulatedHour: 10,
      simulatedMinute: 30,
      defaultDailyGoal: 12000,
    };
  });
  const [blocks, setBlocks] = useState<HourlyBlock[]>(() => {
    const saved = localStorage.getItem("sales_planner_blocks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    return createDefaultBlocks(12000);
  });
  const [history, setHistory] = useState<DayProgress[]>(() => {
    const saved = localStorage.getItem("sales_planner_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  const [systemTime, setSystemTime] = useState<Date>(new Date());

  // --- 3. Merging/Integration Controls ---
  const [autoSyncGoal, setAutoSyncGoal] = useState<boolean>(() => {
    const saved = localStorage.getItem("auto_sync_goal");
    return saved ? saved === "true" : true;
  });
  const [includeLiveSales, setIncludeLiveSales] = useState<boolean>(() => {
    const saved = localStorage.getItem("include_live_sales");
    return saved ? saved === "true" : true;
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  // --- 4. Persistent Storage Syncs ---
  useEffect(() => {
    localStorage.setItem("weekendWeight", weekendWeight.toString());
  }, [weekendWeight]);

  useEffect(() => {
    localStorage.setItem("manualOverrides", JSON.stringify(manualOverrides));
  }, [manualOverrides]);

  useEffect(() => {
    localStorage.setItem("selectedBranch", selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    localStorage.setItem("sales_planner_daily_goal", dailyGoal.toString());
  }, [dailyGoal]);

  useEffect(() => {
    localStorage.setItem("sales_planner_seller_count", sellerCount.toString());
  }, [sellerCount]);

  useEffect(() => {
    localStorage.setItem("sales_planner_seller_shares", JSON.stringify(sellers));
  }, [sellers]);

  // Sync sellers array length with sellerCount and set equal shares
  useEffect(() => {
    if (sellers.length !== sellerCount) {
      const base = Math.floor(100 / sellerCount);
      const remainder = 100 % sellerCount;
      const newSellers = Array.from({ length: sellerCount }, (_, k) => {
        const sharePct = base + (k < remainder ? 1 : 0);
        const name = sellers[k]?.name || `Osoba ${k + 1}`;
        return { name, sharePct };
      });
      setSellers(newSellers);
    }
  }, [sellerCount, sellers.length]);

  useEffect(() => {
    localStorage.setItem("sales_planner_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("sales_planner_blocks", JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem("sales_planner_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("auto_sync_goal", autoSyncGoal.toString());
  }, [autoSyncGoal]);

  useEffect(() => {
    localStorage.setItem("include_live_sales", includeLiveSales.toString());
  }, [includeLiveSales]);

  // Automated shift blocks reset back to 0 when a new day is detected
  useEffect(() => {
    const todayDateStr = systemTime.toLocaleDateString("cs-CZ");
    const lastActiveDate = localStorage.getItem("sales_planner_last_active_date");

    if (lastActiveDate && lastActiveDate !== todayDateStr) {
      // It's a new day! Reset blocks back to 0.
      const resetBlocks = createDefaultBlocks(dailyGoal);
      setBlocks(resetBlocks);
    }
    
    // Always keep the stored date up-to-date
    localStorage.setItem("sales_planner_last_active_date", todayDateStr);
  }, [systemTime, dailyGoal]);

  // Clock Update Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Restore parsing from localStorage if available
  useEffect(() => {
    const cachedData = localStorage.getItem("parsedExcelData");
    if (cachedData) {
      try {
        setAllCalculations(JSON.parse(cachedData));
      } catch (err) {
        /* ignore parsing caches */
      }
    }
  }, []);

  // --- 5. Resolve Active Time of Day ---
  const currentHour = settings.useRealTime ? systemTime.getHours() : settings.simulatedHour;
  const currentMinute = settings.useRealTime ? systemTime.getMinutes() : settings.simulatedMinute;

  // Render Time representation
  const getSystemTimeStr = () => {
    return systemTime.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getSystemDateStr = () => {
    return systemTime.toLocaleDateString("cs-CZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // --- 6. Math Recalculation for Monthly Excel Data ---
  const availableBranches = useMemo(() => {
    return Array.from(new Set(allCalculations.map(c => c.branchName))).sort();
  }, [allCalculations]);

  // Hourly Scheduler stats (total sales today)
  const totalSalesToday = useMemo(() => {
    return blocks.reduce((sum, b) => sum + b.actualSales, 0);
  }, [blocks]);

  const filteredResult = useMemo(() => {
    if (!selectedBranch) return null;
    const baseData = allCalculations.find(c => c.branchName === selectedBranch);
    if (!baseData) return null;

    const branchOverrides = manualOverrides[selectedBranch];
    const currentServiceAsist = branchOverrides?.serviceAsistRevenue ?? baseData.serviceAsistRevenue;
    const currentRevenueRR = branchOverrides?.revenueRR ?? baseData.revenueRR;
    
    const daysInfo = getRemainingDaysInfo();
    const weightedDays = daysInfo.weekdays + (weekendWeight * daysInfo.weekends);
    
    // TWO-WAY INTERACTION!
    // If includeLiveSales is active, the today's completed hourly sales sum 'totalSalesToday'
    // is added to the general cumulative 'currentServiceAsist' so it updates live the target!
    const activeServiceAsistRevenue = includeLiveSales 
      ? currentServiceAsist + totalSalesToday 
      : currentServiceAsist;

    const remainingTotalRevenue = (currentRevenueRR * baseData.planAsrServicesRevenue) - activeServiceAsistRevenue;
    const recalculatedFinalValue = weightedDays > 0 ? remainingTotalRevenue / weightedDays : 0;

    return {
      ...baseData,
      serviceAsistRevenue: currentServiceAsist, // base without today's live
      activeServiceAsistRevenue, // with today's live if toggled
      revenueRR: currentRevenueRR,
      finalValue: recalculatedFinalValue
    };
  }, [allCalculations, selectedBranch, manualOverrides, weekendWeight, totalSalesToday, includeLiveSales]);

  // Calculated Today's Target based on whether today is weekend or weekday
  const calcTodayTarget = useMemo(() => {
    if (!filteredResult) return 0;
    const daysInfo = getRemainingDaysInfo();
    const isWeekend = daysInfo.isTodayWeekend;
    const rawTarget = isWeekend 
      ? filteredResult.finalValue * weekendWeight 
      : filteredResult.finalValue;
    return Math.max(0, Math.round(rawTarget));
  }, [filteredResult, weekendWeight]);

  // Trigger Goal Synchronization automatically if checked
  useEffect(() => {
    if (autoSyncGoal && calcTodayTarget > 0) {
      setDailyGoal(calcTodayTarget);
    }
  }, [calcTodayTarget, autoSyncGoal]);

  // Re-distributes hourly goals based on dailyGoal state
  useEffect(() => {
    setBlocks(prev => {
      const perHour = Math.round(dailyGoal / prev.length);
      return prev.map(b => ({
        ...b,
        originalGoal: perHour,
        adjustedGoal: b.isCompleted ? b.adjustedGoal : perHour
      }));
    });
  }, [dailyGoal]);

  // Progress calculations for MTD Progress Bar (Monthly)
  const progressStats = useMemo(() => {
    if (!filteredResult) return { percent: 0, target: 0 };
    const target = filteredResult.revenueRR * filteredResult.planAsrServicesRevenue;
    
    // We use active value (with today's live if clicked)
    const current = filteredResult.activeServiceAsistRevenue;
    const percent = target > 0 ? (current / target) * 100 : 0;
    return { percent, target };
  }, [filteredResult]);

  // Recalculates Hourly blocks sequence based on clock & actual entries
  const processedBlocks = recalculateHourlyBlocks(
    dailyGoal,
    blocks,
    currentHour,
    currentMinute,
    settings.useRealTime
  );

  const totalGoalReachedPct = dailyGoal > 0 ? Math.round((totalSalesToday / dailyGoal) * 100) : 0;
  const remainingGoalValue = Math.max(0, dailyGoal - totalSalesToday);

  // Count remaining hours
  const remainingSlots = processedBlocks.filter(b => !b.isCompleted);
  const numRemainingHours = remainingSlots.length;

  // Speed required per remaining slot
  const nextTargetHourlySalesVal = numRemainingHours > 0 
    ? Math.round(remainingGoalValue / numRemainingHours) 
    : 0;

  // --- 7. Event Handlers ---
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setFileName(file.name);
    setAllCalculations([]);
    setManualOverrides({});
    localStorage.removeItem("parsedExcelData");
    localStorage.removeItem("uploadedFileName");
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const ab = e.target?.result;
          const wb = XLSX.read(ab, { type: "array" });
          
          const targetSheetName = "Branch Performance";
          let ws = wb.Sheets[targetSheetName];
          if (!ws) ws = wb.Sheets[wb.SheetNames[0]];

          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (rows.length < 5) {
            throw new Error("Soubor je příliš krátký. Záhlaví musí být na 5. řádku.");
          }

          const headerRow = rows[4];
          const findColIndex = (names: string[]) => {
            return headerRow.findIndex(cell => 
              cell && names.some(name => String(cell).toLowerCase().trim() === name.toLowerCase().trim())
            );
          };

          const colIdxBranch = findColIndex(["BranchName", "Pobočka"]);
          const colIdxRevRR = findColIndex(["Revenue RR"]);
          const colIdxServAsist = findColIndex(["Service Asist Revenue"]);
          const colIdxPlanAsr = findColIndex(["Plan ASR Services/Revenue", "Plan ASR Services / Revenue"]);

          if (colIdxBranch === -1 || colIdxRevRR === -1 || colIdxServAsist === -1 || colIdxPlanAsr === -1) {
            setError("Nepodařilo se najít všechny sloupce. Zkontrolujte názvy v Excelu na 5. řádku.");
            setIsProcessing(false);
            return;
          }

          const daysInfo = getRemainingDaysInfo();
          const results: CalculationResult[] = [];

          for (let i = 5; i < rows.length; i++) {
            const row = rows[i];
            const branchVal = row[colIdxBranch]?.toString().trim();
            
            if (branchVal) {
              const parseVal = (val: any) => {
                if (typeof val === "number") return val;
                if (!val) return 0;
                const cleaned = String(val).replace(/\s/g, "").replace(",", ".");
                const num = parseFloat(cleaned);
                return isNaN(num) ? 0 : num;
              };

              const revRR = Math.round(parseVal(row[colIdxRevRR]));
              const planAsr = parseVal(row[colIdxPlanAsr]);
              const serAsist = Math.round(parseVal(row[colIdxServAsist]));

              if (revRR === 0 && planAsr === 0) continue;

              results.push({
                branchName: branchVal,
                revenueRR: revRR,
                planAsrServicesRevenue: planAsr,
                serviceAsistRevenue: serAsist,
                daysRemaining: daysInfo.total,
                weekdaysRemaining: daysInfo.weekdays,
                weekendsRemaining: daysInfo.weekends,
                isTodayWeekend: daysInfo.isTodayWeekend,
                finalValue: 0, 
                rawRow: row
              });
            }
          }

          setAllCalculations(results);
          localStorage.setItem("parsedExcelData", JSON.stringify(results));
          localStorage.setItem("uploadedFileName", file.name);
          
          const savedDefault = localStorage.getItem("defaultBranch");
          if (savedDefault && results.some(r => r.branchName === savedDefault)) {
            setSelectedBranch(savedDefault);
          } else {
            setSelectedBranch("");
          }
          
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Chyba při nahrávání.");
      setIsProcessing(false);
    }
  };

  const handleUpdateOverride = (field: "serviceAsistRevenue" | "revenueRR", newValue: number) => {
    if (!selectedBranch) return;
    setManualOverrides(prev => ({
      ...prev,
      [selectedBranch]: {
        ...(prev[selectedBranch] || {}),
        [field]: newValue
      }
    }));
  };

  const handleSetDefaultBranch = () => {
    if (selectedBranch) {
      localStorage.setItem("defaultBranch", selectedBranch);
      setDefaultBranch(selectedBranch);
    }
  };

  const handleExportPDF = async () => {
    if (!resultsRef.current || !filteredResult) return;

    const element = resultsRef.current;
    const indicators = element.querySelectorAll(".edit-indicator");
    indicators.forEach(el => ((el as HTMLElement).style.opacity = "0"));

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio * 0.95;
      const finalHeight = imgHeight * ratio * 0.95;
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
      pdf.save(`Report_${filteredResult.branchName.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("cs-CZ")}.pdf`);
    } catch (err) {
      console.error("Chyba při exportu PDF:", err);
      alert("Nepodařilo se vygenerovat PDF. Zkuste to prosím znovu.");
    } finally {
      indicators.forEach(el => ((el as HTMLElement).style.opacity = ""));
    }
  };

  // Hourly Scheduler Actions
  const updateActualSales = (id: number, val: number) => {
    const safeVal = Math.max(0, val);
    setBlocks(prev => 
      prev.map(block => 
        block.id === id ? { ...block, actualSales: safeVal } : block
      )
    );
  };

  const toggleBlockCompleted = (id: number) => {
    setBlocks(prev => 
      prev.map(block => 
        block.id === id ? { ...block, isCompleted: !block.isCompleted } : block
      )
    );
  };

  const updateBlockNote = (id: number, val: string) => {
    setBlocks(prev => 
      prev.map(block => 
        block.id === id ? { ...block, note: val } : block
      )
    );
  };

  const handleResetDay = () => {
    if (confirm("Opravdu si přejete vymazat všechna dnešní plnění v plánovači a začít znovu?")) {
      const resetBlocks = createDefaultBlocks(dailyGoal);
      setBlocks(resetBlocks);
    }
  };

  const handleSaveCurrentDay = (dayNotes: string) => {
    const todayStr = new Date().toLocaleDateString("cs-CZ", {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    
    const newLog: DayProgress = {
      id: Date.now().toString(),
      date: todayStr,
      selectedBranch: selectedBranch || undefined,
      dailyGoal: dailyGoal,
      totalSales: totalSalesToday,
      hourlyBlocks: [...blocks],
      notes: dayNotes || undefined
    };

    setHistory(prev => [newLog, ...prev]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  // Motivational quote based on completion percentage for hourly shift
  const getMotivationalMessage = () => {
    if (totalGoalReachedPct >= 100) {
      if (numRemainingHours > 0) {
        return `CÍL POKOŘEN (${totalGoalReachedPct}%)! Fantastická práce. S ${numRemainingHours}h do konce dnes vybudujeme historický rekord! 🏆🚀`;
      }
      return `MIMOŘÁDNÝ ÚSPĚCH! Plán dnešní směny splněn na ${totalGoalReachedPct}%! Perfektní týmový finiš! 🎉🏅👑`;
    }

    if (numRemainingHours === 0) {
      if (totalGoalReachedPct >= 80) {
        return `Konec provozu. Dosáhli jsme parádních ${totalGoalReachedPct}%. Chyběl jen malý kousek, skvělý boj! 👏🎯`;
      }
      return `Směna skončila na ${totalGoalReachedPct}%. Odpočiňte si, načerpejte síly a zítra to s kávou v ruce rozjedeme znovu! 💪☕`;
    }

    if (numRemainingHours <= 3) {
      if (totalGoalReachedPct >= 80) {
        return `Zbývají jen ${numRemainingHours}h! Jsme na ${totalGoalReachedPct}%. Posledních pár asistencí a cíl je stoprocentně náš! ⚡🔥`;
      }
      if (totalGoalReachedPct < 50) {
        const perPerson = Math.round(nextTargetHourlySalesVal / sellerCount);
        return `Finální ${numRemainingHours}h! Abychom dosáhli cíle, potřebujeme ${perPerson.toLocaleString("cs-CZ")} Kč/h na osobu. Pojďme máknout! 🚀🔥`;
      }
      return `Blíží se závěr (${numRemainingHours}h zbývá). S ${totalGoalReachedPct}% plněním nasaďte finální spurt pro dosažení mety! 💪🏁`;
    }

    // Middle of the shift (4 to 8 hours remaining)
    if (numRemainingHours <= 8) {
      if (totalGoalReachedPct >= 50) {
        return `Parádní tempo! Jsme v polovině s ${totalGoalReachedPct}% plněním a zbývajícími ${numRemainingHours}h. Dnes míříme vysoko! 💎✨`;
      }
      const perPerson = Math.round(nextTargetHourlySalesVal / sellerCount);
      return `Máme před sebou ještě ${numRemainingHours}h. Cíl vyžaduje rozumných ${perPerson.toLocaleString("cs-CZ")} Kč/h na každého z nás. Držíme palce! 👍🎯`;
    }

    // Start of the shift (9+ hours remaining)
    if (totalGoalReachedPct > 15) {
      return `Skvělý start směny! Už máme ${totalGoalReachedPct}% a zbývá silných ${numRemainingHours}h. Dnešek vypadá nadmíru slibně! 🌅📈`;
    }
    return `Začátek směny (${numRemainingHours}h zbývá). Vykročme pravou nohou a nastartujme den první asistovanou službou! ✨☕`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
      
      {/* Top Professional Header Navigation */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl px-4 py-4 md:py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                Služby <span className="text-blue-500 font-medium">| Denní &amp; Hodinové Řízení</span>
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
            {/* Realtime / Simulated clock information */}
            <div className="text-right bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-1.5 flex items-center gap-3.5 shadow-inner">
              <span className="text-xs text-slate-450 font-bold block leading-tight">
                {getSystemDateStr()}
              </span>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${settings.useRealTime ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
                <span className="text-xs font-black font-mono text-white tracking-widest leading-none">
                  {settings.useRealTime ? getSystemTimeStr() : `${settings.simulatedHour.toString().padStart(2, "0")}:${settings.simulatedMinute.toString().padStart(2, "0")}`}
                </span>
              </div>
            </div>

            {selectedBranch && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/20 border border-blue-900/40 px-3 py-1.5 rounded-xl font-bold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AKTIVNÍ: {selectedBranch}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Contents Space */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-12">
        
        {/* Dynamic Connected Connection Banner hidden visually from page */}
        {/* ==========================================
            MONTHLY PERFORMANCE AND EXCEL PARSING 
            ========================================== */}
        <div className="space-y-8">

          {/* Excel File Upload Drag-and-Drop Dropzone Card (Sleek Compact Variant) */}
          <div className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-300
            ${fileName ? "border-green-200 bg-green-50/10 shadow-xs" : "border-slate-200 bg-white hover:border-blue-300 shadow-xs"}`}>
            {!fileName && (
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${fileName ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-500"}`}>
                {fileName ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div className="text-center sm:text-left space-y-0.5">
                <p className="text-sm md:text-base font-bold text-slate-800">{fileName || "Vyber aktuální Denní Hlášení (Excel)"}</p>
                {fileName && (
                  <p className="text-xs text-slate-400 font-medium">
                    Denní hlášení je úspěšně analyzováno v paměti aplikace
                  </p>
                )}
              </div>
              {fileName && (
                <button 
                  onClick={() => {
                    setFileName(null);
                    setAllCalculations([]);
                    setManualOverrides({});
                    setSelectedBranch("");
                    localStorage.removeItem("parsedExcelData");
                    localStorage.removeItem("uploadedFileName");
                  }} 
                  className="text-xs text-rose-500 font-black uppercase tracking-wider hover:text-rose-600 transition-colors relative z-20 sm:ml-auto px-4 py-2 hover:bg-rose-50 rounded-xl"
                >
                  Vyměnit soubor
                </button>
              )}
            </div>
          </div>

          {allCalculations.length > 0 && (
            <div className="space-y-8">
              
              {/* Branch Selection & Preferences Card - LAYOUT AS A ROW UNDER THE FILE UPLOAD */}
              <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Column 1: Info and Decorative line */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-1 h-5 bg-blue-500 rounded-full animate-pulse" />
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Nastavení pobočky</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Výběr & váha víkendových dnů</p>
                  </div>
                </div>

                {/* Column 2: Selected Branch Dropdown */}
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Vyberte sledovanou pobočku</label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <select 
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:border-blue-500 transition-all cursor-pointer text-slate-700"
                      >
                        <option value="">Vyberte pobočku...</option>
                        {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                    {selectedBranch && (
                      <button
                        onClick={handleSetDefaultBranch}
                        title="Nastavit jako moji výchozí pobočku"
                        className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${defaultBranch === selectedBranch ? "bg-amber-100 border-amber-200 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-amber-250 hover:text-amber-500"}`}
                      >
                        <Star className={`w-4 h-4 ${defaultBranch === selectedBranch ? "fill-amber-500" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Column 3: Weekend weight slider inside selection row */}
                <div className="flex-1 min-w-[220px] space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Váha víkendu</label>
                    <span className="text-xs font-black text-blue-600 font-mono">{Math.round(weekendWeight * 100)} %</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                    <Settings2 className="w-4 h-4 text-slate-450 shrink-0" />
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(weekendWeight * 105) > 100 ? 100 : Math.round(weekendWeight * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setWeekendWeight(val / 100);
                      }}
                      className="w-full accent-blue-600 bg-slate-150 h-1 rounded-lg cursor-pointer appearance-none"
                    />
                  </div>
                </div>

                {/* Column 4: PDF Export if any branch is selected */}
                {selectedBranch && (
                  <div className="shrink-0 flex items-center self-end md:self-center">
                    <button
                      onClick={handleExportPDF}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer text-xs shadow-sm bg-slate-900"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Exportovat do PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* INTEGRATED: Calculations Target Section & Hourly Shift Planner are bundled as one seamless section */}
              {selectedBranch && filteredResult ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  
                  {/* Unified Dashboard Card (Combines calculations and today progress into a single scroll-free, unified element) */}
                  <div 
                    className="bg-slate-900 text-white rounded-[2.2rem] border border-slate-800 shadow-xl overflow-hidden relative" 
                    ref={resultsRef}
                  >
                    {/* Glowing decorative ambient meshes */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
                      
                      {/* Left Part: MTD Analysis & Target (Equal weight columns for perfect symmetry) */}
                      <div className="p-6 md:p-10 flex flex-col justify-between space-y-7">
                        <div className="space-y-6">
                          
                          <div className="flex flex-col justify-between min-h-[175px] md:min-h-[190px] lg:h-[215px] lg:min-h-[215px] space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Target className="w-8 h-8 text-blue-400 animate-pulse" />
                                <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-200">Dnešní cíl ASR<span className="normal-case">s</span></h3>
                              </div>
                              <span className="text-sm md:text-base font-extrabold bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-white shadow-md leading-none h-10 flex items-center shrink-0">
                                Pobočka: {filteredResult.branchName}
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              <div className="text-5xl md:text-6xl lg:text-7xl font-sans font-black tracking-tighter text-blue-400 drop-shadow-[0_4px_12px_rgba(59,130,246,0.35)] leading-none select-all animate-fade-in">
                                {calcTodayTarget.toLocaleString("cs-CZ")} <span className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-400 tracking-normal">CZK</span>
                              </div>
                              
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {filteredResult.isTodayWeekend ? (
                                  <div className="inline-flex items-center gap-1.5 h-7 text-[11px] font-black text-amber-400 bg-amber-400/10 px-3 py-0.5 rounded-xl border border-amber-400/20 uppercase tracking-wider">
                                    <Info className="w-4 h-4" />
                                    <span>Víkend ({Math.round(weekendWeight * 100)} % váha)</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 h-7 text-[11px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-0.5 rounded-xl border border-emerald-400/20 uppercase tracking-wider">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Všední den (100 %)</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 h-7 bg-slate-950/50 text-slate-300 border border-slate-850 px-3 py-0.5 rounded-xl text-[11px] font-extrabold shadow-sm transition-colors hover:bg-slate-950">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={autoSyncGoal} 
                                      onChange={(e) => setAutoSyncGoal(e.target.checked)}
                                      className="w-4 h-4 accent-blue-500 rounded border-slate-700 bg-slate-900"
                                    />
                                    <span>Auto-sync</span>
                                  </label>
                                </div>

                                <div className="flex items-center gap-2 h-7 bg-slate-950/50 text-slate-300 border border-slate-850 px-3 py-0.5 rounded-xl text-[11px] font-extrabold shadow-sm transition-colors hover:bg-slate-950">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={includeLiveSales} 
                                      onChange={(e) => setIncludeLiveSales(e.target.checked)}
                                      className="w-4 h-4 accent-blue-500 rounded border-slate-700 bg-slate-900"
                                    />
                                    <span>Live MTD</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick editable stats row blocks (compact custom cards tailored for dark mode - scaled up) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4.5 border-t border-slate-800/80">
                            {/* PREDIKOVANÝ OBRAT */}
                            <div 
                              className="bg-slate-950/35 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-3.5 transition-all group shadow-inner flex flex-col justify-between h-[110px]"
                            >
                              <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none shrink-0 font-sans">
                                <span className="select-none">Predikovaný obrat</span>
                                <PencilLine className="w-4 h-4 text-blue-400 opacity-55 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={Math.round(filteredResult.revenueRR) || ""}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    handleUpdateOverride("revenueRR", isNaN(num) ? 0 : num);
                                  }}
                                  className="w-full bg-transparent p-0 font-mono font-black text-lg md:text-xl text-slate-100 border-[1.5px] border-transparent hover:border-slate-850 focus:border-blue-500 rounded px-1.5 py-0.5 focus:ring-0 focus:outline-none leading-none -ml-1.5"
                                />
                                <span className="text-xs text-slate-500 font-bold ml-1 select-none shrink-0">Kč</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold leading-none shrink-0 select-none">
                                Odhadovaný výsledek
                              </div>
                            </div>

                            {/* ASR SLUŽBY */}
                            <div 
                              className="bg-slate-950/35 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3.5 transition-all group shadow-inner flex flex-col justify-between h-[110px]"
                              title={includeLiveSales && totalSalesToday > 0 ? `Zahrnuje dnes prodaných ${totalSalesToday.toLocaleString()} Kč z živé směny` : undefined}
                            >
                              <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none shrink-0 font-sans">
                                <span className={includeLiveSales ? "text-emerald-400 font-bold select-none" : "select-none"}>ASR Služby ({includeLiveSales ? "LIVE" : "HIST"})</span>
                                <PencilLine className="w-4 h-4 text-emerald-400 opacity-55 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={Math.round(filteredResult.serviceAsistRevenue) || ""}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    handleUpdateOverride("serviceAsistRevenue", isNaN(num) ? 0 : num);
                                  }}
                                  className="w-full bg-transparent p-0 font-mono font-black text-lg md:text-xl text-emerald-400 border-[1.5px] border-transparent hover:border-slate-850 focus:border-emerald-500 rounded px-1.5 py-0.5 focus:ring-0 focus:outline-none leading-none -ml-1.5"
                                />
                                <span className="text-xs text-emerald-600 font-bold ml-1 select-none shrink-0">Kč</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold leading-none shrink-0 select-none">
                                {includeLiveSales ? `Live: ${Math.round(filteredResult.activeServiceAsistRevenue).toLocaleString("cs-CZ")} Kč` : "Historická data měsíce"}
                              </div>
                            </div>
                          </div>

                          {/* Minimalist style line info displaying plan asr services to save space */}
                          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/25 px-4 py-2 rounded-xl border border-slate-800/60 shadow-inner">
                            <span className="font-bold uppercase tracking-wider">Plán služeb:</span>
                            <span className="font-mono font-black text-slate-100">
                              {(filteredResult.planAsrServicesRevenue * 105) > 100 ? "100" : (filteredResult.planAsrServicesRevenue * 100).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} %
                            </span>
                          </div>

                          {/* Month Progress Bar (Highly visible yet compact design) */}
                          <div className="bg-slate-950/45 border border-slate-850 rounded-2xl p-4 shadow-md">
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-400 mb-2 leading-none uppercase tracking-widest">
                                <span>Měsíční plnění plánu</span>
                                <span className="font-mono text-blue-400 text-sm font-black">
                                  {progressStats.percent.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}%
                                </span>
                            </div>
                            
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden relative border border-slate-850">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-750 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                style={{ width: `${Math.min(progressStats.percent, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5 font-bold">
                              <span>{filteredResult.activeServiceAsistRevenue.toLocaleString("cs-CZ")} Kč</span>
                              <span>/{Math.round(progressStats.target).toLocaleString("cs-CZ")} Kč</span>
                            </div>
                          </div>

                        </div>

                        {/* Calendar Bottom segment */}
                        <div className="pt-3.5 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500 shrink-0 animate-pulse" />
                            <p className="font-bold leading-none text-slate-300">
                              Zbývá <strong className="text-white font-mono">{filteredResult.daysRemaining} dní</strong> v tomto měsíci.
                            </p>
                          </div>
                          <div className="flex gap-4 pl-6 text-[11px] font-bold text-slate-450 shrink-0 leading-none">
                            <span>Všední dny: <strong className="text-slate-200 font-mono">{filteredResult.weekdaysRemaining}</strong></span>
                            <span>Víkendové dny: <strong className="text-slate-200 font-mono">{filteredResult.weekendsRemaining}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right Part: Today's Shift Progress & Quick Configurations (Equal weight columns for perfect symmetry) */}
                      <div className="p-6 md:p-10 flex flex-col justify-between space-y-7">
                        <div className="space-y-6">
                          
                          <div className="flex flex-col justify-between min-h-[175px] md:min-h-[190px] lg:h-[215px] lg:min-h-[215px] space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Flame className="w-8 h-8 text-orange-400 animate-pulse" />
                                  <h3 className="text-base md:text-lg font-black uppercase tracking-widest text-slate-200">Aktuální cíl</h3>
                                </div>
                                <div className="inline-flex items-center gap-1.5 h-7 text-[11px] font-black text-orange-400 bg-orange-400/10 px-3 py-0.5 rounded-xl border border-orange-400/20 uppercase tracking-wider shrink-0 select-none">
                                  <Clock className="w-4 h-4 text-orange-400 animate-pulse" />
                                  <span>{numRemainingHours}h zbývá</span>
                                </div>
                              </div>
                              <button
                                onClick={handleResetDay}
                                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 hover:text-rose-400 text-slate-350 rounded-xl transition-all cursor-pointer border border-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-md leading-none h-10 flex items-center shrink-0"
                                title="Resetovat celou dnešní směnu"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>Reset dne</span>
                              </button>
                            </div>

                            <div className="space-y-2.5">
                              <span className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest block leading-none">AKTUÁLNÍ CÍL SLUŽBY / HOD</span>
                              <div className="text-5xl md:text-6xl lg:text-7xl font-sans font-black tracking-tighter text-orange-400 drop-shadow-[0_4px_12px_rgba(249,115,22,0.35)] leading-none select-all animate-fade-in">
                                {nextTargetHourlySalesVal.toLocaleString("cs-CZ")} <span className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-400 tracking-normal">CZK/h</span>
                              </div>
                              
                              <div className="mt-3">
                                {sellerCount <= 1 ? (
                                  <div className="inline-flex items-center gap-1.5 h-7 text-[11px] font-black text-blue-400 bg-blue-500/10 px-3 py-0.5 rounded-xl border border-blue-500/20 uppercase tracking-wider">
                                    <Users className="w-4 h-4 text-blue-400" />
                                    <span>Na 1 os: <strong className="text-slate-100 font-mono">{Math.round(nextTargetHourlySalesVal / sellerCount).toLocaleString("cs-CZ")} Kč/h</strong></span>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 w-full">
                                    {sellers.slice(0, sellerCount).map((seller, idx) => {
                                      const targetVal = Math.round((nextTargetHourlySalesVal * seller.sharePct) / 100);
                                      const isCompact = sellerCount > 3;
                                      return (
                                        <div 
                                          key={idx} 
                                          className={`inline-flex items-center gap-1 rounded-xl border border-blue-500/20 uppercase tracking-wider select-none shrink-0 text-blue-400 bg-blue-500/10 font-black transition-all ${
                                            isCompact 
                                              ? "h-6 text-[9px] md:text-[9.5px] px-2 py-0.5" 
                                              : "h-7 text-[10px] md:text-[11px] px-2.5 py-0.5"
                                          }`}
                                        >
                                          <User className={`${isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} text-blue-400 shrink-0`} />
                                          <span>
                                            {seller.name || `Osoba ${idx + 1}`}: <strong className="text-slate-100 font-mono">{targetVal.toLocaleString("cs-CZ")} Kč/h</strong> ({seller.sharePct}%)
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Core KPI blocks: 3 horizontal columns Grid (expanded cards to occupy original visual space of deleted Plnění Cíle) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4.5 border-t border-slate-800/80">
                            
                            {/* KPI 1: Shift Target input box */}
                            <div className="bg-slate-950/35 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-3.5 transition-all shadow-inner flex flex-col justify-between group h-[110px]">
                              <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none shrink-0">
                                <span>Cíl pro dnešek</span>
                                <Target className="w-4 h-4 text-blue-400 opacity-55 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={dailyGoal || ""}
                                  disabled={autoSyncGoal && calcTodayTarget > 0}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setDailyGoal(isNaN(val) ? 0 : val);
                                  }}
                                  className="w-full bg-transparent p-0 font-mono font-black text-lg md:text-xl text-slate-100 border-none focus:ring-0 focus:outline-none focus:border-blue-500 disabled:opacity-40 leading-tight"
                                />
                                <span className="text-xs text-slate-500 font-bold ml-1">Kč</span>
                              </div>
                              {autoSyncGoal && calcTodayTarget > 0 ? (
                                <div className="text-[10px] text-blue-450 font-bold flex items-center gap-0.5 mt-1.5 leading-none shrink-0">
                                  <Link className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span className="truncate">Auto-sync</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDailyGoal(calcTodayTarget)}
                                  disabled={calcTodayTarget === 0}
                                  className="text-[10px] text-blue-400 font-black hover:underline hover:text-blue-350 leading-none mt-1.5 text-left block cursor-pointer shrink-0"
                                >
                                  {calcTodayTarget > 0 ? `Převzít ${calcTodayTarget.toLocaleString("cs-CZ")} Kč` : "Převzít k"}
                                </button>
                              )}
                            </div>

                            {/* KPI 2: Dnešní Služby - aktuál display */}
                            <div className="bg-slate-950/35 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3.5 transition-all shadow-inner flex flex-col justify-between group h-[110px]">
                              <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none shrink-0">
                                <span>Dnešní aktuál</span>
                                <Flame className="w-4 h-4 text-emerald-400 opacity-55 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="font-mono font-black text-lg md:text-xl text-emerald-450 leading-tight">
                                {totalSalesToday.toLocaleString("cs-CZ")} <span className="text-xs text-emerald-600 font-bold">Kč</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold mt-1.5 leading-none shrink-0">
                                {totalGoalReachedPct}% z cíle
                              </div>
                            </div>

                            {/* KPI 3: Staffing Size adjuster */}
                            <div className="bg-slate-950/35 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-3.5 transition-all shadow-inner flex flex-col justify-between group h-[110px]">
                              <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none shrink-0">
                                <span>Obsazení</span>
                                <Users className="w-4 h-4 text-blue-400 opacity-55 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="flex items-center gap-1.5 leading-none">
                                <button
                                  onClick={() => setSellerCount(c => Math.max(1, c - 1))}
                                  disabled={sellerCount <= 1}
                                  className="w-5 h-5 bg-slate-900 border border-slate-700 text-slate-450 disabled:opacity-20 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                                >
                                  −
                                </button>
                                <span className="font-mono font-black text-base md:text-lg text-white leading-none">{sellerCount}</span>
                                <button
                                  onClick={() => setSellerCount(c => Math.min(10, c + 1))}
                                  className="w-5 h-5 bg-slate-900 border border-slate-700 text-slate-450 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold mt-1.5 leading-none truncate shrink-0">
                                Na os: {Math.round(dailyGoal / sellerCount).toLocaleString("cs-CZ")} Kč
                              </div>
                            </div>

                          </div>

                          {/* Minimalist style line info displaying target sales density hourly to save space and align with left block */}
                          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/25 px-4 py-2 rounded-xl border border-slate-800/60 shadow-inner">
                            <span className="font-bold uppercase tracking-wider">Hodinová meta na osobu:</span>
                            <span className="font-mono font-black text-orange-400">
                              {Math.round(nextTargetHourlySalesVal / sellerCount).toLocaleString("cs-CZ")} Kč/hod
                            </span>
                          </div>

                          {/* Shift Progress Bar (Highly visible yet compact design - perfectly matching month progress bar and swapped down here) */}
                          <div className="bg-slate-950/45 border border-slate-850 rounded-2xl p-4 shadow-md">
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-400 mb-2 leading-none uppercase tracking-widest">
                                <span>Dnešní plnění směny</span>
                                <span className="font-mono text-emerald-400 text-sm font-black">
                                  {totalGoalReachedPct.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}%
                                </span>
                            </div>
                            
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden relative border border-slate-850">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-750 ease-out shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                style={{ width: `${Math.min(totalGoalReachedPct, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5 font-bold">
                              <span>{totalSalesToday.toLocaleString("cs-CZ")} Kč</span>
                              <span>/{dailyGoal.toLocaleString("cs-CZ")} Kč</span>
                            </div>
                          </div>

                        </div>

                        {/* Motivational footers segment (fully symmetrical to calendar bottom left) */}
                        <div className="pt-3.5 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-pulse" />
                            <p className="font-bold leading-none text-slate-300 text-ellipsis overflow-hidden whitespace-nowrap">
                              Dnešní status motivace: <strong className="text-white">{getMotivationalMessage()}</strong>
                            </p>
                          </div>
                          <div className="flex gap-4 pl-6 text-[11px] font-bold text-slate-450 shrink-0 leading-none">
                            <span>Výkon směny: <strong className="text-slate-200 font-mono">{totalGoalReachedPct}%</strong></span>
                            <span>Zaměstnanců: <strong className="text-slate-200 font-mono">{sellerCount}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rozdělení aktuálního cíle mezi členy týmu */}
                  {sellerCount > 1 && (
                    <div className="bg-slate-900 text-white rounded-[2.2rem] border border-slate-800 shadow-xl p-6 md:p-8 space-y-5 animate-in fade-in duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                          <Users className="w-6 h-6 text-blue-400 animate-pulse" />
                          <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-slate-250">
                            Rozdělení hodinových cílů mezi členy týmu ({sellerCount} osoby)
                          </h3>
                        </div>
                        <button
                          onClick={() => {
                            const base = Math.floor(100 / sellerCount);
                            const remainder = 100 % sellerCount;
                            const resetSellers = sellers.map((s, k) => ({
                              ...s,
                              sharePct: base + (k < remainder ? 1 : 0)
                            }));
                            setSellers(resetSellers);
                          }}
                          className="px-4.5 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-black rounded-xl border border-slate-705 text-slate-200 hover:text-blue-450 transition-all cursor-pointer shadow-md leading-none h-9 flex items-center shrink-0 self-start sm:self-auto"
                        >
                          Rovným dílem
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sellers.slice(0, sellerCount).map((seller, idx) => {
                          const targetVal = Math.round((nextTargetHourlySalesVal * seller.sharePct) / 100);
                          return (
                            <div key={idx} className="bg-slate-950/35 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-3.5 shadow-inner">
                              <div className="flex flex-col space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Pracovník #{idx + 1}
                                </label>
                                <input
                                  type="text"
                                  value={seller.name}
                                  onChange={(e) => {
                                    const newSellers = [...sellers];
                                    newSellers[idx] = { ...newSellers[idx], name: e.target.value };
                                    setSellers(newSellers);
                                  }}
                                  placeholder={`Osoba ${idx + 1}`}
                                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm font-bold text-slate-200 focus:outline-none focus:ring-0 leading-none h-10"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-900/40">
                                <div className="flex flex-col space-y-1 flex-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Podíl (%)
                                  </label>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={seller.sharePct}
                                      onChange={(e) => {
                                        const num = parseInt(e.target.value, 10);
                                        const val = isNaN(num) ? 0 : num;
                                        const newSellers = [...sellers];
                                        newSellers[idx] = { ...newSellers[idx], sharePct: val };
                                        setSellers(newSellers);
                                      }}
                                      className="w-full bg-slate-900/65 border border-slate-800 focus:border-blue-500 rounded-xl pl-3 pr-8 py-1.5 text-sm font-bold font-mono text-slate-200 focus:outline-none focus:ring-0 leading-none h-9"
                                    />
                                    <span className="absolute right-3 text-xs text-slate-500 font-bold select-none">%</span>
                                  </div>
                                </div>

                                <div className="flex flex-col space-y-1 text-right shrink-0">
                                  <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest">
                                    Hodinový cíl
                                  </span>
                                  <span className="font-mono text-sm font-black text-orange-400 h-9 flex items-center justify-end leading-none">
                                    {targetVal.toLocaleString("cs-CZ")} Kč/h
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Verification message / warnings: if the sum doesn't equal 100% */}
                      {(() => {
                        const sum = sellers.slice(0, sellerCount).reduce((acc, s) => acc + s.sharePct, 0);
                        if (sum !== 100) {
                          return (
                            <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2">
                              <Info className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Součet podílů je aktuálně {sum}%. Pro správné rozdělení cílů musí být součet přesně 100%.</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                    {/* Interactive Chart visualizer */}
                    <SalesPerformanceChart blocks={processedBlocks} />

                    {/* Layout Division: Hourly Blocks Table + Custom Time Simulator Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* Left list columns: The 12 Hourly row blocks */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                              Směnové Úseky (Hodinové Bloky)
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              Upravujte průběžně dosaženou tržbu pro automatickou re-diploidaci cíle zbývajících hodin.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          {processedBlocks.map((block) => (
                            <HourlyRow
                              key={block.id}
                              block={block}
                              status={getBlockStatus(block, currentHour, currentMinute, settings.useRealTime)}
                              onSalesChange={updateActualSales}
                              onToggleComplete={toggleBlockCompleted}
                              onNoteChange={updateBlockNote}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Right sidebars: Clock control simulator + history log keeper */}
                      <div className="space-y-8 h-fit lg:sticky lg:top-24">
                        
                        {/* Time simulator clock widget */}
                        <TimeSimulator 
                          settings={settings}
                          onSettingsChange={setSettings}
                        />

                        {/* Saved sessions database manager history log */}
                        <HistoryLog 
                          history={history}
                          totalSales={totalSalesToday}
                          dailyGoal={dailyGoal}
                          selectedBranch={selectedBranch || undefined}
                          onSaveDay={handleSaveCurrentDay}
                          onDeleteItem={handleDeleteHistoryItem}
                          onClearHistory={handleClearHistory}
                        />

                      </div>

                    </div>
                  </div>

              ) : (
                /* Simple callout to guide user to choose a branch */
                <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 py-10 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Info className="w-8 h-8 opacity-40 text-blue-500 animate-bounce" />
                  <p className="font-bold text-slate-700">Vyberte pobočku v panelu nastavení výše</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Po výběru pobočky se vám vygeneruje Dnešní doporučený cíl a spustí se propojený Hodinový plánovač.
                  </p>
                </div>
              )}

            </div>
          )}

          {error && <div className="p-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-center text-sm font-bold animate-pulse">{error}</div>}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] animate-pulse">Zpracovávám tabulku výkonu poboček...</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

// Reusable micro input Row inside Monthly Calculations Section
const ValueRow = ({ label, value, isPercent, isMinus, isGreen, truncate, editable, onValueChange, subtitle }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  useEffect(() => {
    setTempValue(value.toString());
  }, [value]);

  const handleFinishEdit = () => {
    setIsEditing(false);
    const num = parseFloat(tempValue.replace(/\s/g, "").replace(",", "."));
    if (!isNaN(num)) {
      onValueChange?.(num);
    } else {
      setTempValue(value.toString());
    }
  };

  const formattedVal = useMemo(() => {
    if (isPercent) {
      const percentVal = value * 100;
      return (truncate ? Math.floor(percentVal * 100) / 100 : percentVal).toLocaleString("cs-CZ", { 
        minimumFractionDigits: truncate ? 2 : 1, 
        maximumFractionDigits: truncate ? 2 : 1 
      });
    }
    return Math.round(value).toLocaleString("cs-CZ");
  }, [value, isPercent, truncate]);

  const getTextColor = () => {
    if (isMinus) return "text-rose-500";
    if (isGreen) return "text-emerald-500";
    return "text-slate-805 text-slate-800";
  };

  return (
    <div className={`flex flex-col gap-1 p-3.5.5 p-4 border transition-all 
      ${editable 
        ? "bg-blue-50/20 border-blue-105 rounded-xl hover:border-blue-300 hover:bg-blue-50/45 cursor-text group/row shadow-xs" 
        : "bg-white border-slate-105 rounded-2xl shadow-sm hover:border-blue-100"}`}
      onClick={() => editable && !isEditing && setIsEditing(true)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-bold text-[10px] tracking-wide uppercase shrink-0">{label}</span>
          {editable && (
            <PencilLine className={`w-3.5 h-3.5 text-blue-500 transition-opacity edit-indicator ${isEditing ? "opacity-0" : "opacity-30 group-hover/row:opacity-100"}`} />
          )}
        </div>
        
        <div className="flex items-baseline gap-1.5 shrink-0">
          {isEditing ? (
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleFinishEdit}
                onKeyDown={(e) => e.key === "Enter" && handleFinishEdit()}
                className={`text-lg font-black ${getTextColor()} bg-white shadow-inner border border-blue-200 rounded-xl px-2.5 py-0.5 outline-none w-28 text-right font-mono`}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <span className={`text-lg font-black ${getTextColor()} transition-colors font-mono`}>
              {isMinus && "− "}{formattedVal}
            </span>
          )}
          <span className="text-[10px] text-slate-300 font-black uppercase">{isPercent ? "%" : "Kč"}</span>
        </div>
      </div>
      
      {subtitle && (
        <span className="text-[9px] text-slate-400 font-bold block leading-none">{subtitle}</span>
      )}
    </div>
  );
};

export default App;

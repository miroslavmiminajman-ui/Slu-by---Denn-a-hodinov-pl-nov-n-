/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isAccent?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  isAccent = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
        isAccent
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-slate-100 text-slate-900 hover:border-blue-100 hover:shadow-md"
      }`}
    >
      <div>
        <div className="flex items-center justify-between pb-3">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isAccent ? "text-slate-400" : "text-slate-400"}`}>
            {title}
          </span>
          <div className={`p-2 rounded-xl flex items-center justify-center border ${
            isAccent 
              ? "bg-slate-950 text-emerald-450 border-slate-800" 
              : "bg-blue-50 text-blue-600 border-blue-100"
          }`}>
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className={`text-2xl font-black tracking-tight ${isAccent ? "text-white" : "text-slate-900"}`}>
            {value}
          </h3>
          {subtitle && (
            <p className={`text-xs font-medium leading-tight ${isAccent ? "text-slate-400" : "text-slate-450"}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;

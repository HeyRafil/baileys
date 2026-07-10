import React from 'react';

export default function StatsCard({ title, value, icon: Icon, description, colorClass = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30',
    green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30'
  };

  const selectedColor = colorMap[colorClass] || colorMap.blue;

  return (
    <div className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-md flex items-center justify-between">
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
          {value}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {description}
          </p>
        )}
      </div>

      <div className={`p-4 rounded-2xl border ${selectedColor} flex items-center justify-center`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from 'lucide-react';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function getDaysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(year, parseInt(month), 0).getDate();
}

export default function SmartDatePicker({ value, onChange, label, required, error, minYear, maxYear }) {
  const currentYear = new Date().getFullYear();
  const min = minYear || 1940;
  const max = maxYear || currentYear;

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(String(parseInt(parts[1])));
        setDay(String(parseInt(parts[2])));
      }
    }
  }, []);

  const update = (d, m, y) => {
    if (d && m && y) {
      const dd = String(d).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      onChange(`${y}-${mm}-${dd}`);
    } else {
      onChange('');
    }
  };

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = MONTHS.map((m, i) => ({ label: m, value: String(i + 1) }));
  const years = Array.from({ length: max - min + 1 }, (_, i) => max - i);

  const handleDay = (v) => { setDay(v); update(v, month, year); };
  const handleMonth = (v) => {
    setMonth(v);
    const maxDay = getDaysInMonth(v, year);
    const d = parseInt(day) > maxDay ? String(maxDay) : day;
    if (parseInt(day) > maxDay) setDay(d);
    update(d, v, year);
  };
  const handleYear = (v) => { setYear(v); update(day, month, v); };

  return (
    <div>
      {label && (
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <label className="text-sm font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {/* Day */}
        <Select value={day} onValueChange={handleDay}>
          <SelectTrigger className={`h-11 bg-white border-2 ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-400'} rounded-xl font-medium`}>
            <SelectValue placeholder="Jour" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {days.map(d => (
              <SelectItem key={d} value={String(d)}>{String(d).padStart(2, '0')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month */}
        <Select value={month} onValueChange={handleMonth}>
          <SelectTrigger className={`h-11 bg-white border-2 ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-400'} rounded-xl font-medium`}>
            <SelectValue placeholder="Mois" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year */}
        <Select value={year} onValueChange={handleYear}>
          <SelectTrigger className={`h-11 bg-white border-2 ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-400'} rounded-xl font-medium`}>
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
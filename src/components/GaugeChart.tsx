import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  value: number;
  label?: string;
  color?: string;
  min?: number;
  max?: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({ 
  value, 
  label, 
  color = '#2563eb', 
  min = 0, 
  max = 100 
}) => {
  const normalizedValue = Math.min(Math.max(value, min), max);
  const data = [
    { value: normalizedValue },
    { value: max - normalizedValue },
  ];

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="rgba(255,255,255,0.1)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-[10%]">
        {label && <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2 antialiased">{label}</span>}
      </div>
    </div>
  );
};

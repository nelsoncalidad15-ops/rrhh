import React, { useState, useEffect, useMemo } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  BarChart,
  LineChart,
  LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DashboardFrame, 
  ChartWrapper, 
  DataTable, 
  StatusBadge,
} from './DashboardUI';
import { Icons } from './Icon';
import { ChatBot } from './ChatBot';
import { GaugeChart } from './GaugeChart';
import { fetchSheetData } from '../services/dataService';
import { AutoRecord, LoadingStatus } from '../types';
import { MONTHS, YEARS, BRANCHES, BRANCH_COLORS, DEFAULT_CONFIG } from '../constants';

interface PostventaDashboardProps {
  onBack?: () => void;
}

const BranchKpiCard = ({ title, icon: Icon, color, branchData, total, unit = "" }: { 
  title: string, 
  icon: any, 
  color: string, 
  branchData: { name: string, value: number, subValue1?: number, subValue2?: number }[], 
  total: number,
  unit?: string
}) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/70 border border-white/60 rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl flex flex-col h-full"
  >
    <div className="flex items-center gap-3 mb-6">
      <div className={`p-2.5 rounded-xl bg-slate-50/50 ${color.replace('bg-', 'text-')}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h4>
    </div>

    <div className="space-y-4 flex-1">
      {branchData.map((branch) => (
        <div key={branch.name} className="flex justify-between items-start border-b border-slate-100/40 pb-3 last:border-0">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{branch.name}</span>
          </div>
          <span className="text-xl font-black text-slate-950 tracking-tighter italic leading-none">
            {branch.value.toLocaleString()}{unit}
          </span>
        </div>
      ))}
    </div>

    <div className="mt-8 pt-6 border-t border-slate-100/40 flex justify-between items-end">
      <span className="text-[9px] font-black text-slate-950 uppercase tracking-[0.2em]">TOTAL CONSOLIDADO</span>
      <span className={`text-3xl font-black tracking-tighter italic leading-none ${color.replace('bg-', 'text-')}`}>
        {total.toLocaleString()}{unit}
      </span>
    </div>
  </motion.div>
);

export const PostventaDashboard: React.FC<PostventaDashboardProps> = ({ onBack }) => {
  const [data, setData] = useState<AutoRecord[]>([]);
  const [loading, setLoading] = useState<LoadingStatus>({ isLoading: true, error: null });
  const [selectedYear, setSelectedYear] = useState<string>("2025"); // Default to 2025
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading({ isLoading: true, error: null });
      try {
        const result = await fetchSheetData(DEFAULT_CONFIG.sheetUrls.postventa);
        setData(result);
        setLoading({ isLoading: false, error: null });
      } catch (err) {
        setLoading({ isLoading: false, error: 'Error al cargar los datos operativos.' });
      }
    };
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const yearMatch = item.anio?.toString() === selectedYear;
      const monthMatch = selectedMonths.length === 0 || selectedMonths.some(m => m.toLowerCase() === item.mes?.toLowerCase());
      
      // Ensure we only include branches that are in our BRANCHES constant
      const isAllowedBranch = BRANCHES.includes(item.sucursal);
      const branchMatch = selectedBranches.length === 0 
        ? isAllowedBranch 
        : selectedBranches.includes(item.sucursal);
        
      return yearMatch && monthMatch && branchMatch;
    });
  }, [data, selectedYear, selectedMonths, selectedBranches]);

  // KPI Calculations per branch
  const branchKpis = useMemo(() => {
    const branchesToCalculate = selectedBranches.length > 0 ? selectedBranches : BRANCHES;
    return branchesToCalculate.map(branch => {
      const branchData = filteredData.filter(d => d.sucursal === branch);
      return {
        name: branch,
        avance: branchData.reduce((sum, d) => sum + (d.avance_ppt || 0), 0),
        objetivo: branchData.reduce((sum, d) => sum + (d.objetivo_mensual || 0), 0),
        pptDiarios: branchData.reduce((sum, d) => sum + (d.ppt_diarios || 0), 0),
        servisDiarios: branchData.reduce((sum, d) => sum + (d.servicios_diarios || 0), 0),
        servisTotales: branchData.reduce((sum, d) => sum + (d.avance_servicios || 0), 0),
        diasLaborables: branchData.reduce((sum, d) => sum + (d.dias_laborables || 0), 0),
      };
    }).sort((a, b) => b.objetivo - a.objetivo);
  }, [filteredData, selectedBranches]);

  const totals = useMemo(() => {
    return {
      avance: branchKpis.reduce((sum, b) => sum + b.avance, 0),
      objetivo: branchKpis.reduce((sum, b) => sum + b.objetivo, 0),
      pptDiarios: branchKpis.reduce((sum, b) => sum + b.pptDiarios, 0),
      servisDiarios: branchKpis.reduce((sum, b) => sum + b.servisDiarios, 0),
      servisTotales: branchKpis.reduce((sum, b) => sum + b.servisTotales, 0),
      diasLaborables: branchKpis.reduce((sum, b) => sum + b.diasLaborables, 0),
    };
  }, [branchKpis]);

  // Monthly Chart Data
  const monthlyChartData = useMemo(() => {
    const branchesToUse = selectedBranches.length > 0 ? selectedBranches : BRANCHES;
    return MONTHS.map(m => {
      const entry: any = { name: m.substring(0, 3).toUpperCase() };
      branchesToUse.forEach(branch => {
        const branchMonthData = data.find(d => 
          d.mes?.trim().toLowerCase() === m.trim().toLowerCase() && 
          d.anio?.toString() === selectedYear && 
          d.sucursal === branch
        );
        entry[`${branch}_avance`] = branchMonthData?.avance_ppt || 0;
        entry[`${branch}_pptDiarios`] = branchMonthData?.ppt_diarios || 0;
        entry[`${branch}_servisTotales`] = branchMonthData?.avance_servicios || 0;
        entry[`${branch}_servisDiarios`] = branchMonthData?.servicios_diarios || 0;
        // For the bar chart which uses branch name directly as key
        entry[branch] = branchMonthData?.avance_ppt || 0;
      });
      return entry;
    });
  }, [data, selectedYear, selectedBranches]);

  const barChartData = monthlyChartData;

  const toggleMonth = (month: string) => {
    if (month === 'ANUAL') {
      setSelectedMonths([]);
      return;
    }
    setSelectedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const toggleBranch = (branch: string) => {
    if (branch === 'TODAS') {
      setSelectedBranches([]);
      return;
    }
    setSelectedBranches(prev => 
      prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
    );
  };

  const filters = (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl mb-8"
    >
      <div className="flex flex-col gap-6">
        {/* Top Row: Year and Branches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Year */}
          <div className="space-y-3">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Icons.Calendar className="w-3 h-3" /> Año
            </span>
            <div className="flex gap-1 bg-white/40 p-1 rounded-xl w-fit border border-white/60 shadow-inner">
              {YEARS.map(y => (
                <button 
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-5 py-1.5 rounded-lg text-[10px] font-black transition-all ${selectedYear === y ? 'bg-slate-950 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Branches */}
          <div className="space-y-3">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Icons.MapPin className="w-3 h-3" /> Sucursales
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => toggleBranch('TODAS')}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all border ${selectedBranches.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/50 text-slate-400 border-white/60 hover:border-slate-200'}`}
              >
                TODAS
              </button>
              {BRANCHES.map(branch => (
                <button 
                  key={branch}
                  onClick={() => toggleBranch(branch)}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all border ${selectedBranches.includes(branch) ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white/50 text-slate-400 border-white/60 hover:border-slate-200'}`}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Months */}
        <div className="space-y-3 pt-5 border-t border-white/40">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Icons.Clock className="w-3 h-3" /> Meses
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button 
              onClick={() => toggleMonth('ANUAL')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all border ${selectedMonths.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/50 text-slate-400 border-white/60 hover:border-slate-200 backdrop-blur-sm'}`}
            >
              ANUAL
            </button>
            {MONTHS.map(m => (
              <button 
                key={m}
                onClick={() => toggleMonth(m)}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all border ${selectedMonths.includes(m) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/50 text-slate-400 border-white/60 hover:border-slate-200 backdrop-blur-sm'}`}
              >
                {m.charAt(0) + m.slice(1, 3).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <DashboardFrame 
      title="GESTIÓN DE POSTVENTA" 
      subtitle="Control Operativo y Performance"
      onBack={onBack}
      isLoading={loading.isLoading}
      lastUpdated="22/03/2026 18:52"
      className="bg-[#F8FAFC]"
    >
      {filters}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
        <BranchKpiCard 
          title="OBJETIVO PPT" 
          icon={Icons.Target} 
          color="bg-emerald-600"
          branchData={branchKpis.map(b => ({ name: b.name, value: b.objetivo }))}
          total={totals.objetivo}
        />
        <BranchKpiCard 
          title="AVANCE DE PPT" 
          icon={Icons.Activity} 
          color="bg-blue-600"
          branchData={branchKpis.map(b => ({ 
            name: b.name, 
            value: b.avance
          }))}
          total={totals.avance}
        />
        <BranchKpiCard 
          title="PPT DIARIOS (COL K)" 
          icon={Icons.BarChart} 
          color="bg-indigo-600"
          branchData={branchKpis.map(b => ({ name: b.name, value: b.pptDiarios }))}
          total={totals.pptDiarios}
        />
        <BranchKpiCard 
          title="SERVIS DIARIOS (COL M)" 
          icon={Icons.Zap} 
          color="bg-violet-600"
          branchData={branchKpis.map(b => ({ name: b.name, value: b.servisDiarios }))}
          total={totals.servisDiarios}
        />
        <BranchKpiCard 
          title="DÍAS LAB" 
          icon={Icons.Calendar} 
          color="bg-orange-500"
          branchData={branchKpis.map(b => ({ name: b.name, value: b.diasLaborables }))}
          total={totals.diasLaborables}
        />
      </div>

      {/* Performance Section */}
      <div className="bg-[#05070A] rounded-[2.5rem] p-6 xl:p-8 mb-10 relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/5 to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none antialiased">PERFORMANCE: % SERVIS VS PPT</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] mt-3 antialiased">ANÁLISIS DE CONVERSIÓN POR SUCURSAL</p>
          </div>
          <div className="flex gap-6 bg-white/5 p-4 rounded-[1.5rem] backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest antialiased">&lt; 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest antialiased">50-60%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest antialiased">&gt; 60%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
          {branchKpis.map(branch => {
            const perc = branch.avance > 0 ? (branch.servisTotales / branch.avance) * 100 : 0;
            let color = "#f43f5e";
            if (perc >= 60) color = "#10b981";
            else if (perc >= 50) color = "#f59e0b";
            
            return (
              <div key={branch.name} className="flex flex-col items-center group bg-white/5 p-4 rounded-[1.5rem] border border-white/5 hover:bg-white/10 transition-all">
                <div className="w-full aspect-[2/1] max-w-[200px] mb-3 relative opacity-90 group-hover:opacity-100 transition-opacity">
                  <GaugeChart value={perc} color={color} />
                </div>
                <div className="text-2xl font-black italic tracking-tighter mb-1 text-white group-hover:scale-110 transition-transform duration-500 leading-none drop-shadow-2xl antialiased">
                  {Math.round(perc || 0)}%
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500 group-hover:text-white transition-colors antialiased text-center">
                  {branch.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Summary Section */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 px-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-2 h-10 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
          <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter italic">
            AVANCE PPT <span className="text-blue-600">Y OBJETIVOS</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest border border-white/60 shadow-sm">
            <Icons.Database className="w-3 h-3 text-slate-400" />
            {data.length} REGISTROS
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/60 backdrop-blur-sm rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest border border-blue-100/60 shadow-sm">
            <Icons.Filter className="w-3 h-3" />
            {filteredData.length} FILTRADOS ({selectedYear})
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="mb-12">
        <ChartWrapper 
          title="CUMPLIMIENTO DE OBJETIVOS (PPT)" 
          subtitle="AVANCE PPT VS OBJETIVO MENSUAL (ROJO SI NO LLEGA)"
          className="w-full h-[500px]"
        >
          {barChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <Icons.BarChart className="w-12 h-12 opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest">Sin datos para graficar en {selectedYear}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                {(selectedBranches.length > 0 ? selectedBranches : BRANCHES).map(branch => (
                  <Bar key={branch} dataKey={branch} name={branch} fill={BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS]} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey={branch} position="top" style={{ fontSize: '8px', fontWeight: 900, fill: '#64748b' }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>

      {/* Trend Grid - AVANCE PPT Section */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-10 bg-blue-600 rounded-full"></div>
          <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">AVANCE PPT: TENDENCIAS</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <ChartWrapper title="AVANCE PPT" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
                {(selectedBranches.length > 0 ? selectedBranches : BRANCHES).map(branch => (
                  <Line 
                    key={branch}
                    type="monotone" 
                    dataKey={`${branch}_avance`} 
                    name={branch}
                    stroke={BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS]} 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS] }} 
                    activeDot={{ r: 5 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper title="PPT DIARIOS" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
                {(selectedBranches.length > 0 ? selectedBranches : BRANCHES).map(branch => (
                  <Line 
                    key={branch}
                    type="monotone" 
                    dataKey={`${branch}_pptDiarios`} 
                    name={branch}
                    stroke={BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS]} 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS] }} 
                    activeDot={{ r: 5 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper title="SERVICIOS TOTALES" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
                {(selectedBranches.length > 0 ? selectedBranches : BRANCHES).map(branch => (
                  <Line 
                    key={branch}
                    type="monotone" 
                    dataKey={`${branch}_servisTotales`} 
                    name={branch}
                    stroke={BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS]} 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS] }} 
                    activeDot={{ r: 5 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper title="SERVICIOS DIARIOS" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
                {(selectedBranches.length > 0 ? selectedBranches : BRANCHES).map(branch => (
                  <Line 
                    key={branch}
                    type="monotone" 
                    dataKey={`${branch}_servisDiarios`} 
                    name={branch}
                    stroke={BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS]} 
                    strokeWidth={3} 
                    dot={{ r: 3, fill: BRANCH_COLORS[branch as keyof typeof BRANCH_COLORS] }} 
                    activeDot={{ r: 5 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
      </div>

      {/* Detailed Data Table */}
      <DataTable 
        title="DETALLE DE OPERACIONES"
        subtitle="REGISTROS CONSOLIDADOS POR MES Y SUCURSAL"
        data={filteredData}
        columns={[
          { 
            header: 'SUCURSAL', 
            accessor: 'sucursal',
            render: (val) => (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">
                  {val}
                </span>
              </div>
            )
          },
          { 
            header: 'MES', 
            accessor: 'mes',
            render: (val) => <span className="font-black uppercase tracking-widest">{val}</span>
          },
          { 
            header: 'AVANCE PPT', 
            accessor: 'avance_ppt',
            render: (val) => <span className="font-black italic">{val.toLocaleString()}</span>
          },
          { 
            header: 'OBJETIVO', 
            accessor: 'objetivo_mensual',
            render: (val) => <span className="font-black text-slate-400">{val.toLocaleString()}</span>
          },
          { 
            header: 'CUMPLIMIENTO', 
            accessor: 'avance_ppt',
            render: (val, row) => {
              const perc = (val / row.objetivo_mensual) * 100;
              return (
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-32">
                    <div 
                      className={`h-full rounded-full ${perc >= 100 ? 'bg-emerald-500' : perc >= 80 ? 'bg-blue-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(perc, 100)}%` }}
                    ></div>
                  </div>
                  <span className={`font-black italic ${perc >= 100 ? 'text-emerald-500' : 'text-blue-600'}`}>{(perc || 0).toFixed(1)}%</span>
                </div>
              );
            }
          },
          { 
            header: 'SERVICIOS', 
            accessor: 'avance_servicios',
            render: (val) => <span className="font-black">{val.toLocaleString()}</span>
          }
        ]}
      />

      <ChatBot context={`Estás viendo el Dashboard de Gestión de Postventa de Autosol. 
        Datos actuales: Año ${selectedYear}, Sucursales ${selectedBranches.length > 0 ? selectedBranches.join(', ') : 'Todas'}. 
        KPIs Globales: Avance PPT ${totals.avance}, Objetivo ${totals.objetivo}, Cumplimiento ${(totals.objetivo > 0 ? (totals.avance / totals.objetivo) * 100 : 0).toFixed(1)}%.`} 
      />
    </DashboardFrame>
  );
};

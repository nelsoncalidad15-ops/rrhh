import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DashboardFrame, 
  LuxuryKPICard, 
  ChartWrapper, 
  MonthSelector, 
  DataTable, 
  StatusBadge,
  InsightCard
} from './DashboardUI';
import { Icons } from './Icon';
import { ChatBot } from './ChatBot';
import { fetchPostventaKpiData } from '../services/dataService';
import { PostventaKpiRecord, LoadingStatus } from '../types';
import { MONTHS, YEARS, BRANCHES, KPI_DEFS, DEFAULT_CONFIG } from '../constants';

interface PostventaKpiDashboardProps {
  onBack?: () => void;
}

export const PostventaKpiDashboard: React.FC<PostventaKpiDashboardProps> = ({ onBack }) => {
  const [data, setData] = useState<PostventaKpiRecord[]>([]);
  const [loading, setLoading] = useState<LoadingStatus>({ isLoading: true, error: null });
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('TODAS');
  const [selectedKpiId, setSelectedKpiId] = useState<string>(KPI_DEFS[0].id);
  const [highlightedMonth, setHighlightedMonth] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading({ isLoading: true, error: null });
      try {
        const result = await fetchPostventaKpiData(DEFAULT_CONFIG.sheetUrls.postventa_kpis);
        setData(result);
        setLoading({ isLoading: false, error: null });
      } catch (err) {
        setLoading({ isLoading: false, error: 'Error al cargar los KPIs.' });
      }
    };
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const yearMatch = item.anio?.toString() === selectedYear;
      // If a month is highlighted, we only care about that month for the KPI cards
      // Otherwise, we use the selectedMonths filter
      const effectiveMonths = highlightedMonth ? [highlightedMonth] : selectedMonths;
      const monthMatch = effectiveMonths.length === 0 || effectiveMonths.some(m => m.toLowerCase() === item.mes?.toLowerCase());
      
      // Ensure we only include branches that are in our BRANCHES constant
      const isAllowedBranch = BRANCHES.includes(item.sucursal);
      const branchMatch = selectedBranch === 'TODAS' 
        ? isAllowedBranch 
        : item.sucursal === selectedBranch;
        
      return yearMatch && monthMatch && branchMatch;
    });
  }, [data, selectedYear, selectedMonths, selectedBranch, highlightedMonth]);

  // Trend Chart Data - Always Annual
  const trendChartData = useMemo(() => {
    return MONTHS.map(m => {
      const monthData = data.filter(d => d.mes === m && d.anio?.toString() === selectedYear && (selectedBranch === 'TODAS' || d.sucursal === selectedBranch));
      const values = monthData.map(d => (d as any)[selectedKpiId] || 0).filter(v => v > 0);
      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      
      const kpiDef = KPI_DEFS.find(k => k.id === selectedKpiId);
      return {
        name: m.substring(0, 3),
        fullName: m,
        valor: kpiDef?.unit === '%' ? avgValue * 100 : avgValue,
        objetivo: kpiDef?.target || 0,
        isHighlighted: highlightedMonth === m || (selectedMonths.includes(m) && !highlightedMonth)
      };
    });
  }, [data, selectedYear, selectedBranch, selectedKpiId, highlightedMonth, selectedMonths]);

  // KPI Calculations for the grid
  const kpiResults = useMemo(() => {
    return KPI_DEFS.map(def => {
      // Filter out zero values as they usually represent missing data in the spreadsheet
      // for the months that haven't happened yet or haven't been filled.
      const values = filteredData
        .map(d => (d as any)[def.id] || 0)
        .filter(v => v > 0);
      
      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      
      const isBetter = def.direction === 'up' ? avgValue >= def.target : avgValue <= def.target;
      const status: 'success' | 'warning' | 'error' = isBetter ? 'success' : (Math.abs(avgValue - def.target) / def.target < 0.1 ? 'warning' : 'error');

      return {
        ...def,
        value: avgValue,
        status
      };
    });
  }, [filteredData]);

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const selectedKpi = KPI_DEFS.find(k => k.id === selectedKpiId);

  return (
    <DashboardFrame 
      title="Gestión de KPIs" 
      subtitle="Indicadores de Calidad y Eficiencia"
      onBack={onBack}
      isLoading={loading.isLoading}
      lastUpdated="22/03/2026 19:10"
    >
      {/* Horizontal Filters */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl mb-6"
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

            {/* Branch */}
            <div className="space-y-3">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Icons.MapPin className="w-3 h-3" /> Sucursal
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button 
                  onClick={() => setSelectedBranch('TODAS')}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all border ${selectedBranch === 'TODAS' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/50 text-slate-400 border-white/60 hover:border-slate-200'}`}
                >
                  TODAS
                </button>
                {BRANCHES.map(b => (
                  <button 
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all border ${selectedBranch === b ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/50 text-slate-400 border-white/60 hover:border-slate-200'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Selection (Moved from ChartWrapper action for better visibility) */}
            <div className="space-y-3">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Icons.Activity className="w-3 h-3" /> Métrica Principal
              </span>
              <select 
                value={selectedKpiId}
                onChange={(e) => setSelectedKpiId(e.target.value)}
                className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
              >
                {KPI_DEFS.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Months */}
          <div className="space-y-3 pt-5 border-t border-white/40">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Icons.Clock className="w-3 h-3" /> Meses
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => setSelectedMonths([])}
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

      {/* Dynamic Trend Chart - Prominent */}
      <div className="mb-10">
        <ChartWrapper 
          title={`Tendencia: ${selectedKpi?.name || 'KPI Seleccionado'}`} 
          subtitle={`Visualización histórica de ${selectedKpi?.unit || ''}`}
          className="h-[600px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={trendChartData} 
              margin={{ top: 40, right: 40, left: 20, bottom: 20 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const month = data.activePayload[0].payload.fullName;
                  setHighlightedMonth(prev => prev === month ? null : month);
                }
              }}
            >
              <defs>
                <linearGradient id="colorKpi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  padding: '20px'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}
              />
              <Area 
                type="monotone" 
                dataKey="valor" 
                name="Valor Real" 
                stroke="#2563eb" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorKpi)" 
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle 
                      key={`dot-${payload.name}`}
                      cx={cx} 
                      cy={cy} 
                      r={payload.isHighlighted ? 8 : 4} 
                      fill={payload.isHighlighted ? "#1d4ed8" : "#2563eb"} 
                      stroke="#fff" 
                      strokeWidth={2} 
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
                activeDot={{ r: 10, strokeWidth: 0 }}
                label={{ 
                  position: 'top', 
                  fill: '#1e293b', 
                  fontSize: 10, 
                  fontWeight: 900,
                formatter: (val: number) => {
                  return val.toFixed(selectedKpi?.unit === '%' || selectedKpi?.id === 'lvs' ? 1 : 0) + (selectedKpi?.unit || '');
                }
                }}
              />
              <Line 
                type="monotone" 
                dataKey="objetivo" 
                name="Objetivo" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* KPI Grid - Ultra Compact Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-1.5 mb-10">
        {kpiResults.map((kpi, i) => (
          <motion.div 
            key={kpi.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.01 }}
            onClick={() => setSelectedKpiId(kpi.id)}
            className={`cursor-pointer p-2 rounded-lg border transition-all group relative overflow-hidden ${
              selectedKpiId === kpi.id 
                ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-900/40' 
                : 'bg-white text-slate-900 border-slate-100 hover:border-blue-200 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <div className={`p-0.5 rounded ${selectedKpiId === kpi.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                <Icons.Activity className={`w-2.5 h-2.5 ${selectedKpiId === kpi.id ? 'text-blue-400' : 'text-slate-400'}`} />
              </div>
              <StatusBadge 
                status={kpi.status === 'success' ? 'success' : kpi.status === 'warning' ? 'warning' : 'error'} 
                label={kpi.status === 'success' ? 'OK' : kpi.status === 'warning' ? '!' : 'X'} 
              />
            </div>
            
            <h4 className={`text-[10px] font-black uppercase tracking-wider mb-1 truncate ${selectedKpiId === kpi.id ? 'text-slate-400' : 'text-slate-500'}`}>
              {kpi.name}
            </h4>
            
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-black italic tracking-tighter">
                {kpi.unit === '%' 
                  ? Math.round((kpi.value || 0) * 100) 
                  : (kpi.id === 'lvs' ? (kpi.value || 0).toFixed(1) : Math.round(kpi.value || 0))}
              </span>
              <span className={`text-[5px] font-black uppercase ${selectedKpiId === kpi.id ? 'text-slate-500' : 'text-slate-400'}`}>
                {kpi.unit}
              </span>
            </div>

            <div className={`mt-1.5 pt-1.5 border-t ${selectedKpiId === kpi.id ? 'border-white/10' : 'border-slate-50'} flex justify-between items-center`}>
              <div>
                <span className={`block text-[4px] font-black uppercase tracking-widest ${selectedKpiId === kpi.id ? 'text-slate-500' : 'text-slate-400'}`}>OBJ</span>
                <span className="text-[7px] font-black">{kpi.target}{kpi.unit}</span>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${selectedKpiId === kpi.id ? 'bg-blue-600' : 'bg-slate-100'}`}>
                <Icons.ArrowRight className={`w-2 h-2 ${selectedKpiId === kpi.id ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed KPI Table */}
      <DataTable 
        title="Matriz de Indicadores de Performance"
        subtitle="Consolidado de KPIs por sucursal y periodo"
        data={kpiResults}
        columns={[
          { header: 'Indicador', accessor: 'name' },
          { header: 'Unidad', accessor: 'unit' },
          { 
            header: 'Valor Actual', 
            accessor: 'value',
            render: (val, row) => (
              <span className="font-black text-slate-900">
                {row.unit === '%' 
                  ? Math.round((val || 0) * 100) 
                  : (row.id === 'lvs' ? (val || 0).toFixed(2) : Math.round(val || 0))}
                {row.unit}
              </span>
            )
          },
          { 
            header: 'Objetivo', 
            accessor: 'target',
            render: (val, row) => <span className="font-black text-slate-400">{val}{row.unit}</span>
          },
          { 
            header: 'Desempeño', 
            accessor: 'value',
            render: (val, row) => {
              const perc = row.direction === 'up' ? (val / row.target) * 100 : (row.target / val) * 100;
              return (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                    <div 
                      className={`h-full rounded-full ${perc >= 100 ? 'bg-emerald-500' : perc >= 80 ? 'bg-blue-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(perc, 100)}%` }}
                    ></div>
                  </div>
                  <span className="font-black italic">{Math.round(perc || 0)}%</span>
                </div>
              );
            }
          },
          { 
            header: 'Estado', 
            accessor: 'status',
            render: (val) => <StatusBadge status={val as any} label={val === 'success' ? 'Óptimo' : val === 'warning' ? 'Alerta' : 'Crítico'} />
          }
        ]}
      />

      <ChatBot context={`Estás viendo el Dashboard de Gestión de KPIs de Autosol. 
        KPI Seleccionado: ${selectedKpi?.name}. 
        Filtros: Año ${selectedYear}, Sucursal ${selectedBranch}. 
        Se están monitoreando ${KPI_DEFS.length} indicadores en tiempo real.`} 
      />
    </DashboardFrame>
  );
};

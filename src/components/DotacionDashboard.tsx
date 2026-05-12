import React, { useMemo, useState } from 'react';
import {
  Users,
  Download
} from 'lucide-react';
import { useRotacionData } from '../services/rotacionService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LabelList,
  Cell
} from 'recharts';
import { toPng } from 'html-to-image';

const MONTH_ORDER = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'];

type ChartFilter =
  | { type: 'mes'; value: string }
  | { type: 'antiguedad'; value: string }
  | { type: 'categoria'; value: string }
  | { type: 'area'; value: string }
  | null;

export function DotacionDashboard() {
  const { data, loading, error } = useRotacionData();

  const [filters, setFilters] = useState({
    localidad: 'Todas',
    area: 'Todas',
    ano: new Date().getFullYear().toString(),
    mes: 'Todas',
  });
  const [chartFilter, setChartFilter] = useState<ChartFilter>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleChartFilter = (next: Exclude<ChartFilter, null>) => {
    setChartFilter(current => (
      current?.type === next.type && current.value === next.value ? null : next
    ));
  };

  const filterOptions = useMemo(() => {
    if (!data.length) return { localidades: [], areas: [], anos: [], meses: [] };

    const years = new Set<string>();
    data.forEach(d => {
      if (d.fechaIngreso) years.add(d.fechaIngreso.getFullYear().toString());
      if (d.fechaNovedad) years.add(d.fechaNovedad.getFullYear().toString());
    });

    return {
      localidades: Array.from(new Set(data.map(d => d.localidad).filter(Boolean))).sort(),
      areas: Array.from(new Set(data.map(d => d.area).filter(Boolean))).sort(),
      anos: Array.from(years).sort((a, b) => b.localeCompare(a)),
      meses: MONTH_ORDER
    };
  }, [data]);

  const stats = useMemo(() => {
    if (!data.length) return null;

    let filtered = data;
    if (filters.localidad !== 'Todas') filtered = filtered.filter(d => d.localidad === filters.localidad);
    if (filters.area !== 'Todas') filtered = filtered.filter(d => d.area === filters.area);

    const year = parseInt(filters.ano, 10);
    const historicalData: Array<{ name: string; dotacion: number | null; fullMonth: string }> = [];
    let currentDotacion = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    for (let month = 0; month < 12; month++) {
      const referenceDate = new Date(year, month + 1, 0);
      const isFutureMonth = year === currentYear && month > currentMonth;
      const activeAtEnd = isFutureMonth ? [] : filtered.filter(d => {
        if (!d.fechaIngreso || d.fechaIngreso > referenceDate) return false;
        if (d.estado === 'Activo') return true;
        return d.fechaNovedad ? d.fechaNovedad > referenceDate : true;
      });

      historicalData.push({
        name: MONTH_ORDER[month].substring(0, 3).toUpperCase(),
        dotacion: isFutureMonth ? null : activeAtEnd.length,
        fullMonth: MONTH_ORDER[month]
      });
    }

    const selectedMonthIndex =
      chartFilter?.type === 'mes'
        ? MONTH_ORDER.findIndex(m => m.substring(0, 3).toUpperCase() === chartFilter.value)
        : filters.mes === 'Todas'
          ? Math.min(year === currentYear ? currentMonth : 11, 11)
          : MONTH_ORDER.findIndex(m => m === filters.mes.toLowerCase());

    const safeMonthIndex = selectedMonthIndex >= 0 ? selectedMonthIndex : Math.min(currentMonth, 11);
    const referenceDate = new Date(year, safeMonthIndex + 1, 0);

    const activeStaff = filtered.filter(d => {
      if (!d.fechaIngreso || d.fechaIngreso > referenceDate) return false;
      if (d.estado === 'Activo') return true;
      return d.fechaNovedad ? d.fechaNovedad > referenceDate : true;
    });

    currentDotacion = activeStaff.length;

    const antiguedadRanges = [
      { name: 'Periodo a prueba', min: 0, max: 90, count: 0 },
      { name: 'De 3 a 12 meses', min: 91, max: 365, count: 0 },
      { name: 'De 1 a 3 años', min: 366, max: 1095, count: 0 },
      { name: 'De 3 a 5 años', min: 1096, max: 1825, count: 0 },
      { name: 'De 5 a 10 años', min: 1826, max: 3650, count: 0 },
      { name: '10 años o más', min: 3651, max: Infinity, count: 0 },
    ];

    activeStaff.forEach(d => {
      if (!d.fechaIngreso) return;
      const diffDays = Math.ceil(Math.abs(referenceDate.getTime() - d.fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
      const range = antiguedadRanges.find(item => diffDays >= item.min && diffDays <= item.max);
      if (range) range.count++;
    });

    const categoriasMap = new Map<string, number>();
    const areasMap = new Map<string, number>();

    activeStaff.forEach(d => {
      const categoria = d.categoria || 'Sin especificar';
      const area = d.area || 'Sin especificar';
      categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + 1);
      areasMap.set(area, (areasMap.get(area) || 0) + 1);
    });

    const categoriesData = Array.from(categoriasMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: activeStaff.length > 0 ? (value / activeStaff.length) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const areasData = Array.from(areasMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const startOfYear = new Date(year, 0, 1);
    const growthData = areasData.map(area => {
      const atStart = filtered.filter(d =>
        d.area === area.name &&
        d.fechaIngreso &&
        d.fechaIngreso < startOfYear &&
        (d.estado === 'Activo' || (d.fechaNovedad && d.fechaNovedad >= startOfYear))
      ).length;

      const growth = atStart > 0 ? ((area.count - atStart) / atStart) * 100 : 0;
      return { name: area.name, growth };
    }).sort((a, b) => b.growth - a.growth);

    let displayStaff = activeStaff;

    if (chartFilter?.type === 'mes') {
      const monthIndex = MONTH_ORDER.findIndex(m => m.substring(0, 3).toUpperCase() === chartFilter.value);
      if (monthIndex >= 0) {
        const clickedDate = new Date(year, monthIndex + 1, 0);
        displayStaff = filtered.filter(d => {
          if (!d.fechaIngreso || d.fechaIngreso > clickedDate) return false;
          if (d.estado === 'Activo') return true;
          return d.fechaNovedad ? d.fechaNovedad > clickedDate : true;
        });
      }
    }

    if (chartFilter?.type === 'antiguedad') {
      const range = antiguedadRanges.find(item => item.name === chartFilter.value);
      if (range) {
        displayStaff = activeStaff.filter(d => {
          if (!d.fechaIngreso) return false;
          const diffDays = Math.ceil(Math.abs(referenceDate.getTime() - d.fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= range.min && diffDays <= range.max;
        });
      }
    }

    if (chartFilter?.type === 'categoria') {
      displayStaff = activeStaff.filter(d => (d.categoria || 'Sin especificar') === chartFilter.value);
    }

    if (chartFilter?.type === 'area') {
      displayStaff = activeStaff.filter(d => (d.area || 'Sin especificar') === chartFilter.value);
    }

    return {
      total: currentDotacion,
      monthLabel: MONTH_ORDER[safeMonthIndex].substring(0, 3).toUpperCase(),
      historical: historicalData,
      antiguedad: antiguedadRanges.map(item => ({ name: item.name, value: item.count })),
      categories: categoriesData,
      areas: areasData,
      growth: growthData,
      namesList: displayStaff
        .map(d => ({
          nombre: d.nombre,
          ingreso: d.fechaIngreso?.toLocaleDateString() || '-',
          area: d.area || 'Sin área'
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    };
  }, [chartFilter, data, filters]);

  const handleDownload = (id: string, name: string) => {
    const node = document.getElementById(id);
    if (!node) return;

    toPng(node, {
      backgroundColor: '#ffffff',
      style: { borderRadius: '0' }
    })
      .then(dataUrl => {
        const link = document.createElement('a');
        link.download = `${name}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch(err => {
        console.error('Error downloading chart', err);
      });
  };

  if (loading) return <div className="p-10 text-center">Cargando dotación...</div>;
  if (error) return <div className="p-10 text-red-500 text-center">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="glass-card !p-5 overflow-visible">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Dotación</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Estructura Organizacional</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Localidad" value={filters.localidad} onChange={v => handleFilterChange('localidad', v)} options={['Todas', ...filterOptions.localidades]} />
            <FilterSelect label="Área" value={filters.area} onChange={v => handleFilterChange('area', v)} options={['Todas', ...filterOptions.areas]} />
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <FilterSelect label="Año" value={filters.ano} onChange={v => handleFilterChange('ano', v)} options={filterOptions.anos} />
            <FilterSelect label="Mes" value={filters.mes} onChange={v => handleFilterChange('mes', v)} options={['Todas', ...filterOptions.meses]} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col justify-center items-center text-center border-l-4 border-l-indigo-600">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Dotación Total ({stats.monthLabel})</p>
            <p className="text-6xl font-black text-slate-900">{stats.total}</p>
          </div>

          <div className="glass-card !p-0 flex flex-col h-[400px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center gap-3">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Colaboradores</h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  {chartFilter ? `Filtro activo: ${chartFilter.value}` : 'Personal activo del período'}
                </p>
              </div>
              {chartFilter && (
                <button onClick={() => setChartFilter(null)} className="text-[9px] font-bold bg-rose-100 text-rose-600 px-2 py-1 rounded-md">
                  Limpiar
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Área</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.namesList.map((person, index) => (
                    <tr key={`${person.nombre}-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-[11px] font-bold text-slate-700">{person.nombre}</td>
                      <td className="px-4 py-2 text-[10px] text-slate-500 font-medium">{person.area}</td>
                      <td className="px-4 py-2 text-[10px] text-slate-500 text-right font-medium">{person.ingreso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card !p-0 flex flex-col flex-1 min-h-[200px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Resumen por Área</h3>
            </div>
            <div className="p-2 overflow-y-auto">
              {stats.areas.map((area, index) => (
                <div
                  key={`${area.name}-${index}`}
                  className={`flex justify-between items-center px-3 py-2 text-[11px] font-medium border-b transition-all cursor-pointer rounded-lg ${chartFilter?.type === 'area' && chartFilter.value === area.name ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'border-slate-50 text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => handleChartFilter({ type: 'area', value: area.name })}
                >
                  <span>{area.name}</span>
                  <span className={`font-black px-2 py-0.5 rounded-full ${chartFilter?.type === 'area' && chartFilter.value === area.name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-900'}`}>{area.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-5 lg:col-span-2 h-[300px] flex flex-col relative group" id="chart-historica">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Dotación Histórica</h3>
              <button onClick={() => handleDownload('chart-historica', 'dotacion_historica')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all" title="Descargar Imagen">
                <Download size={14} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.historical}
                margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                onClick={e => {
                  const payload = e?.activePayload?.[0]?.payload;
                  if (payload?.name) handleChartFilter({ type: 'mes', value: payload.name });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={label => `Mes: ${label}`} />
                <Line type="monotone" dataKey="dotacion" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} className="cursor-pointer">
                  <LabelList dataKey="dotacion" position="top" style={{ fontSize: '10px', fill: '#4f46e5', fontWeight: 'bold' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5 h-[300px] flex flex-col relative group" id="chart-crecimiento">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Tasa Crecimiento Área</h3>
              <button onClick={() => handleDownload('chart-crecimiento', 'tasa_crecimiento_area')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <Download size={14} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.growth} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                <Tooltip />
                <Area type="monotone" dataKey="growth" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorGrowth)" onClick={entry => handleChartFilter({ type: 'area', value: entry.name })} className="cursor-pointer" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5 h-[350px] flex flex-col lg:col-span-1 relative group" id="chart-antiguedad">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Colaboradores por Antigüedad</h3>
              <button onClick={() => handleDownload('chart-antiguedad', 'dotacion_antiguedad')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <Download size={14} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.antiguedad} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={100} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} className="cursor-pointer" onClick={entry => handleChartFilter({ type: 'antiguedad', value: entry.name })}>
                  {stats.antiguedad.map((_, index) => <Cell key={`ant-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5 h-[350px] flex flex-col lg:col-span-2 relative group" id="chart-categoria">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">% Dotación por Categoría</h3>
              <button onClick={() => handleDownload('chart-categoria', 'dotacion_categoria')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <Download size={14} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categories.slice(0, 12)} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={150} />
                <Tooltip />
                <Bar dataKey="percent" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} className="cursor-pointer" onClick={entry => handleChartFilter({ type: 'categoria', value: entry.name })}>
                  {stats.categories.slice(0, 12).map((_, index) => <Cell key={`cat-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  <LabelList dataKey="percent" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-xs font-medium bg-white/60 border border-slate-200/60 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm appearance-none cursor-pointer hover:bg-white"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%2364748b\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

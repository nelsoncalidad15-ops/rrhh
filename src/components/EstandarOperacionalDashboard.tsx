import React, { useMemo, useState } from 'react';
import { 
  Settings, 
  Filter,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LabelList
} from 'recharts';
import { toPng } from 'html-to-image';
import { EstandarOperacionalItem } from '../types';

interface Props {
  data: EstandarOperacionalItem[];
}

export function EstandarOperacionalDashboard({ data }: Props) {
  const [filters, setFilters] = useState({
    anio: 'Todas',
    provincia: 'Todas',
    q: 'Todas',
    tipo: 'Todas',
    funcion: 'Todas'
  });

  const filterOptions = useMemo(() => {
    return {
      anios: ['Todas', ...new Set(data.map(d => d.anio))].sort(),
      provincias: ['Todas', ...new Set(data.map(d => d.provincia))].sort(),
      qs: ['Todas', ...new Set(data.map(d => d.q))].sort(),
      tipos: ['Todas', ...new Set(data.map(d => d.tipo))].sort(),
      funciones: ['Todas', ...new Set(data.map(d => d.funcionPrincipal))].sort()
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchAnio = filters.anio === 'Todas' || d.anio === filters.anio;
      const matchProvincia = filters.provincia === 'Todas' || d.provincia === filters.provincia;
      const matchQ = filters.q === 'Todas' || d.q === filters.q;
      const matchTipo = filters.tipo === 'Todas' || d.tipo === filters.tipo;
      const matchFuncion = filters.funcion === 'Todas' || d.funcionPrincipal === filters.funcion;
      return matchAnio && matchProvincia && matchQ && matchTipo && matchFuncion;
    });
  }, [data, filters]);

  const personnelChartData = useMemo(() => {
    const allowedFunctions = [
      'Asesor de servicio',
      'Asesor de citas',
      'Adm de Garantia',
      'Asesor de Repuestos',
      'Tecnicos (mecanicos,electricistas, etc)',
      'Lavador'
    ];
    
    // Group by function
    const grouped = filteredData
      .filter(d => allowedFunctions.includes(d.funcionPrincipal))
      .reduce((acc, curr) => {
        const key = curr.funcionPrincipal;
        if (!acc[key]) {
          acc[key] = { name: key, recomendado: 0, actual: 0 };
        }
        acc[key].recomendado += curr.cantidadCertificados;
        acc[key].actual += curr.cantidadCertificadosReales;
        return acc;
      }, {} as Record<string, any>);

    // Order according to allowedFunctions
    return allowedFunctions
      .map(f => grouped[f])
      .filter(Boolean);
  }, [filteredData]);

  const workshopStepsChartData = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      const key = curr.funcionPrincipal;
      if (!acc[key]) {
        acc[key] = { name: key, recomendado: 0, actual: 0 };
      }
      const recomendado = parseFloat(String(curr.pasosTaller).replace(',', '.')) || 0;
      acc[key].recomendado += recomendado;
      acc[key].actual += curr.pasosTallerReal;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .filter(d => d.recomendado > 0 || d.actual > 0)
      .sort((a, b) => b.recomendado - a.recomendado);
  }, [filteredData]);

  const summaryStats = useMemo(() => {
    const totalRec = personnelChartData.reduce((sum, d) => sum + d.recomendado, 0);
    const totalAct = personnelChartData.reduce((sum, d) => sum + d.actual, 0);
    const gap = totalRec - totalAct;
    const fulfillment = totalRec > 0 ? (totalAct / totalRec) * 100 : 0;

    return { totalRec, totalAct, gap, fulfillment };
  }, [personnelChartData]);

  const handleDownload = (id: string, name: string) => {
    const node = document.getElementById(id);
    if (node) {
      toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2 })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${name}.png`;
          link.href = dataUrl;
          link.click();
        });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <section className="glass-card !p-5 overflow-visible">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#001E50] to-[#00B0F0] flex items-center justify-center shadow-xl shadow-[#001E50]/20 text-white shrink-0">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#001E50] tracking-tight leading-none">Estándar Operacional VW</h2>
              <p className="text-[10px] font-black text-[#00B0F0] uppercase tracking-[0.2em] mt-2">Panel de Control de Estructura</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Año" value={filters.anio} onChange={v => setFilters(f => ({...f, anio: v}))} options={filterOptions.anios} />
            <FilterSelect label="Provincia" value={filters.provincia} onChange={v => setFilters(f => ({...f, provincia: v}))} options={filterOptions.provincias} />
            <FilterSelect label="Trimestre (Q)" value={filters.q} onChange={v => setFilters(f => ({...f, q: v}))} options={filterOptions.qs} />
            <FilterSelect label="Tipo" value={filters.tipo} onChange={v => setFilters(f => ({...f, tipo: v}))} options={filterOptions.tipos} />
            <FilterSelect label="Función" value={filters.funcion} onChange={v => setFilters(f => ({...f, funcion: v}))} options={filterOptions.funciones} />
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Dotación Recomendada" 
          value={summaryStats.totalRec} 
          subtitle="Total según estándar"
          icon={<Users size={20} />}
          color="bg-[#00B0F0]"
        />
        <KPICard 
          title="Dotación Actual" 
          value={summaryStats.totalAct} 
          subtitle="Total certificados reales"
          icon={<CheckCircle2 size={20} />}
          color="bg-[#001E50]"
        />
        <KPICard 
          title="Gap de Estructura" 
          value={summaryStats.gap} 
          subtitle="Diferencia a cubrir"
          icon={<AlertCircle size={20} />}
          color={summaryStats.gap > 0 ? "bg-amber-500" : "bg-emerald-500"}
        />
        <KPICard 
          title="% Cumplimiento" 
          value={`${summaryStats.fulfillment.toFixed(1)}%`} 
          subtitle="Nivel de cobertura"
          icon={<Settings size={20} />}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Personnel Comparison */}
        <div className="glass-card p-6 h-[550px] flex flex-col relative group" id="chart-certificates">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Dotación Crítica: Rec. vs Real</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Comparativa por Funciones Principales</p>
            </div>
            <button onClick={() => handleDownload('chart-certificates', 'comparativa_dotacion')} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
              <Download size={18} className="text-[#001E50]" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={personnelChartData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} 
                  height={100}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', opacity: 0.4 }} 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} 
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="recomendado" name="Cert. Recomendados" fill="#00B0F0" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="recomendado" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#00B0F0' }} />
                </Bar>
                <Bar dataKey="actual" name="Cert. Reales" fill="#001E50" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="actual" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#001E50' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Workshop Steps */}
        <div className="glass-card p-6 h-[550px] flex flex-col relative group" id="chart-steps">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Pasos de Taller: Rec. vs Real</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Capacidad Operativa por Función</p>
            </div>
            <button onClick={() => handleDownload('chart-steps', 'comparativa_pasos')} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
              <Download size={18} className="text-[#001E50]" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workshopStepsChartData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} 
                  height={100}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', opacity: 0.4 }} 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} 
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="recomendado" name="Pasos Rec." fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="recomendado" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#0ea5e9' }} />
                </Bar>
                <Bar dataKey="actual" name="Pasos Reales" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="actual" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#4f46e5' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Data Grid */}
      <section className="glass-card overflow-hidden !p-0">
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#001E50]">Matriz de Detalle Estándar</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Registros filtrados: {filteredData.length}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Función / Tipo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cert. Rec.</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cert. Real</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pasos Rec.</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pasos Real</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4">
                    <p className="text-[13px] font-bold text-[#001E50] group-hover:text-[#00B0F0] transition-colors">{item.funcionPrincipal}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.tipo === 'Funcion' ? 'bg-[#00B0F0]' : 'bg-indigo-400'}`} />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{item.tipo}</p>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{item.cantidadCertificados}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${item.cantidadCertificadosReales >= item.cantidadCertificados ? 'text-emerald-600 bg-emerald-50' : 'text-[#001E50] bg-slate-100'}`}>
                      {item.cantidadCertificadosReales}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{item.pasosTaller}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-xs font-black text-[#001E50] bg-slate-100 px-2 py-1 rounded-md">{item.pasosTallerReal}</span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-[#001E50]/5 text-[#001E50] text-[9px] font-black uppercase rounded-md border border-[#001E50]/10">{item.provincia}</span>
                      <span className="px-2 py-1 bg-[#00B0F0]/5 text-[#00B0F0] text-[9px] font-black uppercase rounded-md border border-[#00B0F0]/10">{item.q}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: string[] }) {
  return (
    <div className="flex flex-col gap-2 min-w-[150px]">
      <label className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 pl-1">{label}</label>
      <div className="relative group">
        <select 
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[#001E50] outline-none focus:ring-2 focus:ring-[#00B0F0]/30 focus:border-[#00B0F0] transition-all shadow-sm appearance-none cursor-pointer hover:bg-slate-50"
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00B0F0] pointer-events-none transition-colors" size={14} />
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon, color }: { title: string, value: string | number, subtitle: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="glass-card p-6 border-l-4 border-l-transparent hover:border-l-current transition-all group overflow-hidden relative" style={{ color: color.includes('[') ? color.match(/\[(.*?)\]/)?.[1] : undefined }}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-black text-[#001E50] group-hover:scale-105 transition-transform origin-left">{value}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-current/20`}>
          {icon}
        </div>
      </div>
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${color} opacity-[0.03] group-hover:scale-150 transition-transform duration-700`} />
    </div>
  );
}

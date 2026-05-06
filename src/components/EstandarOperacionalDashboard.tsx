import React, { useMemo, useState } from 'react';
import { 
  Users,
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
    // Group by function (Showing ALL as requested)
    const grouped = filteredData
      .reduce((acc, curr) => {
        const key = curr.funcionPrincipal;
        if (!acc[key]) {
          acc[key] = { name: key, recomendado: 0, actual: 0 };
        }
        acc[key].recomendado += curr.cantidadCertificados;
        acc[key].actual += curr.cantidadCertificadosReales;
        return acc;
      }, {} as Record<string, any>);

    return Object.values(grouped).sort((a, b) => b.recomendado - a.recomendado);
  }, [filteredData]);

  const workshopStepsChartData = useMemo(() => {
    const criticalFunctions = [
      'Asesor de servicio',
      'Asesor de citas',
      'Adm de Garantia',
      'Asesor de Repuestos',
      'Tecnicos (mecanicos,electricistas, etc)',
      'Lavador'
    ];

    const grouped = filteredData
      .filter(d => criticalFunctions.includes(d.funcionPrincipal))
      .reduce((acc, curr) => {
        const key = curr.funcionPrincipal;
        if (!acc[key]) {
          acc[key] = { name: key, recomendado: 0, actual: 0 };
        }
        // Exigencia Marca = Pasos taller (std) * Certificados Reales
        const stepsStd = parseFloat(String(curr.pasosTaller).replace(',', '.')) || 0;
        const requirement = stepsStd * curr.cantidadCertificadosReales;
        
        acc[key].recomendado += requirement;
        acc[key].actual += curr.pasosTallerReal;
        return acc;
      }, {} as Record<string, any>);

    return Object.values(grouped)
      .filter(d => d.recomendado > 0 || d.actual > 0)
      .sort((a, b) => b.recomendado - a.recomendado);
  }, [filteredData]);

  const personnelByWorkloadChartData = useMemo(() => {
    const criticalFunctions = [
      'Asesor de servicio',
      'Asesor de citas',
      'Adm de Garantia',
      'Asesor de Repuestos',
      'Tecnicos (mecanicos,electricistas, etc)',
      'Lavador'
    ];

    const grouped = filteredData
      .filter(d => criticalFunctions.includes(d.funcionPrincipal))
      .reduce((acc, curr) => {
        const key = curr.funcionPrincipal;
        if (!acc[key]) {
          acc[key] = { name: key, necesario: 0, actual: 0 };
        }
        
        const stepsStd = parseFloat(String(curr.pasosTaller).replace(',', '.')) || 0;
        // Dotación Necesaria = Pasos Reales / Pasos Std
        const needed = stepsStd > 0 ? (curr.pasosTallerReal / stepsStd) : 0;
        
        acc[key].necesario += needed;
        acc[key].actual += curr.cantidadCertificadosReales;
        return acc;
      }, {} as Record<string, any>);

    return Object.values(grouped)
      .map(d => ({
        ...d,
        necesario: Number(d.necesario.toFixed(1)),
        actual: d.actual
      }))
      .filter(d => d.necesario > 0 || d.actual > 0)
      .sort((a, b) => b.necesario - a.necesario);
  }, [filteredData]);

  const summaryStats = useMemo(() => {
    const totalRec = personnelChartData.reduce((sum, d) => sum + d.recomendado, 0);
    const totalAct = personnelChartData.reduce((sum, d) => sum + d.actual, 0);
    const gap = totalRec - totalAct;
    const fulfillment = totalRec > 0 ? (totalAct / totalRec) * 100 : 0;

    return { totalRec, totalAct, gap, fulfillment };
  }, [personnelChartData]);

  const realDataByRole = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      const role = curr.funcionPrincipal;
      if (!acc[role]) {
        acc[role] = { certReal: 0, stepsReal: 0 };
      }
      acc[role].certReal += curr.cantidadCertificadosReales;
      acc[role].stepsReal += curr.pasosTallerReal;
      return acc;
    }, {} as Record<string, { certReal: number, stepsReal: number }>);
  }, [filteredData]);

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
      {/* Header & Filters */}
      <section className="glass-card !p-8 overflow-visible relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B0F0] opacity-[0.03] rounded-full -mr-32 -mt-32" />
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 relative">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#001E50] to-[#00B0F0] flex items-center justify-center shadow-2xl shadow-[#001E50]/30 text-white shrink-0">
                <Settings size={32} className="animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-[#001E50] tracking-tight leading-tight">Estándar Operacional VW</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-1 w-8 bg-[#00B0F0] rounded-full" />
                  <p className="text-[11px] font-black text-[#00B0F0] uppercase tracking-[0.3em]">Panel de Control de Estructura</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 w-full lg:w-auto">
            <FilterSelect label="Año" value={filters.anio} onChange={v => setFilters(f => ({...f, anio: v}))} options={filterOptions.anios} />
            <FilterSelect label="Provincia" value={filters.provincia} onChange={v => setFilters(f => ({...f, provincia: v}))} options={filterOptions.provincias} />
            <FilterSelect label="Trimestre" value={filters.q} onChange={v => setFilters(f => ({...f, q: v}))} options={filterOptions.qs} />
            <FilterSelect label="Tipo" value={filters.tipo} onChange={v => setFilters(f => ({...f, tipo: v}))} options={filterOptions.tipos} />
            <div className="col-span-2 sm:col-span-1 xl:col-span-1">
              <FilterSelect label="Función" value={filters.funcion} onChange={v => setFilters(f => ({...f, funcion: v}))} options={filterOptions.funciones} />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group relative">
          <div className="absolute inset-0 bg-[#00B0F0] opacity-[0.05] blur-3xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700" />
          <KPICard 
            title="Cantidad de certificados" 
            value={summaryStats.totalRec} 
            subtitle="Total proyectado según estándar de marca"
            icon={<Users size={24} />}
            color="bg-[#00B0F0]"
            variant="primary"
          />
        </div>
        <div className="group relative">
          <div className="absolute inset-0 bg-[#001E50] opacity-[0.05] blur-3xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700" />
          <KPICard 
            title="Certificados Reales" 
            value={summaryStats.totalAct} 
            subtitle="Total de dotación certificada actualmente"
            icon={<CheckCircle2 size={24} />}
            color="bg-[#001E50]"
            variant="secondary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Chart: Personnel by Workload */}
        <div className="glass-card p-6 h-[550px] flex flex-col relative group" id="chart-dotacion-carga">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Dotación: Necesaria (según Carga) vs Real</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Cálculo: Pasos Reales / Pasos Std</p>
            </div>
            <button onClick={() => handleDownload('chart-dotacion-carga', 'dotacion_necesaria_carga')} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
              <Download size={18} className="text-[#001E50]" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={personnelByWorkloadChartData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
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
                <Bar dataKey="necesario" name="Dotación Necesaria" fill="#00B0F0" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="necesario" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#00B0F0' }} />
                </Bar>
                <Bar dataKey="actual" name="Dotación Real" fill="#001E50" radius={[6, 6, 0, 0]} barSize={24}>
                  <LabelList dataKey="actual" position="top" style={{ fontSize: '11px', fontWeight: '800', fill: '#001E50' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Workshop Steps */}
        <div className="glass-card p-6 h-[550px] flex flex-col relative group" id="chart-steps">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Pasos de Taller: Exigencia vs Real</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Cálculo: Pasos Std × Certificados Reales</p>
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
                <Bar dataKey="recomendado" name="Exigencia Marca" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={24}>
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
            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#001E50]">Matriz de Detalle Estándar (Referencia vs Real)</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Visualización de estándares de marca y cumplimiento actual</p>
          </div>
          <div className="bg-white px-3 py-1 rounded-full border border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Registros: <span className="text-[#001E50]">{filteredData.length}</span></p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Funciones Principales</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant. Certificados</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pasos de Taller</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant. Pers (Tec/Serv/Op)</th>
                <th className="px-4 py-4 text-[9px] font-black text-[#00B0F0] uppercase tracking-widest text-center">Cert. Real</th>
                <th className="px-4 py-4 text-[9px] font-black text-[#001E50] uppercase tracking-widest text-center">Pasos Real</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-[12px] font-bold text-[#001E50] group-hover:text-[#00B0F0] transition-colors">{item.funcionPrincipal}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter mt-0.5">{item.tipo}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{item.cantidadCertificados}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{item.pasosTaller || '-'}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-[10px] font-bold text-slate-500 italic">{item.cantidadPers || '-'}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${item.cantidadCertificadosReales >= item.cantidadCertificados ? 'text-emerald-600 bg-emerald-50' : 'text-[#001E50] bg-slate-100'}`}>
                      {item.cantidadCertificadosReales}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-black text-[#001E50] bg-slate-100 px-2 py-1 rounded-md">{item.pasosTallerReal}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 bg-[#001E50]/5 text-[#001E50] text-[8px] font-black uppercase rounded border border-[#001E50]/10">{item.provincia}</span>
                      <span className="px-1.5 py-0.5 bg-[#00B0F0]/5 text-[#00B0F0] text-[8px] font-black uppercase rounded border border-[#00B0F0]/10">{item.q}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Brand Standards Quick Guide (Screenshot Friendly) */}
      <section className="glass-card !p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
             <Settings size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Guía de Estándares de Marca (Referencia)</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Resumen de exigencias para captura de pantalla</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {BRAND_STANDARDS.map((std, i) => {
            const real = realDataByRole[std.role] || { certReal: 0, stepsReal: 0 };
            const hasRealData = !!realDataByRole[std.role];
            const isNumericSteps = !isNaN(Number(std.steps)) && std.steps !== '-';

            return (
              <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-lg p-2 flex flex-col hover:border-indigo-200 transition-colors group">
                <p className="text-[9px] font-black text-[#001E50] leading-tight mb-1.5 group-hover:text-indigo-600 transition-colors uppercase tracking-tighter truncate" title={std.role}>
                  {std.role}
                </p>
                
                {/* Certificates Row (Always shown) */}
                <div className="flex items-center justify-between gap-1 mb-1 border-b border-slate-100/50 pb-1">
                  <div className="flex flex-col">
                    <span className="text-[6px] font-black text-slate-400 uppercase">Marca</span>
                    <span className="text-[10px] font-black text-slate-600">{std.certs}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[6px] font-black text-[#00B0F0] uppercase">Real</span>
                    <span className={`text-[10px] font-black ${hasRealData ? 'text-[#00B0F0]' : 'text-slate-300'}`}>
                      {real.certReal}
                    </span>
                  </div>
                </div>

                {/* Steps Row (Only if numeric) */}
                {isNumericSteps ? (
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <span className="text-[6px] font-black text-slate-400 uppercase">Pasos Std</span>
                      <span className="text-[9px] font-bold text-slate-500">{std.steps}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[6px] font-black text-[#001E50] uppercase">Pasos Real</span>
                      <span className={`text-[9px] font-black ${hasRealData ? 'text-[#001E50]' : 'text-slate-300'}`}>
                        {real.stepsReal}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[6px] font-black text-slate-300 uppercase tracking-widest">Estándar</span>
                    <span className="text-[8px] font-bold text-slate-400 truncate max-w-[60px]" title={std.condition}>
                      {std.condition}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center opacity-50">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">© Autosol Jujuy - Estándar Operacional VW</p>
          <div className="flex gap-4">
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-indigo-600" />
               <span className="text-[8px] font-black text-slate-500 uppercase">Certs: Cantidad</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-slate-400" />
               <span className="text-[8px] font-black text-slate-500 uppercase">Pasos: Std/Carga</span>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const BRAND_STANDARDS = [
  { role: 'Asesor de servicio', certs: '1', steps: '12', condition: '-' },
  { role: 'Asesor de citas', certs: '1', steps: '24', condition: '-' },
  { role: 'Gerente de Servicio', certs: '1', steps: '-', condition: '≥ 3 asesores' },
  { role: 'Gerente de Repuestos', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Jefe de taller', certs: '1', steps: '-', condition: '≥ 5 técnicos' },
  { role: 'Adm de Garantia', certs: '1', steps: '10', condition: 'siempre' },
  { role: 'Asesor de Repuestos', certs: '1', steps: '12', condition: '-' },
  { role: 'Gerente de PVT', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Tecnicos (mecanicos,electricistas, etc)', certs: '1', steps: '3', condition: '-' },
  { role: 'RAD', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Vendedor Nora', certs: '1', steps: '1', condition: '1' },
  { role: 'Coord de Capacitación', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Master Técnico', certs: '1', steps: '30/día', condition: '-' },
  { role: 'Asesor Comercial', certs: '1', steps: '-', condition: '40' },
  { role: 'Lavador', certs: '1', steps: '12', condition: '-' },
  { role: 'Tec en Mantenimiento', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Tec en Diagnóstico', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Seguridad Producto', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Coord de IT', certs: '1', steps: 'siempre', condition: 'siempre' },
  { role: 'Coord de Campaña', certs: '1', steps: 'siempre', condition: 'siempre' },
];

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

function KPICard({ title, value, subtitle, icon, color, variant }: { title: string, value: string | number, subtitle: string, icon: React.ReactNode, color: string, variant?: 'primary' | 'secondary' }) {
  return (
    <div className={`glass-card !p-8 border-t-4 ${variant === 'primary' ? 'border-t-[#00B0F0]' : 'border-t-[#001E50]'} hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group overflow-hidden relative min-h-[160px] flex items-center`}>
      <div className="flex justify-between items-center w-full relative z-10">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className={`text-5xl font-black ${variant === 'primary' ? 'text-[#00B0F0]' : 'text-[#001E50]'} tracking-tight group-hover:scale-105 transition-transform duration-500 origin-left`}>
            {value}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide opacity-80">{subtitle}</p>
        </div>
        <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-white shadow-2xl shadow-current/30 group-hover:rotate-6 transition-transform duration-500`}>
          {icon}
        </div>
      </div>
      {/* Decorative background element */}
      <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full ${color} opacity-[0.02] group-hover:scale-150 transition-transform duration-1000`} />
    </div>
  );
}

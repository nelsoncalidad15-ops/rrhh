import React, { useMemo, useState } from 'react';
import { 
  Users, 
  TrendingDown, 
  UserMinus, 
  PieChart as PieChartIcon,
  Filter
} from 'lucide-react';
import { useRotacionData, EmpleadoRecord } from '../services/rotacionService';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, LabelList
} from 'recharts';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';

export function RotacionDashboard() {
  const { data, loading, error } = useRotacionData();

  const [filters, setFilters] = useState({
    localidad: 'Todas',
    ano: new Date().getFullYear().toString(),
    mes: 'Todas',
  });
  const [chartFilter, setChartFilter] = useState<{ type: 'mes' | 'motivo' | 'area', value: string } | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filterOptions = useMemo(() => {
    if (!data.length) return { localidades: [], anos: [], meses: [] };
    
    const years = new Set<string>();
    data.forEach(d => {
      if (d.fechaIngreso) years.add(d.fechaIngreso.getFullYear().toString());
      if (d.fechaNovedad) years.add(d.fechaNovedad.getFullYear().toString());
    });

    const monthOrder = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    return {
      localidades: Array.from(new Set(data.map(d => d.localidad).filter(Boolean))).sort(),
      anos: Array.from(years).sort((a, b) => b.localeCompare(a)), // Descending
      meses: monthOrder
    };
  }, [data]);

  const { filteredData, monthlyStats, motives, areas, kpis } = useMemo(() => {
    if (!data.length) return { filteredData: [], monthlyStats: [], motives: [], areas: [], kpis: { acumulada: 0 } };

    // Filtrar data por localidad y año
    let filtered = data;
    if (filters.localidad !== 'Todas') {
      filtered = filtered.filter(d => d.localidad === filters.localidad);
    }
    
    const year = parseInt(filters.ano, 10) || new Date().getFullYear();

    // Calcular estadísticas mensuales
    const monthsData = [];
    let bajasTotalesAnuales = 0;
    let dotacionPromedioTotal = 0;
    let mesesConData = 0;

    const monthOrder = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    for (let month = 0; month < 12; month++) {
      if (filters.mes !== 'Todas' && monthOrder[month].toLowerCase() !== filters.mes.toLowerCase()) {
        continue;
      }

      const endOfMonth = new Date(year, month + 1, 0); // Last day of month
      
      // Dotación al final del mes
      const activosAlFinal = filtered.filter(d => {
        if (!d.fechaIngreso || d.fechaIngreso > endOfMonth) return false;
        if (d.estado === 'Activo') return true;
        if (d.fechaNovedad && d.fechaNovedad > endOfMonth) return true;
        return false;
      });

      const countActivos = activosAlFinal.length;
      
      // Bajas en el mes
      const bajasEnMes = filtered.filter(d => {
        return d.fechaNovedad && 
               d.fechaNovedad.getFullYear() === year && 
               d.fechaNovedad.getMonth() === month;
      });

      const countBajas = bajasEnMes.length;

      // Voluntaria: Renuncia
      const voluntarias = bajasEnMes.filter(d => d.motivoNovedad && d.motivoNovedad.toLowerCase().includes('renuncia'));
      
      // Temprana: < 1 año de antigüedad
      const voluntariasTempranas = voluntarias.filter(d => {
        if (!d.fechaIngreso || !d.fechaNovedad) return false;
        const diffDays = (d.fechaNovedad.getTime() - d.fechaIngreso.getTime()) / (1000 * 3600 * 24);
        return diffDays < 365;
      });

      const rotacionMensual = countActivos > 0 ? (countBajas / countActivos) * 100 : 0;
      const rotacionVoluntaria = countActivos > 0 ? (voluntarias.length / countActivos) * 100 : 0;
      const rotacionVolTemprana = countActivos > 0 ? (voluntariasTempranas.length / countActivos) * 100 : 0;
      // Rotacion Interanual (Anualizada)
      const rotacionInteranual = rotacionMensual * 12;

      const mesStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;

      if (countActivos > 0 || countBajas > 0) {
        monthsData.push({
          mes: mesStr,
          nombreMes: monthOrder[month].substring(0, 3).toUpperCase(),
          rotacionMensual,
          rotacionInteranual,
          rotacionVoluntaria,
          rotacionVolTemprana,
          bajas: countBajas
        });
        
        bajasTotalesAnuales += countBajas;
        dotacionPromedioTotal += countActivos;
        mesesConData++;
      }
    }

    const dotacionPromedioAnual = mesesConData > 0 ? dotacionPromedioTotal / mesesConData : 0;
    const rotacionAcumuladaAnual = dotacionPromedioAnual > 0 ? (bajasTotalesAnuales / dotacionPromedioAnual) * 100 : 0;

    // Bajas en todo el año para motivos y areas
    const bajasAnuales = filtered.filter(d => {
        const enAno = d.fechaNovedad && d.fechaNovedad.getFullYear() === year;
        if (filters.mes !== 'Todas') {
          const m = monthOrder.findIndex(mo => mo.toLowerCase() === filters.mes.toLowerCase());
          return enAno && d.fechaNovedad!.getMonth() === m;
        }
        return enAno;
    });

    const motivosMap = new Map<string, number>();
    const areasMap = new Map<string, number>();

    bajasAnuales.forEach(d => {
      const mot = d.motivoNovedad || 'Sin especificar';
      motivosMap.set(mot, (motivosMap.get(mot) || 0) + 1);

      const ar = d.area || 'Sin especificar';
      areasMap.set(ar, (areasMap.get(ar) || 0) + 1);
    });

    const motivesArr = Array.from(motivosMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const areasArr = Array.from(areasMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // List of names for the sidebar
    let namesData = filtered;
    if (chartFilter) {
      if (chartFilter.type === 'mes') {
        const mStr = chartFilter.value.toLowerCase();
        const m = monthOrder.findIndex(mo => mo.substring(0,3) === mStr);
        namesData = namesData.filter(d => 
          d.fechaNovedad && 
          d.fechaNovedad.getFullYear() === year && 
          d.fechaNovedad.getMonth() === m
        );
      } else if (chartFilter.type === 'motivo') {
        namesData = bajasAnuales.filter(d => (d.motivoNovedad || 'Sin especificar') === chartFilter.value);
      } else if (chartFilter.type === 'area') {
        namesData = bajasAnuales.filter(d => (d.area || 'Sin especificar') === chartFilter.value);
      }
    }

    const filteredNames = Array.from(new Set(namesData.map(d => d.nombre))).sort();

    return { 
      filteredData: filteredNames,
      monthlyStats: monthsData,
      motives: motivesArr,
      areas: areasArr,
      kpis: {
        acumulada: rotacionAcumuladaAnual
      }
    };
  }, [data, filters, chartFilter]);

  const handleDownload = (id: string, name: string) => {
    const node = document.getElementById(id);
    if (node) {
      toPng(node, { backgroundColor: '#ffffff' })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${name}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch((err) => {
          console.error('Error downloading chart', err);
        });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Cargando indicadores de rotación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 shadow-sm max-w-md text-center">
          <h3 className="font-bold text-lg mb-2">Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Filters */}
      <section className="glass-card !p-5 overflow-visible">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white shrink-0">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Rotación</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Indicadores de RRHH</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Localidad" value={filters.localidad} onChange={v => handleFilterChange('localidad', v)} options={['Todas', ...filterOptions.localidades]} />
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <FilterSelect label="Año" value={filters.ano} onChange={v => handleFilterChange('ano', v)} options={filterOptions.anos} />
            <FilterSelect label="Mes" value={filters.mes} onChange={v => handleFilterChange('mes', v)} options={['Todas', ...filterOptions.meses]} />
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 ml-2">
              <Filter size={18} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: KPI & Names */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group border-l-4 border-l-rose-500">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingDown size={100} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 relative z-10">Rotación Acumulada Año (%)</p>
            <p className="text-5xl font-black text-slate-900 relative z-10">{kpis.acumulada.toFixed(2)} %</p>
          </div>
          
          <div className="glass-card !p-0 flex flex-col overflow-hidden h-[450px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Nombre y Apellido</h3>
              {chartFilter && (
                <button onClick={() => setChartFilter(null)} className="text-[9px] font-bold bg-rose-100 text-rose-600 px-2 py-1 rounded-md hover:bg-rose-200 transition-colors uppercase tracking-widest">
                  Quitar Filtro
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredData.map((name, i) => (
                <div key={i} className={`px-3 py-2 text-xs font-medium rounded-lg ${i % 2 === 0 ? 'bg-transparent' : 'bg-slate-50'}`}>
                  {name}
                </div>
              ))}
              <div className="px-3 py-2 text-xs font-black border-t border-slate-200 mt-2">
                Total: {filteredData.length}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 1: Rotacion Total Mensual */}
          <div className="glass-card p-5 h-[300px] flex flex-col relative group" id="chart-rot-mensual">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">% Rotación Total Mensual</h3>
              <button onClick={() => handleDownload('chart-rot-mensual', 'rotacion_mensual')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <Download size={14} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} onClick={(e) => { if (e && e.activePayload) setChartFilter({ type: 'mes', value: e.activePayload[0].payload.nombreMes }); }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="nombreMes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [`${val.toFixed(2)}%`, 'Rotación']}
                  />
                  <Line type="monotone" dataKey="rotacionMensual" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} className="cursor-pointer">
                    <LabelList dataKey="rotacionMensual" position="top" formatter={(val: number) => `${val.toFixed(1)}%`} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Rotacion Interanual */}
          <div className="glass-card p-5 h-[300px] flex flex-col relative group" id="chart-rot-interanual">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Rotación Interanual</h3>
              <button onClick={() => handleDownload('chart-rot-interanual', 'rotacion_interanual')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <Download size={14} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="nombreMes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [`${val.toFixed(2)}%`, 'Rotación Interanual']}
                  />
                  <Bar dataKey="rotacionInteranual" fill="#3b82f6" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={(data) => setChartFilter({ type: 'mes', value: data.nombreMes })}>
                    {monthlyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="rotacionInteranual" position="top" formatter={(val: number) => `${val.toFixed(1)}%`} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Voluntaria y Temprana */}
          <div className="glass-card p-5 h-[300px] flex flex-col relative group" id="chart-rot-voluntaria">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">% Rotación Voluntaria y Temprana</h3>
              <button onClick={() => handleDownload('chart-rot-voluntaria', 'rotacion_voluntaria')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                <Download size={14} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="nombreMes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [`${val.toFixed(2)}%`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                  <Bar dataKey="rotacionVoluntaria" name="Voluntaria Mensual" fill="#0ea5e9" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={(data) => setChartFilter({ type: 'mes', value: data.nombreMes })}>
                    <LabelList dataKey="rotacionVoluntaria" position="top" formatter={(val: number) => val > 0 ? `${val.toFixed(1)}%` : ''} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }} />
                  </Bar>
                  <Bar dataKey="rotacionVolTemprana" name="Voluntaria Temprana" fill="#1e3a8a" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={(data) => setChartFilter({ type: 'mes', value: data.nombreMes })}>
                    <LabelList dataKey="rotacionVolTemprana" position="top" formatter={(val: number) => val > 0 ? `${val.toFixed(1)}%` : ''} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-[300px]">
            {/* Chart 4: Bajas por motivo */}
            <div className="glass-card p-5 flex flex-col relative group" id="chart-bajas-motivo">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Cantidad de Bajas por Motivo</h3>
                <button onClick={() => handleDownload('chart-bajas-motivo', 'bajas_por_motivo')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                  <Download size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motives} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} width={80} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16} className="cursor-pointer" onClick={(data) => setChartFilter({ type: 'motivo', value: data.name })}>
                       {motives.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Bajas por área */}
            <div className="glass-card p-5 flex flex-col relative group" id="chart-bajas-area">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Bajas por Área</h3>
                <button onClick={() => handleDownload('chart-bajas-area', 'bajas_por_area')} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                  <Download size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={areas}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                      className="cursor-pointer focus:outline-none"
                      onClick={(data) => setChartFilter({ type: 'area', value: data.name })}
                    >
                      {areas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Subcomponente
function FilterSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: string[] }) {
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

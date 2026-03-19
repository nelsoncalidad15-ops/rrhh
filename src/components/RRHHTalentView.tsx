import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  AlertCircle, 
  Filter, 
  X
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { CourseGrade, RelatorioItem } from '../types';

interface RRHHTalentViewProps {
  grades: CourseGrade[];
  relatorio: RelatorioItem[];
  units: string[];
  areas: string[];
  functions: string[];
  selectedUnit: string;
  setSelectedUnit: (u: string) => void;
  selectedArea: string;
  setSelectedArea: (a: string) => void;
  selectedFunction: string;
  setSelectedFunction: (f: string) => void;
  onResetFilters: () => void;
  showPendingOnly: boolean;
  setShowPendingOnly: (s: boolean) => void;
  onSelectCollab: (id: string) => void;
}

const RRHHTalentView: React.FC<RRHHTalentViewProps> = ({
  grades,
  relatorio,
  units,
  areas,
  functions,
  selectedUnit,
  setSelectedUnit,
  selectedArea,
  setSelectedArea,
  selectedFunction,
  setSelectedFunction,
  onResetFilters,
  showPendingOnly,
  setShowPendingOnly,
  onSelectCollab
}) => {
  const totalColaboradores = grades.length;
  
  const avgICF = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, curr) => acc + curr.icf, 0);
    return Math.round(sum / grades.length);
  }, [grades]);

  const totalPending = useMemo(() => {
    // Count unique collaborators with pending courses in the current filtered set
    const collaboratorNames = new Set(grades.map(g => g.colaborador.toLowerCase()));
    const pendingNames = new Set(relatorio.filter(r => collaboratorNames.has(r.nombre.toLowerCase())).map(r => r.nombre.toLowerCase()));
    return pendingNames.size;
  }, [grades, relatorio]);

  const icfChartData = [
    { name: 'ICF Promedio', value: avgICF, color: '#00B0F0' },
    { name: 'Restante', value: 100 - avgICF, color: '#E2E8F0' }
  ];

  const getICFColor = (icf: number) => {
    if (icf >= 90) return 'bg-emerald-500';
    if (icf >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getICFTextClass = (icf: number) => {
    if (icf >= 90) return 'text-emerald-600';
    if (icf >= 50) return 'text-blue-600';
    return 'text-amber-600';
  };

  return (
    <div className="space-y-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <KPICard 
          title="Total de Colaboradores" 
          value={totalColaboradores.toString()} 
          icon={<Users className="text-white" size={28} />}
          subtitle="Activos en capacitación"
          color="bg-[#001E50]"
        />
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">ICF Promedio</p>
            <h3 className="text-5xl font-black font-mono text-[#001E50]">{avgICF}%</h3>
            <p className="text-xs text-[#00B0F0] mt-2 uppercase font-black tracking-tight">Índice de Capacitación</p>
          </div>
          <div className="w-20 h-20 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={icfChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={35}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {icfChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap size={16} className="text-[#00B0F0] opacity-20" />
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowPendingOnly(!showPendingOnly)}
          className={`p-6 rounded-3xl shadow-sm border transition-all text-left flex items-center justify-between group ${
            showPendingOnly 
              ? 'bg-[#00B0F0] border-[#00B0F0] text-white ring-4 ring-[#00B0F0]/10' 
              : 'bg-white border-slate-100 text-[#1A1A1A] hover:border-[#00B0F0] hover:shadow-md'
          }`}
        >
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${showPendingOnly ? 'text-white/70' : 'text-slate-400'}`}>Cursos Pendientes</p>
            <h3 className={`text-5xl font-black font-mono ${showPendingOnly ? 'text-white' : 'text-[#001E50]'}`}>{totalPending}</h3>
            <p className={`text-xs mt-2 uppercase font-black tracking-tight ${showPendingOnly ? 'text-white' : 'text-amber-500'}`}>Colaboradores con pendientes</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${showPendingOnly ? 'bg-white/20' : 'bg-slate-50'}`}>
            <AlertCircle className={showPendingOnly ? 'text-white' : 'text-amber-500'} size={24} />
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-[#001E50] ml-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <FilterSelect 
              label="Unidad" 
              value={selectedUnit} 
              options={units} 
              onChange={setSelectedUnit} 
            />
            <FilterSelect 
              label="Área" 
              value={selectedArea} 
              options={areas} 
              onChange={setSelectedArea} 
            />
            <FilterSelect 
              label="Función" 
              value={selectedFunction} 
              options={functions} 
              onChange={setSelectedFunction} 
            />
          </div>

          <button 
            onClick={onResetFilters}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <X size={16} />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Listado de Colaboradores</h4>
          <span className="text-[10px] font-black text-[#001E50] bg-[#00B0F0]/10 px-4 py-1.5 rounded-full uppercase tracking-widest">
            {grades.length} Resultados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidad</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Área</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Función</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-64">Progreso ICF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-3">
                      <X size={40} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                grades.map((g) => (
                  <tr 
                    key={`${g.id}-${g.colaborador}`} 
                    onClick={() => onSelectCollab(g.id)}
                    className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#001E50] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-[#001E50]/10 group-hover:bg-[#00B0F0] transition-colors">
                          {g.colaborador.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-black text-[#001E50] group-hover:text-[#00B0F0] transition-colors uppercase tracking-tight">{g.colaborador}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{g.funcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {g.unidad.split(' | ').filter(Boolean).map((u, i) => (
                          <span key={i} className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest">
                            {u}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        {g.area.split(' | ').filter(Boolean).map((a, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {g.funcion.split(' | ').filter(Boolean).map((f, i) => (
                          <span key={i} className="text-[9px] font-black text-[#00B0F0] uppercase tracking-widest">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        {/* Main ICF or first function ICF */}
                        {!g.icfByFunction || Object.keys(g.icfByFunction).length <= 1 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-black font-mono ${getICFTextClass(g.icf)}`}>{g.icf}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${g.icf}%` }}
                                className={`h-full rounded-full ${getICFColor(g.icf)}`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {Object.entries(g.icfByFunction).map(([func, val]) => (
                              <div key={func} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{func}</span>
                                  <span className={`text-[10px] font-black font-mono ${getICFTextClass(val as number)}`}>{val as number}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${val}%` }}
                                    className={`h-full rounded-full ${getICFColor(val as number)}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, subtitle, color = "bg-white" }) => (
  <div className={`${color} p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all`}>
    <div>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${color === 'bg-white' ? 'text-slate-400' : 'text-white/60'}`}>{title}</p>
      <h3 className={`text-5xl font-black font-mono ${color === 'bg-white' ? 'text-[#001E50]' : 'text-white'}`}>{value}</h3>
      <p className={`text-xs mt-2 uppercase font-black tracking-tight ${color === 'bg-white' ? 'text-slate-400' : 'text-[#00B0F0]'}`}>{subtitle}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${color === 'bg-white' ? 'bg-slate-50' : 'bg-white/10'}`}>
      {icon}
    </div>
  </div>
);

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, options, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-2">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#001E50] rounded-xl px-4 py-2.5 focus:bg-white focus:border-[#00B0F0] outline-none transition-all min-w-[160px] appearance-none cursor-pointer uppercase tracking-tight shadow-sm"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt === 'ALL' ? `Todas` : opt}</option>
      ))}
    </select>
  </div>
);

export default RRHHTalentView;

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
import { CourseGrade, RelatorioItem, CoursePhase } from '../types';

interface RRHHTalentViewProps {
  grades: CourseGrade[];
  relatorio: RelatorioItem[];
  phases: CoursePhase[];
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
  phases,
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
    return grades.filter(g => g.icf < 100).length;
  }, [grades]);

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
          icon={<Users className="text-white" size={24} strokeWidth={1.5} />}
          subtitle="Activos en capacitación"
          color="bg-[#001E50]"
        />
        
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#00B0F0]/5 transition-all duration-500">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 font-display">ICF Promedio</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-5xl font-bold font-display text-[#001E50] tracking-tighter">{avgICF}</h3>
              <span className="text-2xl font-bold text-[#00B0F0]">%</span>
            </div>
            <p className="text-[11px] text-[#00B0F0] mt-3 font-semibold tracking-tight">Índice de Capacitación</p>
          </div>
          <div className="w-24 h-24 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={icfChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={42}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {icfChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap size={20} className="text-[#00B0F0] opacity-30" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowPendingOnly(!showPendingOnly)}
          className={`p-8 rounded-[2.5rem] shadow-sm border transition-all duration-500 text-left flex items-center justify-between group ${
            showPendingOnly 
              ? 'bg-[#00B0F0] border-[#00B0F0] text-white ring-8 ring-[#00B0F0]/5 shadow-xl shadow-[#00B0F0]/20' 
              : 'bg-white border-slate-100 text-[#1A1A1A] hover:border-[#00B0F0] hover:shadow-xl hover:shadow-slate-200/50'
          }`}
        >
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 font-display ${showPendingOnly ? 'text-white/70' : 'text-slate-400'}`}>Cursos Pendientes</p>
            <h3 className={`text-5xl font-bold font-display tracking-tighter ${showPendingOnly ? 'text-white' : 'text-[#001E50]'}`}>{totalPending}</h3>
            <p className={`text-[11px] mt-3 font-semibold tracking-tight ${showPendingOnly ? 'text-white' : 'text-amber-500'}`}>Colaboradores con pendientes</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${showPendingOnly ? 'bg-white/20' : 'bg-slate-50'}`}>
            <AlertCircle className={showPendingOnly ? 'text-white' : 'text-amber-500'} size={28} strokeWidth={1.5} />
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3 text-[#001E50] ml-4">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
              <Filter size={16} className="text-[#00B0F0]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-display">Filtros</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 flex-1">
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
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-3 font-display">Colaborador</label>
              <div className="relative group">
                <select 
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) onSelectCollab(val);
                  }}
                  className="bg-slate-50 border border-slate-100 text-xs font-semibold text-[#001E50] rounded-2xl px-5 py-3 focus:bg-white focus:border-[#00B0F0] outline-none transition-all duration-300 min-w-[220px] appearance-none cursor-pointer uppercase tracking-tight shadow-sm group-hover:border-slate-200 font-display"
                >
                  <option value="">Seleccionar...</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.colaborador}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-[#00B0F0] transition-colors">
                  <Users size={12} strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={onResetFilters}
            className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all duration-300 text-[10px] font-bold uppercase tracking-widest font-display"
          >
            <X size={16} strokeWidth={1.5} />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] font-display">Listado de Colaboradores</h4>
          <span className="text-[10px] font-bold text-[#001E50] bg-[#00B0F0]/10 px-5 py-2 rounded-full uppercase tracking-widest font-display">
            {grades.length} Resultados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-display">Colaborador</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-display">Unidad</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-display">Área</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-display">Función</th>
                <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-display w-64">Progreso ICF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4">
                      <X size={48} className="opacity-10" strokeWidth={1} />
                      <p className="text-[10px] font-bold uppercase tracking-widest font-display">Sin resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                grades.map((g) => (
                  <tr 
                    key={`${g.id}-${g.colaborador}`} 
                    onClick={() => onSelectCollab(g.id)}
                    className="hover:bg-slate-50/80 transition-all duration-300 group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#001E50] flex items-center justify-center text-white font-bold text-sm shadow-xl shadow-[#001E50]/10 group-hover:bg-[#00B0F0] group-hover:shadow-[#00B0F0]/20 transition-all duration-500 font-display">
                          {g.colaborador.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-bold text-[#001E50] group-hover:text-[#00B0F0] transition-colors duration-300 font-display tracking-tight">{g.colaborador}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">{g.funcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {g.unidad.split(' | ').filter(Boolean).map((u, i) => (
                          <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-widest font-display">
                            {u}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        {g.area.split(' | ').filter(Boolean).map((a, i) => (
                          <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {g.funcion.split(' | ').filter(Boolean).map((f, i) => (
                          <span key={i} className="text-[9px] font-bold text-[#00B0F0] uppercase tracking-widest font-display">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-4">
                        {!g.icfByFunction || Object.keys(g.icfByFunction).length <= 1 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold font-display ${getICFTextClass(g.icf)}`}>{g.icf}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${g.icf}%` }}
                                className={`h-full rounded-full ${getICFColor(g.icf)} shadow-sm`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {Object.entries(g.icfByFunction).map(([func, val]) => (
                              <div key={func} className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px] font-display">{func}</span>
                                  <span className={`text-[10px] font-bold font-display ${getICFTextClass(val as number)}`}>{val as number}%</span>
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
  <div className={`${color} p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all duration-500 ${color === 'bg-white' ? 'hover:shadow-slate-200/50' : 'hover:shadow-[#001E50]/20'}`}>
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 font-display ${color === 'bg-white' ? 'text-slate-400' : 'text-white/60'}`}>{title}</p>
      <h3 className={`text-5xl font-bold font-display tracking-tighter ${color === 'bg-white' ? 'text-[#001E50]' : 'text-white'}`}>{value}</h3>
      <p className={`text-[11px] mt-3 font-semibold tracking-tight ${color === 'bg-white' ? 'text-slate-400' : 'text-[#00B0F0]'}`}>{subtitle}</p>
    </div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${color === 'bg-white' ? 'bg-slate-50' : 'bg-white/10'}`}>
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
  <div className="flex flex-col gap-2">
    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-3 font-display">{label}</label>
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-50 border border-slate-100 text-xs font-semibold text-[#001E50] rounded-2xl px-5 py-3 focus:bg-white focus:border-[#00B0F0] outline-none transition-all duration-300 min-w-[180px] appearance-none cursor-pointer uppercase tracking-tight shadow-sm group-hover:border-slate-200 font-display"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt === 'ALL' ? `Todas` : opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-[#00B0F0] transition-colors">
        <Filter size={12} strokeWidth={2} />
      </div>
    </div>
  </div>
);

export default RRHHTalentView;

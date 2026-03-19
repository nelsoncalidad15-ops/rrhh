import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Search, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User,
  Building2,
  Briefcase,
  Trophy,
  Calendar,
  Users,
  Printer,
  Download,
  Info,
  Clock3
} from 'lucide-react';
import { CourseGrade, RelatorioItem } from '../types';

interface RRHHCollaboratorsViewProps {
  grades: CourseGrade[];
  relatorio: RelatorioItem[];
  initialSearch?: string;
  initialSelectedId?: string | null;
  onNavigateToCalendar?: (event: RelatorioItem) => void;
}

interface ProgramCourse {
  name: string;
  score: number;
  status: 'approved' | 'pending' | 'failed';
  type: 'finished';
}

const RRHHCollaboratorsView: React.FC<RRHHCollaboratorsViewProps> = ({
  grades,
  relatorio,
  initialSearch = '',
  initialSelectedId = null,
  onNavigateToCalendar
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(
    initialSelectedId || grades[0]?.id || null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingUpcoming, setIsExportingUpcoming] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const upcomingRef = useRef<HTMLDivElement>(null);

  // Update selected collab if initialSelectedId changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedCollabId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const filteredCollabs = useMemo(() => {
    return grades
      .filter(g => g.colaborador.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }, [grades, searchQuery]);

  const selectedCollab = useMemo(() => {
    return grades.find(g => g.id === selectedCollabId) || null;
  }, [grades, selectedCollabId]);

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

  const programCoursesByFunction = useMemo(() => {
    if (!selectedCollab) return {} as Record<string, ProgramCourse[]>;
    
    const grouped: Record<string, ProgramCourse[]> = {};
    
    if (selectedCollab.coursesByFunction) {
      Object.entries(selectedCollab.coursesByFunction).forEach(([func, courses]) => {
        grouped[func] = Object.entries(courses)
          .filter(([_, score]) => (score as number) !== -1)
          .map(([name, score]) => {
            const numScore = score as number;
            let status: 'approved' | 'pending' | 'failed' = 'pending';
            if (numScore > 0) {
              status = numScore >= 60 ? 'approved' : 'failed';
            }
            
            return {
              name,
              score: numScore,
              status,
              type: 'finished' as const
            };
          }).sort((a, b) => {
            const statusOrder = { 'pending': 0, 'failed': 1, 'approved': 2 };
            if (a.status === b.status) return a.name.localeCompare(b.name);
            return statusOrder[a.status] - statusOrder[b.status];
          });
      });
    } else {
      // Fallback to general courses if no function breakdown
      grouped['General'] = Object.entries(selectedCollab.courses)
        .filter(([_, score]) => (score as number) !== -1)
        .map(([name, score]) => {
          const numScore = score as number;
          let status: 'approved' | 'pending' | 'failed' = 'pending';
          if (numScore > 0) {
            status = numScore >= 60 ? 'approved' : 'failed';
          }
          
          return {
            name,
            score: numScore,
            status,
            type: 'finished' as const
          };
        }).sort((a, b) => {
          const statusOrder = { 'pending': 0, 'failed': 1, 'approved': 2 };
          if (a.status === b.status) return a.name.localeCompare(b.name);
          return statusOrder[a.status] - statusOrder[b.status];
        });
    }
    
    return grouped;
  }, [selectedCollab]);

  const totalProgramCourses = useMemo(() => {
    return (Object.values(programCoursesByFunction) as ProgramCourse[][]).reduce((acc, curr) => acc + curr.length, 0);
  }, [programCoursesByFunction]);

  const upcomingCourses = useMemo(() => {
    if (!selectedCollab) return [];

    const normalizedCollabName = selectedCollab.colaborador.toLowerCase().trim();

    return relatorio
      .filter(r => r.nombre.toLowerCase().trim() === normalizedCollabName)
      .map(r => ({
        name: r.curso,
        score: 0,
        status: 'pending' as const,
        type: 'relatorio' as const,
        relatorioItem: r
      })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCollab, relatorio]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJPG = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#F2F3F5',
        logging: false,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `Legajo_${selectedCollab?.colaborador || 'Colaborador'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error('Error exporting JPG:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUpcomingJPG = async () => {
    if (!upcomingRef.current) return;
    setIsExportingUpcoming(true);
    try {
      const canvas = await html2canvas(upcomingRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          // Ensure the cloned element is visible even if it's in a scrollable area
          const el = clonedDoc.getElementById('upcoming-section-export');
          if (el) el.style.padding = '20px';
        }
      });
      const link = document.createElement('a');
      link.download = `Proximos_Cursos_${selectedCollab?.colaborador || 'Colaborador'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error('Error exporting upcoming JPG:', err);
    } finally {
      setIsExportingUpcoming(false);
    }
  };

  const renderAttributeList = (attr: string, label: string, Icon: any) => {
    const items = attr.split(' | ').filter(Boolean);
    if (items.length === 0) return null;

    return (
      <div className="flex flex-col gap-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon size={14} />
          <p className="text-[9px] font-black uppercase tracking-widest">{label}</p>
        </div>
        <div className="flex flex-col gap-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00B0F0]" />
              <span className="text-[11px] font-black text-[#001E50] uppercase tracking-tight">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20">
      {/* Top Selector Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#001E50] rounded-lg flex items-center justify-center shadow-lg shadow-[#001E50]/20">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[#001E50] uppercase tracking-tight">Selección de Colaborador</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Visualización de legajo de capacitación</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="BUSCAR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#001E50] focus:border-[#00B0F0] outline-none transition-all"
            />
          </div>
          <select
            value={selectedCollabId || ''}
            onChange={(e) => setSelectedCollabId(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-[#001E50] focus:border-[#00B0F0] outline-none cursor-pointer uppercase tracking-tight"
          >
            <option value="" disabled>Seleccionar Colaborador...</option>
            {filteredCollabs.map(collab => (
              <option key={`${collab.id}-${collab.colaborador}`} value={collab.id}>
                {collab.colaborador}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#001E50] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Printer size={14} />
            Imprimir
          </button>
          <button 
            onClick={handleExportJPG}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#001E50] hover:bg-[#001E50]/90 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#001E50]/20 disabled:opacity-50"
          >
            <Download size={14} />
            {isExporting ? 'Exportando...' : 'Exportar JPG'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6" ref={printRef}>
        {selectedCollab ? (
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="relative flex flex-col md:flex-row md:items-start gap-8">
                <div className="w-24 h-24 bg-[#001E50] rounded-2xl flex items-center justify-center shadow-xl shadow-[#001E50]/20 flex-shrink-0 border border-white/10">
                  <User size={40} className="text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <h2 className="text-4xl font-black text-[#001E50] uppercase tracking-tighter">
                      {selectedCollab.colaborador}
                    </h2>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      Activo
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {renderAttributeList(selectedCollab.unidad, 'Unidad / Sede', Building2)}
                    {renderAttributeList(selectedCollab.funcion, 'Función / Cargo', GraduationCap)}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 mt-8 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00B0F0]/10 flex items-center justify-center text-[#00B0F0]">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ICF General</p>
                        <p className="text-2xl font-black text-[#00B0F0]">{selectedCollab.icf}%</p>
                      </div>
                    </div>
                    
                    {selectedCollab.icfByFunction && Object.keys(selectedCollab.icfByFunction).length > 1 && (
                      <div className="flex flex-wrap gap-x-8 gap-y-4 border-l border-slate-100 pl-6">
                        {Object.entries(selectedCollab.icfByFunction).map(([func, val]) => (
                          <div key={func} className="flex flex-col min-w-[120px]">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none truncate max-w-[100px]">{func}</p>
                              <p className={`text-[10px] font-black font-mono ${getICFTextClass(val as number)}`}>{val as number}%</p>
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
                </div>
              </div>

              {/* Course Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-50">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cursos Completados</p>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  </div>
                  <p className="text-3xl font-black text-emerald-700">
                    {(Object.values(programCoursesByFunction).flat() as ProgramCourse[]).filter(c => c.status === 'approved').length}
                  </p>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Cursos Pendientes</p>
                    <Clock size={14} className="text-amber-400" />
                  </div>
                  <p className="text-3xl font-black text-amber-700">
                    {(Object.values(programCoursesByFunction).flat() as ProgramCourse[]).filter(c => c.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Próximas Inscripciones</p>
                    <Calendar size={14} className="text-blue-400" />
                  </div>
                  <p className="text-3xl font-black text-blue-700">{upcomingCourses.length}</p>
                </div>
              </div>
            </div>

            {/* Courses Sections */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Program Status Section (Main) */}
              <div className="flex-1 space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-[#001E50] rounded-full" />
                    <h3 className="text-sm font-black text-[#001E50] uppercase tracking-tight">Estado de Cursos del Programa</h3>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {totalProgramCourses} Módulos Totales
                  </div>
                </div>

                {Object.entries(programCoursesByFunction).map(([func, courses]) => (
                  <div key={func} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                      <div className="h-px flex-1 bg-slate-100" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-3">{func}</span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(courses as ProgramCourse[]).length > 0 ? (
                        (courses as ProgramCourse[]).map((courseData, idx) => (
                          <CourseCard 
                            key={`${courseData.name}-${idx}`} 
                            courseData={courseData} 
                          />
                        ))
                      ) : (
                        <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin cursos registrados para esta función</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {totalProgramCourses === 0 && (
                  <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin cursos registrados en el programa</p>
                  </div>
                )}
              </div>

              {/* Upcoming Section (Sidebar) */}
              <div className="w-full lg:w-96 space-y-4" ref={upcomingRef} id="upcoming-section-export">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-[#00B0F0] rounded-full" />
                    <h3 className="text-sm font-black text-[#001E50] uppercase tracking-tight">Próximos (Relatorio)</h3>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <button 
                      onClick={handleExportUpcomingJPG}
                      disabled={isExportingUpcoming}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-[#00B0F0] rounded-lg transition-colors disabled:opacity-50"
                      title="Exportar esta sección como JPG"
                    >
                      <Download size={14} />
                    </button>
                    <div className="group relative cursor-help">
                      <Info size={14} className="text-slate-300 hover:text-[#00B0F0] transition-colors" />
                      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#001E50] text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="font-bold mb-1 uppercase tracking-widest">¿Qué es el Relatorio?</p>
                        <p className="font-medium leading-relaxed">Son las capacitaciones programadas en el calendario que aún no han sido procesadas en la matriz principal de notas.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {upcomingCourses.length > 0 ? (
                    upcomingCourses.map((courseData, idx) => (
                      <CourseCard 
                        key={`${courseData.name}-${idx}`} 
                        courseData={courseData} 
                        onNavigateToCalendar={onNavigateToCalendar} 
                        isCompact
                      />
                    ))
                  ) : (
                    <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin inscripciones próximas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-dashed border-slate-200">
            <User size={48} className="opacity-10 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Selecciona un colaborador para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface CourseCardProps {
  courseData: any;
  onNavigateToCalendar?: (event: RelatorioItem) => void;
  isCompact?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ courseData, onNavigateToCalendar, isCompact }) => {
  const { name, score, status, type } = courseData;
  
  let statusColor = 'bg-rose-500';
  let textColor = 'text-rose-600';
  let bgColor = 'bg-rose-50';
  let statusText = 'Desaprobado';
  let Icon = AlertCircle;

  if (status === 'pending') {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-600';
    bgColor = 'bg-amber-50';
    statusText = type === 'relatorio' ? 'Programado' : 'Pendiente';
    Icon = Clock;
  } else if (status === 'approved') {
    statusColor = 'bg-emerald-500';
    textColor = 'text-emerald-600';
    bgColor = 'bg-emerald-50';
    statusText = type === 'relatorio' ? 'Finalizado' : 'Aprobado';
    Icon = CheckCircle2;
  }

  if (isCompact) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => onNavigateToCalendar?.(courseData.relatorioItem!)}
        className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-[#00B0F0] relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} />
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h5 className="text-[11px] font-black text-[#001E50] leading-tight uppercase line-clamp-2 group-hover:text-[#00B0F0] transition-colors">
                {name}
              </h5>
            </div>
            <div className={`w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-50 flex items-center justify-center flex-shrink-0 ${textColor}`}>
              <Icon size={16} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-slate-400" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                {courseData.relatorioItem?.claseFecha || 'Sin fecha'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 size={12} className="text-[#00B0F0]" />
              <span className="text-[9px] font-black text-[#00B0F0] uppercase">
                {courseData.relatorioItem?.claseHora || 'Sin horario'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColor}`} />
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {type === 'relatorio' ? 'Capacitación Programada' : 'Módulo de Formación'}
          </p>
          <h5 className="text-sm font-black text-[#001E50] leading-tight uppercase line-clamp-2 group-hover:text-[#00B0F0] transition-colors">
            {name}
          </h5>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-50 flex items-center justify-center flex-shrink-0 ${textColor}`}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className={`text-4xl font-black leading-none ${textColor}`}>
              {score}<span className="text-sm ml-0.5">%</span>
            </span>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${bgColor} ${textColor}`}>
            {statusText}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            className={`h-full rounded-full ${statusColor}`}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default RRHHCollaboratorsView;

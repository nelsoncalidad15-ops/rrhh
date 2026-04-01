import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { toJpeg } from 'html-to-image';
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
  Clock3,
  Filter
} from 'lucide-react';
import { CourseGrade, RelatorioItem, CoursePhase } from '../types';
import { normalizeKey } from '../services/dataService';

interface RRHHCollaboratorsViewProps {
  grades: CourseGrade[];
  relatorio: RelatorioItem[];
  phases: CoursePhase[];
  initialSearch?: string;
  initialSelectedId?: string | null;
  onNavigateToCalendar?: (event: RelatorioItem) => void;
}

interface ProgramCourse {
  name: string;
  score: number;
  status: 'approved' | 'pending' | 'failed';
  type: 'finished';
  modalidad: string;
}

const RRHHCollaboratorsView: React.FC<RRHHCollaboratorsViewProps> = ({
  grades,
  relatorio,
  phases,
  initialSearch = '',
  initialSelectedId = null,
  onNavigateToCalendar
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCollabIds, setSelectedCollabIds] = useState<string[]>(
    initialSelectedId ? [initialSelectedId] : (grades[0] ? [grades[0].id] : [])
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'approved' | 'pending' | 'failed'>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingUpcoming, setIsExportingUpcoming] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const upcomingRef = useRef<HTMLDivElement>(null);

  // Update selected collab if initialSelectedId changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedCollabIds([initialSelectedId]);
    }
  }, [initialSelectedId]);

  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');

  const filteredCollabs = useMemo(() => {
    return grades
      .filter(g => {
        const matchSearch = g.colaborador.toLowerCase().includes(searchQuery.toLowerCase());
        const matchUnit = selectedUnit === 'ALL' || g.unidad.includes(selectedUnit);
        return matchSearch && matchUnit;
      })
      .sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }, [grades, searchQuery, selectedUnit]);

  const units = useMemo(() => ['ALL', ...new Set(grades.map(g => g.unidad))].sort(), [grades]);
  const modalities = useMemo(() => {
    const mods = new Set(phases.map(p => p.modalidad).filter(Boolean));
    // Always add 'Sin Modalidad' to ensure it's available for filtering
    mods.add('Sin Modalidad');
    return ['ALL', ...Array.from(mods)].sort();
  }, [phases]);

  const availablePhases = useMemo(() => {
    const phs = new Set(phases.map(p => p.fase).filter(Boolean));
    phs.add('Otros');
    return ['ALL', ...Array.from(phs)].sort();
  }, [phases]);

  const selectedCollabs = useMemo(() => {
    return grades.filter(g => selectedCollabIds.includes(g.id));
  }, [grades, selectedCollabIds]);

  const selectedCollab = selectedCollabs[0] || null;

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

  const getProgramCoursesForCollab = (collab: CourseGrade) => {
    const grouped: Record<string, Record<string, Record<string, ProgramCourse[]>>> = {};
    
    const getPhaseInfo = (courseName: string) => {
      const normalizedCourseName = normalizeKey(courseName);
      const phaseObj = phases.find(p => normalizeKey(p.curso) === normalizedCourseName);
      const fase = phaseObj?.fase?.trim() || 'Otros';
      const modalidad = phaseObj?.modalidad?.trim() || 'Sin Modalidad';
      return { fase, modalidad };
    };

    const processCourse = (func: string, name: string, score: number) => {
      const { fase, modalidad } = getPhaseInfo(name);
      
      // Apply modality filter
      if (selectedModality !== 'ALL' && modalidad !== selectedModality) return;
      
      // Apply phase filter
      if (selectedPhase !== 'ALL' && fase !== selectedPhase) return;

      const numScore = score;
      let status: 'approved' | 'pending' | 'failed' = 'pending';
      if (numScore > 0) {
        status = numScore >= 60 ? 'approved' : 'failed';
      }
      
      // Apply status filter
      if (statusFilter !== 'ALL' && status !== statusFilter) return;

      if (!grouped[func]) grouped[func] = {};
      if (!grouped[func][fase]) grouped[func][fase] = {};
      if (!grouped[func][fase][modalidad]) grouped[func][fase][modalidad] = [];
      
      grouped[func][fase][modalidad].push({
        name,
        score: numScore,
        status,
        type: 'finished' as const,
        modalidad
      });
    };

    if (collab.coursesByFunction && Object.keys(collab.coursesByFunction).length > 0) {
      Object.entries(collab.coursesByFunction).forEach(([func, courses]) => {
        Object.entries(courses)
          .filter(([_, score]) => (score as number) !== -1)
          .forEach(([name, score]) => {
            processCourse(func, name, score as number);
          });
      });
    } else {
      Object.entries(collab.courses)
        .filter(([_, score]) => (score as number) !== -1)
        .forEach(([name, score]) => {
          processCourse('General', name, score as number);
        });
    }

    // Sort courses within groups
    Object.keys(grouped).forEach(func => {
      Object.keys(grouped[func]).forEach(fase => {
        Object.keys(grouped[func][fase]).forEach(mod => {
          grouped[func][fase][mod].sort((a, b) => {
            const statusOrder = { 'pending': 0, 'failed': 1, 'approved': 2 };
            if (a.status === b.status) return a.name.localeCompare(b.name);
            return statusOrder[a.status] - statusOrder[b.status];
          });
        });
      });
    });
    
    return grouped;
  };

  const programCoursesByFunctionAndPhase = useMemo(() => {
    if (!selectedCollab) return {} as Record<string, Record<string, Record<string, ProgramCourse[]>>>;
    return getProgramCoursesForCollab(selectedCollab);
  }, [selectedCollab, phases, selectedModality, selectedPhase, statusFilter]);

  const allProgramCourses = useMemo(() => {
    const all: ProgramCourse[] = [];
    Object.values(programCoursesByFunctionAndPhase).forEach(funcGroup => {
      Object.values(funcGroup).forEach(phaseGroup => {
        Object.values(phaseGroup).forEach(modGroup => {
          all.push(...(modGroup as ProgramCourse[]));
        });
      });
    });
    return all;
  }, [programCoursesByFunctionAndPhase]);

  const totalProgramCourses = useMemo(() => allProgramCourses.length, [allProgramCourses]);

  const upcomingCourses = useMemo(() => {
    if (!selectedCollab) return [];

    const normalizedCollabName = selectedCollab.colaborador.toLowerCase().trim();

    return relatorio
      .filter(r => r.nombre.toLowerCase().trim() === normalizedCollabName)
      .filter(r => {
        const normalizedCourseName = normalizeKey(r.curso);
        const phaseObj = phases.find(p => normalizeKey(p.curso) === normalizedCourseName);
        const fase = phaseObj?.fase?.trim() || 'Otros';
        const modalidad = r.modalidad || phaseObj?.modalidad?.trim() || 'Sin Modalidad';
        
        if (selectedModality !== 'ALL' && modalidad !== selectedModality) return false;
        if (selectedPhase !== 'ALL' && fase !== selectedPhase) return false;
        return true;
      })
      .map(r => ({
        name: r.curso,
        score: 0,
        status: 'pending' as const,
        type: 'relatorio' as const,
        relatorioItem: r
      })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCollab, relatorio, phases, selectedModality, selectedPhase]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJPG = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      // Small delay to ensure any layout changes are settled
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const element = printRef.current;
      
      // Create a temporary container to clone the element into
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Apply export-specific styles to the clone
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '1600px'; // Wider for more square aspect
      clone.style.height = 'auto';
      clone.style.padding = '60px';
      clone.style.backgroundColor = '#F8FAFC';
      clone.style.zIndex = '-1000';
      clone.style.display = 'block';
      
      // Find the export container in the clone
      const exportContainer = clone.hasAttribute('data-export-container') 
        ? clone 
        : (clone.querySelector('[data-export-container]') as HTMLElement);

      if (exportContainer instanceof HTMLElement) {
        exportContainer.style.height = 'auto';
        exportContainer.style.overflow = 'visible';
        exportContainer.style.display = 'block';
        exportContainer.style.width = '100%';
        exportContainer.style.backgroundColor = '#F8FAFC';
        
        const contentWrapper = exportContainer.querySelector('.content-layout-wrapper') as HTMLElement;
        if (contentWrapper) {
          contentWrapper.style.display = 'grid';
          contentWrapper.style.gridTemplateColumns = '1fr 450px'; // Wider sidebar for balance
          contentWrapper.style.gap = '3rem';
          contentWrapper.style.alignItems = 'start';
          contentWrapper.style.width = '100%';
        }

        // Force 3 columns for courses in export to make it wider/squarer
        const courseGrids = exportContainer.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2');
        courseGrids.forEach(g => {
          (g as HTMLElement).style.display = 'grid';
          (g as HTMLElement).style.gridTemplateColumns = 'repeat(3, 1fr)';
          (g as HTMLElement).style.gap = '1.5rem';
          (g as HTMLElement).style.width = '100%';
        });

        // Ensure all sections are visible and have width
        const sections = exportContainer.querySelectorAll('.space-y-8, .space-y-6, .space-y-4');
        sections.forEach(s => {
          (s as HTMLElement).style.display = 'block';
          (s as HTMLElement).style.width = '100%';
          (s as HTMLElement).style.opacity = '1';
        });

        // Hide elements that shouldn't be in the export
        const noPrintElements = clone.querySelectorAll('.no-print');
        noPrintElements.forEach(e => (e as HTMLElement).style.display = 'none');

        // Force all elements to be visible and non-animated
        const allElements = clone.querySelectorAll('*');
        allElements.forEach(e => {
          const el = e as HTMLElement;
          if (el.style) {
            if (el.style.opacity === '0') el.style.opacity = '1';
            if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
            el.style.transform = 'none';
            el.style.transition = 'none';
            el.style.animation = 'none';
          }
        });
      }

      document.body.appendChild(clone);

      // Wait for images and fonts to be ready in the clone
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toJpeg(clone, {
        quality: 0.95,
        backgroundColor: '#F8FAFC',
        width: 1600,
        pixelRatio: 2, // High quality
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `Legajo_${selectedCollab?.colaborador || 'Colaborador'}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting JPG:', err);
      alert('Error al exportar JPG. Por favor, intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUpcomingJPG = async () => {
    if (!upcomingRef.current) return;
    setIsExportingUpcoming(true);
    try {
      // Small delay to ensure any layout changes are settled
      await new Promise(resolve => setTimeout(resolve, 200));

      const element = upcomingRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '800px';
      clone.style.height = 'auto';
      clone.style.padding = '40px';
      clone.style.backgroundColor = '#FFFFFF';
      clone.style.zIndex = '-1000';
      clone.style.display = 'block';

      const exportEl = clone.id === 'upcoming-section-export' 
        ? clone 
        : (clone.querySelector('#upcoming-section-export') as HTMLElement);

      if (exportEl instanceof HTMLElement) {
        exportEl.style.padding = '40px';
        exportEl.style.height = 'auto';
        exportEl.style.overflow = 'visible';
        exportEl.style.display = 'block';
        exportEl.style.backgroundColor = '#FFFFFF';
        
        // Force all elements to be visible
        const allElements = exportEl.querySelectorAll('*');
        allElements.forEach(e => {
          const el = e as HTMLElement;
          if (el.style) {
            if (el.style.opacity === '0') el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.transition = 'none';
            el.style.animation = 'none';
          }
        });
      }

      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 400));

      const dataUrl = await toJpeg(clone, {
        quality: 0.95,
        backgroundColor: '#FFFFFF',
        width: 800,
        pixelRatio: 2
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `Proximos_Cursos_${selectedCollab?.colaborador || 'Colaborador'}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting upcoming JPG:', err);
      alert('Error al exportar JPG de próximos cursos.');
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 no-print">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
          {/* Logo & Title */}
          <div className="xl:col-span-3 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#001E50] rounded-2xl flex items-center justify-center shadow-lg shadow-[#001E50]/10 flex-shrink-0">
              <Users size={24} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#001E50] font-display tracking-tight leading-none mb-1">Selección de Colaborador</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] leading-none">Legajo de capacitación</p>
            </div>
          </div>

          {/* Search & Unit */}
          <div className="xl:col-span-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="BUSCAR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#001E50] focus:border-[#00B0F0] outline-none transition-all"
              />
            </div>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-40 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-[#001E50] focus:border-[#00B0F0] outline-none cursor-pointer uppercase tracking-tight"
            >
              {units.map(u => (
                <option key={u} value={u}>{u === 'ALL' ? 'Unidad' : u}</option>
              ))}
            </select>
          </div>

          {/* References (Modality & Phase) */}
          <div className="xl:col-span-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">REFERENCIAS:</span>
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={selectedModality}
                  onChange={(e) => setSelectedModality(e.target.value)}
                  className="bg-transparent text-xs font-black text-[#001E50] outline-none cursor-pointer uppercase tracking-tight flex-1"
                >
                  {modalities.map(m => (
                    <option key={m} value={m}>{m === 'ALL' ? 'Modalidad' : m}</option>
                  ))}
                </select>
                <div className="w-px h-4 bg-slate-200" />
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="bg-transparent text-xs font-black text-[#001E50] outline-none cursor-pointer uppercase tracking-tight flex-1"
                >
                  {availablePhases.map(p => (
                    <option key={p} value={p}>{p === 'ALL' ? 'Fase' : p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="xl:col-span-2 flex items-center justify-end gap-2">
            <button 
              onClick={handlePrint}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-[#001E50] rounded-xl border border-slate-200 transition-all flex-shrink-0"
              title="Imprimir"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={handleExportJPG}
              disabled={isExporting || !selectedCollab}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#001E50] hover:bg-[#001E50]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#001E50]/20 disabled:opacity-50 min-w-[120px]"
            >
              <Download size={16} />
              {isExporting ? '...' : 'Exportar'}
            </button>
          </div>

          {/* Collaborator Selector */}
          <div className="xl:col-span-12 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Colaborador</p>
              {selectedCollabIds.length > 0 && (
                <button 
                  onClick={() => setSelectedCollabIds([])}
                  className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                >
                  Limpiar Selección
                </button>
              )}
            </div>
            <div className="relative group">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00B0F0] transition-colors" size={18} strokeWidth={1.5} />
              <select
                value={selectedCollabIds[0] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setSelectedCollabIds([val]);
                  } else {
                    setSelectedCollabIds([]);
                  }
                }}
                className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-[#001E50] focus:bg-white focus:border-[#00B0F0] outline-none transition-all appearance-none cursor-pointer uppercase tracking-tight shadow-sm"
              >
                <option value="">Seleccione un colaborador...</option>
                {filteredCollabs.map(collab => (
                  <option key={`${collab.id}-${collab.colaborador}`} value={collab.id}>
                    {collab.colaborador}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-[#00B0F0] transition-colors">
                <Filter size={16} strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-12" ref={printRef} data-export-container>
        {selectedCollabs.length > 0 ? (
          selectedCollabs.map((collab, collabIdx) => {
            const collabProgramCourses = getProgramCoursesForCollab(collab);
            const collabAllCourses: ProgramCourse[] = [];
            Object.values(collabProgramCourses).forEach(funcGroup => {
              Object.values(funcGroup).forEach(phaseGroup => {
                Object.values(phaseGroup).forEach(modGroup => {
                  collabAllCourses.push(...(modGroup as ProgramCourse[]));
                });
              });
            });

            const collabUpcoming = relatorio
              .filter(r => r.nombre.toLowerCase().trim() === collab.colaborador.toLowerCase().trim())
              .filter(r => {
                const normalizedCourseName = normalizeKey(r.curso);
                const phaseObj = phases.find(p => normalizeKey(p.curso) === normalizedCourseName);
                const fase = phaseObj?.fase?.trim() || 'Otros';
                const modalidad = r.modalidad || phaseObj?.modalidad?.trim() || 'Sin Modalidad';
                
                if (selectedModality !== 'ALL' && modalidad !== selectedModality) return false;
                if (selectedPhase !== 'ALL' && fase !== selectedPhase) return false;
                return true;
              })
              .map(r => ({
                name: r.curso,
                score: 0,
                status: 'pending' as const,
                type: 'relatorio' as const,
                relatorioItem: r
              })).sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div key={collab.id} className={`space-y-8 ${collabIdx > 0 ? 'pt-12 border-t-2 border-dashed border-slate-200' : ''}`}>
                {/* Profile Header */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="relative flex flex-col md:flex-row md:items-start gap-8">
                    <div className="w-24 h-24 bg-[#001E50] rounded-2xl flex items-center justify-center shadow-xl shadow-[#001E50]/20 flex-shrink-0 border border-white/10">
                      <User size={40} className="text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-4 mb-6">
                        <h2 className="text-4xl font-bold text-[#001E50] font-display tracking-tight">
                          {collab.colaborador}
                        </h2>
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-emerald-100">
                          Activo
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {renderAttributeList(collab.unidad, 'Unidad / Sede', Building2)}
                        {renderAttributeList(collab.funcion, 'Función / Cargo', GraduationCap)}
                      </div>

                      <div className="flex flex-wrap items-center gap-8 mt-8 pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#00B0F0]/10 flex items-center justify-center text-[#00B0F0]">
                            <Trophy size={20} strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">ICF General</p>
                            <p className="text-2xl font-bold text-[#00B0F0] font-display">{collab.icf}%</p>
                          </div>
                        </div>
                        
                        {collab.icfByFunction && Object.keys(collab.icfByFunction).length > 1 && (
                          <div className="flex flex-wrap gap-x-8 gap-y-4 border-l border-slate-100 pl-6">
                            {Object.entries(collab.icfByFunction).map(([func, val]) => (
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
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-50">
                    <button 
                      onClick={() => setStatusFilter(statusFilter === 'approved' ? 'ALL' : 'approved')}
                      className={`p-5 rounded-3xl border transition-all text-left ${
                        statusFilter === 'approved' 
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20' 
                          : 'bg-white text-slate-700 border-slate-100 hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[9px] font-semibold uppercase tracking-widest ${statusFilter === 'approved' ? 'text-white/80' : 'text-emerald-600'}`}>Cursos Completados</p>
                        <CheckCircle2 size={16} strokeWidth={1.5} className={statusFilter === 'approved' ? 'text-white' : 'text-emerald-400'} />
                      </div>
                      <p className="text-3xl font-bold font-display">
                        {collabAllCourses.filter(c => c.status === 'approved').length}
                      </p>
                    </button>
                    <button 
                      onClick={() => setStatusFilter(statusFilter === 'pending' ? 'ALL' : 'pending')}
                      className={`p-5 rounded-3xl border transition-all text-left ${
                        statusFilter === 'pending' 
                          ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20' 
                          : 'bg-white text-slate-700 border-slate-100 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[9px] font-semibold uppercase tracking-widest ${statusFilter === 'pending' ? 'text-white/80' : 'text-amber-600'}`}>Cursos Pendientes</p>
                        <Clock size={16} strokeWidth={1.5} className={statusFilter === 'pending' ? 'text-white' : 'text-amber-400'} />
                      </div>
                      <p className="text-3xl font-bold font-display">
                        {collabAllCourses.filter(c => c.status === 'pending').length}
                      </p>
                    </button>
                    <button 
                      onClick={() => setStatusFilter(statusFilter === 'failed' ? 'ALL' : 'failed')}
                      className={`p-5 rounded-3xl border transition-all text-left ${
                        statusFilter === 'failed' 
                          ? 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/20' 
                          : 'bg-white text-slate-700 border-slate-100 hover:border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[9px] font-semibold uppercase tracking-widest ${statusFilter === 'failed' ? 'text-white/80' : 'text-rose-600'}`}>Cursos Desaprobados</p>
                        <AlertCircle size={16} strokeWidth={1.5} className={statusFilter === 'failed' ? 'text-white' : 'text-rose-400'} />
                      </div>
                      <p className="text-3xl font-bold font-display">
                        {collabAllCourses.filter(c => c.status === 'failed').length}
                      </p>
                    </button>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-widest">Próximas Inscripciones</p>
                        <Calendar size={16} strokeWidth={1.5} className="text-blue-400" />
                      </div>
                      <p className="text-3xl font-bold font-display text-blue-700">{collabUpcoming.length}</p>
                    </div>
                  </div>
                </div>

                {/* Courses Sections */}
                <div className="flex flex-col lg:flex-row gap-8 content-layout-wrapper">
                  {/* Program Status Section (Main) */}
                  <div className="flex-1 space-y-8">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-[#001E50] rounded-full" />
                        <h3 className="text-sm font-black text-[#001E50] uppercase tracking-tight">
                          {statusFilter === 'ALL' ? 'Estado de Cursos' : `Cursos ${statusTextMap[statusFilter]}`}
                        </h3>
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {collabAllCourses.length} Módulos Visibles
                      </div>
                    </div>

                    {Object.entries(collabProgramCourses).map(([func, phaseGroups]) => (
                      <div key={func} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                          <div className="h-px flex-1 bg-slate-100" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-3">{func}</span>
                          <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        
                        {Object.entries(phaseGroups).map(([phase, modalityGroups]) => (
                          <div key={phase} className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00B0F0]" />
                              <h4 className="text-[11px] font-black text-[#00B0F0] uppercase tracking-widest">{phase}</h4>
                            </div>
                            
                            <div className="space-y-6 pl-4 border-l border-slate-100">
                              {Object.entries(modalityGroups).map(([modality, courses]) => (
                                <div key={modality} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded">
                                      {modality}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {(courses as ProgramCourse[]).map((courseData, idx) => (
                                      <CourseCard 
                                        key={`${courseData.name}-${idx}`} 
                                        courseData={courseData} 
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {collabAllCourses.length === 0 && (
                      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin cursos que coincidan con los filtros</p>
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
                      {collabUpcoming.length > 0 ? (
                        collabUpcoming.map((courseData, idx) => (
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
            );
          })
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-dashed border-slate-200">
            <User size={48} className="opacity-10 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Selecciona uno o más colaboradores para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

const statusTextMap = {
  'approved': 'Aprobados',
  'pending': 'Pendientes',
  'failed': 'Desaprobados',
  'ALL': ''
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
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-[#00B0F0] relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} />
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-semibold text-[#001E50] font-display leading-snug group-hover:text-[#00B0F0] transition-colors">
                {name}
              </h5>
            </div>
            <div className={`w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-50 flex items-center justify-center flex-shrink-0 ${textColor}`}>
              <Icon size={16} strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <Calendar size={12} strokeWidth={1.5} className="text-slate-400" />
              <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                {courseData.relatorioItem?.claseFecha || 'Sin fecha'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 size={12} strokeWidth={1.5} className="text-[#00B0F0]" />
              <span className="text-[9px] font-semibold text-[#00B0F0] uppercase tracking-wider">
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
      className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColor}`} />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-1">
            {type === 'relatorio' ? 'Capacitación Programada' : 'Módulo de Formación'}
          </p>
          <h5 className="text-xs font-semibold text-[#001E50] font-display leading-snug group-hover:text-[#00B0F0] transition-colors">
            {name}
          </h5>
        </div>
        <div className={`w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-50 flex items-center justify-center flex-shrink-0 ${textColor}`}>
          <Icon size={16} strokeWidth={1.5} />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className={`text-2xl font-bold font-display leading-none ${textColor}`}>
              {score}<span className="text-[10px] ml-0.5 font-sans">%</span>
            </span>
          </div>
          <span className={`text-[8px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-lg ${bgColor} ${textColor}`}>
            {statusText}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
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

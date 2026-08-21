import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  AlertCircle, 
  Filter, 
  X,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  CalendarClock,
  MonitorPlay
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { CourseGrade, RelatorioItem, CoursePhase } from '../types';
import { normalizeKey } from '../services/dataService';

interface PendingCourse {
  name: string;
  functionName: string;
  phase: string;
  modality: string;
  source: 'Matriz' | 'Programado';
  schedule?: string;
}

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
  const [expandedProgress, setExpandedProgress] = useState<{ collaboratorId: string; functionName?: string } | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const totalColaboradores = grades.length;
  
  const avgICF = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, curr) => acc + curr.icf, 0);
    return Math.round(sum / grades.length);
  }, [grades]);

  const totalPending = useMemo(() => {
    return grades.filter(g => g.icf < 100).length;
  }, [grades]);

  const phaseIndex = useMemo(() => {
    const index = new Map<string, Pick<CoursePhase, 'fase' | 'modalidad'>>();
    phases.forEach(phase => index.set(normalizeKey(phase.curso), phase));
    return index;
  }, [phases]);

  const getPendingCourses = (collaborator: CourseGrade): PendingCourse[] => {
    const pending: PendingCourse[] = [];
    const addCourse = (functionName: string, name: string, score: number) => {
      if (score !== 0) return;
      const phase = phaseIndex.get(normalizeKey(name));
      pending.push({
        name,
        functionName,
        phase: phase?.fase?.trim() || 'Otros',
        modality: phase?.modalidad?.trim() || 'Sin modalidad',
        source: 'Matriz'
      });
    };

    if (collaborator.coursesByFunction && Object.keys(collaborator.coursesByFunction).length > 0) {
      Object.entries(collaborator.coursesByFunction).forEach(([functionName, courses]) => {
        Object.entries(courses).forEach(([name, score]) => addCourse(functionName, name, score));
      });
    } else {
      Object.entries(collaborator.courses).forEach(([name, score]) => addCourse('General', name, score));
    }

    const collaboratorKey = normalizeKey(collaborator.colaborador);
    relatorio
      .filter(item => normalizeKey(item.nombre) === collaboratorKey)
      .forEach(item => {
        const phase = phaseIndex.get(normalizeKey(item.curso));
        const modality = item.modalidad || phase?.modalidad?.trim() || 'Sin modalidad';
        const alreadyInMatrix = pending.some(course => normalizeKey(course.name) === normalizeKey(item.curso));
        if (!alreadyInMatrix) {
          pending.push({
            name: item.curso,
            functionName: 'Capacitación programada',
            phase: phase?.fase?.trim() || 'Otros',
            modality,
            source: 'Programado',
            schedule: [item.claseFecha, item.claseHora].filter(Boolean).join(' · ')
          });
        }
      });

    return pending.sort((a, b) => a.functionName.localeCompare(b.functionName) || a.phase.localeCompare(b.phase) || a.name.localeCompare(b.name));
  };

  const pendingByCollaborator = useMemo(
    () => new Map(grades.map(grade => [grade.id, getPendingCourses(grade)])),
    [grades, phaseIndex, relatorio]
  );

  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const buildPendingReport = () => {
    setReportError(null);
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      setReportError('No se pudo abrir el reporte. Habilitá las ventanas emergentes e intentá nuevamente.');
      return;
    }

    const activeFilters = [
      selectedUnit !== 'ALL' ? `Unidad: ${selectedUnit}` : 'Todas las unidades',
      selectedArea !== 'ALL' ? `Área: ${selectedArea}` : 'Todas las áreas',
      selectedFunction !== 'ALL' ? `Función: ${selectedFunction}` : 'Todas las funciones',
      showPendingOnly ? 'Solo colaboradores con pendientes' : 'Todos los colaboradores filtrados'
    ];
    const collaboratorsWithPending = grades
      .map(grade => ({ grade, courses: pendingByCollaborator.get(grade.id) || [] }))
      .filter(({ courses }) => courses.length > 0);
    const pendingTotal = collaboratorsWithPending.reduce((total, item) => total + item.courses.length, 0);

    const collaboratorSections = collaboratorsWithPending.map(({ grade, courses }) => {
      const groups = new Map<string, PendingCourse[]>();
      courses.forEach(course => {
        const groupKey = `${course.functionName}|||${course.phase}|||${course.modality}`;
        groups.set(groupKey, [...(groups.get(groupKey) || []), course]);
      });
      const courseGroups = Array.from(groups.entries()).map(([key, items]) => {
        const [functionName, phase, modality] = key.split('|||');
        return `
          <section class="course-group">
            <div class="course-group__heading"><strong>${escapeHtml(functionName)}</strong><span>${escapeHtml(phase)} · ${escapeHtml(modality)}</span></div>
            <ul>${items.map(course => `<li><span>${escapeHtml(course.name)}</span><small>${course.source === 'Programado' ? `Programado${course.schedule ? ` · ${escapeHtml(course.schedule)}` : ''}` : 'Pendiente'}</small></li>`).join('')}</ul>
          </section>`;
      }).join('');

      return `
        <article class="collaborator">
          <header class="collaborator__header">
            <div><p>COLABORADOR</p><h2>${escapeHtml(grade.colaborador)}</h2></div>
            <div class="icf"><span>ICF</span><strong>${grade.icf}%</strong></div>
          </header>
          <div class="metadata"><span><b>Unidad</b>${escapeHtml(grade.unidad)}</span><span><b>Área</b>${escapeHtml(grade.area)}</span><span><b>Función</b>${escapeHtml(grade.funcion)}</span></div>
          <h3>Cursos pendientes <em>${courses.length}</em></h3>
          ${courseGroups}
        </article>`;
    }).join('') || '<div class="empty">No hay cursos pendientes para los filtros seleccionados.</div>';

    const generatedAt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());
    reportWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte de capacitación pendiente</title><style>
      @page { size: A4; margin: 13mm; } * { box-sizing: border-box; } body { margin: 0; color: #10254b; font-family: Arial, Helvetica, sans-serif; background: #f6f9fc; } .report { max-width: 900px; margin: 0 auto; } .hero { background: linear-gradient(135deg, #001e50, #063b82); color: white; padding: 30px 34px; border-radius: 20px; } .brand { color: #6bddff; letter-spacing: .18em; font-size: 10px; font-weight: 700; } h1 { margin: 8px 0 4px; font-size: 28px; } .hero p { margin: 0; color: #d8e7fb; font-size: 12px; } .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 16px 0; } .summary div { background: white; border: 1px solid #e2eaf3; border-radius: 14px; padding: 14px 16px; } .summary span { display:block; font-size: 10px; color: #68809e; text-transform: uppercase; letter-spacing: .08em; } .summary strong { display:block; font-size: 25px; margin-top: 5px; } .filters { background: #eaf7fc; color: #245275; border-radius: 12px; padding: 11px 14px; font-size: 10px; line-height: 1.7; margin-bottom: 18px; } .collaborator { background: #fff; border: 1px solid #e3ebf3; border-radius: 16px; padding: 20px; margin: 0 0 14px; break-inside: avoid; } .collaborator__header { display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom: 1px solid #edf1f5; padding-bottom: 14px; } .collaborator__header p { margin:0; color:#00a6e0; font-size:9px; font-weight:bold; letter-spacing:.13em; } .collaborator__header h2 { margin:4px 0 0; font-size:19px; } .icf { text-align:right; background:#eff9fd; border-radius:10px; padding:8px 12px; min-width:70px; } .icf span { display:block; font-size:9px; color:#5081a5; } .icf strong { font-size:19px; color:#007fb5; } .metadata { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; padding:13px 0; font-size:10px; color:#526a82; } .metadata span { border-left:2px solid #d9edf7; padding-left:7px; } .metadata b { display:block; color:#8192a4; text-transform:uppercase; font-size:8px; letter-spacing:.08em; margin-bottom:3px; } .collaborator h3 { font-size:12px; text-transform:uppercase; letter-spacing:.07em; margin: 8px 0 10px; } .collaborator h3 em { font-style:normal; color:#007fb5; background:#e9f8fd; border-radius:10px; padding:3px 7px; margin-left:5px; } .course-group { border:1px solid #e8eef4; border-radius:10px; overflow:hidden; margin-top:8px; } .course-group__heading { display:flex; justify-content:space-between; gap:10px; background:#f7fafc; padding:8px 10px; font-size:10px; } .course-group__heading strong { color:#173a6b; } .course-group__heading span { color:#5882a2; text-align:right; } ul { list-style:none; padding:0; margin:0; } li { display:flex; justify-content:space-between; gap:12px; padding:8px 10px; border-top:1px solid #edf1f5; font-size:10px; } li small { color:#a56b09; text-align:right; white-space:nowrap; } .empty { text-align:center; padding:45px; background:#fff; border:1px dashed #cdd9e5; border-radius:14px; color:#64748b; font-size:12px; } footer { color:#7c8ea2; font-size:9px; text-align:center; padding:8px 0 0; } @media print { body { background:white; } .report { max-width:none; } .hero { border-radius:0; } .collaborator { box-shadow:none; } }
    </style></head><body><main class="report"><section class="hero"><div class="brand">AUTOSOL · TALENT HUB</div><h1>Reporte de cursos pendientes</h1><p>Reporte ejecutivo para Dirección · ${generatedAt}</p></section><section class="summary"><div><span>Colaboradores con pendientes</span><strong>${collaboratorsWithPending.length}</strong></div><div><span>Cursos pendientes</span><strong>${pendingTotal}</strong></div></section><div class="filters"><b>Filtros aplicados:</b> ${activeFilters.map(escapeHtml).join(' &nbsp; · &nbsp; ')}</div>${collaboratorSections}<footer>Autosol · Reporte generado desde Talent Hub</footer></main><script>window.onload = () => { window.focus(); window.print(); }<\/script></body></html>`);
    reportWindow.document.close();
  };

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
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KPICard 
          title="Total de Colaboradores" 
          value={totalColaboradores.toString()} 
          icon={<Users className="text-white" size={24} strokeWidth={1.5} />}
          subtitle="Activos en capacitación"
          color="bg-[#001E50]"
        />
        
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl hover:shadow-[#00B0F0]/5 transition-all duration-500 min-h-[142px]">
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
          className={`p-5 sm:p-6 rounded-3xl shadow-sm border transition-all duration-500 text-left flex items-center justify-between group min-h-[142px] ${
            showPendingOnly 
              ? 'bg-[#00B0F0] border-[#00B0F0] text-white ring-8 ring-[#00B0F0]/5 shadow-xl shadow-[#00B0F0]/20' 
              : 'bg-white border-slate-100 text-[#1A1A1A] hover:border-[#00B0F0] hover:shadow-xl hover:shadow-slate-200/50'
          }`}
        >
          <div>
            <p className={`text-[10px] font-semibold tracking-[0.12em] mb-3 font-display ${showPendingOnly ? 'text-white/70' : 'text-slate-500'}`}>Cursos pendientes</p>
            <h3 className={`text-5xl font-bold font-display tracking-tighter ${showPendingOnly ? 'text-white' : 'text-[#001E50]'}`}>{totalPending}</h3>
            <p className={`text-[11px] mt-3 font-semibold tracking-tight ${showPendingOnly ? 'text-white' : 'text-amber-500'}`}>Colaboradores con pendientes</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${showPendingOnly ? 'bg-white/20' : 'bg-slate-50'}`}>
            <AlertCircle className={showPendingOnly ? 'text-white' : 'text-amber-500'} size={28} strokeWidth={1.5} />
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-5 sm:gap-8">
          <div className="flex items-center gap-3 text-[#001E50] ml-1 sm:ml-2">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
              <Filter size={16} className="text-[#00B0F0]" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 font-display">Filtros</span>
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
              <label className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] ml-3 font-display">Colaborador</label>
              <div className="relative group">
                <select 
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) onSelectCollab(val);
                  }}
                  className="bg-slate-50 border border-slate-100 text-xs font-semibold text-[#001E50] rounded-2xl px-5 py-3 focus:bg-white focus:border-[#00B0F0] outline-none transition-all duration-300 min-w-[220px] appearance-none cursor-pointer tracking-[0.04em] shadow-sm group-hover:border-slate-200 font-display"
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

          <div className="flex items-end gap-2 sm:ml-auto">
            <button
              onClick={buildPendingReport}
              className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-[#001E50] text-white hover:bg-[#003b82] rounded-2xl transition-all duration-300 text-[10px] font-semibold tracking-[0.1em] font-display shadow-lg shadow-[#001E50]/10"
              title="Abrir el reporte listo para guardar como PDF"
            >
              <FileText size={16} strokeWidth={1.5} />
              <span>Reporte PDF</span>
              <Download size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={onResetFilters}
              className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-slate-50 text-slate-500 hover:text-white hover:bg-rose-500 rounded-2xl transition-all duration-300 text-[10px] font-semibold tracking-[0.12em] font-display"
            >
              <X size={16} strokeWidth={1.5} />
              <span>Limpiar</span>
            </button>
          </div>
        </div>
        {reportError && <p className="mt-3 text-xs font-medium text-rose-600 sm:text-right">{reportError}</p>}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h4 className="text-[11px] font-semibold text-slate-500 tracking-[0.12em] font-display">Listado de colaboradores</h4>
          <span className="text-[10px] font-semibold text-[#001E50] bg-[#00B0F0]/10 px-4 py-2 rounded-full tracking-[0.08em] font-display">
            {grades.length} Resultados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 sm:px-8 py-5 text-[11px] font-semibold text-slate-500 tracking-[0.08em] font-display">Colaborador</th>
                <th className="px-5 sm:px-8 py-5 text-[11px] font-semibold text-slate-500 tracking-[0.08em] font-display">Unidad</th>
                <th className="px-5 sm:px-8 py-5 text-[11px] font-semibold text-slate-500 tracking-[0.08em] font-display">Area</th>
                <th className="px-5 sm:px-8 py-5 text-[11px] font-semibold text-slate-500 tracking-[0.08em] font-display">Funcion</th>
                <th className="px-5 sm:px-8 py-5 text-[11px] font-semibold text-slate-500 tracking-[0.08em] font-display w-80">Progreso ICF y cursos pendientes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4">
                      <X size={48} className="opacity-10" strokeWidth={1} />
                      <p className="text-[11px] font-semibold tracking-[0.08em] font-display">Sin resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                grades.map((g) => (
                  <React.Fragment key={`${g.id}-${g.colaborador}`}>
                  <tr className="hover:bg-slate-50/80 transition-all duration-300 group">
                    <td className="px-5 sm:px-8 py-5 sm:py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#001E50] flex items-center justify-center text-white font-bold text-sm shadow-xl shadow-[#001E50]/10 group-hover:bg-[#00B0F0] group-hover:shadow-[#00B0F0]/20 transition-all duration-500 font-display">
                          {g.colaborador.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button onClick={() => onSelectCollab(g.id)} className="text-left text-base font-bold text-[#001E50] hover:text-[#00B0F0] transition-colors duration-300 font-display tracking-tight">{g.colaborador}</button>
                          <p className="text-[11px] text-slate-400 font-medium tracking-[0.04em] mt-0.5">{g.funcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 sm:px-8 py-5 sm:py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {g.unidad.split(' | ').filter(Boolean).map((u, i) => (
                          <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg tracking-[0.04em] font-display">
                            {u}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 sm:px-8 py-5 sm:py-6">
                      <div className="flex flex-col gap-1">
                        {g.area.split(' | ').filter(Boolean).map((a, i) => (
                          <span key={i} className="text-[11px] font-medium text-slate-500 tracking-[0.04em]">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 sm:px-8 py-5 sm:py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {g.funcion.split(' | ').filter(Boolean).map((f, i) => (
                          <span key={i} className="text-[10px] font-semibold text-[#00B0F0] tracking-[0.04em] font-display">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 sm:px-8 py-5 sm:py-6">
                      <div className="space-y-3">
                        {!g.icfByFunction || Object.keys(g.icfByFunction).length <= 1 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold font-display ${getICFTextClass(g.icf)}`}>{g.icf}%</span>
                              <button
                                onClick={() => setExpandedProgress(expandedProgress?.collaboratorId === g.id ? null : { collaboratorId: g.id })}
                                className="p-1 rounded-md text-slate-400 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                title="Ver cursos pendientes"
                                aria-label="Ver cursos pendientes"
                                aria-expanded={expandedProgress?.collaboratorId === g.id}
                              >
                                {expandedProgress?.collaboratorId === g.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
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
                          <div className="flex flex-col gap-3">
                            {Object.entries(g.icfByFunction).map(([func, val]) => {
                              const functionIsExpanded = expandedProgress?.collaboratorId === g.id && expandedProgress.functionName === func;
                              return (
                              <div key={func} className="flex items-center gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-semibold text-slate-500 tracking-[0.04em] truncate max-w-[90px] font-display">{func}</span>
                                </div>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${val}%` }}
                                    className={`h-full rounded-full ${getICFColor(val as number)}`}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold font-display ${getICFTextClass(val as number)}`}>{val as number}%</span>
                                <button
                                  onClick={() => setExpandedProgress(functionIsExpanded ? null : { collaboratorId: g.id, functionName: func })}
                                  className="p-1 rounded-md text-slate-400 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                  title={`Ver pendientes de ${func}`}
                                  aria-label={`Ver pendientes de ${func}`}
                                  aria-expanded={functionIsExpanded}
                                >
                                  {functionIsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedProgress?.collaboratorId === g.id && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={5} className="px-5 sm:px-8 pb-6 pt-0">
                        <PendingCoursesDropdown
                          courses={(pendingByCollaborator.get(g.id) || []).filter(course => !expandedProgress.functionName || course.functionName === expandedProgress.functionName || course.source === 'Programado')}
                          functionName={expandedProgress.functionName}
                        />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function PendingCoursesDropdown({ courses, functionName }: { courses: PendingCourse[]; functionName?: string }) {
  const groupedCourses = useMemo(() => {
    const groups = new Map<string, PendingCourse[]>();
    courses.forEach(course => {
      const key = `${course.phase}|||${course.modality}`;
      groups.set(key, [...(groups.get(key) || []), course]);
    });
    return Array.from(groups.entries());
  }, [courses]);

  return (
    <div className="mt-2 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-800">
          <CalendarClock size={16} strokeWidth={1.5} />
          <p className="text-[10px] font-bold uppercase tracking-[0.1em]">
            {functionName ? `Pendientes · ${functionName}` : 'Detalle de cursos pendientes'}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{courses.length} cursos</span>
      </div>

      {groupedCourses.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {groupedCourses.map(([key, group]) => {
            const [phase, modality] = key.split('|||');
            return (
              <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-[#001E50]">{phase}</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[9px] font-semibold text-sky-700 shadow-sm">
                    <MonitorPlay size={11} strokeWidth={1.5} />
                    {modality}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {group.map(course => (
                    <li key={`${course.functionName}-${course.name}-${course.source}`} className="flex items-start justify-between gap-3 text-[11px] text-slate-600">
                      <span>{course.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${course.source === 'Programado' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                        {course.source === 'Programado' ? 'Programado' : 'Pendiente'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-[11px] font-medium text-slate-400">No hay cursos pendientes registrados para este progreso.</p>
      )}
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, subtitle, color = "bg-white" }) => (
  <div className={`${color} p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all duration-500 min-h-[142px] ${color === 'bg-white' ? 'hover:shadow-slate-200/50' : 'hover:shadow-[#001E50]/20'}`}>
    <div>
      <p className={`text-[10px] font-semibold tracking-[0.12em] mb-3 font-display ${color === 'bg-white' ? 'text-slate-500' : 'text-white/70'}`}>{title}</p>
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
    <label className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] ml-3 font-display">{label}</label>
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-50 border border-slate-100 text-xs font-semibold text-[#001E50] rounded-2xl px-5 py-3 focus:bg-white focus:border-[#00B0F0] outline-none transition-all duration-300 min-w-[180px] appearance-none cursor-pointer tracking-[0.04em] shadow-sm group-hover:border-slate-200 font-display"
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

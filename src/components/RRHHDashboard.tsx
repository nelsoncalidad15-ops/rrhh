import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Search, 
  Download, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { fetchHRGradesData, fetchHRRelatorioData, fetchHRContactsData, fetchCoursePhasesData } from '../services/dataService';
import { CourseGrade, RelatorioItem, LoadingState, CollaboratorContact, CoursePhase } from '../types';
import { SkeletonLoader } from './DashboardUI';

// Views
import RRHHTalentView from './RRHHTalentView';
import RRHHCollaboratorsView from './RRHHCollaboratorsView';
import RRHHCalendarView from './RRHHCalendarView';

interface RRHHDashboardProps {
  gradesUrl: string;
  relatorioUrl: string;
  contactsUrl: string;
  phasesUrl: string;
  onBack: () => void;
}

export type RRHHView = 'dashboard' | 'collaborators' | 'calendar';

const RRHHDashboard: React.FC<RRHHDashboardProps> = ({ gradesUrl, relatorioUrl, contactsUrl, phasesUrl, onBack }) => {
  const [view, setView] = useState<RRHHView>('dashboard');
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioItem[]>([]);
  const [contacts, setContacts] = useState<CollaboratorContact[]>([]);
  const [phases, setPhases] = useState<CoursePhase[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);

  // Filters
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedFunction, setSelectedFunction] = useState<string>('ALL');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      setErrorMessage(null);
      
      if (!gradesUrl || !relatorioUrl) {
        setLoadingState(LoadingState.ERROR);
        setErrorMessage("Faltan configurar las URLs de RRHH.");
        return;
      }

      try {
        const [gradesData, relatorioData, contactsData, phasesData] = await Promise.all([
          fetchHRGradesData(gradesUrl),
          fetchHRRelatorioData(relatorioUrl),
          fetchHRContactsData(contactsUrl),
          fetchCoursePhasesData(phasesUrl)
        ]);
        
        setGrades(gradesData);
        setRelatorio(relatorioData);
        setContacts(contactsData);
        setPhases(phasesData);
        setLoadingState(LoadingState.SUCCESS);
      } catch (error: any) {
        console.error("RRHHDashboard: Error loading HR data:", error);
        setLoadingState(LoadingState.ERROR);
        setErrorMessage(error.message || "Error desconocido al cargar datos");
      }
    };
    loadData();
  }, [gradesUrl, relatorioUrl, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const filteredGrades = useMemo(() => {
    return grades.filter(g => {
      const matchSearch = g.colaborador.toLowerCase().includes(searchQuery.toLowerCase());
      const matchUnit = selectedUnit === 'ALL' || g.unidad === selectedUnit;
      const matchArea = selectedArea === 'ALL' || g.area === selectedArea;
      const matchFunction = selectedFunction === 'ALL' || g.funcion === selectedFunction;
      
      if (showPendingOnly) {
        return matchSearch && matchUnit && matchArea && matchFunction && g.icf < 100;
      }

      return matchSearch && matchUnit && matchArea && matchFunction;
    });
  }, [grades, searchQuery, selectedUnit, selectedArea, selectedFunction, showPendingOnly]);

  const units = useMemo(() => ['ALL', ...new Set(grades.map(g => g.unidad))].sort(), [grades]);
  const areas = useMemo(() => ['ALL', ...new Set(grades.map(g => g.area))].sort(), [grades]);
  const functions = useMemo(() => ['ALL', ...new Set(grades.map(g => g.funcion))].sort(), [grades]);

  const handleResetFilters = () => {
    setSelectedUnit('ALL');
    setSelectedArea('ALL');
    setSelectedFunction('ALL');
    setShowPendingOnly(false);
    setSearchQuery('');
  };

  const handleSelectCollab = (id: string) => {
    setSelectedCollabId(id);
    setView('collaborators');
  };

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<RelatorioItem | null>(null);

  const handleNavigateToCalendar = (event: RelatorioItem) => {
    setSelectedCalendarEvent(event);
    setView('calendar');
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <RRHHTalentView 
            grades={filteredGrades} 
            relatorio={relatorio}
            phases={phases}
            units={units}
            areas={areas}
            functions={functions}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            selectedFunction={selectedFunction}
            setSelectedFunction={setSelectedFunction}
            onResetFilters={handleResetFilters}
            showPendingOnly={showPendingOnly}
            setShowPendingOnly={setShowPendingOnly}
            onSelectCollab={handleSelectCollab}
          />
        );
      case 'collaborators':
        return (
          <RRHHCollaboratorsView 
            grades={grades} 
            relatorio={relatorio}
            phases={phases}
            initialSearch={searchQuery}
            initialSelectedId={selectedCollabId}
            onNavigateToCalendar={handleNavigateToCalendar}
          />
        );
      case 'calendar':
        return (
          <RRHHCalendarView 
            relatorio={relatorio}
            contacts={contacts}
            phases={phases}
            initialSelectedEvent={selectedCalendarEvent}
            onCloseEventDetail={() => setSelectedCalendarEvent(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans text-slate-900">
      <main className="flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-100 z-20 sticky top-0 shadow-sm backdrop-blur-md bg-white/80">
          <div className="max-w-[1600px] mx-auto w-full">
            <div className="h-20 px-8 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#001E50] rounded-2xl flex items-center justify-center shadow-xl shadow-[#001E50]/10">
                  <span className="text-white font-bold text-2xl font-display">A</span>
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-none font-display tracking-tight text-[#001E50]">Autosol</h1>
                  <p className="text-[10px] font-semibold text-[#00B0F0] uppercase tracking-[0.2em] mt-1">Talent Hub</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative w-72 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00B0F0] transition-colors" size={18} strokeWidth={1.5} />
                  <input 
                    type="text"
                    placeholder="Buscar en el hub..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#00B0F0] rounded-2xl text-sm transition-all outline-none font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 flex items-center justify-between">
              <nav className="flex items-center gap-2">
                <TabButton 
                  active={view === 'dashboard'} 
                  onClick={() => setView('dashboard')}
                  icon={<LayoutDashboard size={20} strokeWidth={1.5} />}
                  label="Dashboard"
                />
                <TabButton 
                  active={view === 'collaborators'} 
                  onClick={() => setView('collaborators')}
                  icon={<Users size={20} strokeWidth={1.5} />}
                  label="Colaboradores"
                />
                <TabButton 
                  active={view === 'calendar'} 
                  onClick={() => setView('calendar')}
                  icon={<Calendar size={20} strokeWidth={1.5} />}
                  label="Calendario"
                />
              </nav>
              
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-[#00B0F0] rounded-full shadow-sm shadow-[#00B0F0]/20" />
                <h2 className="text-base font-semibold font-display tracking-tight text-[#001E50]">
                  {view === 'dashboard' ? 'Gestión de Talento' : view === 'collaborators' ? 'Perfil de Colaboradores' : 'Calendario de Capacitación'}
                </h2>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
          {loadingState === LoadingState.LOADING ? (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <SkeletonLoader className="h-32 rounded-2xl" />
                <SkeletonLoader className="h-32 rounded-2xl" />
                <SkeletonLoader className="h-32 rounded-2xl" />
              </div>
              <SkeletonLoader className="h-96 rounded-2xl" />
            </div>
          ) : loadingState === LoadingState.ERROR ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-12">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-black text-[#001E50] uppercase tracking-tight mb-2">Error de Carga</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-md mb-8">
                {errorMessage || "No se pudieron cargar los datos de RRHH."}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={handleRetry}
                  className="px-8 py-3 bg-[#001E50] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#003380] transition-all"
                >
                  Reintentar
                </button>
                <button 
                  onClick={onBack}
                  className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-8 py-5 transition-all duration-300 relative group ${
      active 
        ? 'text-[#00B0F0] font-semibold' 
        : 'text-slate-400 hover:text-[#001E50] font-medium'
    }`}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </span>
    <span className="text-xs font-display uppercase tracking-widest">{label}</span>
    {active && (
      <motion.div 
        layoutId="activeTab"
        className="absolute bottom-0 left-0 right-0 h-1 bg-[#00B0F0] rounded-t-full shadow-[0_-2px_8px_rgba(0,176,240,0.4)]"
      />
    )}
  </button>
);

export default RRHHDashboard;

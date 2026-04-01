import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toJpeg } from 'html-to-image';
import { 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User,
  Users,
  GraduationCap,
  AlertCircle,
  X,
  Info,
  CalendarDays,
  Building2,
  Printer,
  Download,
  Search,
  MessageCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { RelatorioItem, CollaboratorContact, CoursePhase } from '../types';
import { normalizeKey } from '../services/dataService';

interface RRHHCalendarViewProps {
  relatorio: RelatorioItem[];
  contacts: CollaboratorContact[];
  phases: CoursePhase[];
  initialSelectedEvent?: RelatorioItem | null;
  onCloseEventDetail?: () => void;
}

const RRHHCalendarView: React.FC<RRHHCalendarViewProps> = ({ 
  relatorio, 
  contacts,
  phases,
  initialSelectedEvent,
  onCloseEventDetail
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<RelatorioItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollabFilters, setSelectedCollabFilters] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Enrich relatorio with modalidad from phases
  const enrichedRelatorio = useMemo(() => {
    return relatorio.map(item => {
      const normalizedCourseName = normalizeKey(item.curso);
      const phaseInfo = phases.find(p => normalizeKey(p.curso) === normalizedCourseName);
      return {
        ...item,
        modalidad: phaseInfo?.modalidad || 'Sin Modalidad' // Default to Sin Modalidad if not found
      };
    });
  }, [relatorio, phases]);

  // Get unique collaborators for filter
  const collaborators = useMemo(() => {
    const names = new Set(enrichedRelatorio.map(item => item.nombre));
    return Array.from(names).sort();
  }, [enrichedRelatorio]);

  // Filter relatorio based on search query and collaborator filter
  const filteredRelatorio = useMemo(() => {
    let result = enrichedRelatorio;
    
    if (selectedCollabFilters.length > 0) {
      result = result.filter(item => selectedCollabFilters.includes(item.nombre));
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.nombre.toLowerCase().includes(lowerQuery) ||
        item.curso.toLowerCase().includes(lowerQuery) ||
        item.unidad.toLowerCase().includes(lowerQuery) ||
        (item.modalidad && item.modalidad.toLowerCase().includes(lowerQuery))
      );
    }
    
    return result;
  }, [enrichedRelatorio, searchQuery, selectedCollabFilters]);

  // Helper to parse date string safely
  const parseDate = (dateStr: string | undefined, referenceMonth?: string): Date | null => {
    if (!dateStr || dateStr.toLowerCase().includes('sin') || dateStr.toLowerCase().includes('fecha')) return null;
    
    const months: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    try {
      let cleanStr = dateStr.toLowerCase().trim();
      let refMonth = referenceMonth ? referenceMonth.toLowerCase().trim() : '';

      // If the date string contains pipes, it's the concatenated format
      if (cleanStr.includes('|')) {
        const parts = cleanStr.split('|').map(p => p.trim());
        refMonth = parts[0];
        cleanStr = parts[2] || parts[3] || parts[0];
      }
      
      // Extract year from refMonth or cleanStr
      let year = new Date().getFullYear();
      const yearMatch = (refMonth + ' ' + cleanStr).match(/\b(20\d{2})\b/);
      if (yearMatch) year = parseInt(yearMatch[0]);

      // Handle "DD de Mes" format (e.g., "08 de mayo")
      if (cleanStr.includes(' de ')) {
        const parts = cleanStr.split(' de ');
        const dayMatch = parts[0].match(/\d+/);
        const day = dayMatch ? parseInt(dayMatch[0]) : NaN;
        const monthName = parts[1].trim();
        
        let monthIndex = -1;
        for (const [name, index] of Object.entries(months)) {
          if (monthName.includes(name)) {
            monthIndex = index;
            break;
          }
        }

        if (!isNaN(day) && monthIndex !== -1) {
          return new Date(year, monthIndex, day);
        }
      }

      // Handle case where cleanStr is just a day number and refMonth has the month/year
      const justDayMatch = cleanStr.match(/^\d{1,2}$/);
      if (justDayMatch && refMonth) {
        const day = parseInt(justDayMatch[0]);
        let monthIndex = -1;
        for (const [name, index] of Object.entries(months)) {
          if (refMonth.includes(name)) {
            monthIndex = index;
            break;
          }
        }
        
        if (monthIndex !== -1) {
          return new Date(year, monthIndex, day);
        }
      }

      // Handle "Month YYYY" or just "Month"
      for (const [name, index] of Object.entries(months)) {
        if (cleanStr.includes(name)) {
          const dayMatch = cleanStr.match(/\b(\d{1,2})\b/);
          const day = dayMatch ? parseInt(dayMatch[1]) : 1;
          return new Date(year, index, day);
        }
      }

      // Handle DD/MM/YYYY or DD-MM-YYYY (extract from anywhere in string)
      const numericMatch = cleanStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (numericMatch) {
        let d = parseInt(numericMatch[1]);
        let m = parseInt(numericMatch[2]);
        let y = parseInt(numericMatch[3]);
        
        if (y < 100) y += 2000; // Handle 2-digit year
        
        // Sanity check for year to avoid 2031 issues if it was a misparse
        if (y > 2040 || y < 2020) y = year;

        const date = new Date(y, m - 1, d);
        return isNaN(date.getTime()) ? null : date;
      }

      // Handle DD/MM (assume current year or from reference)
      const shortMatch = cleanStr.match(/(\d{1,2})[\/\-](\d{1,2})/);
      if (shortMatch) {
        let d = parseInt(shortMatch[1]);
        let m = parseInt(shortMatch[2]);
        const date = new Date(year, m - 1, d);
        return isNaN(date.getTime()) ? null : date;
      }

      // Handle YYYY-MM-DD
      const isoMatch = cleanStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        let y = parseInt(isoMatch[1]);
        let m = parseInt(isoMatch[2]);
        let d = parseInt(isoMatch[3]);
        const date = new Date(y, m - 1, d);
        return isNaN(date.getTime()) ? null : date;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleWhatsApp = (event: RelatorioItem) => {
    const contact = contacts.find(c => c.nombre.toLowerCase().trim() === event.nombre.toLowerCase().trim());
    if (!contact) {
      alert(`No se encontró el teléfono de ${event.nombre}`);
      return;
    }

    const linkMessage = event.linkCurso ? `\n\nLink del curso: ${event.linkCurso}` : '';
    const message = `Hola ${contact.nombre}, te recordamos que tienes el curso "${event.curso}" el día ${event.claseFecha} a las ${event.claseHora}.${linkMessage} ¡Te esperamos!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = contact.telefono.replace(/\D/g, ''); // Remove non-digits
    
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  // Handle initial selected event and auto-month
  useEffect(() => {
    if (initialSelectedEvent) {
      setSelectedEvent(initialSelectedEvent);
      
      // Set calendar to the event's month
      const eventDate = parseDate(initialSelectedEvent.claseFecha, initialSelectedEvent.referenciaMeses);
      if (eventDate) {
        setCurrentDate(eventDate);
      }
    } else if (relatorio.length > 0) {
      // If no events in current month, find the first month with events
      const hasEventsInCurrentMonth = relatorio.some(item => {
        const d = parseDate(item.claseFecha, item.referenciaMeses);
        return d && isSameMonth(d, currentDate);
      });

      if (!hasEventsInCurrentMonth) {
        // Find the earliest event in the future, or just the first event
        const sortedEvents = [...relatorio].sort((a, b) => {
          const da = parseDate(a.claseFecha, a.referenciaMeses);
          const db = parseDate(b.claseFecha, b.referenciaMeses);
          if (!da) return 1;
          if (!db) return -1;
          return da.getTime() - db.getTime();
        });

        const firstDate = parseDate(sortedEvents[0]?.claseFecha, sortedEvents[0]?.referenciaMeses);
        if (firstDate) {
          setCurrentDate(firstDate);
        }
      }
    }
  }, [initialSelectedEvent, relatorio]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, RelatorioItem[]> = {};
    filteredRelatorio.forEach(item => {
      const month = item.referenciaMeses || 'Sin Fecha';
      if (!groups[month]) groups[month] = [];
      groups[month].push(item);
    });
    return groups;
  }, [filteredRelatorio]);

  const calendarDays = useMemo(() => {
    // Ensure currentDate is valid before using date-fns
    const dateToUse = isNaN(currentDate.getTime()) ? new Date() : currentDate;
    const start = startOfWeek(startOfMonth(dateToUse), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(dateToUse), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const isCurrentMonthEmpty = useMemo(() => {
    return !enrichedRelatorio.some(item => {
      const d = parseDate(item.claseFecha, item.referenciaMeses);
      return d && isSameMonth(d, currentDate);
    });
  }, [enrichedRelatorio, currentDate]);

  const getEventsForDay = (day: Date) => {
    return filteredRelatorio.filter(item => {
      const eventDate = parseDate(item.claseFecha, item.referenciaMeses);
      return eventDate ? isSameDay(day, eventDate) : false;
    });
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    onCloseEventDetail?.();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJPG = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    // Add a small delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const element = printRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '1400px';
      clone.style.height = 'auto';
      clone.style.padding = '40px';
      clone.style.backgroundColor = '#F8FAFC';
      clone.style.zIndex = '-1000';
      clone.style.display = 'block';

      // Force all elements to be visible
      const allElements = clone.querySelectorAll('*');
      allElements.forEach(e => {
        const el = e as HTMLElement;
        if (el.style) {
          if (el.style.opacity === '0') el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.transition = 'none';
          el.style.animation = 'none';
        }
      });

      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 400));

      const dataUrl = await toJpeg(clone, {
        quality: 0.95,
        backgroundColor: '#F8FAFC',
        width: 1400,
        pixelRatio: 2
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `Calendario_Capacitacion_${format(currentDate, 'MMMM_yyyy', { locale: es })}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting JPG:', err);
      alert('Error al exportar la imagen. Por favor, intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001E50]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-[#001E50] p-6 text-white relative">
                <button 
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#00B0F0] flex items-center justify-center shadow-lg shadow-[#00B0F0]/20">
                    <GraduationCap size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-full tracking-widest">Próximamente</span>
                    </div>
                    <h3 className="text-lg font-black leading-tight uppercase tracking-tight">{selectedEvent.curso}</h3>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <User size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.nombre}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unidad</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <Building2 size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.unidad}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <CalendarDays size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.claseFecha || 'Sin Fecha'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Horario</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <Clock size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.claseHora || 'Sin Horario'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tipo / Modalidad</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <Info size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.modalidad || 'Presencial'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-[#001E50]" />
                    <p className="text-[10px] font-black text-[#001E50] uppercase tracking-tight">Detalles del Registro</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Referencia</span>
                      <span className="text-[9px] font-black text-[#001E50]">{selectedEvent.referenciaMeses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Registro</span>
                      <span className="text-[9px] font-black text-[#001E50]">{selectedEvent.fechaRegistro}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button 
                    onClick={() => handleWhatsApp(selectedEvent)}
                    className="w-full py-3 bg-[#25D366] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Enviar WhatsApp
                  </button>
                  <button 
                    onClick={handleCloseModal}
                    className="w-full py-3 bg-[#001E50] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#003380] transition-all shadow-lg shadow-[#001E50]/20"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6 no-print mb-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all ${
                viewMode === 'calendar' ? 'bg-white text-[#001E50] shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
              <span className="font-display">Vista Mensual</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all ${
                viewMode === 'list' ? 'bg-white text-[#001E50] shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List size={16} strokeWidth={1.5} />
              <span className="font-display">Vista de Lista</span>
            </button>
          </div>

          {viewMode === 'calendar' && (
            <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 transition-all">
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <h3 className="text-sm font-semibold text-[#001E50] font-display tracking-tight min-w-[160px] text-center capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 transition-all">
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 flex-1 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00B0F0] transition-colors" size={16} strokeWidth={1.5} />
              <input 
                type="text"
                placeholder="Buscar curso, colaborador o unidad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-[#001E50] focus:ring-2 focus:ring-[#00B0F0]/10 focus:border-[#00B0F0] outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={1.5} />
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !selectedCollabFilters.includes(val)) {
                    setSelectedCollabFilters(prev => [...prev, val]);
                  }
                }}
                className="w-56 pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-[#001E50] focus:ring-2 focus:ring-[#00B0F0]/10 focus:border-[#00B0F0] outline-none cursor-pointer appearance-none"
              >
                <option value="">Filtrar Colaborador</option>
                {collaborators.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedCollabFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCollabFilters.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCollabFilters(prev => prev.filter(item => item !== c))}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#001E50]/5 text-[#001E50] rounded-xl text-[10px] font-semibold uppercase tracking-wider hover:bg-rose-50 hover:text-rose-600 transition-all border border-[#001E50]/10 group"
                >
                  {c}
                  <X size={12} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                </button>
              ))}
              <button
                onClick={() => setSelectedCollabFilters([])}
                className="px-3 py-1.5 text-[10px] font-semibold text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
              >
                Limpiar Todo
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2.5 px-5 py-3 bg-white hover:bg-slate-50 text-[#001E50] rounded-2xl text-[11px] font-semibold uppercase tracking-widest transition-all border border-slate-100"
          >
            <Printer size={16} strokeWidth={1.5} />
            <span className="font-display">Imprimir</span>
          </button>
          <button 
            onClick={handleExportJPG}
            disabled={isExporting}
            className="flex items-center gap-2.5 px-5 py-3 bg-[#001E50] hover:bg-[#001E50]/90 text-white rounded-2xl text-[11px] font-semibold uppercase tracking-widest transition-all shadow-xl shadow-[#001E50]/10 disabled:opacity-50"
          >
            <Download size={16} strokeWidth={1.5} />
            <span className="font-display">{isExporting ? 'Exportando...' : 'Exportar JPG'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={printRef} className="space-y-6">
        {viewMode === 'calendar' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day: string) => (
                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l border-slate-100 relative">
              {calendarDays.length === 0 && (
                <div className="col-span-7 py-20 text-center text-slate-400">
                  <CalendarDays size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest">No se pudieron cargar los días del calendario</p>
                </div>
              )}
              
              {calendarDays.map((day: Date, idx: number) => {
                const events = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                    <div 
                      key={idx} 
                      className={`min-h-[180px] p-3 border-r border-b border-slate-100 transition-all ${
                        !isCurrentMonth ? 'bg-slate-50/20' : 'bg-white'
                      } ${isToday ? 'bg-[#00B0F0]/5' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-semibold font-display ${
                          !isCurrentMonth ? 'text-slate-300' : isToday ? 'text-[#00B0F0]' : 'text-slate-400'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {events.length > 0 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
                            {events.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {events.map((event, eIdx) => (
                          <div 
                            key={eIdx}
                            className="group/event relative flex flex-col p-3 bg-white border border-slate-100 rounded-2xl hover:shadow-lg hover:shadow-[#00B0F0]/10 transition-all cursor-pointer hover:border-[#00B0F0] hover:-translate-y-0.5"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <span className="text-[10px] font-semibold text-[#001E50] leading-tight font-display group-hover/event:text-[#00B0F0] transition-colors block">
                                  {event.curso}
                                </span>
                                {event.modalidad && (
                                  <span className={`text-[8px] font-semibold uppercase tracking-widest block mt-1 ${
                                    event.modalidad === 'Presencial' ? 'text-emerald-500' : 'text-blue-500'
                                  }`}>
                                    {event.modalidad}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsApp(event);
                                }}
                                className="p-1.5 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all shrink-0"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle size={12} strokeWidth={2} />
                              </button>
                            </div>
                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                              <div className="flex items-start gap-1.5">
                                <User size={10} className="text-slate-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                                <span className="text-[9px] font-medium text-slate-500 leading-tight">
                                  {event.nombre}
                                </span>
                              </div>
                              {event.claseHora && (
                                <div className="flex items-center gap-1 text-[8px] font-semibold text-[#00B0F0] bg-[#00B0F0]/5 px-1.5 py-0.5 rounded-md self-start">
                                  <Clock size={10} strokeWidth={2} />
                                  <span>{event.claseHora}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                );
              })}

              {/* Empty State Overlay for the month */}
              {isCurrentMonthEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] z-10 pointer-events-none">
                  <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center max-w-xs pointer-events-auto">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                      <CalendarDays size={32} />
                    </div>
                    <h4 className="text-sm font-black text-[#001E50] uppercase tracking-tight mb-2">Sin Cursos Programados</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      No hay capacitaciones registradas para {format(currentDate, 'MMMM yyyy', { locale: es })}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedByMonth).sort().map(([month, items]) => {
              const typedItems = items as RelatorioItem[];
              return (
                <div key={month} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
                      <CalendarIcon size={18} className="text-[#00B0F0]" />
                      <h4 className="text-sm font-black text-[#001E50] uppercase tracking-widest">
                        {month}
                      </h4>
                    </div>
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{typedItems.length} Capacitaciones</span>
                  </div>
                  
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Fecha y Hora</th>
                          <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Colaborador</th>
                          <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Capacitación</th>
                          <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em]">Unidad</th>
                          <th className="px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {typedItems.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
                            onClick={() => setSelectedEvent(item)}
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-[#001E50] shadow-sm">
                                  <span className="text-xs font-bold font-display leading-none">{item.claseFecha?.split('/')[0]}</span>
                                  <span className="text-[8px] font-semibold leading-none uppercase tracking-widest mt-0.5">{item.claseFecha?.split('/')[1]}</span>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#001E50] font-display">{item.claseFecha}</p>
                                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{item.claseHora}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#001E50]">
                                  <User size={14} strokeWidth={1.5} />
                                </div>
                                <span className="text-xs font-semibold text-[#001E50] font-display">{item.nombre}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="max-w-xs">
                                <p className="text-xs font-semibold text-[#001E50] font-display group-hover:text-[#00B0F0] transition-colors line-clamp-1">{item.curso}</p>
                                <span className={`text-[9px] font-semibold uppercase tracking-widest mt-1 inline-block ${
                                  item.modalidad === 'Presencial' ? 'text-emerald-500' : 'text-blue-500'
                                }`}>
                                  {item.modalidad || 'Presencial'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                <Building2 size={14} strokeWidth={1.5} className="text-slate-400" />
                                <span className="uppercase tracking-widest">{item.unidad}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWhatsApp(item);
                                  }}
                                  className="p-2.5 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366] hover:text-white transition-all shadow-sm"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageCircle size={16} strokeWidth={2} />
                                </button>
                                <button 
                                  className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#001E50] hover:text-white transition-all border border-slate-100"
                                >
                                  <ChevronRight size={16} strokeWidth={2} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RRHHCalendarView;

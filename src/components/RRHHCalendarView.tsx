import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User,
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
import { RelatorioItem, CollaboratorContact } from '../types';

interface RRHHCalendarViewProps {
  relatorio: RelatorioItem[];
  contacts: CollaboratorContact[];
  initialSelectedEvent?: RelatorioItem | null;
  onCloseEventDetail?: () => void;
}

const RRHHCalendarView: React.FC<RRHHCalendarViewProps> = ({ 
  relatorio, 
  contacts,
  initialSelectedEvent,
  onCloseEventDetail
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<RelatorioItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollabFilter, setSelectedCollabFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Get unique collaborators for filter
  const collaborators = useMemo(() => {
    const names = new Set(relatorio.map(item => item.nombre));
    return Array.from(names).sort();
  }, [relatorio]);

  // Filter relatorio based on search query and collaborator filter
  const filteredRelatorio = useMemo(() => {
    let result = relatorio;
    
    if (selectedCollabFilter !== 'all') {
      result = result.filter(item => item.nombre === selectedCollabFilter);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.nombre.toLowerCase().includes(lowerQuery) ||
        item.curso.toLowerCase().includes(lowerQuery) ||
        item.unidad.toLowerCase().includes(lowerQuery)
      );
    }
    
    return result;
  }, [relatorio, searchQuery, selectedCollabFilter]);

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

    const message = `Hola ${contact.nombre}, te recordamos que tienes el curso "${event.curso}" el día ${event.claseFecha} a las ${event.claseHora}. ¡Te esperamos!`;
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
    return !relatorio.some(item => {
      const d = parseDate(item.claseFecha, item.referenciaMeses);
      return d && isSameMonth(d, currentDate);
    });
  }, [relatorio, currentDate]);

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
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#F2F3F5',
        logging: false,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `Calendario_Capacitacion_${format(currentDate, 'MMMM_yyyy', { locale: es })}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error('Error exporting JPG:', err);
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
      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'calendar' ? 'bg-white text-[#001E50] shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarIcon size={16} />
              <span>Vista Mensual</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'list' ? 'bg-white text-[#001E50] shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List size={16} />
              <span>Vista de Lista</span>
            </button>
          </div>

          {viewMode === 'calendar' && (
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-sm font-black text-[#001E50] uppercase tracking-widest min-w-[150px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="FILTRAR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#001E50] focus:border-[#00B0F0] outline-none transition-all"
            />
          </div>
          <select
            value={selectedCollabFilter}
            onChange={(e) => setSelectedCollabFilter(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-[#001E50] focus:border-[#00B0F0] outline-none cursor-pointer uppercase tracking-tight"
          >
            <option value="all">TODOS LOS COLABORADORES</option>
            {collaborators.map(name => (
              <option key={name} value={name}>{name}</option>
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
                    className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-colors ${
                      !isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'
                    } ${isToday ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-black font-mono ${
                        isToday ? 'text-[#00B0F0]' : isCurrentMonth ? 'text-[#001E50]' : 'text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {events.map((event, eIdx) => (
                        <div 
                          key={eIdx}
                          className="group/event relative flex flex-col p-2 bg-amber-50 border border-amber-100 rounded-xl hover:shadow-md transition-all cursor-pointer hover:border-[#00B0F0] hover:bg-white"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="text-[9px] font-black text-amber-700 leading-tight uppercase line-clamp-2 flex-1">
                              {event.curso}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsApp(event);
                              }}
                              className="p-1 bg-[#25D366] text-white rounded-md hover:bg-[#128C7E] transition-colors shadow-sm"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={10} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-amber-100/50">
                            <div className="w-1 h-1 rounded-full bg-[#00B0F0]" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight truncate">
                              {event.nombre}
                            </span>
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
          <div className="space-y-8">
            {Object.entries(groupedByMonth).sort().map(([month, items]) => {
              const typedItems = items as RelatorioItem[];
              return (
                <div key={month} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h4 className="text-sm font-black text-[#001E50] uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                      {month}
                    </h4>
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{typedItems.length} Cursos</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {typedItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedEvent(item)}
                        className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:border-[#00B0F0] transition-all group cursor-pointer overflow-hidden flex flex-col"
                      >
                        {/* Card Header Style like Modal */}
                        <div className="bg-[#001E50] p-5 text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#00B0F0] flex items-center justify-center shadow-lg shadow-[#00B0F0]/20">
                              <GraduationCap size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black uppercase rounded-full tracking-widest">Próximamente</span>
                              </div>
                              <h5 className="text-xs font-black leading-tight uppercase tracking-tight line-clamp-1">{item.curso}</h5>
                            </div>
                          </div>
                        </div>

                        {/* Card Body with all details */}
                        <div className="p-5 space-y-4 flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[#001E50]">
                                <User size={12} className="text-[#00B0F0]" />
                                <span className="truncate">{item.nombre}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Unidad</p>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[#001E50]">
                                <Building2 size={12} className="text-[#00B0F0]" />
                                <span className="truncate">{item.unidad}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[#001E50]">
                                <CalendarDays size={12} className="text-[#00B0F0]" />
                                <span>{item.claseFecha || 'Sin Fecha'}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Horario</p>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[#001E50]">
                                <Clock size={12} className="text-[#00B0F0]" />
                                <span>{item.claseHora || 'Sin Horario'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-auto">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">Referencia</span>
                              <span className="text-[8px] font-black text-[#001E50]">{item.referenciaMeses}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">Registro</span>
                              <span className="text-[8px] font-black text-[#001E50]">{item.fechaRegistro}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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

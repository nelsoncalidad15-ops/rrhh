import React, { useMemo, useState } from 'react';
import { CalendarClock, CircleDollarSign, Users, UserCheck, Filter, CheckCircle2 } from 'lucide-react';
import { CareerPlanItem } from '../types';

interface RRHHCareerPlanViewProps {
  items: CareerPlanItem[];
  searchQuery: string;
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const parseDate = (value: string) => {
  const normalized = value.trim();
  const completeDate = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (completeDate) {
    const [, day, month, year] = completeDate;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return parsed.getFullYear() === Number(year) && parsed.getMonth() === Number(month) - 1 ? parsed : null;
  }

  // La planilla también contiene fechas de finalización expresadas como MM-AAAA.
  const monthYear = normalized.match(/^(\d{1,2})[/-](\d{4})$/);
  if (!monthYear) return null;
  const [, month, year] = monthYear;
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  return parsed.getFullYear() === Number(year) && parsed.getMonth() === Number(month) - 1 ? parsed : null;
};

const isUsefulDate = (date: Date | null) => Boolean(date && date.getFullYear() >= 2000);
const isTechnician = (activity: string) => /técnico|hvt|alto voltaje/i.test(activity);
const isCertified = (item: CareerPlanItem) => /^(ejecutado|certificado|realizado|sí|si)$/i.test(item.planificadoEjecutado.trim());

const calculatedDeadline = (item: CareerPlanItem) => {
  const supplied = parseDate(item.fechaLimite);
  if (isUsefulDate(supplied)) return supplied;
  const hiringDate = parseDate(item.fechaAlta);
  if (!isUsefulDate(hiringDate)) return null;
  const deadline = new Date(hiringDate);
  deadline.setMonth(deadline.getMonth() + (isTechnician(item.actividad) ? 24 : 18));
  return deadline;
};

const formatDate = (date: Date | null) => date ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : 'Sin fecha';

const deadlineStatus = (item: CareerPlanItem) => {
  const deadline = calculatedDeadline(item);
  if (!deadline) return { label: 'Pendiente de alta', className: 'bg-slate-100 text-slate-500' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: 'Vencido', className: 'bg-rose-50 text-rose-600 border-rose-100' };
  if (days <= 90) return { label: `Vence en ${days} días`, className: 'bg-amber-50 text-amber-700 border-amber-100' };
  return { label: 'En plazo', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
};

const certificationCompliance = (item: CareerPlanItem) => {
  const completionDate = parseDate(item.fin);
  const deadline = calculatedDeadline(item);
  if (!completionDate) return { label: 'Pendiente', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (!deadline) return { label: 'Sin límite ISO', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  const meetsDeadline = completionDate.getTime() <= deadline.getTime();
  if (isCertified(item)) return meetsDeadline
    ? { label: 'Cumple', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    : { label: 'No cumple', className: 'bg-rose-50 text-rose-600 border-rose-100' };
  return meetsDeadline
    ? { label: 'Proyecta cumplir', className: 'bg-blue-50 text-blue-600 border-blue-100' }
    : { label: 'Proyecta no cumplir', className: 'bg-rose-50 text-rose-600 border-rose-100' };
};

const isoTrafficLight = (item: CareerPlanItem) => {
  if (isCertified(item)) return { label: 'Certificado', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  const deadline = calculatedDeadline(item);
  if (!deadline) return { label: 'Sin fecha', className: 'bg-slate-100 text-slate-500 border-slate-200' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: 'Vencido', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (days <= 7) return { label: `Urgente: ${days} días`, className: 'bg-red-100 text-red-700 border-red-200' };
  if (days <= 30) return { label: 'Falta 1 mes', className: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (days <= 60) return { label: 'Faltan 2 meses', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (days <= 90) return { label: 'Faltan 3 meses', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  const months = Math.ceil(days / 30.44);
  return { label: months >= 12 ? `Falta ${Math.ceil(months / 12)} año${months >= 24 ? 's' : ''}` : `Faltan ${months} meses`, className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
};

const RRHHCareerPlanView: React.FC<RRHHCareerPlanViewProps> = ({ items, searchQuery }) => {
  const [province, setProvince] = useState('ALL');
  const [participant, setParticipant] = useState('ALL');
  const [employmentStatus, setEmploymentStatus] = useState('ALL');
  const [executionStatus, setExecutionStatus] = useState('ALL');

  const provinces = useMemo(() => [...new Set(items.map(item => item.provincia).filter(Boolean))].sort(), [items]);
  const participants = useMemo(() => [...new Set(items.map(item => item.participante).filter(Boolean))].sort(), [items]);
  const employmentStatuses = useMemo(() => [...new Set(items.map(item => item.estado || 'Sin estado').filter(Boolean))].sort(), [items]);
  const executionStatuses = useMemo(() => [...new Set(items.map(item => item.planificadoEjecutado).filter(Boolean))].sort(), [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch = !normalizedSearch || [item.participante, item.actividad, item.provincia, item.genero, item.estado]
        .some(value => value.toLowerCase().includes(normalizedSearch));
      return matchesSearch && (province === 'ALL' || item.provincia === province) && (participant === 'ALL' || item.participante === participant) && (employmentStatus === 'ALL' || (item.estado || 'Sin estado') === employmentStatus) && (executionStatus === 'ALL' || item.planificadoEjecutado === executionStatus);
    }).sort((a, b) => (calculatedDeadline(a)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (calculatedDeadline(b)?.getTime() ?? Number.MAX_SAFE_INTEGER));
  }, [items, searchQuery, province, participant, employmentStatus, executionStatus]);

  const summary = useMemo(() => {
    const active = filteredItems.filter(item => item.estado.toLowerCase() === 'activo').length;
    const totalInvestment = filteredItems.reduce((sum, item) => sum + item.valorPresencial + item.valorVirtual, 0);
    const overdue = filteredItems.filter(item => !isCertified(item) && deadlineStatus(item).label === 'Vencido').length;
    const certified = filteredItems.filter(isCertified).length;
    return { active, totalInvestment, overdue, certified };
  }, [filteredItems]);

  if (!items.length) return <div className="bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-16 text-center"><CalendarClock className="mx-auto mb-5 text-[#00B0F0]" size={38} strokeWidth={1.4} /><h3 className="font-display text-xl font-bold text-[#001E50]">Sin datos de Plan de carrera</h3><p className="mt-2 text-sm text-slate-400">Publicá la hoja de Google Sheets para que el panel pueda cargar las certificaciones.</p></div>;

  return <div className="space-y-8">
    <section className="rounded-[2.5rem] bg-[#001E50] px-8 py-9 text-white shadow-xl shadow-[#001E50]/10">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-[#00B0F0]">Cumplimiento ISO</p><h3 className="mt-3 font-display text-3xl font-bold tracking-tight">Plan de carrera y certificaciones</h3><p className="mt-2 max-w-2xl text-sm text-white/65">Seguimiento individual de alta en función, fechas proyectadas, vencimientos e inversión por certificación.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs text-white/80"><span className="font-bold text-[#00B0F0]">Regla ISO:</span> 18 meses · 24 meses para técnicos</div></div>
    </section>

    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Colaboradores" value={filteredItems.length.toString()} detail="en el plan seleccionado" icon={<Users size={22} />} tone="navy" />
      <MetricCard label="Activos" value={summary.active.toString()} detail="estado laboral activo" icon={<UserCheck size={22} />} tone="blue" />
      <MetricCard label="Certificados" value={summary.certified.toString()} detail="según Planeado/Ejecutado" icon={<CheckCircle2 size={22} />} tone="green" />
      <MetricCard label="Inversión total" value={currency.format(summary.totalInvestment)} detail={summary.overdue ? `${summary.overdue} certificaciones vencidas` : 'sin vencimientos detectados'} icon={<CircleDollarSign size={22} />} tone={summary.overdue ? 'rose' : 'amber'} />
    </section>

    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end gap-4"><div className="mb-2 flex items-center gap-2 pr-2 text-slate-400"><Filter size={17} className="text-[#00B0F0]" /><span className="font-display text-[10px] font-bold uppercase tracking-[0.2em]">Filtros</span></div><FilterSelect label="Colaborador" value={participant} onChange={setParticipant} options={participants} /><FilterSelect label="Provincia" value={province} onChange={setProvince} options={provinces} /><FilterSelect label="Estado" value={employmentStatus} onChange={setEmploymentStatus} options={employmentStatuses} /><FilterSelect label="Certificación" value={executionStatus} onChange={setExecutionStatus} options={executionStatuses} /></div></section>

    <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-7 py-5"><div><h4 className="font-display text-sm font-bold uppercase tracking-[0.15em] text-[#001E50]">Certificaciones por colaborador</h4><p className="mt-1 text-xs text-slate-400">La inversión total es la suma de modalidad presencial y virtual.</p></div><span className="rounded-full bg-[#00B0F0]/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-[#001E50]">{filteredItems.length} registros</span></div>
      <div className="overflow-x-auto"><table className="min-w-[1500px] w-full text-left"><thead className="border-b border-slate-100"><tr className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-6 py-5">Colaborador / actividad</th><th className="px-4 py-5">Provincia</th><th className="px-4 py-5">Alta en función</th><th className="px-4 py-5">Comienzo</th><th className="px-4 py-5">Fin proyectado</th><th className="px-4 py-5">Límite ISO</th><th className="px-4 py-5">Semáforo ISO</th><th className="px-4 py-5">Cumplimiento</th><th className="px-4 py-5">Estado</th><th className="px-4 py-5">Género</th><th className="px-6 py-5 text-right">Inversión total</th></tr></thead>
      <tbody className="divide-y divide-slate-50 text-sm">{filteredItems.map((item, index) => { const deadline = calculatedDeadline(item); const alert = isoTrafficLight(item); const compliance = certificationCompliance(item); const investment = item.valorPresencial + item.valorVirtual; return <tr key={`${item.participante}-${item.actividad}-${index}`} className="transition-colors hover:bg-slate-50/70"><td className="px-6 py-5"><p className="font-display font-bold text-[#001E50]">{item.participante || 'Sin asignar'}</p><p className="mt-1 max-w-[280px] text-[11px] font-medium text-slate-400">{item.actividad}</p><span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${item.planificadoEjecutado.toLowerCase() === 'ejecutado' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}>{item.planificadoEjecutado || 'Sin definir'}</span></td><td className="px-4 py-5 font-medium text-slate-600">{item.provincia || '—'}</td><td className="px-4 py-5 text-slate-600">{formatDate(parseDate(item.fechaAlta))}</td><td className="px-4 py-5 text-slate-600">{item.comienzo || 'Sin definir'}</td><td className="px-4 py-5 text-slate-600">{item.fin || 'Sin definir'}</td><td className="px-4 py-5"><p className="font-semibold text-[#001E50]">{formatDate(deadline)}</p></td><td className="px-4 py-5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${alert.className}`}>{alert.label}</span></td><td className="px-4 py-5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${compliance.className}`}>{compliance.label}</span></td><td className="px-4 py-5"><StatusPill text={item.estado || 'Sin estado'} active={item.estado.toLowerCase() === 'activo'} /></td><td className="px-4 py-5 text-slate-600">{item.genero || '—'}</td><td className="px-6 py-5 text-right font-display font-bold text-[#001E50]">{currency.format(investment)}</td></tr>; })}{!filteredItems.length && <tr><td colSpan={11} className="px-6 py-16 text-center text-sm text-slate-400">No hay registros para los filtros seleccionados.</td></tr>}</tbody></table></div>
    </section>
  </div>;
};

const MetricCard: React.FC<{ label: string; value: string; detail: string; icon: React.ReactNode; tone: 'navy' | 'blue' | 'green' | 'amber' | 'rose' }> = ({ label, value, detail, icon, tone }) => {
  const styles = { navy: 'bg-[#001E50] text-white border-[#001E50] [&_p]:text-white/60 [&_span]:bg-white/10 [&_span]:text-[#00B0F0]', blue: 'bg-white text-[#001E50] border-slate-100 [&_p]:text-slate-400 [&_span]:bg-[#00B0F0]/10 [&_span]:text-[#00B0F0]', green: 'bg-white text-[#001E50] border-slate-100 [&_p]:text-slate-400 [&_span]:bg-emerald-50 [&_span]:text-emerald-600]', amber: 'bg-white text-[#001E50] border-slate-100 [&_p]:text-slate-400 [&_span]:bg-amber-50 [&_span]:text-amber-600]', rose: 'bg-white text-[#001E50] border-slate-100 [&_p]:text-slate-400 [&_span]:bg-rose-50 [&_span]:text-rose-600]' };
  return <div className={`rounded-3xl border p-6 shadow-sm ${styles[tone]}`}><div className="flex items-start justify-between gap-4"><div><p className="font-display text-[10px] font-bold uppercase tracking-[0.16em]">{label}</p><h4 className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</h4><p className="mt-2 text-[11px] font-medium">{detail}</p></div><span className="rounded-2xl p-3">{icon}</span></div></div>;
};

const StatusPill: React.FC<{ text: string; active: boolean }> = ({ text, active }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{text}</span>;
const FilterSelect: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: string[] }> = ({ label, value, onChange, options }) => <label className="flex flex-col gap-2"><span className="pl-2 font-display text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="min-w-44 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-[#001E50] outline-none focus:border-[#00B0F0]"><option value="ALL">Todos</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;

export default RRHHCareerPlanView;

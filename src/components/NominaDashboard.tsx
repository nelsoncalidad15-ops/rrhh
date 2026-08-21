import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  Filter,
  RotateCcw,
  Table2,
  Users
} from 'lucide-react';
import {
  BUSINESS_UNITS,
  type BusinessUnitKey,
  type NominaRecord,
  normalizeText,
  useNominaData
} from '../services/nominaService';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LabelList,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { toPng } from 'html-to-image';

const ALL = 'Todos';
const MISSING = 'Sin dato';
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const COLORS = ['#0ea5e9', '#2563eb', '#4f46e5', '#7c3aed', '#a855f7', '#db2777', '#f43f5e', '#f97316', '#eab308', '#14b8a6'];

type Filters = {
  year: string;
  month: string;
  razonSocial: string;
  localidad: string;
  area: string;
  subArea: string;
  puesto: string;
  jerarquia: string;
  jefe: string;
  sexo: string;
  modalidadContrato: string;
  convenio: string;
  categoria: string;
  estado: string;
  cobertura: string;
  unidadNegocio: string;
  generacion: string;
  edadRango: string;
  antiguedadRango: string;
  dataIssue: string;
  search: string;
};

type ChartDatum = { name: string; value: number };
type LeadershipScope = {
  gerencia: boolean;
  subgerencia: boolean;
};

const FILTER_LABELS: Partial<Record<keyof Filters, string>> = {
  month: 'Corte',
  area: 'Área',
  jerarquia: 'Jerarquía',
  sexo: 'Sexo',
  generacion: 'Generación',
  antiguedadRango: 'Antigüedad',
  edadRango: 'Edad',
  categoria: 'Categoría',
  modalidadContrato: 'Modalidad',
  jefe: 'Jefe',
  unidadNegocio: 'Unidad de negocio',
  dataIssue: 'Calidad de datos'
};


const initialFilters = (): Filters => ({
  year: String(new Date().getFullYear()),
  month: ALL,
  razonSocial: ALL,
  localidad: ALL,
  area: ALL,
  subArea: ALL,
  puesto: ALL,
  jerarquia: ALL,
  jefe: ALL,
  sexo: ALL,
  modalidadContrato: ALL,
  convenio: ALL,
  categoria: ALL,
  estado: ALL,
  cobertura: ALL,
  generacion: ALL,
  unidadNegocio: ALL,
  edadRango: ALL,
  antiguedadRango: ALL,
  dataIssue: ALL,
  search: ''
});

const dimensionValue = (value?: string | null) => value?.trim() || MISSING;

const normalizeSexo = (value?: string) => {
  const normalized = normalizeText(value);
  if (normalized === 'F' || normalized === 'FEMENINO' || normalized === 'MUJER') return 'Femenino';
  if (normalized === 'M' || normalized === 'MASCULINO' || normalized === 'VARON') return 'Masculino';
  return MISSING;
};
const isLeadershipRecord = (record: NominaRecord, scope: LeadershipScope) => {
  const hierarchy = normalizeText(record.jerarquia);
  const isSubgerencia = hierarchy.includes('SUBGERENT');
  const isGerencia = hierarchy.includes('GERENT') && !isSubgerencia;
  return (scope.gerencia && isGerencia) || (scope.subgerencia && isSubgerencia);
};


const normalizeGeneracion = (value?: string) => {
  const normalized = normalizeText(value);
  if (normalized.includes('CENTENNIAL')) return 'Centennials';
  if (normalized.includes('MILLENNIAL')) return 'Millennials';
  if (normalized.includes('GENERACION X')) return 'Generación X';
  if (normalized.includes('BABY BOOMER')) return 'Baby boomers';
  return dimensionValue(value);
};

const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getReferenceDate = (year: number, month: string) => {
  const monthIndex = MONTHS.indexOf(month);
  if (monthIndex >= 0) return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const today = new Date();
  if (year === today.getFullYear()) return endOfDay(today);
  return new Date(year, 11, 31, 23, 59, 59, 999);
};

const isActiveAt = (record: NominaRecord, date: Date) => {
  if (!record.fechaIngreso || record.fechaIngreso > date) return false;
  if (record.fechaEgreso) return record.fechaEgreso > date;
  return normalizeText(record.estado) !== 'INACTIVO';
};

const getAge = (record: NominaRecord, referenceDate: Date) => {
  if (!record.fechaNacimiento) return null;
  let age = referenceDate.getFullYear() - record.fechaNacimiento.getFullYear();
  const birthdayPassed =
    referenceDate.getMonth() > record.fechaNacimiento.getMonth() ||
    (referenceDate.getMonth() === record.fechaNacimiento.getMonth() && referenceDate.getDate() >= record.fechaNacimiento.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 && age < 100 ? age : null;
};

const getTenureMonths = (record: NominaRecord, referenceDate: Date) => {
  if (!record.fechaIngreso || record.fechaIngreso > referenceDate) return null;
  let months = (referenceDate.getFullYear() - record.fechaIngreso.getFullYear()) * 12 + referenceDate.getMonth() - record.fechaIngreso.getMonth();
  if (referenceDate.getDate() < record.fechaIngreso.getDate()) months -= 1;
  return Math.max(months, 0);
};

const getAgeBand = (age: number | null) => {
  if (age === null) return MISSING;
  if (age < 25) return 'Hasta 24';
  if (age < 35) return '25 a 34';
  if (age < 45) return '35 a 44';
  if (age < 55) return '45 a 54';
  return '55 o más';
};

const getTenureBand = (months: number | null) => {
  if (months === null) return MISSING;
  if (months < 3) return 'Hasta 3 meses';
  if (months < 12) return '3 a 12 meses';
  if (months < 36) return '1 a 3 años';
  if (months < 60) return '3 a 5 años';
  if (months < 120) return '5 a 10 años';
  return '10 años o más';
};

const allocationTotal = (record: NominaRecord) =>
  Object.values(record.asignaciones).reduce((total, allocation) => total + allocation, 0);

const countBy = (records: NominaRecord[], getName: (record: NominaRecord) => string, limit?: number) => {
  const counts = records.reduce((map, record) => {
    const name = getName(record);
    map.set(name, (map.get(name) || 0) + 1);
    return map;
  }, new Map<string, number>());

  const values = Array.from(counts, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'));
  return typeof limit === 'number' ? values.slice(0, limit) : values;
};

const formatNumber = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const formatFte = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const formatChartValue = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? formatNumber.format(numericValue) : '';
};
const formatChartFte = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? formatFte.format(numericValue) : '';
};
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatShortDate = (date: Date) =>
  date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const getChartPayload = <T,>(event: unknown): T | undefined => {
  const candidate = event as { activePayload?: Array<{ payload?: T }> };
  return candidate.activePayload?.[0]?.payload;
};

const downloadChart = (id: string, filename: string) => {
  const node = document.getElementById(id);
  if (!node) return;

  void toPng(node, { backgroundColor: '#ffffff', pixelRatio: 2 })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    })
    .catch((error) => console.error('No se pudo exportar el gráfico:', error));
};

const unitLabel = (key: string) => BUSINESS_UNITS.find((unit) => unit.key === key)?.label || key;

export function NominaDashboard() {
  const { data, loading, error, updatedAt } = useNominaData();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [leadershipScope, setLeadershipScope] = useState<LeadershipScope>({ gerencia: true, subgerencia: false });
  const [chartFilterNotice, setChartFilterNotice] = useState<string | null>(null);
  const detailTableRef = useRef<HTMLElement>(null);

  const updateFilter = (key: keyof Filters, value: string) => {
    setChartFilterNotice(null);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyChartFilter = (key: keyof Filters, value: string, displayValue = value) => {
    if (!value) return;
    const isApplying = filters[key] !== value;
    setFilters((current) => ({ ...current, [key]: current[key] === value ? ALL : value }));
    setChartFilterNotice(isApplying ? (FILTER_LABELS[key] || 'Filtro') + ': ' + displayValue : null);

    if (isApplying) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          detailTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  };

  const clearFilter = (key: keyof Filters) => {
    const fallback = key === 'search' ? '' : key === 'year' ? String(new Date().getFullYear()) : ALL;
    updateFilter(key, fallback);
  };

  const options = useMemo(() => {
    const selectOptions = (getValue: (record: NominaRecord) => string) =>
      Array.from(new Set(data.map(getValue))).sort((a, b) => a.localeCompare(b, 'es'));
    const years = new Set<number>();
    data.forEach((record) => {
      if (record.fechaIngreso) years.add(record.fechaIngreso.getFullYear());
      if (record.fechaEgreso) years.add(record.fechaEgreso.getFullYear());
    });

    return {
      years: Array.from(years).sort((a, b) => b - a).map(String),
      razonSocial: selectOptions((record) => dimensionValue(record.razonSocial)),
      localidades: selectOptions((record) => dimensionValue(record.localidad)),
      areas: selectOptions((record) => dimensionValue(record.area)),
      subAreas: selectOptions((record) => dimensionValue(record.subArea)),
      puestos: selectOptions((record) => dimensionValue(record.puesto)),
      jerarquias: selectOptions((record) => dimensionValue(record.jerarquia)),
      jefes: selectOptions((record) => dimensionValue(record.jefe)),
      sexos: selectOptions((record) => normalizeSexo(record.sexo)),
      modalidades: selectOptions((record) => dimensionValue(record.modalidadContrato)),
      convenios: selectOptions((record) => dimensionValue(record.convenio)),
      categorias: selectOptions((record) => dimensionValue(record.categoria)),
      estados: selectOptions((record) => dimensionValue(record.estado)),
      coberturas: selectOptions((record) => dimensionValue(record.cobertura)),
      generaciones: selectOptions((record) => normalizeGeneracion(record.generacion)),
    };
  }, [data]);

  const selectedYear = Number.parseInt(filters.year, 10) || new Date().getFullYear();
  const referenceDate = useMemo(() => getReferenceDate(selectedYear, filters.month), [filters.month, selectedYear]);

  const baseRecords = useMemo(() => {
    const search = normalizeText(filters.search);

    return data.filter((record) => {
      const checks = [
        filters.razonSocial === ALL || dimensionValue(record.razonSocial) === filters.razonSocial,
        filters.localidad === ALL || dimensionValue(record.localidad) === filters.localidad,
        filters.area === ALL || dimensionValue(record.area) === filters.area,
        filters.subArea === ALL || dimensionValue(record.subArea) === filters.subArea,
        filters.puesto === ALL || dimensionValue(record.puesto) === filters.puesto,
        filters.jerarquia === ALL || dimensionValue(record.jerarquia) === filters.jerarquia,
        filters.jefe === ALL || dimensionValue(record.jefe) === filters.jefe,
        filters.sexo === ALL || normalizeSexo(record.sexo) === filters.sexo,
        filters.modalidadContrato === ALL || dimensionValue(record.modalidadContrato) === filters.modalidadContrato,
        filters.convenio === ALL || dimensionValue(record.convenio) === filters.convenio,
        filters.generacion === ALL || normalizeGeneracion(record.generacion) === filters.generacion,
        filters.categoria === ALL || dimensionValue(record.categoria) === filters.categoria,
        filters.estado === ALL || dimensionValue(record.estado) === filters.estado,
        filters.cobertura === ALL || dimensionValue(record.cobertura) === filters.cobertura,
        filters.unidadNegocio === ALL || record.asignaciones[filters.unidadNegocio as BusinessUnitKey] > 0,
        filters.edadRango === ALL || getAgeBand(getAge(record, referenceDate)) === filters.edadRango,
        filters.antiguedadRango === ALL || getTenureBand(getTenureMonths(record, referenceDate)) === filters.antiguedadRango,
        !search || [record.nombre, record.legajo, record.puesto, record.jefe, record.area].some((value) => normalizeText(value).includes(search))
      ];

      if (!checks.every(Boolean)) return false;
      if (filters.dataIssue === ALL) return true;
      if (filters.dataIssue === 'Sin legajo') return !record.legajo;
      if (filters.dataIssue === 'Sin sexo') return normalizeSexo(record.sexo) === MISSING;
      if (filters.dataIssue === 'Sin fecha de ingreso') return !record.fechaIngreso;
      if (filters.dataIssue === 'Sin asignación') return allocationTotal(record) === 0;
      if (filters.dataIssue === 'Asignación incompleta') {
        const total = allocationTotal(record);
        return total > 0 && total < 0.995;
      }
      return true;
    });
  }, [data, filters, referenceDate]);

  const dashboard = useMemo(() => {
    const active = baseRecords.filter((record) => isActiveAt(record, referenceDate));
    const fte = active.reduce((total, record) => total + allocationTotal(record), 0);
    const tenureMonths = active
      .map((record) => getTenureMonths(record, referenceDate))
      .filter((value): value is number => value !== null);
    const averageTenure = tenureMonths.length
      ? tenureMonths.reduce((sum, value) => sum + value, 0) / tenureMonths.length
      : 0;

    const maxMonth = filters.month === ALL
      ? selectedYear === new Date().getFullYear() ? new Date().getMonth() : 11
      : Math.max(MONTHS.indexOf(filters.month), 0);
    const historical = MONTHS.map((name, month) => ({
      name: name.slice(0, 3).toUpperCase(),
      fullMonth: name,
      value: month <= maxMonth ? baseRecords.filter((record) => isActiveAt(record, new Date(selectedYear, month + 1, 0, 23, 59, 59, 999))).length : null
    }));

    const businessFte = BUSINESS_UNITS
      .map((unit) => ({
        name: unit.label,
        key: unit.key,
        value: active.reduce((total, record) => total + record.asignaciones[unit.key], 0)
      }))
      .filter((unit) => unit.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      active,
      fte,
      averageTenure,
      historical,
      areas: countBy(active, (record) => dimensionValue(record.area), 10),
      hierarchy: countBy(active, (record) => dimensionValue(record.jerarquia), 8),
      categories: countBy(active, (record) => dimensionValue(record.categoria), 8),
      genders: countBy(active, (record) => normalizeSexo(record.sexo)),
      generations: countBy(active, (record) => normalizeGeneracion(record.generacion)),
      ages: countBy(active, (record) => getAgeBand(getAge(record, referenceDate))),
      tenure: countBy(active, (record) => getTenureBand(getTenureMonths(record, referenceDate))),
      modalities: countBy(active, (record) => dimensionValue(record.modalidadContrato)),
      leaders: countBy(active.filter((record) => record.jefe), (record) => dimensionValue(record.jefe), 8),
      businessFte,
      quality: [
        { name: 'Sin legajo', value: active.filter((record) => !record.legajo).length },
        { name: 'Sin sexo', value: active.filter((record) => normalizeSexo(record.sexo) === MISSING).length },
        { name: 'Sin fecha de ingreso', value: active.filter((record) => !record.fechaIngreso).length },
        { name: 'Sin asignación', value: active.filter((record) => allocationTotal(record) === 0).length },
        { name: 'Asignación incompleta', value: active.filter((record) => {
          const total = allocationTotal(record);
          return total > 0 && total < 0.995;
        }).length }
      ]
    };
  }, [baseRecords, filters.month, referenceDate, selectedYear]);
  const womenRepresentation = useMemo(() => {
    const active = dashboard.active;
    const leadership = active.filter((record) => isLeadershipRecord(record, leadershipScope));
    const womenWorkforce = active.filter((record) => normalizeSexo(record.sexo) === 'Femenino').length;
    const womenLeadership = leadership.filter((record) => normalizeSexo(record.sexo) === 'Femenino').length;
    const unknownSex = active.filter((record) => normalizeSexo(record.sexo) === MISSING).length;

    const workforceShare = active.length ? (womenWorkforce / active.length) * 100 : 0;
    const leadershipShare = leadership.length ? (womenLeadership / leadership.length) * 100 : 0;
    const ratio = leadership.length && workforceShare > 0 ? leadershipShare / workforceShare : null;
    const scopeLabel = leadershipScope.gerencia && leadershipScope.subgerencia
      ? 'Gerencia + Subgerencia'
      : leadershipScope.gerencia
        ? 'Gerencia'
        : 'Subgerencia';

    const assessment = ratio === null
      ? { label: 'Sin evaluación', tone: 'slate', message: 'No hay base suficiente para calcular el índice.' }
      : ratio >= 0.8 && ratio <= 1.2
        ? { label: 'Cumple completamente', tone: 'emerald', message: 'La representación de mujeres está dentro del rango objetivo de 0,80 a 1,20.' }
        : (ratio >= 0.6 && ratio < 0.8) || (ratio > 1.2 && ratio <= 1.4)
          ? { label: 'En camino', tone: 'amber', message: 'El índice está dentro del rango de evaluación parcial.' }
          : { label: 'A revisar', tone: 'rose', message: 'El índice está fuera de los rangos de evaluación definidos.' };

    return { activeCount: active.length, leadershipCount: leadership.length, womenWorkforce, womenLeadership, unknownSex, workforceShare, leadershipShare, ratio, scopeLabel, assessment };
  }, [dashboard.active, leadershipScope]);

  const detailRecords = dashboard.active;


  const activeFilterChips = useMemo(() => {
    const labels: Array<{ key: keyof Filters; label: string; value: string }> = [
      { key: 'month', label: 'Corte', value: filters.month },
      { key: 'razonSocial', label: 'Razón social', value: filters.razonSocial },
      { key: 'localidad', label: 'Localidad', value: filters.localidad },
      { key: 'area', label: 'Área', value: filters.area },
      { key: 'subArea', label: 'Subárea', value: filters.subArea },
      { key: 'puesto', label: 'Puesto', value: filters.puesto },
      { key: 'jerarquia', label: 'Jerarquía', value: filters.jerarquia },
      { key: 'jefe', label: 'Jefe', value: filters.jefe },
      { key: 'sexo', label: 'Sexo', value: filters.sexo },
      { key: 'modalidadContrato', label: 'Modalidad', value: filters.modalidadContrato },
      { key: 'generacion', label: 'Generación', value: filters.generacion },
      { key: 'convenio', label: 'Convenio', value: filters.convenio },
      { key: 'categoria', label: 'Categoría', value: filters.categoria },
      { key: 'estado', label: 'Estado', value: filters.estado },
      { key: 'cobertura', label: 'Cobertura', value: filters.cobertura },
      { key: 'unidadNegocio', label: 'Unidad', value: filters.unidadNegocio === ALL ? ALL : unitLabel(filters.unidadNegocio) },
      { key: 'edadRango', label: 'Edad', value: filters.edadRango },
      { key: 'antiguedadRango', label: 'Antigüedad', value: filters.antiguedadRango },
      { key: 'dataIssue', label: 'Calidad', value: filters.dataIssue },
      { key: 'search', label: 'Búsqueda', value: filters.search }
    ];
    return labels.filter((filter) => filter.value && filter.value !== ALL);
  }, [filters]);

  if (loading) {
    return <LoadingPanel text="Cargando la nómina y normalizando indicadores..." />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
        <AlertTriangle className="mx-auto mb-3" size={28} />
        <p className="font-bold">No se pudo cargar la nómina.</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <section className="glass-card !p-5 overflow-visible">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Dotación</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Nómina, estructura y movimientos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right text-[10px] font-medium text-slate-400">
            <Database size={14} />
            <span>{data.length} registros · actualización de la vista {updatedAt ? formatShortDate(updatedAt) : '-'}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
          <FilterSelect label="Año" value={filters.year} options={options.years} onChange={(value) => updateFilter('year', value)} />
          <FilterSelect label="Corte" value={filters.month} options={MONTHS} onChange={(value) => updateFilter('month', value)} />
          <FilterSelect label="Razón social" value={filters.razonSocial} options={options.razonSocial} onChange={(value) => updateFilter('razonSocial', value)} />
          <FilterSelect label="Localidad" value={filters.localidad} options={options.localidades} onChange={(value) => updateFilter('localidad', value)} />
          <FilterSelect label="Área" value={filters.area} options={options.areas} onChange={(value) => updateFilter('area', value)} />
          <FilterSelect label="Subárea" value={filters.subArea} options={options.subAreas} onChange={(value) => updateFilter('subArea', value)} />
          <FilterSelect label="Puesto" value={filters.puesto} options={options.puestos} onChange={(value) => updateFilter('puesto', value)} />
          <FilterSelect label="Jerarquía" value={filters.jerarquia} options={options.jerarquias} onChange={(value) => updateFilter('jerarquia', value)} />
          <FilterSelect label="Jefe" value={filters.jefe} options={options.jefes} onChange={(value) => updateFilter('jefe', value)} />
          <FilterSelect label="Sexo" value={filters.sexo} options={options.sexos} onChange={(value) => updateFilter('sexo', value)} />
          <FilterSelect label="Modalidad" value={filters.modalidadContrato} options={options.modalidades} onChange={(value) => updateFilter('modalidadContrato', value)} />
          <FilterSelect label="Convenio" value={filters.convenio} options={options.convenios} onChange={(value) => updateFilter('convenio', value)} />
          <FilterSelect label="Categoría" value={filters.categoria} options={options.categorias} onChange={(value) => updateFilter('categoria', value)} />
          <FilterSelect label="Estado" value={filters.estado} options={options.estados} onChange={(value) => updateFilter('estado', value)} />
          <FilterSelect label="Cobertura" value={filters.cobertura} options={options.coberturas} onChange={(value) => updateFilter('cobertura', value)} />
          <FilterSelect label="Generación" value={filters.generacion} options={options.generaciones} onChange={(value) => updateFilter('generacion', value)} />
          <FilterSelect label="Unidad" value={filters.unidadNegocio} options={BUSINESS_UNITS.map((unit) => unit.key)} formatOption={unitLabel} onChange={(value) => updateFilter('unidadNegocio', value)} />
          <label className="col-span-2 flex min-w-0 flex-col gap-1 xl:col-span-2">
            <span className="pl-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Buscar</span>
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Nombre, legajo, puesto o jefe"
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Filter size={14} className="text-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filtros activos</span>
          {activeFilterChips.length ? activeFilterChips.map((filter) => (
            <button
              key={filter.key}
              onClick={() => clearFilter(filter.key)}
              className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
              title="Quitar filtro"
            >
              {filter.label}: {filter.value} ×
            </button>
          )) : <span className="text-[11px] text-slate-400">Sin segmentaciones adicionales</span>}
          <button
            onClick={() => {
              setFilters(initialFilters());
              setChartFilterNotice(null);
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <RotateCcw size={13} /> Limpiar todo
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <KpiCard label="Dotación activa" value={formatNumber.format(dashboard.active.length)} caption={`Al ${formatShortDate(referenceDate)}`} icon={<Users size={18} />} accent="indigo" />
        <KpiCard label="FTE asignado" value={formatNumber.format(dashboard.fte)} caption="Suma de asignaciones normalizadas" icon={<Activity size={18} />} accent="sky" />
        <KpiCard label="Antigüedad media" value={`${(dashboard.averageTenure / 12).toFixed(1)} a`} caption="Personal activo con fecha de ingreso" icon={<Table2 size={18} />} accent="violet" />
      </section>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] text-indigo-800">
        <Filter size={14} className="shrink-0 text-indigo-600" />
        <p><strong>Gráficos interactivos:</strong> hacé clic en una barra, punto o segmento para ver las personas abajo. Repetí el clic para quitar el filtro.</p>
      </div>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard id="nomina-evolucion" title="Evolución de dotación" subtitle="Estimación por fechas de ingreso y egreso · clic en un mes para cortar la vista" className="xl:col-span-6">
          <ChartOrEmpty hasData={dashboard.historical.some((item) => item.value !== null)}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dashboard.historical}
                margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
                onClick={(event) => {
                  const item = getChartPayload<{ fullMonth?: string }>(event);
                  if (item?.fullMonth) applyChartFilter('month', item.fullMonth);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip labelFormatter={(label) => `Mes: ${label}`} formatter={(value: number) => [value, 'Dotación']} />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} className="cursor-pointer" connectNulls={false}>
                  <LabelList dataKey="value" position="top" offset={8} formatter={formatChartValue} fill="#4f46e5" fontSize={10} fontWeight={700} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </ChartCard>

        <ChartCard id="nomina-area" title="Dotación por área" subtitle="Clic en una barra para aplicar el mismo filtro a toda la vista" className="xl:col-span-3">
          <BarDistribution
            data={dashboard.areas}
            activeValue={filters.area}
            onSelect={(value) => applyChartFilter('area', value)}
            color="#2563eb"
          />
        </ChartCard>

        <ChartCard id="nomina-jerarquia" title="Estructura jerárquica" subtitle="Distribución de la dotación activa" className="xl:col-span-3">
          <BarDistribution
            data={dashboard.hierarchy}
            activeValue={filters.jerarquia}
            onSelect={(value) => applyChartFilter('jerarquia', value)}
            color="#7c3aed"
          />
        </ChartCard>

        <ChartCard id="nomina-sexo" title="Distribución por sexo" subtitle="Clic para segmentar toda la vista" className="xl:col-span-3">
          <PieDistribution data={dashboard.genders} activeValue={filters.sexo} onSelect={(value) => applyChartFilter('sexo', value)} />
        </ChartCard>

        <ChartCard id="nomina-generacion" title="Generaciones" subtitle="Campo informado en la nómina" className="xl:col-span-3">
          <BarDistribution
            data={dashboard.generations}
            activeValue={filters.generacion}
            onSelect={(value) => applyChartFilter('generacion', value)}
            color="#0ea5e9"
            interactive
          />
        </ChartCard>

        <ChartCard id="nomina-antiguedad" title="Antigüedad" subtitle="Calculada al corte seleccionado" className="xl:col-span-3">
          <BarDistribution
            data={dashboard.tenure}
            activeValue={filters.antiguedadRango}
            onSelect={(value) => applyChartFilter('antiguedadRango', value)}
            color="#14b8a6"
          />
        </ChartCard>

        <ChartCard id="nomina-edad" title="Rangos etarios" subtitle="Derivados de fecha de nacimiento" className="xl:col-span-3">
          <BarDistribution
            data={dashboard.ages}
            activeValue={filters.edadRango}
            onSelect={(value) => applyChartFilter('edadRango', value)}
            color="#f97316"
          />
        </ChartCard>

        <ChartCard id="nomina-categoria" title="Categorías" subtitle="Top categorías dentro del corte" className="xl:col-span-4">
          <BarDistribution
            data={dashboard.categories}
            activeValue={filters.categoria}
            onSelect={(value) => applyChartFilter('categoria', value)}
            color="#6366f1"
          />
        </ChartCard>

        <ChartCard id="nomina-modalidad" title="Modalidad de contrato" subtitle="DC, FC y otros formatos informados" className="xl:col-span-4">
          <PieDistribution data={dashboard.modalities} activeValue={filters.modalidadContrato} onSelect={(value) => applyChartFilter('modalidadContrato', value)} />
        </ChartCard>

        <ChartCard id="nomina-jefes" title="Span de control" subtitle="Personas activas por jefe informado" className="xl:col-span-4">
          <BarDistribution
            data={dashboard.leaders}
            activeValue={filters.jefe}
            onSelect={(value) => applyChartFilter('jefe', value)}
            color="#db2777"
          />
        </ChartCard>

        <ChartCard id="nomina-unidad" title="FTE por unidad de negocio" subtitle="No suma personas: prorratea la dedicación declarada" className="xl:col-span-6">
          <ChartOrEmpty hasData={dashboard.businessFte.length > 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.businessFte}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 68, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={86} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip formatter={(value: number) => [value.toFixed(2), 'FTE']} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} className="cursor-pointer">
                  <LabelList dataKey="value" position="right" offset={8} formatter={formatChartFte} fill="#475569" fontSize={10} fontWeight={700} />
                  {dashboard.businessFte.map((item, index) => (
                    <Cell key={item.key} fill={filters.unidadNegocio === item.key ? '#001e50' : COLORS[index % COLORS.length]} onClick={() => applyChartFilter('unidadNegocio', item.key, item.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartOrEmpty>
        </ChartCard>

        <section className="glass-card !p-0 flex min-h-[300px] flex-col overflow-hidden xl:col-span-3">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Calidad de datos</h3>
              <p className="mt-1 text-[10px] text-slate-400">Clic para filtrar y revisar la nómina activa.</p>
            </div>
            <AlertTriangle size={16} className="mt-0.5 text-amber-500" />
          </div>
          <div className="flex-1 space-y-1 p-2">
            {dashboard.quality.map((item) => (
              <button
                key={item.name}
                onClick={() => applyChartFilter('dataIssue', item.name)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[11px] transition ${filters.dataIssue === item.name ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{item.name}</span>
                <span className="rounded-full bg-white px-2 py-0.5 font-black text-slate-700 shadow-sm">{item.value}</span>
              </button>
            ))}
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">Los indicadores derivan edad y antigüedad al corte; no exponen contacto, mails ni otros datos sensibles.</p>
        </section>
      </section>

      <section ref={detailTableRef} id="nomina-detalle" className="glass-card !p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Detalle de dotación activa</h3>
            <p className="mt-1 text-[11px] text-slate-400">
              {detailRecords.length + ' personas al ' + formatShortDate(referenceDate) + ' · la tabla respeta exactamente los filtros y clics aplicados.'}
            </p>
            {chartFilterNotice && (
              <p role="status" className="mt-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700">
                Filtro aplicado desde el gráfico: <strong>{chartFilterNotice}</strong> · {detailRecords.length} personas en la lista.
              </p>
            )}
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600"><Table2 size={13} /> Sin datos de contacto</span>
        </div>
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Colaborador</th>
                <th className="px-3 py-3">Localidad</th>
                <th className="px-3 py-3">Área / subárea</th>
                <th className="px-3 py-3">Puesto</th>
                <th className="px-3 py-3">Jerarquía</th>
                <th className="px-3 py-3">Jefe</th>
                <th className="px-3 py-3 text-right">Antigüedad</th>
                <th className="px-5 py-3 text-right">FTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {detailRecords.map((record) => {
                const tenure = getTenureMonths(record, referenceDate);
                return (
                  <tr key={record.id} className="text-slate-600 transition hover:bg-indigo-50/40">
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {record.nombre || MISSING}
                      <span className="ml-2 text-[10px] font-medium text-slate-400">{record.legajo ? `Leg. ${record.legajo}` : 'Sin legajo'}</span>
                    </td>
                    <td className="px-3 py-3">{dimensionValue(record.localidad)}</td>
                    <td className="px-3 py-3"><span className="block font-medium text-slate-700">{dimensionValue(record.area)}</span><span className="text-[10px] text-slate-400">{dimensionValue(record.subArea)}</span></td>
                    <td className="px-3 py-3">{dimensionValue(record.puesto)}</td>
                    <td className="px-3 py-3">{dimensionValue(record.jerarquia)}</td>
                    <td className="px-3 py-3">{dimensionValue(record.jefe)}</td>
                    <td className="px-3 py-3 text-right">{tenure === null ? MISSING : (tenure / 12).toFixed(1) + ' a'}</td>
                    <td className="px-5 py-3 text-right font-black text-indigo-700">{allocationTotal(record).toFixed(2)}</td>
                  </tr>
                );
              })}
              {!detailRecords.length && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No hay personas activas que cumplan los filtros seleccionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card border border-slate-200 !p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Evidencia para auditoría</p>
            <h3 className="mt-1 text-base font-black text-slate-900">Representación de mujeres en puestos directivos</h3>
            <p className="mt-1 text-[11px] text-slate-500">Índice = % de mujeres en el alcance seleccionado / % de mujeres en la dotación activa total.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect label="Localidad" value={filters.localidad} options={options.localidades} onChange={(value) => updateFilter('localidad', value)} />
            <div role="group" aria-label="Alcance de puestos directivos" className="flex flex-col gap-1">
              <span className="pl-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Puestos directivos</span>
              <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1 text-[10px] font-black uppercase tracking-wider">
                <button
                  type="button"
                  aria-pressed={leadershipScope.gerencia}
                  onClick={() => setLeadershipScope((scope) => scope.subgerencia ? { ...scope, gerencia: !scope.gerencia } : scope)}
                  className={'rounded-lg px-3 py-2 transition ' + (leadershipScope.gerencia ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                >Gerencia</button>
                <button
                  type="button"
                  aria-pressed={leadershipScope.subgerencia}
                  onClick={() => setLeadershipScope((scope) => scope.gerencia ? { ...scope, subgerencia: !scope.subgerencia } : scope)}
                  className={'rounded-lg px-3 py-2 transition ' + (leadershipScope.subgerencia ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                >Subgerencia</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Índice de representación</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{womenRepresentation.ratio === null ? '—' : formatFte.format(womenRepresentation.ratio)}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">Cumple completamente: 0,80 a 1,20</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mujeres en {womenRepresentation.scopeLabel}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{formatPercent(womenRepresentation.leadershipShare)}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">{womenRepresentation.womenLeadership} de {womenRepresentation.leadershipCount} personas</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mujeres en dotación total</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{formatPercent(womenRepresentation.workforceShare)}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">{womenRepresentation.womenWorkforce} de {womenRepresentation.activeCount} personas</p>
          </div>
        </div>

        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-700">
          <strong>{womenRepresentation.assessment.label}:</strong> {womenRepresentation.assessment.message}
        </p>
        <p className="mt-2 text-[10px] text-slate-500">Evaluación parcial: 0,60 a &lt;0,80 o &gt;1,20 a 1,40 · Base actual: {womenRepresentation.activeCount} personas activas · {womenRepresentation.unknownSex} sin sexo informado.</p>
      </section>
    </div>
  );
}

function LoadingPanel({ text }: { text: string }) {
  return (
    <div className="flex min-h-[52vh] flex-col items-center justify-center gap-4 text-slate-500">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, formatOption }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatOption?: (value: string) => string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="pl-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer truncate rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition hover:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
      >
        <option value={ALL}>{ALL}</option>
        {options.map((option) => <option key={option} value={option}>{formatOption ? formatOption(option) : option}</option>)}
      </select>
    </label>
  );
}

function KpiCard({ label, value, caption, icon, accent }: { label: string; value: string; caption: string; icon: ReactNode; accent: 'indigo' | 'sky' | 'emerald' | 'rose' | 'amber' | 'violet' }) {
  const palettes = {
    indigo: 'border-indigo-500 bg-indigo-50/40 text-indigo-600',
    sky: 'border-sky-500 bg-sky-50/40 text-sky-600',
    emerald: 'border-emerald-500 bg-emerald-50/40 text-emerald-600',
    rose: 'border-rose-500 bg-rose-50/40 text-rose-600',
    amber: 'border-amber-500 bg-amber-50/40 text-amber-600',
    violet: 'border-violet-500 bg-violet-50/40 text-violet-600'
  };

  return (
    <article className={`min-w-0 rounded-2xl border-l-4 p-4 shadow-sm ${palettes[accent]}`}>
      <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>{icon}</div>
      <p className="mt-3 truncate text-3xl font-black leading-none text-slate-900">{value}</p>
      <p className="mt-2 text-[10px] leading-snug text-slate-500">{caption}</p>
    </article>
  );
}

function ChartCard({ id, title, subtitle, className = '', children }: { id: string; title: string; subtitle: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`glass-card flex h-[300px] min-w-0 flex-col !p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">{title}</h3>
          <p className="mt-1 text-[10px] leading-snug text-slate-400">{subtitle}</p>
        </div>
        <button onClick={() => downloadChart(id, title.toLowerCase().replace(/[^a-z0-9]+/gi, '_'))} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600" title="Descargar imagen">
          <Download size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function ChartOrEmpty({ hasData, children }: { hasData: boolean; children: ReactNode }) {
  if (hasData) return <>{children}</>;
  return <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-xs text-slate-400">No hay datos para esta visualización con los filtros actuales.</div>;
}

function BarDistribution({ data, activeValue, onSelect, color, interactive = true }: { data: ChartDatum[]; activeValue: string; onSelect: (value: string) => void; color: string; interactive?: boolean }) {
  return (
    <ChartOrEmpty hasData={data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 2, right: 48, left: 56, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={86} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} />
          <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => [value, 'Personas']} />
          <Bar dataKey="value" fill={color} radius={[0, 5, 5, 0]} className={interactive ? 'cursor-pointer' : ''}>
            <LabelList dataKey="value" position="right" offset={8} formatter={formatChartValue} fill="#475569" fontSize={10} fontWeight={700} />
            {data.map((item, index) => <Cell key={item.name} fill={activeValue === item.name ? '#001e50' : COLORS[index % COLORS.length] || color} onClick={() => { if (interactive) onSelect(item.name); }} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartOrEmpty>
  );
}

function PieDistribution({ data, activeValue, onSelect }: { data: ChartDatum[]; activeValue: string; onSelect: (value: string) => void }) {
  return (
    <ChartOrEmpty hasData={data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="47%"
            innerRadius={38}
            outerRadius={66}
            paddingAngle={2}
            label={({ value }) => formatChartValue(value)}
            labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            className="cursor-pointer outline-none"
            onClick={(item) => {
              const name = typeof item?.name === 'string' ? item.name : '';
              if (name) onSelect(name);
            }}
          >
            {data.map((item, index) => <Cell key={item.name} fill={activeValue === item.name ? '#001e50' : COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value: number) => [value, 'Personas']} />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: 4 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartOrEmpty>
  );
}

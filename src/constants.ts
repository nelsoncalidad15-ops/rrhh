import { AutoRecord, AreaConfig, AreaType, ReportTemplate, PostventaKpiRecord, BillingRecord, CemOsRecord, InternalPostventaRecord, ActionPlanRecord, CourseGrade, RelatorioItem, AppConfig, LoadingState } from './types';

// Mock data based on the user's provided Excel snippet
export const MOCK_DATA: AutoRecord[] = [
  { id: '1', nro_mes: 1, mes: 'Enero', sucursal: 'Santa Fe', semana_1: 32, semana_2: 142, semana_3: 148, semana_4: 136, semana_5: 145, avance_ppt: 603, dias_laborables: 22, ppt_diarios: 27.41, avance_servicios: 393, servicios_diarios: 17.86, servis_vs_ppt: 65, objetivo_mensual: 480, objetivo_ppt: 126, anio: 2025 },
  { id: '2', nro_mes: 1, mes: 'Enero', sucursal: 'Jujuy', semana_1: 1, semana_2: 141, semana_3: 112, semana_4: 140, semana_5: 133, avance_ppt: 527, dias_laborables: 22, ppt_diarios: 23.95, avance_servicios: 302, servicios_diarios: 13.73, servis_vs_ppt: 57, objetivo_mensual: 400, objetivo_ppt: 132, anio: 2025 },
  { id: '3', nro_mes: 2, mes: 'Febrero', sucursal: 'Santa Fe', semana_1: 147, semana_2: 175, semana_3: 136, semana_4: 105, semana_5: 0, avance_ppt: 563, dias_laborables: 19, ppt_diarios: 29.63, avance_servicios: 339, servicios_diarios: 17.84, servis_vs_ppt: 60, objetivo_mensual: 480, objetivo_ppt: 117, anio: 2025 },
];

export const DEFAULT_SHEET_KEY = "postventa";
export const QUALITY_SHEET_KEY = "quality";
export const SALES_QUALITY_SHEET_KEY = "sales_quality";
export const SALES_CLAIMS_SHEET_KEY = "sales_claims";
export const INTERNAL_POSTVENTA_SHEET_KEY = "internal_postventa";
export const DETAILED_QUALITY_SHEET_KEY = "detailed_quality";
export const DETAILED_QUALITY_SALTA_SHEET_KEY = "detailed_quality_salta";
export const POSTVENTA_KPI_SHEET_KEY = "postventa_kpi";
export const POSTVENTA_BILLING_SHEET_KEY = "postventa_billing";
export const PCGC_SHEET_KEY = "pcgc";
export const CEM_OS_SHEET_KEY = "cem_os";
export const CEM_OS_SALTA_SHEET_KEY = "cem_os_salta";
export const ACTION_PLAN_SHEET_KEY = "action_plan";
export const ACTION_PLAN_SALES_SHEET_KEY = "action_plan_sales";
export const HR_GRADES_SHEET_KEY = "hr_grades";
export const HR_RELATORIO_SHEET_KEY = "hr_relatorio";

export const GEMINI_MODEL = "gemini-3-flash-preview";

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const YEARS = ["2024", "2025", "2026"];

export const BRANCHES = ["Salta", "Jujuy", "Express", "MOVIL", "Santa Fe", "Tartagal"];

export const BRANCH_COLORS = {
  "Salta": "#ef4444",
  "Jujuy": "#3b82f6",
  "Express": "#6366f1",
  "MOVIL": "#f59e0b",
  "Santa Fe": "#10b981",
  "Tartagal": "#ec4899",
  "TODAS": "#0f172a"
};

export const KPI_DEFS = [
  { id: 'lvs', name: 'LVS', target: 4.8, unit: '', direction: 'up' },
  { id: 'email_validos', name: 'Emails Válidos', target: 95, unit: '%', direction: 'up' },
  { id: 'tasa_respuesta', name: 'Tasa Respuesta', target: 30, unit: '%', direction: 'up' },
  { id: 'dac', name: 'DAC', target: 0.2, unit: '%', direction: 'down' },
  { id: 'contrato_mantenimiento', name: 'Contrato Mant.', target: 20, unit: 'un', direction: 'up' },
  { id: 'reporte_tecnico', name: 'Reporte Técnico', target: 48, unit: 'un', direction: 'up' },
  { id: 'reporte_garantia', name: 'Reporte Garantía', target: 48, unit: 'un', direction: 'up' },
  { id: 'ampliacion_trabajo', name: 'Ampliación Trab.', target: 50, unit: '%', direction: 'up' },
  { id: 'ppt_diario', name: 'PPT Diario', target: 26, unit: 'un', direction: 'up' },
  { id: 'conversion_ppt_serv', name: 'Conv. PPT/Serv', target: 60, unit: '%', direction: 'up' },
  { id: 'oudi_servicios', name: 'OUDI Servicios', target: 12, unit: '%', direction: 'up' },
  { id: 'grado_ocupacion', name: 'Grado Ocupación', target: 95, unit: '%', direction: 'up' },
  { id: 'productividad', name: 'Productividad', target: 97, unit: '%', direction: 'up' },
  { id: 'costos_controlables', name: 'Costos Contr.', target: 80, unit: '%', direction: 'down' },
  { id: 'costo_sueldos', name: 'Costo Sueldos', target: 60, unit: '%', direction: 'down' },
  { id: 'stock_muerto', name: 'Stock Muerto', target: 15, unit: '%', direction: 'down' },
  { id: 'meses_stock', name: 'Meses Stock', target: 3, unit: 'm', direction: 'down' },
  { id: 'cotizacion_seguros', name: 'Cotiz. Seguros', target: 10, unit: '%', direction: 'up' },
  { id: 'uodi_repuestos', name: 'UODI Repuestos', target: 7, unit: '%', direction: 'up' },
  { id: 'margen_bruto_primario', name: 'Margen Bruto', target: 23, unit: '%', direction: 'up' },
  { id: 'uodi_posventa', name: 'UODI Posventa', target: 7, unit: '%', direction: 'up' },
  { id: 'incentivo_calidad', name: 'Inc. Calidad', target: 100, unit: '%', direction: 'up' },
  { id: 'plan_incentivo_posventa', name: 'Plan Inc. Posv.', target: 100, unit: '%', direction: 'up' },
  { id: 'plan_incentivo_repuestos', name: 'Plan Inc. Rep.', target: 120, unit: '%', direction: 'up' },
  { id: 'uops_total', name: 'UOPS Total', target: 100, unit: '%', direction: 'up' },
];

export const AREAS: AreaConfig[] = [
  { 
    id: 'postventa', 
    name: 'Postventa', 
    icon: 'Wrench', 
    color: 'bg-blue-600', 
    description: 'Gestión de talleres, PPT y servicios diarios.' 
  },
  { 
    id: 'rrhh', 
    name: 'RRHH', 
    icon: 'Users', 
    color: 'bg-[#001E50]', 
    description: 'Gestión de talento, capacitación y desempeño.' 
  },
  { 
    id: 'calidad', 
    name: 'Calidad', 
    icon: 'ClipboardCheck', 
    color: 'bg-green-600', 
    description: 'Auditorías, satisfacción y procesos.' 
  },
  { 
    id: 'ventas', 
    name: 'Ventas', 
    icon: 'BarChart', 
    color: 'bg-orange-500', 
    description: 'Objetivos de ventas, patentamientos y leads.' 
  }
];

export const DEFAULT_REPORT_TEMPLATE: ReportTemplate = {
  ventas: {
    enabled: true,
    modules: [
      { id: 'kpis', label: 'Indicadores Principales (CEM)', enabled: true, size: 'full' },
      { id: 'process', label: 'Adherencia a Procesos', enabled: true, size: 'half' },
      { id: 'delivery', label: 'Experiencia de Entrega', enabled: true, size: 'half' },
      { id: 'claims', label: 'Gestión de Reclamos', enabled: true, size: 'full' },
    ]
  },
  postventa: {
    enabled: true,
    modules: [
      { id: 'kpis', label: 'Indicadores LVS', enabled: true, size: 'full' },
      { id: 'resolution', label: 'Resolución de Casos', enabled: true, size: 'half' },
      { id: 'claims', label: 'Motivos de Reclamo', enabled: true, size: 'half' },
    ]
  },
  globalComments: ''
};

export const DEFAULT_CONFIG: AppConfig = {
  isPasswordProtected: false,
  globalPassword: 'autosol2026',
  sheetUrls: {
    postventa: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxUrEIVysJ9HgBXHOJnZ_MGPL2Huqw1b4h1zQB-SugNLB2TzTmx7CnQrPIAKKnHA/pub?gid=1177925024&single=true&output=csv',
    rrhh: HR_GRADES_SHEET_KEY,
    calidad: QUALITY_SHEET_KEY,
    ventas: '',
    detailed_quality: DETAILED_QUALITY_SHEET_KEY,
    detailed_quality_salta: DETAILED_QUALITY_SALTA_SHEET_KEY,
    postventa_kpis: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxUrEIVysJ9HgBXHOJnZ_MGPL2Huqw1b4h1zQB-SugNLB2TzTmx7CnQrPIAKKnHA/pub?gid=2103759067&single=true&output=csv',
    postventa_billing: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxUrEIVysJ9HgBXHOJnZ_MGPL2Huqw1b4h1zQB-SugNLB2TzTmx7CnQrPIAKKnHA/pub?gid=609635821&single=true&output=csv',
    pcgc: PCGC_SHEET_KEY,
    cem_os: CEM_OS_SHEET_KEY,
    cem_os_salta: CEM_OS_SALTA_SHEET_KEY,
    sales_quality: SALES_QUALITY_SHEET_KEY,
    sales_claims: SALES_CLAIMS_SHEET_KEY,
    internal_postventa: INTERNAL_POSTVENTA_SHEET_KEY,
    action_plan: ACTION_PLAN_SHEET_KEY,
    action_plan_sales: ACTION_PLAN_SALES_SHEET_KEY,
    hr_relatorio: HR_RELATORIO_SHEET_KEY
  },
  geminiApiKey: '',
  reportTemplate: DEFAULT_REPORT_TEMPLATE
};

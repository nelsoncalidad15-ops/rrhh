export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface RelatorioItem {
  nombre: string;
  unidad: string;
  area: string;
  curso: string;
  claseFecha: string;
  claseHora: string;
  referenciaMeses: string;
  fechaRegistro: string;
  modalidad?: string;
  linkCurso?: string;
}

export interface CoursePhase {
  curso: string;
  fase: string;
  modalidad: string;
}

export interface CollaboratorContact {
  nombre: string;
  telefono: string;
}

export interface CourseGrade {
  id: string;
  colaborador: string;
  unidad: string;
  area: string;
  funcion: string;
  icf: number;
  courses: Record<string, number>;
  icfByFunction?: Record<string, number>;
  coursesByFunction?: Record<string, Record<string, number>>;
}

export interface EstandarOperacionalItem {
  anio: string;
  provincia: string;
  q: string;
  tipo: string;
  funcionPrincipal: string;
  cantidadCertificados: number;
  pasosTaller: string;
  cantidadPers: string;
  cantidadCertificadosReales: number;
  pasosTallerReal: number;
}

export interface CareerPlanItem {
  actividad: string;
  provincia: string;
  participante: string;
  fechaAlta: string;
  comienzo: string;
  fin: string;
  fechaLimite: string;
  planificadoEjecutado: string;
  valorPresencial: number;
  valorVirtual: number;
  personasCapacitadas: number;
  cargaHoraria: number;
  genero: string;
  estado: string;
  muestra: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface RelatorioItem {
  nombre: string;
  unidad: string;
  curso: string;
  claseFecha: string;
  claseHora: string;
  referenciaMeses: string;
  fechaRegistro: string;
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

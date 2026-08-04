import { useEffect, useState } from 'react';
import Papa from 'papaparse';

/**
 * La fuente puede reemplazarse en cada ambiente por una vista reducida para el
 * dashboard. El valor por defecto mantiene operativa la pestaña con la hoja
 * indicada, pero en producción se recomienda configurar VITE_NOMINA_CSV_URL
 * con una pestaña sin datos personales sensibles.
 */
const DEFAULT_NOMINA_CSV_URL = 'https://docs.google.com/spreadsheets/d/14v21bofu7z2oMfKsGQs2C-p6ZgVgvucqrom4zdobI3k/export?format=csv&gid=1617826475';

const configuredNominaCsvUrl = (import.meta as ImportMeta & { env?: { VITE_NOMINA_CSV_URL?: string } }).env?.VITE_NOMINA_CSV_URL;
export const NOMINA_CSV_URL = configuredNominaCsvUrl || DEFAULT_NOMINA_CSV_URL;

export const BUSINESS_UNITS = [
  { key: 'ceroKm', label: '0 km', aliases: ['0 KM %', '0KM %', '0 KM'] },
  { key: 'planes', label: 'Planes', aliases: ['PLANES %', 'PLANES'] },
  { key: 'usados', label: 'Usados', aliases: ['USADOS %', 'USADOS'] },
  { key: 'kinto', label: 'Kinto', aliases: ['KINTO %', 'KINTO'] },
  { key: 'repuestos', label: 'Repuestos', aliases: ['REPUESTOS %', 'REPUESTOS'] },
  { key: 'taller', label: 'Taller', aliases: ['TALLER %', 'TALLER'] },
  { key: 'euroSalta', label: 'Euro Salta', aliases: ['EURO SALTA %', 'EURO SALTA'] },
  { key: 'tallerMovil', label: 'Taller móvil', aliases: ['TALLER MOVIL %', 'TALLER MOVIL'] },
  { key: 'chapaPintura', label: 'Chapa y pintura', aliases: ['CHAPA Y PINTURA %', 'CHAPA Y PINTURA'] },
  { key: 'staff', label: 'Staff', aliases: ['STAFF'] }
] as const;

export type BusinessUnitKey = (typeof BUSINESS_UNITS)[number]['key'];

export interface NominaRecord {
  id: string;
  nombre: string;
  legajo: string;
  sexo: string;
  razonSocial: string;
  empresa: string;
  localidad: string;
  area: string;
  subArea: string;
  puesto: string;
  jerarquia: string;
  modalidadContrato: string;
  convenio: string;
  categoria: string;
  categoriaVariable: string;
  frecuenciaVariable: string;
  jefe: string;
  puestoJefe: string;
  fechaIngreso: Date | null;
  fechaEgreso: Date | null;
  fechaNacimiento: Date | null;
  generacion: string;
  estado: string;
  motivoEgreso: string;
  cobertura: string;
  contrato: string;
  asignaciones: Record<BusinessUnitKey, number>;
}

type RawRow = Record<string, string | undefined>;

const EMPTY_VALUES = new Set(['', '-', 'N/A', 'NA', 'NULL', 'SIN DATO', 'NO APLICA']);

export const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase();

export const cleanValue = (value?: string | null) => {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  return EMPTY_VALUES.has(normalizeText(clean)) ? '' : clean;
};

const getValue = (row: RawRow, aliases: string[]) => {
  const normalizedAliases = new Set(aliases.map(normalizeText));
  const key = Object.keys(row).find((header) => normalizedAliases.has(normalizeText(header)));
  return key ? cleanValue(row[key]) : '';
};

export const parseNominaDate = (value?: string | null): Date | null => {
  const clean = cleanValue(value);
  if (!clean) return null;

  const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  let year = Number.parseInt(match[3], 10);
  if (year < 100) year += 2000;

  const date = new Date(year, month, day);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

/** Normaliza 50%, 0.5, 1 y 100 a una fracción FTE entre 0 y 1. */
export const parseAllocation = (value?: string | null) => {
  const clean = cleanValue(value);
  if (!clean) return 0;

  const hasPercent = clean.includes('%');
  const compact = clean.replace(/%/g, '').replace(/\s/g, '');
  const numberText = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  const parsed = Number.parseFloat(numberText);
  if (!Number.isFinite(parsed)) return 0;

  const fraction = hasPercent || parsed > 1 ? parsed / 100 : parsed;
  return Math.min(Math.max(fraction, 0), 1);
};

const normalizeEstado = (value: string) => {
  const normalized = normalizeText(value);
  if (normalized === 'ACTIVO') return 'Activo';
  if (normalized === 'INACTIVO') return 'Inactivo';
  return cleanValue(value);
};

const createRecord = (row: RawRow, index: number): NominaRecord => {
  const asignaciones = BUSINESS_UNITS.reduce((acc, unit) => {
    acc[unit.key] = parseAllocation(getValue(row, [...unit.aliases]));
    return acc;
  }, {} as Record<BusinessUnitKey, number>);

  return {
    id: getValue(row, ['ID']) || `fila-${index + 2}`,
    nombre: getValue(row, ['APELLIDO Y NOMBRE', 'NOMBRE COMPLETO', 'NOMBRE']),
    legajo: getValue(row, ['N DE LEGAJO', 'N° DE LEGAJO', 'NUMERO DE LEGAJO', 'LEGAJO']),
    sexo: getValue(row, ['SEXO']),
    razonSocial: getValue(row, ['RAZON SOCIAL', 'RAZÓN SOCIAL']),
    empresa: getValue(row, ['EMPRESA']),
    localidad: getValue(row, ['LOCALIDAD', 'SUCURSAL']),
    area: getValue(row, ['AREA', 'ÁREA']),
    subArea: getValue(row, ['SUB AREA', 'SUBÁREA', 'SUBAREA', 'SECTOR']),
    puesto: getValue(row, ['PUESTO', 'FUNCION', 'FUNCIÓN']),
    jerarquia: getValue(row, ['JERARQUIA', 'JERARQUÍA']),
    modalidadContrato: getValue(row, ['MODALIDAD DE CONTRATO', 'MODALIDAD CONTRATO']),
    convenio: getValue(row, ['CONVENIO']),
    categoria: getValue(row, ['CATEGORIA', 'CATEGORÍA']),
    categoriaVariable: getValue(row, ['CATEGORIA DE VARIABLE', 'CATEGORÍA DE VARIABLE']),
    frecuenciaVariable: getValue(row, ['FRECUENCIA VARIABLE']),
    jefe: getValue(row, ['JEFE', 'RESPONSABLE']),
    puestoJefe: getValue(row, ['PUESTO DEL JEFE', 'CARGO DEL JEFE']),
    fechaIngreso: parseNominaDate(getValue(row, ['FECHA DE INGRESO', 'FECHA INGRESO'])),
    fechaEgreso: parseNominaDate(getValue(row, ['FECHA DE EGRESO', 'FECHA EGRESO', 'FECHA BAJA'])),
    fechaNacimiento: parseNominaDate(getValue(row, ['FECHA DE NACIMIENTO', 'FECHA NACIMIENTO'])),
    generacion: getValue(row, ['GENERACION', 'GENERACIÓN']),
    estado: normalizeEstado(getValue(row, ['ESTADO'])),
    motivoEgreso: getValue(row, ['MOTIVO DE EGRESO', 'MOTIVO EGRESO', 'MOTIVO DE BAJA']),
    cobertura: getValue(row, ['COBERTURA']),
    contrato: getValue(row, ['CONTRATO']),
    asignaciones
  };
};

export const parseNominaCsv = (csv: string): NominaRecord[] => {
  const parsed = Papa.parse<RawRow>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim()
  });

  const records = parsed.data
    .map(createRecord)
    .filter((record) => Boolean(record.nombre || record.id));

  if (!records.length || !records.some((record) => record.nombre)) {
    throw new Error('La fuente de nómina no contiene las columnas requeridas (ID y APELLIDO Y NOMBRE).');
  }

  return records;
};

export function useNominaData(url = NOMINA_CSV_URL) {
  const [data, setData] = useState<NominaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`La hoja respondió ${response.status}.`);
        }

        const csv = await response.text();
        const records = parseNominaCsv(csv);

        if (!cancelled) {
          setData(records);
          setUpdatedAt(new Date());
        }
      } catch (cause) {
        console.error('Error cargando nómina:', cause);
        if (!cancelled) {
          setData([]);
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar la nómina.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error, updatedAt };
}

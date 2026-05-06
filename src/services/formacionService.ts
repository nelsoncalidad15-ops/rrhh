import { useState, useEffect } from 'react';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=208474053&single=true&output=csv';
const HISTORICO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=86835321&single=true&output=csv';

export interface CourseRecord {
  colaborador: string;
  unidad: string;
  area: string;
  funcion: string;
  icf: number;
  rutaAprendizaje: string;
  score: number | null;
  estado: string;
  fase: string;
}

export interface ColaboradorRecord {
  colaborador: string;
  unidad: string;
  area: string;
  funcion: string;
  icf: number;
}

export interface FormacionHistorico {
  provincia: string;
  mes: string;
  ano: string;
  puesto: number;
  indiceCualificacion: number;
  mediaPais: number;
  indiceAreaServicioRepuesto: number;
  indiceAreaTecnica: number;
  indiceAreaVentas: number;
}

export function useFormacionData() {
  const [data, setData] = useState<CourseRecord[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorRecord[]>([]);
  const [historico, setHistorico] = useState<FormacionHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        
        // Basic CSV parser that handles quotes
        const parseCSVRow = (row: string) => {
          const result = [];
          let insideQuotes = false;
          let currentEntry = '';
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              result.push(currentEntry);
              currentEntry = '';
            } else {
              currentEntry += char;
            }
          }
          result.push(currentEntry);
          return result;
        };

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        const headerRowIndex = lines.findIndex(l => l.includes('nm_curso'));
        const courseNamesRow = headerRowIndex >= 0 ? parseCSVRow(lines[headerRowIndex]) : [];
        const courseNames = courseNamesRow.slice(6); // first 6 are empty or other things
        
        const records: CourseRecord[] = [];
        const colabMap = new Map<string, ColaboradorRecord>();

        const dataStartIndex = lines.findIndex(l => l.startsWith('Unidad,Colaborador')) + 1;
        
        for (let i = dataStartIndex; i < lines.length; i++) {
          const row = parseCSVRow(lines[i]);
          if (row.length < 6) continue;
          
          const unidad = row[0] || '';
          const colaborador = row[1] || '';
          const area = row[2] || '';
          const funcion = row[3] || '';
          // row[4] is categoria
          const rawIcf = row[5] || '0';
          const icf = parseFloat(rawIcf.replace(',', '.')) || 0;

          if (colaborador) {
            const compositeKey = `${colaborador}|${funcion}`;
            colabMap.set(compositeKey, { colaborador, unidad, area, funcion, icf });
          }

          // Read course scores
          for (let j = 6; j < row.length; j++) {
            const courseName = courseNames[j - 6];
            if (!courseName) continue;
            
            const rawScore = row[j];
            let score: number | null = null;
            let estado = 'Pendiente';
            let fase = '';

            if (rawScore && rawScore.trim() !== '') {
              score = parseFloat(rawScore.replace(',', '.'));
              if (!isNaN(score)) {
                estado = score >= 70 ? 'Aprobado' : 'Desaprobado';
              } else {
                score = null;
              }
            } else {
              // Skip courses without any data to reduce noise
              continue;
            }

            if (courseName.toLowerCase().includes('certificaci')) {
              fase = 'Certificación';
            }

            records.push({
              colaborador,
              unidad,
              area,
              funcion,
              icf,
              rutaAprendizaje: courseName,
              score,
              estado,
              fase
            });
          }
        }

        // Fetch Historico
        const histResponse = await fetch(HISTORICO_CSV_URL);
        const histText = await histResponse.text();
        const histLines = histText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        const historicoData: FormacionHistorico[] = [];
        const monthNames: Record<string, string> = {
          '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril',
          '05': 'mayo', '06': 'junio', '07': 'julio', '08': 'agosto',
          '09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre'
        };

        const parsePercent = (val: string) => parseFloat(val.replace('%', '').replace(',', '.')) || 0;

        for (let i = 1; i < histLines.length; i++) {
          const row = parseCSVRow(histLines[i]);
          if (row.length < 8) continue;

          const provincia = row[0];
          const mesAno = row[1].split('-');
          let mes = '', ano = '';
          if (mesAno.length === 2) {
            mes = monthNames[mesAno[0]] || mesAno[0];
            ano = mesAno[1];
          }

          historicoData.push({
            provincia,
            mes,
            ano,
            puesto: parseInt(row[2]) || 0,
            indiceCualificacion: parsePercent(row[3]),
            mediaPais: parsePercent(row[4]),
            indiceAreaServicioRepuesto: parsePercent(row[5]),
            indiceAreaTecnica: parsePercent(row[6]),
            indiceAreaVentas: parsePercent(row[7]),
          });
        }

        setData(records);
        setColaboradores(Array.from(colabMap.values()));
        setHistorico(historicoData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Error loading data');
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, colaboradores, historico, loading, error };
}

import { useState, useEffect } from 'react';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=794966503&single=true&output=csv';

export interface EmpleadoRecord {
  id: string;
  nombre: string;
  localidad: string;
  dni: string;
  sexo: string;
  fechaNacimiento: Date | null;
  fechaIngreso: Date | null;
  cobertura: string;
  convenio: string;
  categoria: string;
  area: string;
  sector: string;
  puesto: string;
  estado: string; // "Activo" o "Inactivo"
  fechaNovedad: Date | null; // Baja
  motivoNovedad: string;
}

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // DD/MM/YYYY
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return null;
};

export const useRotacionData = () => {
  const [data, setData] = useState<EmpleadoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL);
        const text = await response.text();

        const parseCSVRow = (row: string) => {
          const result = [];
          let currentEntry = '';
          let insideQuotes = false;

          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              if (insideQuotes && row[i + 1] === '"') {
                currentEntry += '"';
                i++;
              } else {
                insideQuotes = !insideQuotes;
              }
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
        const records: EmpleadoRecord[] = [];

        // Assuming headers are on line 0. Data starts at line 1.
        for (let i = 1; i < lines.length; i++) {
          const row = parseCSVRow(lines[i]);
          if (row.length < 15) continue;

          const record: EmpleadoRecord = {
            id: row[0],
            nombre: row[1] || '',
            localidad: row[2] || '',
            dni: row[3] || '',
            sexo: row[4] || '',
            fechaNacimiento: parseDate(row[5]),
            fechaIngreso: parseDate(row[6]),
            cobertura: row[7] || '',
            convenio: row[8] || '',
            categoria: row[9] || '',
            area: row[10] || '',
            sector: row[11] || '',
            puesto: row[12] || '',
            estado: row[13] || '',
            fechaNovedad: parseDate(row[14]),
            motivoNovedad: row[15] || ''
          };
          
          if (record.nombre) {
            records.push(record);
          }
        }

        setData(records);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching rotacion data:", err);
        setError("No se pudo cargar la información de rotación.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

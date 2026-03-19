import Papa from 'papaparse';
import { CourseGrade, RelatorioItem, CollaboratorContact } from '../types';

const normalizeKey = (key: string) => {
  if (!key) return '';
  return key.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const getRowValue = (row: any, ...possibleKeys: string[]) => {
  const normalizedPossibleKeys = possibleKeys.map(normalizeKey);
  const keys = Object.keys(row);
  
  // Try exact match first
  for (const pKey of possibleKeys) {
    if (row[pKey] !== undefined) return row[pKey];
  }

  // Try normalized match
  const foundKey = keys.find(k => normalizedPossibleKeys.includes(normalizeKey(k)));
  if (foundKey) return row[foundKey];

  return undefined;
};

export const fetchHRGradesData = async (url: string): Promise<CourseGrade[]> => {
  try {
    const response = await fetch(url);
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const headers = results.meta.fields || [];
          
          // Metadata keys that should NOT be treated as courses
          const basicInfoKeys = [
            'ID', 'Colaborador', 'Unidad', 'Area', 'Funcion', 'ICF', 
            'Progreso ICF', 'Nombre', 'Sede', 'Departamento', 'Cargo', 
            'Puesto', 'Sector', 'Ubicacion', 'Empleado', 'Legajo', 'DNI',
            'Email', 'Correo', 'Estado', 'Ingreso', 'Antiguedad'
          ];
          const normalizedBasicKeys = new Set(basicInfoKeys.map(normalizeKey));

          const collaboratorMap = new Map<string, CourseGrade>();

          data.forEach((row, index) => {
            const getVal = (possibleKeys: string[], index: number) => {
              const val = getRowValue(row, ...possibleKeys);
              if (val !== undefined && val !== null && String(val).trim() !== '') return val;
              if (headers.length > index) return row[headers[index]];
              return undefined;
            };

            const name = getVal(['Colaborador', 'Nombre', 'Empleado'], 1) || 'Sin Nombre';
            
            // Filter out header row or non-collaborator rows
            if (name.toLowerCase().includes('colaborador') || name === 'C' || name.trim() === '') return;

            const unit = getVal(['Unidad', 'Sede', 'Ubicacion'], 2) || 'Sin Unidad';
            const func = getVal(['Funcion', 'Cargo', 'Puesto'], 3) || 'Sin Funcion';
            const area = getVal(['Area', 'Departamento', 'Sector'], 4) || 'Sin Area';
            const icf = parseFloat(String(getVal(['ICF', 'Progreso ICF', 'Indice'], 5) || '0').replace('%', '').replace(',', '.')) || 0;
            const id = getVal(['ID', 'Legajo'], 0) || `collab-${index}`;

            const courses: Record<string, number> = {};
            Object.keys(row).forEach(key => {
              const normKey = normalizeKey(key);
              if (!normalizedBasicKeys.has(normKey) && key.trim() !== '') {
                const rawVal = String(row[key] || '');
                const val = parseFloat(rawVal.replace('%', '').replace(',', '.').trim());
                courses[key] = isNaN(val) ? -1 : val;
              }
            });

            if (collaboratorMap.has(name)) {
              const existing = collaboratorMap.get(name)!;
              // Add unique values
              if (!existing.unidad.split(' | ').includes(unit)) existing.unidad += ` | ${unit}`;
              if (!existing.area.split(' | ').includes(area)) existing.area += ` | ${area}`;
              if (!existing.funcion.split(' | ').includes(func)) existing.funcion += ` | ${func}`;
              
              // Subdivide ICF by function
              if (!existing.icfByFunction) existing.icfByFunction = {};
              existing.icfByFunction[func] = Math.max(existing.icfByFunction[func] || 0, icf);
              
              // Subdivide courses by function
              if (!existing.coursesByFunction) existing.coursesByFunction = {};
              if (!existing.coursesByFunction[func]) existing.coursesByFunction[func] = {};
              
              // Merge courses (take highest score)
              Object.entries(courses).forEach(([cName, score]) => {
                // Filter out invalid course names (like _3, _4, or just numbers)
                if (cName.startsWith('_') || /^\d+$/.test(cName.trim())) return;
                
                if (score !== -1) {
                  existing.courses[cName] = Math.max(existing.courses[cName] || 0, score);
                  existing.coursesByFunction![func][cName] = Math.max(existing.coursesByFunction![func][cName] || 0, score);
                }
              });
              // Update ICF (take average or max)
              existing.icf = Math.max(existing.icf, icf);
            } else {
              // Filter out invalid courses for the new entry
              const filteredCourses: Record<string, number> = {};
              Object.entries(courses).forEach(([cName, score]) => {
                if (!cName.startsWith('_') && !/^\d+$/.test(cName.trim())) {
                  filteredCourses[cName] = score;
                }
              });

              collaboratorMap.set(name, {
                id: `${id}-${name}`,
                colaborador: name,
                unidad: unit,
                area: area,
                funcion: func,
                icf: icf,
                courses: filteredCourses,
                icfByFunction: { [func]: icf },
                coursesByFunction: { [func]: filteredCourses }
              });
            }
          });

          const grades = Array.from(collaboratorMap.values());
          resolve(grades);
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error("Error fetching grades data:", error);
    throw error;
  }
};

export const fetchHRContactsData = async (url: string): Promise<CollaboratorContact[]> => {
  try {
    const response = await fetch(url);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false, // User said column A is name, B is phone
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          const contacts: CollaboratorContact[] = data
            .filter(row => row.length >= 2 && row[0] && row[1])
            .map((row) => ({
              nombre: row[0].trim(),
              telefono: row[1].trim()
            }));
          resolve(contacts);
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error("Error fetching contacts data:", error);
    throw error;
  }
};

export const fetchHRRelatorioData = async (url: string): Promise<RelatorioItem[]> => {
  try {
    const response = await fetch(url);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length === 0) {
            resolve([]);
            return;
          }

          // Detect if first row is header
          const firstRow = rows[0];
          const isHeader = firstRow.some(cell => 
            ['nombre', 'colaborador', 'curso', 'fecha', 'clase', 'referencia'].some(h => 
              normalizeKey(cell).includes(h)
            )
          );
          
          const startIdx = isHeader ? 1 : 0;
          const dataRows = rows.slice(startIdx);

          const relatorio: RelatorioItem[] = dataRows
            .filter(row => row.length >= 1) // Be more lenient with row length
            .map((row) => {
              const colC = row[2] || '';
              
              // If Column C has the pipe format, use it to extract data
              // Example: Mayo 2026 | Comunicación y Feedback Profesional | 8 de Mayo | 08 de mayo | 13.30 a 17.30hs
              if (colC.includes('|')) {
                const parts = colC.split('|').map(p => p.trim());
                return {
                  referenciaMeses: parts[0] || row[0] || '',
                  curso: parts[1] || row[1] || '',
                  claseFecha: parts[2] || parts[3] || colC,
                  claseHora: parts[4] || '',
                  nombre: row[0] || 'Sin Nombre',
                  unidad: row[1] || 'Sin Unidad',
                  fechaRegistro: row[3] || row[4] || ''
                };
              }

              // Fallback to standard mapping if no pipe format detected
              return {
                referenciaMeses: row[0] || '',
                curso: row[1] || '',
                claseFecha: row[2] || '',
                claseHora: row[4] || row[3] || '',
                nombre: row[5] || row[0] || 'Sin Nombre',
                unidad: row[6] || row[1] || 'Sin Unidad',
                fechaRegistro: row[7] || ''
              };
            });
          resolve(relatorio);
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error("Error fetching relatorio data:", error);
    throw error;
  }
};

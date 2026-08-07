import Papa from 'papaparse';
import { CourseGrade, RelatorioItem, CollaboratorContact, CoursePhase, CareerPlanItem } from '../types';

export const normalizeKey = (key: string) => {
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
            'Email', 'Correo', 'Estado', 'Ingreso', 'Antiguedad', 'nm_curso',
            'nm_unidad', 'nm_area', 'nm_funcion', 'nm_cargo', 'nm_puesto'
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
            if (name.toLowerCase().includes('colaborador') || name === 'C' || name.trim() === '' || name === 'Nombre') return;

            const rawUnit = getVal(['Unidad', 'Sede', 'Ubicacion'], 0) || 'Sin Unidad';
            let unit = rawUnit;
            if (rawUnit.includes('3059')) unit = 'Jujuy';
            else if (rawUnit.includes('3087')) unit = 'Salta';

            const area = getVal(['Area', 'Departamento', 'Sector'], 2) || 'Sin Area';
            const func = getVal(['Funcion', 'Cargo', 'Puesto'], 3) || 'Sin Funcion';
            const icf = parseFloat(String(getVal(['ICF', 'Progreso ICF', 'Indice'], 5) || '0').replace('%', '').replace(',', '.')) || 0;
            const id = getVal(['ID', 'Legajo'], 0) || `collab-${index}`;

            const rowCourses: Record<string, number> = {};
            headers.forEach((key, colIdx) => {
              // User specified courses start at column G (index 6). 
              // If G is 'nm_curso', we start at index 7 (Column H) to be safe.
              if (colIdx < 7) return;
              
              const normKey = normalizeKey(key);
              if (!normalizedBasicKeys.has(normKey) && key.trim() !== '') {
                const rawVal = String(row[key] || '').trim();
                // Skip empty cells - this is crucial to isolate courses by function
                if (rawVal === '' || rawVal === '-' || rawVal.toLowerCase() === 'n/a') return; 
                
                const val = parseFloat(rawVal.replace('%', '').replace(',', '.').trim());
                if (!isNaN(val)) {
                  rowCourses[key] = val;
                }
              }
            });

            // Filter out invalid courses (additional safety)
            const filteredCourses: Record<string, number> = {};
            Object.entries(rowCourses).forEach(([cName, score]) => {
              if (!cName.startsWith('_') && !/^\d+$/.test(cName.trim())) {
                filteredCourses[cName] = score;
              }
            });

            if (collaboratorMap.has(name)) {
              const existing = collaboratorMap.get(name)!;
              // Concatenate unique values
              if (!existing.unidad.split(' | ').includes(unit)) existing.unidad += ` | ${unit}`;
              if (!existing.area.split(' | ').includes(area)) existing.area += ` | ${area}`;
              if (!existing.funcion.split(' | ').includes(func)) existing.funcion += ` | ${func}`;
              
              // Update ICF for this specific function
              if (!existing.icfByFunction) existing.icfByFunction = {};
              existing.icfByFunction[func] = Math.max(existing.icfByFunction[func] || 0, icf);
              
              // Update courses for this specific function
              if (!existing.coursesByFunction) existing.coursesByFunction = {};
              if (!existing.coursesByFunction[func]) existing.coursesByFunction[func] = {};
              
              Object.entries(filteredCourses).forEach(([cName, score]) => {
                // Add to global courses and function-specific bucket
                existing.courses[cName] = Math.max(existing.courses[cName] || 0, score);
                existing.coursesByFunction![func][cName] = Math.max(existing.coursesByFunction![func][cName] || 0, score);
              });
              
              // Recalculate overall ICF as average of function ICFs
              const functionValues = Object.values(existing.icfByFunction) as number[];
              existing.icf = Math.round(functionValues.reduce((a, b) => a + b, 0) / functionValues.length);
            } else {
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
              // Example 1: Mayo 2026 | Comunicación y Feedback Profesional | 8 de Mayo | 08 de mayo | 13.30 a 17.30hs
              // Example 2: Mayo 2026 | Trabajo en Equipo (Gerentes de Ventas y Postventa) |19 de mayo | 13.30 a 17.30hs
              if (colC.includes('|')) {
                const parts = colC.split('|').map(p => p.trim()).filter(p => p !== '');
                
                let curso = parts[1] || row[1] || '';
                let fecha = '';
                let hora = '';
                
                if (parts.length >= 4) {
                  // Last part is likely time if it contains 'hs' or ':'
                  const lastPart = parts[parts.length - 1];
                  if (lastPart.toLowerCase().includes('hs') || lastPart.includes(':') || /\d+[\.:]\d+/.test(lastPart)) {
                    hora = lastPart;
                    fecha = parts[parts.length - 2];
                  } else {
                    fecha = lastPart;
                  }
                } else if (parts.length === 3) {
                  fecha = parts[2];
                }

                const rawUnit = row[4] || 'Sin Unidad';
                let unit = rawUnit;
                if (rawUnit.includes('3059')) unit = 'Jujuy';
                else if (rawUnit.includes('3087')) unit = 'Salta';

                return {
                  referenciaMeses: parts[0] || row[0] || '',
                  curso: curso,
                  claseFecha: fecha || colC,
                  claseHora: hora,
                  nombre: row[3] || 'Sin Nombre',
                  unidad: unit,
                  area: 'Sin Area',
                  fechaRegistro: row[5] || '',
                  linkCurso: row[8] || ''
                };
              }

              // Fallback to standard mapping if no pipe format detected
              const rawUnitFallback = row[4] || row[1] || 'Sin Unidad';
              let unitFallback = rawUnitFallback;
              if (rawUnitFallback.includes('3059')) unitFallback = 'Jujuy';
              else if (rawUnitFallback.includes('3087')) unitFallback = 'Salta';

              return {
                referenciaMeses: row[0] || '',
                curso: row[1] || '',
                claseFecha: row[2] || '',
                claseHora: row[4] || row[3] || '',
                nombre: row[3] || row[0] || 'Sin Nombre',
                unidad: unitFallback,
                area: 'Sin Area',
                fechaRegistro: row[5] || '',
                linkCurso: row[8] || ''
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

export const fetchCoursePhasesData = async (url: string): Promise<CoursePhase[]> => {
  try {
    const response = await fetch(url);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length < 2) {
            resolve([]);
            return;
          }

          // The user specified: Col A (0) = Curso, Col B (1) = Fase, Col C (2) = Modalidad
          // We'll skip the first row assuming it's a header
          const phases: CoursePhase[] = rows.slice(1)
            .filter(row => row[0]) // Must have a course name
            .map(row => ({
              curso: (row[0] || '').trim(),
              fase: (row[1] || 'Otros').trim() || 'Otros',
              modalidad: (row[2] || 'Sin Modalidad').trim() || 'Sin Modalidad'
            }));
          resolve(phases);
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error("Error fetching course phases data:", error);
    throw error;
  }
};

const parseAmount = (value: unknown) => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  return Number.parseFloat(normalized) || 0;
};

export const fetchCareerPlanData = async (url: string): Promise<CareerPlanItem[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo acceder a la hoja de Plan de carrera.');
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, unknown>[];
          const items = rows
            .map(row => ({
              actividad: String(getRowValue(row, 'Actividad') ?? '').trim(),
              provincia: String(getRowValue(row, 'Provincia') ?? '').trim(),
              participante: String(getRowValue(row, 'Participantes', 'Participante', 'Colaborador') ?? '').trim(),
              fechaAlta: String(getRowValue(row, 'Fecha alta en funcion', 'Fecha alta en función', 'Fecha de alta') ?? '').trim(),
              comienzo: String(getRowValue(row, 'Comienzo') ?? '').trim(),
              fin: String(getRowValue(row, 'Fin') ?? '').trim(),
              fechaLimite: String(getRowValue(row, 'Fecha limite', 'Fecha límite') ?? '').trim(),
              planificadoEjecutado: String(getRowValue(row, 'Planeado/Ejecutado', 'Planificado/Ejecutado') ?? '').trim(),
              valorPresencial: parseAmount(getRowValue(row, 'Valor Presencial')),
              valorVirtual: parseAmount(getRowValue(row, 'Valor Virtual')),
              personasCapacitadas: parseAmount(getRowValue(row, 'Personas Capacitadas')),
              cargaHoraria: parseAmount(getRowValue(row, 'Carga horaria')),
              genero: String(getRowValue(row, 'Genero', 'Género') ?? '').trim(),
              estado: String(getRowValue(row, 'Estado') ?? '').trim()
            }))
            .filter(item => item.actividad || item.participante);
          resolve(items);
        },
        error: error => reject(error)
      });
    });
  } catch (error) {
    console.error('Error fetching career plan data:', error);
    throw error;
  }
};
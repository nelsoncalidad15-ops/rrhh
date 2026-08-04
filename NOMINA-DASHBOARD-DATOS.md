# Modelo de datos para Dotación

La pestaña **Dotación** usa una nómina individual y calcula los indicadores a una fecha de corte. No mezcla esta fuente con el módulo **Estándar Op.**, que trabaja con cantidades agregadas por puesto y reglas de marca.

## Fuente operativa actual

La app entiende el export CSV de una fila por vínculo laboral. Lee por encabezado, no por posición; por eso tolera columnas visuales vacías y el orden actual de la hoja.

Campos usados:

- `ID` (clave única de la persona/vínculo)
- `APELLIDO Y NOMBRE`, `N DE LEGAJO`, `SEXO`
- `RAZON SOCIAL`, `EMPRESA`, `LOCALIDAD`, `AREA`, `SUB AREA`, `PUESTO`, `JERARQUIA`
- `MODALIDAD DE CONTRATO`, `CONVENIO`, `CATEGORIA`
- `JEFE`, `FECHA DE INGRESO`, `FECHA DE EGRESO`, `ESTADO`, `MOTIVO DE EGRESO`, `COBERTURA`
- `FECHA DE NACIMIENTO`, `GENERACION`
- Asignaciones: `0 KM %`, `PLANES %`, `USADOS %`, `KINTO %`, `REPUESTOS %`, `TALLER %`, `EURO SALTA %`, `TALLER MOVIL %`, `CHAPA Y PINTURA %`, `STAFF`

El dashboard no muestra correo, teléfono, estado civil, hijos, profesión ni observaciones.

## Estructura recomendada para mantenerla bien

La hoja actual puede funcionar como carga operativa, pero para una base sostenible conviene separar los datos en estas entidades:

| Entidad | Clave | Finalidad |
| --- | --- | --- |
| `DIM_PERSONA` | `persona_id` | Legajo, sexo y fecha de nacimiento. Los datos de contacto quedan restringidos. |
| `FACT_VINCULO` | `vinculo_id` | Alta, baja, estado, entidad legal, localidad, área, puesto, jerarquía, jefe, convenio y cobertura. |
| `FACT_ASIGNACION_UNIDAD` | `vinculo_id + fecha_desde + unidad_negocio` | Porcentaje/FTE de cada unidad de negocio. |
| `FACT_SNAPSHOT_DOTACION` | `fecha_corte + vinculo_id` | Foto mensual para histórico exacto de estructura y movimientos. |
| `DIM_CALENDARIO` | `fecha` | Año, mes, trimestre y fecha de corte. |

La relación de jefe debe evolucionar de un nombre libre a `jefe_vinculo_id` para que el span de control sea confiable.

## Regla de asignación/FTE

Cada asignación debe tener un valor decimal entre `0` y `1`:

- `0.50` = 50 %
- `1.00` = dedicación total

Evitar mezclar `50%`, `0.5`, `1` y `100%` en la carga. La app normaliza los formatos actuales para no interrumpir el dashboard, pero el origen debe usar un único formato. Una persona se cuenta una sola vez en **dotación (HC)**; la suma de sus porcentajes compone **FTE**.

## Snapshot mensual indispensable

Ingreso y egreso permiten reconstruir altas, bajas y una evolución estimada. Para una evolución histórica exacta deben guardarse snapshots mensuales o vigencias (`fecha_desde` / `fecha_hasta`) cuando cambian área, puesto, localidad, jefe o asignación.

## Publicación segura

La aplicación es estática: si consume un CSV público, el navegador descarga todas sus columnas aunque no se muestren. Para producción publicar una vista `NOMINA_DASHBOARD` sin mails, teléfonos, fecha de nacimiento completa, estado civil, hijos ni observaciones; o bien usar un endpoint autenticado.

Configurar la URL de esa vista reducida con:

```text
VITE_NOMINA_CSV_URL=https://.../export?format=csv&gid=...
```

## Campo pendiente: tipo de nómina

La nueva fuente no incluye `TIPO_NOMINA`; por eso el filtro anterior Concesionario/VW fue reemplazado por Razón social. Si ese corte es necesario, agregar `TIPO_NOMINA` con valores controlados y mantenerlo en `FACT_VINCULO`.

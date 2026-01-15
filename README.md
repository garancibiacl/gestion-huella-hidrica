 # Plataforma Hub: Gestión Ambiental y Gestión de Seguridad

 Aplicación web **hub** para Prevención de Riesgos y sostenibilidad, diseñada para centralizar la operación HSE. Unifica **Gestión Ambiental** (agua, energía, petróleo) y **Gestión de Seguridad (PLS)** en un solo entorno con módulos estandarizados, KPIs y flujos de sincronización.

 ## Resumen ejecutivo

 La plataforma concentra datos operativos desde **Google Sheets** y los organiza en módulos con dashboards, reportes y tableros de seguimiento. El hub permite navegar entre **Gestión Ambiental** y **Gestión de Seguridad**, manteniendo una experiencia consistente, roles claros y métricas comparables por centro, faena y período.

 ## ¿Dónde apunta?

 - **Operación HSE centralizada** para equipos de prevención y gestión.
 - **Decisiones basadas en datos** con KPIs, tendencias y alertas.
 - **Estandarización de módulos** para escalar a nuevos centros y organizaciones.

 ## Objetivo

 - **Gestión Ambiental:** visibilidad y control de consumos, costos y huella asociada (agua, energía, petróleo), con trazabilidad por centro/faena/medidor.
 - **Gestión de Seguridad (PLS):** planificación semanal, seguimiento de cumplimiento y reportabilidad de actividades preventivas.

 ## Módulos estandarizados

 - **Gestión Ambiental**
   - **Agua** (`/dashboard/agua`)
   - **Energía Eléctrica** (`/dashboard/energia`)
   - **Petróleo** (`/dashboard/petroleo`)
   - **Períodos** (`/periodos`)
   - **Medidas Sustentables** (`/medidas`)
   - **Capa predictiva / riesgos** (`/admin/riesgos`)
 - **Gestión de Seguridad (PLS)**
   - **Mis actividades** (`/pls/my-activities`)
   - **Dashboard PLS** (`/pls/dashboard`)
   - **Planificación semanal PLS** (`/admin/pls/upload`)
   - **Reporte de Peligro** (`/admin/pls/hazard-report`)
   - **Estado de cumplimiento** (`/admin/pls/board`)
   - **Desempeño del PLS** (`/pls/performance`)
   - **Reportabilidad** (`/pls/reports`)

 ## Rutas clave del hub

 - **Hub principal**: `/hub`
 - **Hub alternativo (UX nuevo)**: `/hub_new`
 - **Autenticación**: `/auth`

 ## Funcionalidades principales

 ### Gestión Ambiental

 - KPIs (totales, costo, distribución por formato, litros totales, etc.).
 - Gráficos (Recharts) y tablas/segmentación por centro/período/faena.
 - Filtros:
   - Período
   - Centro de trabajo
   - Faena
   - Formato (botellas/bidones)

 ### Energía Eléctrica

 - KPIs (consumo y costo) y visualización por centro/medidor/período.
 - Filtros:
   - Período
   - Centro de trabajo
   - Medidor

 ### Gestión de Seguridad (PLS)

 - Planificación semanal con sincronización desde Google Sheets.
 - Gestión de tareas: creación, edición, estados y evidencias.
 - Tablero de cumplimiento y reportabilidad.

 ### Sincronización (Google Sheets → Supabase)

 - Sincronización iniciada por el usuario desde la UI.
 - Estrategia de cache:
   - Se guarda `last_*_hash` y `last_*_sync` en `localStorage`.
   - Si el contenido del CSV no cambió (hash), puede reportar “0 registros insertados”.
 - Se recomienda mantener la estructura de columnas estable para evitar errores de parsing.

 ## Stack tecnológico

 ### Frontend

 - **React** + **TypeScript**
 - **Vite**
 - **TailwindCSS**
 - **shadcn/ui** (componentes UI)
 - **Recharts** (gráficos)
 - **Framer Motion** (animaciones)

 ### Backend

 - **Supabase**
   - Postgres
   - Auth
   - RLS (Row-Level Security)
   - Edge Functions (opcional, según configuración del entorno)

 ### Fuente de datos

 - **Google Sheets** exportado como **CSV**.

 ## Arquitectura (alto nivel)

 - **Separación por módulos** (Ambiental / Seguridad) con rutas dedicadas.
 - **Hooks de dominio** para encapsular lógica:
   - `useWaterSync` (sincronización módulo Agua)
   - `useElectricSync` (sincronización módulo Energía)
 - **Componentes presentacionales** (UI/gráficos) separados de lógica de sync y acceso a datos.
 - **Multi-tenant por `organization_id`** (si aplica):
   - Los registros se guardan asociados a una organización.
   - RLS restringe visibilidad/modificación según usuario/rol/organización.

 ## Roles y permisos

 - **admin**: acceso completo, incluyendo sincronización.
 - **prevencionista**: acceso a sincronización y visualización (según reglas de negocio).

 > Nota: Los permisos finos dependen de las políticas RLS y la configuración del proyecto.

 ## Requisitos

 - Node.js (recomendado via nvm)
 - Cuenta y proyecto en Supabase

 ## Configuración (variables de entorno)

 Crea un archivo `.env` (o `.env.local`) con:

 ```bash
 VITE_SUPABASE_URL=<TU_SUPABASE_URL>
 VITE_SUPABASE_ANON_KEY=<TU_SUPABASE_ANON_KEY>
 ```

 **No** commitear secretos.

 ## Desarrollo local

 ```bash
 npm install
 npm run dev
 ```

 ## Guía de sincronización (Google Sheets)

 ### Recomendaciones para preparar el Sheet

 - Mantener encabezados/columnas estables (no renombrar sin revisar parsing).
 - Asegurar consistencia en nombres de centros/medidores.
 - Fechas y números:
   - Preferir formatos consistentes (ej. fechas dd-mm-aaaa o `YYYY-MM`).
   - Respetar separadores decimales/miles (la app contempla formatos comunes).

 ### Permisos

 - Para que el frontend pueda obtener el CSV, el documento o pestaña debe permitir lectura:
   - “**Cualquier persona con el enlace → Ver**”
   - o el método de publicación equivalente.

 ### ¿Qué significa “0 registros insertados”?

 - Puede ser normal si **no hubo cambios** en el Google Sheet desde la última sincronización.
 - La aplicación compara el contenido del CSV usando un hash (cache) para evitar cargas repetidas.

 ## Troubleshooting: cuando los datos quedan “pegados” (no se actualizan)

 1. **Forzar sincronización desde el dashboard**
    - Clic en **Sincronizar** (Agua o Energía).
    - Esperar el spinner y el mensaje de resultado.
    - Si sale “0 registros insertados”, puede ser porque el sheet no cambió.

 2. **Hard refresh del navegador** (evita caché)
    - Windows/Linux: `Ctrl + F5`
    - Mac: `Cmd + Shift + R`

 3. **Cambiar de pestaña/módulo y volver**
    - Ejemplo: Agua → Energía → Agua.

 4. **Limpiar caché local (localStorage)**
    - En consola del navegador (F12 → Console):
      ```js
      localStorage.clear();
      location.reload();
      ```

 5. **Verificar permisos del Google Sheet**
    - Debe permitir lectura pública (o método equivalente).

 6. **Verificar que el `gid`/URL del CSV corresponde a la pestaña correcta**
    - Si se editó otra pestaña del documento, la app podría estar leyendo otra.

 ## Contribuir

 - Crear un branch por feature/fix.
 - Mantener cambios acotados y con responsabilidad única.
 - Validar estados límite: sin datos, muchos datos, errores de red.

 ## Licencia

 _Pendiente definir._

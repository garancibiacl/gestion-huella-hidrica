## Architecture / System Patterns

### 1. Clean Code & General Principles

- **[CC-01] Nombrado claro y semántico**  
  - Componentes, hooks y funciones en inglés, descriptivos (`HumanWaterConsumptionChart`, [useAutoSync](cci:1://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/hooks/useAutoSync.ts:394:0-455:1)), sin abreviaturas opacas.  
  - Props booleanas deben leerse como preguntas (`isLoading`, `isAdmin`, `hasError`).

- **[CC-02] Single Responsibility**  
  - Cada archivo debe tener una única responsabilidad clara:  
    - Componentes de UI puros (presentacionales) sin lógica de negocio.  
    - Hooks para lógica de estado/efectos.  
    - Módulos de servicios para acceso a datos (Supabase/API).
  - Extraer lógica compleja en funciones puras reutilizables.

- **[CC-03] Código declarativo y legible**  
  - Preferir `map/filter/reduce` sobre bucles mutables siempre que sea legible.  
  - Evitar anidación profunda de `if/else`; extraer a funciones o early-returns.

- **[CC-04] Tipado estricto (TypeScript)**  
  - No usar `any` salvo justificación explícita.  
  - Modelar tipos de dominio (p.ej. [WaterReading](cci:2://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/components/dashboard/MeterConsumption.tsx:30:0-33:1), `HumanWaterRecord`) y reutilizarlos en componentes y hooks.  
  - Las respuestas de APIs deben tener tipos explícitos, no `any` ni tipos inferidos implícitos.

- **[CC-05] Manejo de errores explícito**  
  - Todos los accesos a red / Supabase deben manejar error y mostrar feedback de usuario (`toast` o estado visual).  
  - No silenciar `catch`; log mínimo + mensaje amigable.

---

### 2. SPA React + TS: Estructura y Estado

- **[SPA-01] Componentes orientados a composición**  
  - Construir vistas a partir de componentes pequeños reutilizables ([StatCard](cci:1://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/components/ui/stat-card.tsx:23:0-103:1), [PageHeader](cci:1://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/components/ui/page-header.tsx:9:0-26:1), etc.).  
  - Evitar “God components” con demasiadas responsabilidades o > 300 líneas.

- **[SPA-02] Hooks personalizados para lógica de dominio**  
  - Lógica que se repite (fetch, sync, filtros, cálculo de agregados) debe ir en hooks ([useAutoSync](cci:1://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/hooks/useAutoSync.ts:394:0-455:1), `useHumanWaterData`, [useOrganization](cci:1://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/hooks/useOrganization.ts:9:0-49:1)).  
  - Hooks nunca deben tener side-effects globales no controlados (ej.: modificar `localStorage` fuera de efectos bien delimitados).

- **[SPA-03] React Router**  
  - Todas las pantallas deben ser componentes bajo `src/pages`.  
  - No hacer redirecciones “manuales” con `window.location`; usar `useNavigate`.  
  - Rutas protegidas deben basarse en el estado de auth/context, no en lógica imperativa en cada página.

- **[SPA-04] Context API para estado global**  
  - Usar `Context` solo para:  
    - Autenticación / perfil (`AuthContext`).  
    - Organización / tenant (`OrganizationContext`).  
    - Preferencias globales de UI (tema, idioma).  
  - No meter datos de listas voluminosas en Context; consumirlos por hooks / queries locales.

---

### 3. Patrones Funcionales & Datos

- **[FD-01] Funciones puras para transformaciones**  
  - Cálculo de métricas (totales, promedios, agregaciones por período/formato) en funciones puras sin efectos secundarios.  
  - Estas funciones deben estar testeadas y no depender de React.

- **[FD-02] Inmutabilidad por defecto**  
  - No mutar arrays/objetos recibidos por props; usar `map`, `spread` o utilidades inmutables.  
  - Evitar mutaciones compartidas sobre `localStorage` salvo en un único módulo de utilidades o hook de sync.

- **[FD-03] Capa de datos bien definida**  
  - Integraciones con Supabase/API en módulos dedicados (`integrations/supabase/...`) o hooks de datos.  
  - No llamar `supabase` directamente desde componentes de UI, salvo casos muy simples y controlados.

---

### 4. UI/UX, Responsive & Design System

- **[UI-01] Uso coherente de componentes de diseño**  
  - Utilizar el design system existente (`Button`, `Input`, `Tabs`, `Table`, etc.) antes de crear nuevos estilos ad hoc.  
  - Evitar estilos inline complejos; preferir utilidades de Tailwind y clases compartidas.

- **[UI-02] Responsive first**  
  - Todos los layouts deben comportarse correctamente en viewport móvil (mínimo 360px) y desktop.  
  - No introducir tablas o gráficos que sean ilegibles en móvil sin un plan de fallback (scroll horizontal, stacking, resumen).

- **[UI-03] Feedback claro de estado**  
  - Estados: `loading`, `empty`, `error`, `success` deben estar representados visualmente en todas las vistas de datos.  
  - Botones con acciones async deben mostrar spinner y deshabilitarse mientras se procesa.

---

### 5. Accesibilidad (a11y)

- **[A11Y-01] Navegación por teclado**  
  - Todos los elementos interactivos deben ser alcanzables por `Tab`.  
  - No usar `div` clicables sin `role`/`tabIndex`; preferir `button`/`a`.

- **[A11Y-02] Semántica y roles**  
  - Headers de página ([PageHeader](cci:1://file:///Users/imac/Desktop/Git/gestion-huella-hidrica/src/components/ui/page-header.tsx:9:0-26:1)) deben mapearse a jerarquía de `<h1>…h3>`.  
  - Formularios deben asociar `Label` con `Input` mediante `htmlFor`/`id`.

- **[A11Y-03] Contraste y estados de foco**  
  - Respetar niveles mínimos de contraste WCAG para texto e iconos críticos.  
  - Estados de `:focus` visibles en botones, links y controles de formulario.

- **[A11Y-04] Texto alternativo y descripciones**  
  - Iconos que transmiten información deben tener `aria-label` o texto visible adyacente.  
  - Gráficos críticos deben tener al menos un resumen textual (totales o tabla de apoyo).

---

### 6. QA & Testing

- **[QA-01] Validaciones en formularios**  
  - Validar en el cliente (Zod) y manejar errores del servidor.  
  - Mensajes de error deben ser específicos y en lenguaje del usuario.

- **[QA-02] Reglas de regresión visual y lógica**  
  - Cualquier cambio que afecte sincronización de datos, agregaciones o filtros debe revisarse contra:  
    - Valores de referencia conocidos (ej.: totales del Excel).  
    - Escenarios de login/logout, cambio de rol (admin/prevencionista) y recarga del navegador.

- **[QA-03] Estados límite**  
  - Probar siempre: sin datos, muchos datos, datos con valores extremos o nulos, y errores de red.

---

### 7. Agent Ownership & Review Criteria

Los siguientes agentes **deben usar estas reglas como checklist obligatorio** en cada revisión:

- **UI/UX Agent**  
  - Responsable de: `[UI-01..03]`, `[A11Y-03]`, parte visual de `[CC-01..03]`.  
  - Verifica diseño consistente, responsive, estados de carga/empty/error y legibilidad.

- **Data & Domain Agent**  
  - Responsable de: `[FD-01..03]`, integraciones Supabase/API, coherencia de métricas y sincronización.  
  - Asegura que los datos mostrados coinciden con las fuentes (p.ej. Excel/Google Sheets) y que la lógica es pura y testeable.

- **Accessibility Agent**  
  - Responsable de: `[A11Y-01..04]`.  
  - Revisa navegación por teclado, roles semánticos, contraste y descripciones alternativas.

- **QA & Testing Agent**  
  - Responsable de: `[QA-01..03]`, robustez general y no-regresiones.  
  - Exige escenarios de prueba claros y resultados esperados para cambios de negocio clave.

---

### 8. Mantenimiento, Calidad y Documentación

- **[MAINT-01] Evolución del repositorio y componentes**  
  - Mantener y extender el repositorio siguiendo las mejores prácticas de desarrollo mencionadas en este documento.  
  - Contribuir activamente a la evolución del sistema de diseño multimarca, reutilizando y mejorando componentes existentes antes de crear nuevos.

- **[CODE-01] Calidad de código**  
  - Implementar soluciones limpias, eficientes y fáciles de mantener.  
  - Seguir los estándares de código definidos en las reglas de *Architecture / System Patterns*.  
  - Mantener alineamiento con las guías de estilos UI/UX establecidas (tipografía, espaciados, uso de color, componentes de diseño).

- **[DOC-01] Documentación viva**  
  - Mantener actualizada la documentación del proyecto (README, guías de uso, decisiones técnicas clave).  
  - Documentar nuevos componentes, hooks y flujos relevantes cuando se introducen cambios de negocio o arquitectura.  
  - Asegurar que la documentación sea suficiente para que otro desarrollador pueda continuar el trabajo sin fricción.

> **Regla global:** Ningún cambio se considera “aprobado” si no pasa explícitamente por estos criterios de Architecture/System Patterns y por los agentes designados arriba.
# AI Prompts (Guardados y Recomendados)

Este documento reúne prompts reutilizables para trabajar con este repo. Están alineados con `AGENTS.md` y las reglas de arquitectura.

## Uso recomendado

- Indica el objetivo y el módulo afectado (agua/energía/petróleo/PLS).
- Explica estados de datos esperados (loading/empty/error/success).
- Pide validar criterios de `AGENTS.md` cuando corresponda.

## Prompts sugeridos

### 1) Implementar feature UI con datos

```
Implementa [feature] en [ruta/componente]. 
Requisitos: UI consistente con design system, responsive, estados loading/empty/error,
sin lógica de negocio en UI, usar hooks para data y funciones puras para agregados.
Incluye tipos TS explícitos y manejo de errores con feedback al usuario.
```

### 2) Refactor de lógica a hook

```
Extrae la lógica de [componente] a un hook llamado [useX].
Mantén el componente como presentacional.
Asegura tipos estrictos y evita side-effects fuera de useEffect.
```

### 3) Revisión de PR / cambios

```
Revisa estos cambios con foco en bugs, regresiones y tests faltantes.
Usa AGENTS.md como checklist: UI/UX, datos, a11y y QA.
Devuelve findings ordenados por severidad con referencias de archivo.
```

### 4) Ajustes de accesibilidad

```
Audita [componente/pantalla] para a11y.
Verifica navegación por teclado, roles semánticos, contraste y textos alternativos.
Propón cambios mínimos y consistentes con el design system.
```

### 5) Métricas y agregaciones

```
Define una función pura para calcular [métrica].
No dependas de React, usa inputs tipados y evita mutaciones.
Incluye casos límite (sin datos, valores nulos/extremos).
```

### 6) Diagnóstico de bug en datos

```
Investiga por qué [métrica] no coincide con el Excel/Sheets.
Traza el flujo: fuente -> transformación -> UI.
Identifica diferencias de filtros/períodos y sugiere fix con tests.

### 7) Para cuando no sinconicen los datos: 

Eliminar todos los datos de water_meter_readings de mi organización y forzar una sincronización limpia desde el Sheet..

Los datos de consumo de agua no están sincronizando correctamente. Necesito forzar una sincronización limpia desde Google Sheets.


### 8) Evita el “flash” del empty state en [ruta/componente]. 
Muestra skeleton mientras organizationId o la query estén loading/fetching, 
y recién después renderiza “No hay datos”.
```

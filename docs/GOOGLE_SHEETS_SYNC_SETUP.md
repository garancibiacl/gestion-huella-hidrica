# Configuración de Sincronización con Google Sheets

Esta guía explica cómo configurar la sincronización automática desde Google Sheets a la aplicación.

## Requisitos previos

- Acceso a la consola de Supabase del proyecto
- Acceso a Google Cloud Console
- Permisos de administrador en la aplicación

## Paso 1: Ejecutar la migración SQL

1. Accede a tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor**
3. Ejecuta el archivo de migración: `supabase/migrations/20250127_add_sync_infrastructure.sql`
4. Verifica que se crearon:
   - Constraints únicos en `water_readings` y `human_water_consumption`
   - Tabla `sync_runs`
   - Políticas RLS

## Paso 2: Configurar Google Sheets (Simplificado)

**No necesitas API Key ni Service Account** - la integración usa la URL pública de la hoja.

1. Abre tu Google Sheet
2. Haz clic en **Compartir** (botón verde superior derecha)
3. En "Acceso general", selecciona:
   - **Cualquier persona con el enlace** puede **Ver**
4. Copia el enlace compartido

Tu hoja ya está configurada correctamente:
```
https://docs.google.com/spreadsheets/d/1L78_TmjdE58596F9tqHFK7DTjovedFJI/edit?usp=sharing
```

**Importante**: La hoja debe tener permisos de "Ver" para cualquiera con el enlace. No necesita ser editable públicamente.

## Paso 3: Configurar la Google Sheet

1. Abre tu Google Sheet: `https://docs.google.com/spreadsheets/d/1L78_TmjdE58596F9tqHFK7DTjovedFJI`
2. Asegúrate de tener una hoja llamada **"Agua en Botella"** con las siguientes columnas:
   - **Fecha**: Fecha del registro (formato: DD/MM/YYYY)
   - **Mes**: Mes del periodo (formato: "Enero", "ene", "01/2025", etc.)
   - **Orden de Compra**: Número de orden (opcional)
   - **Centro de Trabajo**: Nombre del centro (requerido)
   - **Faena**: Nombre de la faena (opcional)
   - **Tipo**: "Botella" o "Bidón 20L"
   - **Proveedor**: Nombre del proveedor (opcional)
   - **Cantidad**: Número de unidades
   - **Litros**: Litros totales (opcional)
   - **Costo Total**: Costo en pesos chilenos (formato: $109.242)
   - **Observaciones**: Notas adicionales (opcional)

3. Configura permisos de la hoja:
   - **Con API Key**: La hoja debe ser pública (Anyone with the link can view)
   - **Con Service Account**: Comparte la hoja con el email de la service account

## Paso 4: Configurar variables de entorno en Supabase

**No se requieren variables de entorno adicionales** para Google Sheets.

La Edge Function usa directamente la URL pública de la hoja, por lo que no necesitas configurar API Keys ni credenciales de Service Account.

## Paso 5: Desplegar la Edge Function

Desde la raíz del proyecto, ejecuta:

```bash
# Login a Supabase (si no lo has hecho)
npx supabase login

# Link al proyecto
npx supabase link --project-ref tu-project-ref

# Deploy la función
npx supabase functions deploy sync-google-sheets
```

## Paso 6: Configurar variables de entorno en el frontend

En tu archivo `.env.local`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Uso

### Para usuarios administradores

1. Inicia sesión con una cuenta que tenga rol `admin`
2. Ve al Dashboard
3. Verás el botón **"Sincronizar ahora"** en la esquina superior derecha
4. Haz clic para sincronizar los datos desde Google Sheets
5. El dashboard se actualizará automáticamente al completar la sincronización

### Información mostrada

- **Estado de sincronización**: Loading, Success, Error
- **Última sincronización**: Tiempo transcurrido desde la última sync
- **Registros procesados**: Número de filas insertadas/actualizadas

## Solución de problemas

### Error: "Missing authorization header"
- Verifica que estés autenticado en la aplicación
- Cierra sesión y vuelve a iniciar sesión

### Error: "Forbidden: Admin role required"
- Tu usuario no tiene rol de administrador
- Contacta al administrador del sistema para que te asigne el rol

### Error: "Error fetching Google Sheet"
- Verifica que la hoja tenga permisos públicos de lectura
- Asegúrate de que el enlace compartido esté activo
- Verifica que el ID de la hoja (gid) sea correcto en la Edge Function

### Error: "Could not parse period"
- Revisa que la columna "Mes" tenga formato válido
- Formatos aceptados: "Enero 2025", "ene-25", "01/2025", "2025-01"

### Los datos no se actualizan en el dashboard
- Haz clic en el botón "Sincronizar ahora" nuevamente
- Verifica que no haya errores en la consola del navegador
- Prueba hacer un hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Mantenimiento

### Actualizar el ID de la Google Sheet

Si cambias de Google Sheet, actualiza el ID y gid en:
`supabase/functions/sync-google-sheets/index.ts`

```typescript
const spreadsheetId = 'NUEVO_ID_AQUI'; // ID del spreadsheet
const gid = 'NUEVO_GID_AQUI'; // ID de la hoja específica
```

Para obtener el `gid`:
1. Abre la hoja en Google Sheets
2. Mira la URL: `...#gid=680818774`
3. El número después de `gid=` es el que necesitas

Luego redeploya la función:
```bash
npx supabase functions deploy sync-google-sheets
```

### Ver logs de sincronización

1. En Supabase Dashboard, ve a **Database > Tables > sync_runs**
2. Filtra por tu `user_id`
3. Revisa la columna `errors` para ver detalles de errores

## Seguridad

- ✅ Solo usuarios con rol `admin` pueden ejecutar sincronizaciones
- ✅ RLS está habilitado en todas las tablas
- ✅ La hoja de Google solo tiene permisos de lectura pública
- ✅ No se exponen credenciales sensibles (usa URL pública)
- ✅ Los datos se insertan con el `user_id` del usuario autenticado
- ⚠️ **Importante**: No incluyas datos sensibles en la Google Sheet pública

## Importación manual (alternativa)

La sincronización con Google Sheets **no reemplaza** la importación manual de Excel. Ambas opciones coexisten:

- **Google Sheets**: Para actualizaciones frecuentes y automáticas
- **Excel manual**: Para cargas iniciales, correcciones puntuales o contingencia

Ambas escriben en las mismas tablas usando UPSERT para evitar duplicados.

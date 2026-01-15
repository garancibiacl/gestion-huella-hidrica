# HUB UX/UI Redesign - Plataforma JM

## 🎯 Objetivo del Rediseño

Transformar la vista post-login en una experiencia profesional, confiable y moderna que transmita:
- **Confianza institucional** - Sistema serio y estructurado
- **Claridad funcional** - Qué puedo hacer aquí de forma inmediata
- **Atracción visual** - Gradientes modernos, cards limpias, micro-interacciones
- **Accesibilidad real** - Navegación por teclado, contraste WCAG AA/AAA

---

## 🎨 Decisiones de Diseño UX/UI

### 1. **Jerarquía Visual Clara**

**Estructura de 3 niveles:**
1. **Welcome Header** (Nivel 1 - Contexto)
   - Saludo personalizado con nombre del usuario
   - Badge de rol con color semántico
   - Última conexión (contexto temporal)
   
2. **Module Cards** (Nivel 2 - Acción principal)
   - Cards grandes y respirables (grid 2 columnas en desktop)
   - Contenido estructurado: Título → Descripción → Features → CTA
   
3. **Admin Quick Actions** (Nivel 3 - Acciones secundarias)
   - Solo visible para admins
   - Grid de 4 columnas con iconos claros

---

## 🎨 Sistema de Colores por Módulo

### Gestión Ambiental
```css
Gradient: from-emerald-500 to-teal-600
Accent: #10b981 (emerald-500)
Semántica: Verde = Naturaleza, Sostenibilidad, Medio Ambiente
```

### Gestión de Seguridad (PAM)
```css
Gradient: from-red-500 to-orange-600
Accent: #ef4444 (red-500)
Semántica: Rojo = Alerta, Seguridad, Prevención
```

### Roles de Usuario
```css
Admin: Purple (bg-purple-100, text-purple-700)
Supervisión: Blue (bg-blue-100, text-blue-700)
Worker: Green (bg-green-100, text-green-700)
```

---

## 🧩 Componentes Reutilizables

### 1. **ModuleCard**
**Ubicación:** `src/components/hub/ModuleCard.tsx`

**Anatomía:**
```
┌─────────────────────────────────┐
│ [Icon Container - Gradient]    │
│                                 │
│ Título del Módulo               │
│ Descripción clara de 1 línea    │
│                                 │
│ ✓ Feature 1                     │
│ ✓ Feature 2                     │
│ ✓ Feature 3                     │
│ ✓ Feature 4                     │
│                                 │
│ ─────────────────────────────   │
│ Acceder al módulo         [→]  │
└─────────────────────────────────┘
```

**Características UX:**
- **Hover:** Elevación (-4px), sombra xl, escala de ícono (110%)
- **Focus:** Ring de 2px en color JM (#b3382a)
- **Click:** Toda la card es clickeable (mejor UX que solo botón)
- **Animación:** Fade-in con stagger (delay incremental)

**Props:**
- `title`: Nombre del módulo
- `description`: Descripción clara (1 línea)
- `icon`: Ícono React (Lucide)
- `features`: Array de capacidades clave (4 items)
- `path`: Ruta de navegación
- `gradient`: Clase Tailwind de gradiente
- `accentColor`: Color hex para efectos
- `delay`: Delay de animación (stagger)

---

### 2. **WelcomeHeader**
**Ubicación:** `src/components/hub/WelcomeHeader.tsx`

**Anatomía:**
```
Bienvenido, [Diego]
Selecciona el módulo con el que deseas trabajar

[Badge: Administrador] | Última conexión: 24-04-2024 10:15
```

**Características UX:**
- **Personalización:** Usa primer nombre del usuario
- **Contexto:** Badge de rol + última conexión
- **Jerarquía:** Título grande (4xl/5xl), descripción legible (lg)
- **Animación:** Fade-in desde arriba

**Props:**
- `userName`: Primer nombre del usuario
- `userRole`: Rol (admin, prevencionista, worker)
- `lastConnection`: Fecha/hora formateada (opcional)

---

### 3. **AdminQuickActions**
**Ubicación:** `src/components/hub/AdminQuickActions.tsx`

**Anatomía:**
```
Accesos rápidos de administración
Gestiona usuarios, configuración y reportes del sistema

[Usuarios] [Analytics] [Configuración] [Riesgos]
```

**Características UX:**
- **Grid responsive:** 2 cols móvil, 4 cols desktop
- **Hover:** Escala (105%), cambio de color semántico
- **Iconos claros:** Users, BarChart3, Settings, Shield
- **Animación:** Stagger con scale

**Acciones:**
- Usuarios → `/admin/usuarios`
- Analytics → `/admin/analytics`
- Configuración → `/configuracion`
- Riesgos → `/admin/riesgos`

---

## 🎬 Micro-interacciones y Animaciones

### Entrada de Página (Page Load)
```typescript
WelcomeHeader: fade-in from top (0.5s)
ModuleCard 1: fade-in + slide-up (0.4s, delay 0s)
ModuleCard 2: fade-in + slide-up (0.4s, delay 0.1s)
AdminQuickActions: fade-in + slide-up (0.4s, delay 0.4s)
```

### Hover States
```typescript
ModuleCard:
  - translateY: -4px
  - shadow: xl
  - icon scale: 110%
  - gradient opacity: 5%
  - title color: #b3382a

QuickAction:
  - scale: 105%
  - background: color-50
  - text: color-600
  - border: color-200
```

### Focus States
```typescript
All interactive elements:
  - ring: 2px
  - ring-color: #b3382a
  - ring-offset: 2px
```

---

## ♿ Accesibilidad (WCAG 2.1 AA/AAA)

### Navegación por Teclado
✅ **Tab:** Navega entre cards y acciones
✅ **Enter/Space:** Activa el elemento enfocado
✅ **Escape:** Cierra menús (si aplica)

### Contraste de Color
✅ **Texto sobre blanco:** Ratio > 4.5:1 (AA)
✅ **Texto sobre gradientes:** Siempre blanco (máximo contraste)
✅ **Badges de rol:** Fondo claro + texto oscuro (ratio > 7:1, AAA)

### Estados Visuales
✅ **Hover:** Cambio de color + elevación
✅ **Focus:** Ring visible de 2px
✅ **Active:** Feedback visual inmediato

### Semántica HTML
✅ **Links:** Elemento `<Link>` con href válido
✅ **Buttons:** Elemento `<button>` con type
✅ **Headings:** Jerarquía h1 → h2 → h3
✅ **Lists:** `<ul>` para features

---

## 📱 Responsive Design (Mobile-First)

### Breakpoints
```css
Mobile:  < 640px  (1 columna)
Tablet:  640-1024px (1-2 columnas)
Desktop: > 1024px (2 columnas)
```

### Layout Adaptativo

**Mobile (< 640px):**
```
┌─────────────────┐
│ Welcome Header  │
│                 │
│ [Module Card 1] │
│                 │
│ [Module Card 2] │
│                 │
│ [Quick Actions] │
│  2x2 grid       │
└─────────────────┘
```

**Desktop (> 1024px):**
```
┌───────────────────────────────────┐
│ Welcome Header                    │
│                                   │
│ [Module 1]    [Module 2]          │
│                                   │
│ [Quick Actions - 4 columns]       │
└───────────────────────────────────┘
```

---

## 📊 Contenido de las Cards

### Gestión Ambiental
**Título:** Gestión Ambiental
**Descripción:** "Controla consumo de agua y energía, detecta riesgos y mejora tu huella."
**Features:**
- ✓ Monitoreo de Agua, Energía y Petróleo
- ✓ Alertas y gestión de riesgos ambientales
- ✓ Paneles e informes de cumplimiento
- ✓ Históricos por centro / faena

### Gestión de Seguridad (PAM)
**Título:** Gestión de Seguridad
**Descripción:** "Planificación, asignación y seguimiento semanal de tareas de seguridad y medioambientales (PAM)."
**Features:**
- ✓ Carga semanal desde Excel
- ✓ Asignación automática por responsable
- ✓ Seguimiento, evidencias y reportes
- ✓ Dashboard ejecutivo y cumplimiento

---

## 🎨 Paleta de Colores Completa

### Colores Primarios JM
```css
Primary: #b3382a (rojo JM)
Primary Dark: #9f2f24
Primary Light: #c44a3c
```

### Gradientes de Módulos
```css
Ambiental: linear-gradient(135deg, #10b981 0%, #14b8a6 100%)
Seguridad: linear-gradient(135deg, #ef4444 0%, #f97316 100%)
```

### Colores de Estado
```css
Success: #10b981 (emerald-500)
Warning: #f59e0b (amber-500)
Error: #ef4444 (red-500)
Info: #3b82f6 (blue-500)
```

### Grises (Neutrales)
```css
Gray 50:  #f9fafb
Gray 100: #f3f4f6
Gray 200: #e5e7eb
Gray 600: #4b5563
Gray 700: #374151
Gray 900: #111827
```

---

## 🧪 Testing y QA

### Checklist de Accesibilidad
- [ ] Navegación por teclado funciona en todos los elementos
- [ ] Estados de focus visibles (ring de 2px)
- [ ] Contraste de texto cumple WCAG AA (4.5:1)
- [ ] Contraste de elementos interactivos cumple WCAG AA (3:1)
- [ ] Screen readers pueden leer todo el contenido
- [ ] Imágenes/iconos tienen texto alternativo

### Checklist de UX
- [ ] Animaciones suaves (no causan mareo)
- [ ] Hover states claros y consistentes
- [ ] Click areas suficientemente grandes (44x44px mínimo)
- [ ] Feedback visual inmediato en todas las interacciones
- [ ] Contenido legible sin zoom (16px mínimo)

### Checklist de Responsive
- [ ] Layout funciona en 320px (móvil pequeño)
- [ ] Layout funciona en 768px (tablet)
- [ ] Layout funciona en 1920px (desktop grande)
- [ ] Touch targets de 44x44px en móvil
- [ ] No hay scroll horizontal no deseado

---

## 🚀 Próximas Mejoras

### Corto Plazo
- [ ] Agregar skeleton loaders durante carga
- [ ] Implementar búsqueda de módulos (si escala a 5+)
- [ ] Agregar tooltips informativos en features
- [ ] Métricas rápidas en cada card (ej: "12 tareas pendientes")

### Mediano Plazo
- [ ] Personalización de orden de módulos por usuario
- [ ] Módulos favoritos / recientes
- [ ] Notificaciones en tiempo real en cada card
- [ ] Modo oscuro (dark mode)

### Largo Plazo
- [ ] Widgets configurables en el HUB
- [ ] Dashboard embebido en cada card
- [ ] Onboarding interactivo para nuevos usuarios
- [ ] Analytics de uso de módulos

---

## 📚 Referencias Conceptuales

### Inspiración Visual
1. **Codelco/Zyght:** Sensación de sistema serio, estructurado, confiable
2. **HubSpot:** Cards limpias, navegación directa, contenido claro
3. **Material Design 3:** Elevación, sombras, micro-interacciones

### Principios UX Aplicados
- **Ley de Hick:** Menos opciones = decisión más rápida (2 módulos principales)
- **Ley de Fitts:** Targets grandes y cercanos = más fácil de clickear
- **Principio de proximidad:** Elementos relacionados agrupados visualmente
- **Jerarquía visual:** Tamaño, color y posición guían la atención

---

## 🎓 Guía de Implementación

### Para Desarrolladores

**1. Instalar dependencias:**
```bash
# Framer Motion ya está instalado
npm install framer-motion
```

**2. Importar componentes:**
```typescript
import { ModuleCard } from '@/components/hub/ModuleCard';
import { WelcomeHeader } from '@/components/hub/WelcomeHeader';
import { AdminQuickActions } from '@/components/hub/AdminQuickActions';
```

**3. Usar en Hub.tsx:**
```typescript
<WelcomeHeader userName={userName} userRole={userRole} />
<ModuleCard {...moduleProps} />
<AdminQuickActions />
```

### Para Diseñadores

**Figma/Sketch:**
- Usar grid de 12 columnas
- Espaciado base: 8px (múltiplos de 8)
- Bordes redondeados: 16px (cards), 12px (botones)
- Sombras: sm, md, lg, xl (Tailwind equivalentes)

**Tipografía:**
- Headings: Inter/SF Pro (bold)
- Body: Inter/SF Pro (regular)
- Tamaños: 14px (sm), 16px (base), 18px (lg), 24px (xl)

---

**Versión:** 2.0  
**Fecha:** Enero 2024  
**Autor:** UX/UI Lead Senior + Frontend Architect  
**Estado:** ✅ Implementado y Documentado

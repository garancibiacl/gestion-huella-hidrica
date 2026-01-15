# Guía: Asignar Roles a Usuarios Existentes

## ✅ El HUB Funciona Correctamente

Como se ve en la imagen, el HUB está mostrando correctamente ambos módulos:
- **Gestión Ambiental** (verde)
- **Gestión de Tareas (PAM)** (amarillo)

El usuario "Diego Martínez" está conectado como **Admin** y puede ver ambos módulos.

---

## 📋 Paso 1: Listar Usuarios Existentes

Ejecuta esta query en **Supabase SQL Editor** para ver todos los usuarios registrados:

```sql
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  p.created_at,
  ur.role as rol_actual
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
ORDER BY p.created_at DESC;
```

Esto te mostrará:
- Todos los usuarios registrados
- Sus emails
- Sus nombres
- Si ya tienen un rol asignado

---

## 🔐 Paso 2: Asignar Roles a Usuarios Reales

### Opción A: Asignar rol a un usuario específico por email

```sql
-- Reemplaza 'email@real.com' con el email del usuario
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'admin' 
FROM profiles 
WHERE email = 'email@real.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Opción B: Asignar roles a múltiples usuarios

```sql
-- Admin
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'admin' 
FROM profiles 
WHERE email IN ('diego@ejemplo.com', 'admin@empresa.cl')
ON CONFLICT (user_id, role) DO NOTHING;

-- Supervisión
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'prevencionista' 
FROM profiles 
WHERE email IN ('preventer1@empresa.cl', 'preventer2@empresa.cl')
ON CONFLICT (user_id, role) DO NOTHING;

-- Worker
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'worker' 
FROM profiles 
WHERE email IN ('worker1@empresa.cl', 'worker2@empresa.cl')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Opción C: Asignar rol por user_id directamente

```sql
-- Si conoces el user_id
INSERT INTO user_roles (user_id, role) 
VALUES ('uuid-del-usuario-aqui', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 🎯 Roles Disponibles

### `admin`
- ✅ Ve ambos módulos en el HUB
- ✅ Acceso completo a Gestión Ambiental
- ✅ Acceso completo a Gestión de Seguridad (PAM)
- ✅ Dashboard ejecutivo PAM
- ✅ Carga masiva de tareas
- ✅ Gestión de usuarios

### `prevencionista`
- ✅ Ve ambos módulos en el HUB
- ✅ Acceso a Gestión Ambiental
- ✅ Dashboard ejecutivo PAM
- ✅ Ve todas las tareas PAM de la organización
- ❌ No puede gestionar usuarios

### `worker`
- ✅ Ve ambos módulos en el HUB
- ✅ Acceso a Gestión Ambiental
- ✅ Solo ve sus propias tareas PAM asignadas
- ❌ No accede a dashboard ejecutivo
- ❌ No puede cargar tareas masivamente

---

## 🔍 Paso 3: Verificar Roles Asignados

```sql
-- Ver todos los usuarios con sus roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.id as role_id
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
ORDER BY p.email;
```

---

## 🚀 Flujo de Navegación del HUB

### Para Usuarios con 1 Solo Módulo
Si un usuario tiene acceso solo a un módulo (por configuración futura):
1. Login → `/auth`
2. Redirección automática al módulo único
3. No pasa por el HUB

### Para Usuarios con 2+ Módulos (Caso Actual)
1. Login → `/auth`
2. Redirección a `/hub`
3. Usuario ve cards de ambos módulos
4. Click en "Ingresar" → navega al módulo seleccionado

**Rutas:**
- Gestión Ambiental → `/dashboard/agua`
- Gestión de Seguridad → `/pam/my-activities` (worker) o `/pam/dashboard` (admin/preventer)

---

## 🛠️ Ejemplo Práctico

Si tienes un usuario con email `diego.martinez@empresa.cl`:

```sql
-- 1. Verificar que existe
SELECT * FROM profiles WHERE email = 'diego.martinez@empresa.cl';

-- 2. Asignar rol de admin
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'admin' 
FROM profiles 
WHERE email = 'diego.martinez@empresa.cl'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar asignación
SELECT 
  p.email,
  p.full_name,
  ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.email = 'diego.martinez@empresa.cl';
```

---

## ⚠️ Notas Importantes

1. **Un usuario puede tener múltiples roles** (admin + prevencionista, por ejemplo)
2. **Si no tiene rol asignado**, el sistema puede tener comportamiento inesperado
3. **Recomendación**: Asignar al menos un rol a cada usuario activo
4. **El HUB solo muestra módulos** si el usuario tiene permisos (roles asignados)

---

## 🔄 Cambiar o Eliminar Roles

### Eliminar un rol específico
```sql
DELETE FROM user_roles 
WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'usuario@empresa.cl')
AND role = 'worker';
```

### Eliminar todos los roles de un usuario
```sql
DELETE FROM user_roles 
WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'usuario@empresa.cl');
```

### Cambiar rol (eliminar anterior y asignar nuevo)
```sql
-- Eliminar rol anterior
DELETE FROM user_roles 
WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'usuario@empresa.cl');

-- Asignar nuevo rol
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'admin' 
FROM profiles 
WHERE email = 'usuario@empresa.cl';
```

---

## 📞 Troubleshooting

### No veo el HUB después de login
- Verificar que el usuario tenga al menos un rol asignado
- Verificar que la ruta `/hub` esté configurada en `App.tsx`
- Revisar console del navegador (F12) para errores

### Solo veo un módulo en el HUB
- Verificar permisos del módulo en `Hub.tsx`
- Actualmente ambos módulos están disponibles para todos los roles

### El usuario no puede acceder a funciones PAM
- Verificar que tenga rol asignado en `user_roles`
- Workers solo ven sus tareas, admins/preventers ven todo

---

**Última actualización:** Enero 2024

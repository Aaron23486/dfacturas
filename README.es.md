# DFacturas
<!-- portfolio-badges-start -->

![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-13%2F13-passing?logo=vitest)
![Security](https://img.shields.io/badge/auditoría%20producción-0%20vulnerabilidades-success)

<!-- portfolio-badges-end -->

Aplicación de control logístico de despachos construida con **Next.js, TypeScript, Supabase y PostgreSQL**. El flujo principal modela una operación real: el primer escaneo de una factura inicia su atención y el segundo la finaliza, mientras los usuarios administrativos gestionan catálogos, analítica y auditoría.

El proyecto está preparado como portafolio técnico con énfasis en **reglas de dominio, autorización en la capa de datos, trazabilidad, RPC transaccionales y separación mantenible de responsabilidades**.

<!-- access-callout-start -->

> **Modelo de acceso:** DFacturas incluye inicio de sesión con correo y contraseña, pero intencionalmente no ofrece registro público. Para ejecutar una instalación propia, cree el usuario manualmente en **Supabase Dashboard > Authentication > Users** y luego active su perfil y asigne el rol correspondiente.

<!-- access-callout-end -->

## Vista del producto

<!-- product-preview-start -->

### Analítica operativa

El dashboard administrativo presenta KPIs, análisis por rango de fechas, distribución de despachos, rendimiento por rutas y ranking de responsables.

![Dashboard administrativo de DFacturas](docs/images/dfacturas-dashboard.png)

### Flujo de despacho

El módulo operativo central gestiona escaneo de facturas, asignación de responsables y transportistas, compañía y ruta, transiciones de estado e historial en tiempo real.

![Flujo de despacho de DFacturas](docs/images/dfacturas-dispatch.png)

### Administración

Los usuarios administrativos gestionan compañías y sus rutas asociadas desde una interfaz especializada.

![Configuración de compañías y rutas en DFacturas](docs/images/dfacturas-configuration.png)

<!-- product-preview-end -->
## Funcionalidad principal

- Facturas de 20 dígitos.
- Primer escaneo → `ATENDIENDO`.
- Segundo escaneo → `DESPACHADA`.
- Cancelación → `PEDIDO_CANCELADO` con motivo obligatorio.
- Roles `ADMIN` y `OPERATIVO`.
- RLS de PostgreSQL y guards de servidor.
- Escrituras críticas mediante RPC en lugar de updates arbitrarios desde el navegador.
- Soft delete y auditoría de cambios sensibles.
- Dashboard administrativo con rangos de fechas, filtros cruzados, KPIs, gráficos y exportación a Excel.
- Gestión de responsables, transportistas/placas, compañías y rutas.
- Flujo especial `CLIENTE RETIRA` protegido por reglas de dominio/base de datos.
- Traducción segura de errores para no exponer mensajes internos de PostgreSQL al usuario.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16.3.8 (App Router) |
| UI | React 19.2.8, Tailwind CSS 4, Base UI, Lucide, Recharts |
| Lenguaje | TypeScript 5.9 |
| Validación | Zod 4 |
| Auth / Datos | Supabase Auth + PostgreSQL |
| Seguridad BD | RLS, grants, RPC, constraints y triggers |
| Testing | Vitest 5 |
| Deploy | Vercel + Supabase |

## Módulos

La navegación principal contiene cinco módulos:

1. **Dashboard** — exclusivo para `ADMIN`.
2. **Despacho** — operación principal de escaneo, historial, cancelación y correcciones autorizadas.
3. **Responsables** — lectura para usuarios activos; mutaciones protegidas como administrativas en base de datos.
4. **Transportistas** — transportistas y placas con operaciones controladas.
5. **Configuración** — compañías y rutas, exclusivo para `ADMIN`.

Existe además `/admin/auditoria`, accesible para `ADMIN`, pero intencionalmente no aparece como un sexto módulo principal.

## Arquitectura

```text
Rutas/layouts Next.js
        ↓
Componentes por feature
        ↓
Servicios / casos de uso
        ↓
Reglas puras de dominio + validación Zod
        ↓
Repositorios
        ↓
Supabase
        ↓
PostgreSQL (RLS + RPC + constraints + triggers)
```

La regla central es: **ocultar un botón no equivale a autorizar una operación**. La UI mejora la experiencia por rol, pero PostgreSQL mantiene el límite real de seguridad.

### Principios demostrados en el código

- **SOLID orientado a responsabilidades:** dominio, servicios, repositorios, validación e interfaz tienen responsabilidades distintas.
- **DRY:** helpers de autorización, mapeo seguro de errores, constantes y componentes reutilizables centralizan comportamiento repetido.
- **Separation of Concerns:** React no define permisos de PostgreSQL y los repositorios no contienen presentación.
- **Single Source of Truth:** invariantes críticas se vuelven a validar en la base de datos/RPC aunque el cliente intente saltarse la UI.
- **Atomic Design pragmático:** `src/components/ui` contiene primitivas, `src/components/app` composiciones reutilizables y `src/features/*/components` componentes específicos del dominio.
- **Least Privilege:** permisos mínimos y funciones internas sin ejecución directa desde clientes autenticados.

Consulta [Arquitectura](docs/architecture.md) para los detalles.

## Estructura

```text
src/
├─ app/                 rutas/layouts de Next.js
├─ components/          primitivas y componentes de aplicación
├─ constants/           constantes compartidas
├─ domain/              reglas puras y tests unitarios
├─ features/            UI y dominio por capacidad
├─ lib/                 Supabase, errores y utilidades
├─ repositories/        acceso a datos y RPC
├─ schemas/             validación Zod
├─ services/            casos de uso y guards
└─ types/               contratos TypeScript

supabase/
├─ migrations/          historial forward-only
├─ tests/               verificación SQL de hardening
└─ seed/                sin datos reales de producción
```

## Variables de entorno

Copia `.env.example` a `.env.local` y usa los valores de tu propio proyecto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Nunca coloques `service_role`, `sb_secret_*`, contraseñas de base de datos ni secretos JWT en variables `NEXT_PUBLIC_*`.

## Autenticación y creación de usuarios

<!-- user-provisioning-start -->

DFacturas incluye un flujo completo de autenticación con correo y contraseña, pero intencionalmente **no ofrece registro público de usuarios**.

Esto es una decisión de seguridad y no una funcionalidad faltante. DFacturas representa un sistema logístico interno en el que la organización controla quién puede acceder.

### Modelo de acceso

La autenticación y la autorización están separadas:

```text
Supabase Auth
    |
    v
Identidad autenticada
    |
    v
public.profiles
    |
    +-- active = false -> acceso denegado
    |
    +-- active = true
            |
            +-- OPERATIVO
            |
            +-- ADMIN
```

- **Supabase Auth** verifica la identidad mediante correo y contraseña.
- `public.profiles` determina si esa identidad autenticada puede utilizar DFacturas.
- Los perfiles nuevos se crean con rol `OPERATIVO`.
- Los perfiles nuevos permanecen inactivos hasta ser habilitados explícitamente.
- Los privilegios `ADMIN` deben asignarse intencionalmente.
- El registro público y la autenticación anónima permanecen deshabilitados.

Crear un usuario en Auth **no concede automáticamente acceso a DFacturas**.

### Crear el primer usuario

Después de crear un proyecto propio de Supabase y aplicar las migraciones de base de datos:

1. Abra **Supabase Dashboard > Authentication > Users**.
2. Seleccione **Add user**.
3. Cree la cuenta con correo electrónico y contraseña.
4. El trigger de base de datos crea automáticamente su fila en `public.profiles`.
5. Abra **SQL Editor**.
6. Active el perfil y asigne el rol requerido.
7. Inicie DFacturas e ingrese desde `/login`.

Verifique el usuario Auth y su perfil de aplicación:

```sql
select
  u.id,
  u.email,
  p.role,
  p.active
from auth.users u
join public.profiles p
  on p.id = u.id
order by u.created_at desc;
```

Habilitar un usuario operativo:

```sql
update public.profiles p
set
  role = 'OPERATIVO'::public.app_role,
  active = true,
  updated_at = now()
from auth.users u
where u.id = p.id
  and u.email = 'operativo@example.com';
```

Habilitar un administrador:

```sql
update public.profiles p
set
  role = 'ADMIN'::public.app_role,
  active = true,
  updated_at = now()
from auth.users u
where u.id = p.id
  and u.email = 'admin@example.com';
```

Reemplace el correo de ejemplo por el usuario creado en su propio proyecto Supabase.

### Roles

| Rol | Acceso |
| --- | --- |
| `OPERATIVO` | Operaciones de despacho autorizadas |
| `ADMIN` | Operaciones más dashboard, catálogos, configuración, auditoría y funciones administrativas |

### Política de credenciales

El repositorio público intencionalmente no contiene contraseñas de usuarios, credenciales demo compartidas, claves `service_role` de Supabase, contraseñas de base de datos, secretos JWT ni otras credenciales privilegiadas.

Quien desee evaluar el proyecto puede crear una instancia aislada de Supabase, aplicar las migraciones y provisionar sus propios usuarios siguiendo el procedimiento anterior.

> No habilite el registro público solamente para crear la primera cuenta. Utilice **Authentication > Users > Add user** en Supabase.

<!-- user-provisioning-end -->

## Instalación local

Requisitos: Node `22.23.3`, npm 10+ y un proyecto Supabase.

```bash
npm ci
npm run dev
```

En PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Las migraciones se aplican en orden desde `supabase/migrations/`. Las migraciones `001`–`005` son historial forward-only y no deben reescribirse después de aplicarse.

## Seguridad de Auth esperada para la demo cerrada

- Email/password: ON.
- Signup público: OFF.
- Anonymous sign-in: OFF.
- Manual linking: OFF salvo necesidad explícita.
- Rate limits: activos.
- CAPTCHA: opcional; solo habilitar después de integrarlo en login.
- Site URL: URL final del deploy.
- Redirect URLs: allow-list mínima.

## Gates de calidad

```bash
npm test
npx tsc --noEmit
npm run lint
npm audit --omit=dev
npm run build
```

El snapshot validado antes de publicación superó:

- **13/13 tests de dominio**.
- TypeScript.
- ESLint.
- auditoría de dependencias de producción con **0 vulnerabilidades reportadas**.
- build de producción de Next.js con Webpack.
- gate de secretos/archivos sensibles para GitHub.

También se incluye un verificador SQL read-only:

```text
supabase/tests/20261004000005_security_hardening_verify.sql
```

## Política de datos demo

El repositorio público no debe contener nombres, correos, teléfonos, clientes, empleados, facturas, órdenes, credenciales ni otra información real de producción. Las capturas y fixtures deben usar exclusivamente datos ficticios.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [Seguridad](docs/security.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md)
- [README in English](README.md)

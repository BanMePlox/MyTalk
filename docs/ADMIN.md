# Guía de administración y despliegue

Requisitos, configuración y comandos necesarios para poner en marcha la aplicación.

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|----------------|
| PHP         | 8.2            |
| Composer    | 2.x            |
| Node.js     | 18.x           |
| npm         | 9.x            |
| SQLite      | 3.x (incluido en PHP) |

> Para producción se recomienda MySQL 8+ o PostgreSQL 15+ en lugar de SQLite.

---

## Instalación inicial

```bash
# 1. Instalar dependencias PHP y generar .env, clave de app y migrar la base de datos
composer run setup

# Equivalente manual:
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

El script `composer run setup` hace todo lo anterior en un solo paso.

---

## Variables de entorno (.env)

Copia `.env.example` a `.env` y ajusta los valores:

### Esenciales

```dotenv
APP_NAME="Mi Discord"        # Nombre visible en el navegador
APP_URL=http://localhost      # URL base de la aplicación
APP_KEY=                      # Se genera con: php artisan key:generate
APP_ENV=local                 # local | production
APP_DEBUG=true                # false en producción
```

### Base de datos

SQLite (por defecto, ideal para desarrollo):
```dotenv
DB_CONNECTION=sqlite
# El archivo se crea en database/database.sqlite
```

MySQL (producción):
```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=discord
DB_USERNAME=usuario
DB_PASSWORD=contraseña
```

### Broadcasting en tiempo real (Laravel Reverb)

Para que los mensajes lleguen en tiempo real hay que activar Reverb:

```dotenv
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=mi-app
REVERB_APP_KEY=clave-secreta
REVERB_APP_SECRET=secreto-muy-seguro
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http             # https en producción

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

> Si `BROADCAST_CONNECTION=log`, los mensajes no llegarán en tiempo real (solo útil para depuración).

### Colas (necesarias para broadcasting)

```dotenv
QUEUE_CONNECTION=database
```

---

## Arrancar en desarrollo

Ejecuta este único comando desde la raíz del proyecto. Lanza cuatro procesos en paralelo:

```bash
composer run dev
```

| Proceso  | Qué hace                                     |
|----------|----------------------------------------------|
| `server` | Servidor PHP (`php artisan serve`)           |
| `queue`  | Worker de colas para broadcasting            |
| `logs`   | Visor de logs en tiempo real (Pail)          |
| `vite`   | Servidor de assets con HMR                  |

La aplicación estará disponible en `http://localhost:8000`.

Para el tiempo real también necesitas arrancar Reverb en una terminal separada:

```bash
php artisan reverb:start
```

---

## Arrancar en producción

```bash
# Compilar assets para producción
npm run build

# Optimizar Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ejecutar migraciones pendientes
php artisan migrate --force

# Iniciar el servidor de aplicación (ejemplo con Octane o un servidor Nginx/Apache externo)
php artisan serve --env=production
```

Para el worker de colas y Reverb en producción usa un gestor de procesos como **Supervisor**:

```ini
; /etc/supervisor/conf.d/discord-worker.conf
[program:discord-queue]
command=php /ruta/al/proyecto/artisan queue:work --tries=3
autostart=true
autorestart=true

[program:discord-reverb]
command=php /ruta/al/proyecto/artisan reverb:start --port=8080
autostart=true
autorestart=true
```

---

## Migraciones y base de datos

```bash
# Ejecutar migraciones pendientes
php artisan migrate

# Rehacer toda la base de datos (¡borra todos los datos!)
php artisan migrate:fresh

# Ver estado de las migraciones
php artisan migrate:status
```

Tablas que crea la aplicación:

| Tabla            | Descripción                                 |
|------------------|---------------------------------------------|
| `users`          | Cuentas de usuario                          |
| `servers`        | Servidores de chat                          |
| `server_members` | Relación usuario–servidor con rol           |
| `channels`       | Canales dentro de un servidor               |
| `messages`       | Mensajes de cada canal                      |
| `sessions`       | Sesiones de usuario                         |
| `jobs`           | Cola de trabajos (broadcasting)             |

---

## Roles de usuario en un servidor

| Rol      | Puede ver canales | Puede crear canales | Puede eliminar servidor |
|----------|:-----------------:|:-------------------:|:-----------------------:|
| `owner`  | Sí                | Sí                  | Sí                      |
| `admin`  | Sí                | Sí                  | No                      |
| `member` | Sí                | No                  | No                      |

El rol se asigna en `server_members.role`. El creador del servidor recibe `owner` automáticamente; quien se une con código recibe `member`.

---

## Comandos útiles

```bash
# Limpiar caché de configuración
php artisan config:clear

# Ejecutar tests
composer run test

# Abrir consola interactiva (Tinker)
php artisan tinker

# Ver rutas registradas
php artisan route:list
```

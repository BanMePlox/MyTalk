# Guía de administración y despliegue

Requisitos, configuración y comandos para poner en marcha MyTalk.

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
# Instalar dependencias, generar .env, clave de app y migrar la base de datos
composer run setup

# Equivalente manual:
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

---

## Variables de entorno (.env)

### Esenciales

```dotenv
APP_NAME="MyTalk"
APP_URL=http://localhost
APP_KEY=                      # php artisan key:generate
APP_ENV=local                 # local | production
APP_DEBUG=true                # false en producción
```

### Base de datos

SQLite (por defecto, desarrollo):
```dotenv
DB_CONNECTION=sqlite
```

MySQL (producción):
```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mytalk
DB_USERNAME=usuario
DB_PASSWORD=contraseña
```

### Broadcasting en tiempo real (Laravel Reverb)

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

### Colas

```dotenv
QUEUE_CONNECTION=database
```

### Web Push (notificaciones push)

Genera un par de claves VAPID con OpenSSL:

```bash
# Generar clave privada EC
openssl ecparam -name prime256v1 -genkey -noout -out vapid_private.pem

# Extraer clave pública
openssl ec -in vapid_private.pem -pubout -out vapid_public.pem
```

Luego extrae los bytes raw y codifícalos en base64url. Puedes hacerlo con un script PHP de utilidad o con la librería `web-push`. Añade las claves resultantes al `.env`:

```dotenv
VAPID_SUBJECT=mailto:admin@tudominio.com
VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Si estas variables faltan o son incorrectas, las notificaciones push simplemente no se activarán; el resto de la aplicación funcionará con normalidad.

---

## Arrancar en desarrollo

```bash
composer run dev
```

Lanza cuatro procesos en paralelo:

| Proceso  | Qué hace                                     |
|----------|----------------------------------------------|
| `server` | Servidor PHP (`php artisan serve`)           |
| `queue`  | Worker de colas para broadcasting            |
| `logs`   | Visor de logs en tiempo real (Pail)          |
| `vite`   | Servidor de assets con HMR                   |

La aplicación estará en `http://localhost:8000`.

Reverb (WebSocket) en terminal separada:

```bash
php artisan reverb:start
```

---

## Arrancar en producción

```bash
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

Usa **Supervisor** para mantener los procesos en background:

```ini
[program:mytalk-queue]
command=php /ruta/proyecto/artisan queue:work --tries=3
autostart=true
autorestart=true

[program:mytalk-reverb]
command=php /ruta/proyecto/artisan reverb:start --port=8080
autostart=true
autorestart=true
```

---

## Base de datos

### Tablas de la aplicación

| Tabla                    | Descripción                                              |
|--------------------------|----------------------------------------------------------|
| `users`                  | Cuentas de usuario                                       |
| `servers`                | Servidores de chat                                       |
| `server_members`         | Relación usuario–servidor (con apodo y rol base)         |
| `channel_categories`     | Categorías para agrupar canales                          |
| `channels`               | Canales de texto/anuncios                                |
| `channel_permissions`    | Permisos por rol para cada canal (ver, escribir)         |
| `roles`                  | Roles personalizados por servidor                        |
| `server_member_roles`    | Relación usuario–rol dentro de un servidor               |
| `messages`               | Mensajes de canal y de hilo                              |
| `message_edits`          | Historial de versiones anteriores de un mensaje          |
| `message_reactions`      | Reacciones emoji a mensajes                              |
| `threads`                | Hilos iniciados desde un mensaje de canal                |
| `conversations`          | Conversaciones directas (1:1 o grupo)                    |
| `conversation_user`      | Participantes de cada conversación                       |
| `direct_messages`        | Mensajes de conversaciones directas                      |
| `friendships`            | Solicitudes y relaciones de amistad                      |
| `bans`                   | Usuarios baneados de un servidor                         |
| `unread_mentions`        | Contador de menciones no leídas por canal                |
| `push_subscriptions`     | Suscripciones Web Push por usuario                       |
| `server_emojis`          | Emojis personalizados por servidor (nombre + ruta imagen) |
| `jobs`                   | Cola de trabajos para broadcasting                       |
| `sessions`               | Sesiones de usuario                                      |

> **Caché de voz:** los participantes activos en canales de voz se almacenan en Laravel Cache con la clave `voice_participants_{channelId}` (TTL 8 horas). No hay tabla dedicada; si se resetea la caché, el sidebar de voz mostrará vacío hasta que los usuarios vuelvan a unirse.

### Comandos de migración

```bash
php artisan migrate              # Ejecutar migraciones pendientes
php artisan migrate:fresh        # Rehacer toda la BD (borra datos)
php artisan migrate:status       # Ver estado de las migraciones
```

---

## Roles en un servidor

Cada servidor tiene su propio sistema de roles personalizados (creados desde *Ajustes del servidor → Roles*). Los roles tienen nombre, color y permisos:

| Permiso          | Descripción                                     |
|------------------|-------------------------------------------------|
| `manage_channels`| Crear, editar, reordenar y eliminar canales     |
| `manage_messages`| Eliminar y fijar mensajes de otros usuarios     |
| `manage_roles`   | Crear roles y asignarlos a miembros             |
| `kick_members`   | Expulsar miembros del servidor                  |
| `ban_members`    | Banear y desbanear miembros                     |

El **propietario** tiene todos los permisos siempre. Los permisos de canal (ver / escribir) se configuran individualmente por rol en *Ajustes del servidor → Canales*.

---

## Comandos útiles

```bash
php artisan config:clear       # Limpiar caché de configuración
php artisan route:list         # Ver rutas registradas
php artisan tinker             # Consola interactiva
composer run test              # Ejecutar tests
```

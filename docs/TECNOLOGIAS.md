# Stack Tecnológico — MyTalk

## Backend

| Tecnología | Versión | Uso |
|---|---|---|
| PHP | 8.2+ | Lenguaje del servidor |
| Laravel | 12 | Framework principal (routing, ORM, eventos, broadcasting, colas) |
| Laravel Reverb | 1.x | Servidor WebSocket propio para tiempo real |
| Laravel Sanctum | 4.x | Autenticación de API y gestión de sesiones |
| Laravel Breeze | 2.x | Scaffolding de autenticación (login, registro, perfil) |
| Inertia.js (Laravel) | 2.x | Puente entre Laravel y React sin API REST explícita |
| Ziggy | 2.x | Exposición de rutas Laravel al frontend (`route()`) |
| minishlink/web-push | 10.x | Envío de notificaciones Web Push (VAPID) desde el servidor |
| SQLite / MySQL | — | Base de datos |

## Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Librería de UI (componentes, estado, efectos) |
| Inertia.js (React) | 2.x | Navegación SPA integrada con Laravel |
| Tailwind CSS | 3 | Estilos mediante clases utilitarias |
| Axios | 1.x | Cliente HTTP para peticiones AJAX |
| Laravel Echo | 2.x | Cliente WebSocket para escuchar canales de Reverb |
| Pusher JS | 8.x | Driver de transporte usado por Echo |
| highlight.js | 11.x | Syntax highlighting para bloques de código en mensajes |
| Service Worker (`sw.js`) | Web API | Recepción de notificaciones push en background |

## Tooling

| Tecnología | Versión | Uso |
|---|---|---|
| Vite | 7 | Bundler y servidor de desarrollo frontend |
| laravel-vite-plugin | 2.x | Integración entre Vite y Laravel (HMR, manifesto) |
| @vitejs/plugin-react | 4.x | Soporte de JSX y React Fast Refresh en Vite |
| PostCSS + Autoprefixer | — | Procesado y compatibilidad de CSS |
| Concurrently | 9.x | Ejecución paralela de múltiples procesos en desarrollo |
| Laravel Pint | 1.x | Formateador de código PHP (PSR-12) |
| PHPUnit | 11.x | Framework de testing para PHP |

---

## Arquitectura de tiempo real

MyTalk usa broadcasting basado en canales privados de Reverb. Todos los canales requieren autenticación.

| Canal | Tipo | Uso |
|-------|------|-----|
| `channel.{id}` | Privado | Mensajes, ediciones, borrados, reacciones, pins, actualizaciones de hilos |
| `thread.{id}` | Privado | Mensajes nuevos en un hilo concreto |
| `conversation.{id}` | Privado | Mensajes directos (1:1 y grupo) |
| `App.Models.User.{id}` | Privado | Menciones, DMs, solicitudes de amistad, expulsiones, señalización WebRTC |
| `presence-server.{id}` | Presencia | Estado online/ausente/dnd + eventos `VoicePresenceChanged` para el sidebar de voz |
| `presence-voice.{id}` | Presencia | Participantes activos en un canal de voz concreto (join/leave/here para WebRTC) |

Los **whispers** (cliente a cliente, sin pasar por el servidor) se usan para el indicador "X está escribiendo...".

---

## Arquitectura de voz (WebRTC)

Las llamadas de voz usan una malla P2P completa (full mesh): cada participante establece una conexión directa `RTCPeerConnection` con cada uno de los demás.

**Señalización** (intercambio de SDP e ICE candidates):

1. Al unirse, el nuevo participante envía un **offer** SDP a cada usuario ya presente (vía `POST /voice/{channel}/signal`, que hace broadcast del evento `VoiceSignal` en el canal privado del destinatario).
2. El destinatario responde con un **answer** SDP.
3. Ambos intercambian **ICE candidates** hasta que se establece la conexión directa.
4. Los SDP se codifican en base64 para el transporte.

**Gestión de estado** (`VoiceContext` — `resources/js/Contexts/VoiceContext.jsx`):

Toda la lógica WebRTC vive en un React Context montado en la raíz de la app (`app.jsx`). Esto permite que las llamadas persistan mientras el usuario navega entre canales de texto (Inertia soft-navigation no desmonta el contexto). Los componentes consumidores (`VoiceChannel.jsx`, `VoiceMiniBar.jsx`) son puramente de UI.

**Presencia en el sidebar**:

`VoiceController::presence()` actualiza una entrada en Laravel Cache (`voice_participants_{channelId}`) y emite `VoicePresenceChanged` en `presence-server.{serverId}`. `Show.jsx` escucha el evento y actualiza el estado local del sidebar. Al cargar la página, `MessageController` devuelve `initialVoiceParticipants` desde la caché; si el usuario no está en llamada (ausencia del header `X-Voice-Channel-Id`), limpia su presencia zombie antes de devolver los datos.

**Servidores STUN** usados para descubrimiento de IP pública: `stun.l.google.com:19302`.

---

## Arquitectura de notificaciones push

1. El navegador se suscribe via `PushManager.subscribe()` con la clave pública VAPID.
2. El endpoint de suscripción se almacena en `push_subscriptions` (tabla por usuario).
3. Al ocurrir un evento relevante (mensaje, mención), el servidor usa `minishlink/web-push` para enviar la notificación al endpoint del navegador.
4. El **Service Worker** (`/sw.js`) intercepta el evento `push` y llama a `showNotification()`.
5. Al hacer clic en la notificación, el Service Worker enfoca la ventana existente o abre una nueva en la URL del canal correspondiente.

---

## Permisos de canal

Los permisos de canal se evalúan por rol con la siguiente lógica (mismo modelo que Discord):

1. Sin overrides → canal visible/escribible para todos.
2. Deny explícito para alguno de los roles del usuario → denegado.
3. Allow explícito para alguno de los roles del usuario → permitido.
4. Canal tiene overrides de allow pero el usuario no tiene ninguno → denegado (canal "restringido").

Esta lógica se aplica tanto en el servidor (al filtrar los canales visibles en el sidebar) como en el cliente de broadcasting (al autenticar el canal `channel.{id}`).

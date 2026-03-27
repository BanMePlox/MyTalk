# Guía de usuario — MyTalk

Aplicación de chat en tiempo real similar a Discord. Permite crear servidores, organizar la comunicación en canales y chatear con otros usuarios.

---

## Registro e inicio de sesión

1. Abre la aplicación en el navegador.
2. Si no tienes cuenta, haz clic en **Registrarse** e introduce tu nombre, correo y contraseña.
3. Confirma tu correo electrónico (recibirás un enlace de verificación).
4. Inicia sesión con tu correo y contraseña.

---

## Servidores

### Crear un servidor

1. En la pantalla principal (**Mis Servidores**), rellena el campo **Nombre del servidor** y pulsa **Crear**.
2. Se creará el servidor con un canal `#general` por defecto.

### Unirse a un servidor

1. Consigue el **enlace de invitación** del servidor (disponible en el menú desplegable del servidor → *Copiar invitación*).
2. Abre el enlace en el navegador o usa el campo **Unirse con código** en *Mis Servidores*.

### Ajustes del servidor

El menú desplegable (nombre del servidor en la cabecera del sidebar) permite:

- **Copiar invitación** — comparte el enlace con quien quieras.
- **Cambiar nombre** — solo el propietario.
- **Cambiar icono** — sube una imagen cuadrada; solo el propietario.
- **Ajustes del servidor** — gestión de roles, miembros, canales, categorías y baneos.
- **Abandonar / Eliminar** — los miembros pueden abandonar; el propietario puede eliminar el servidor.

---

## Canales

### Tipos de canal

| Tipo | Descripción |
|------|-------------|
| `#` Texto | Canal normal; cualquier miembro con permiso puede escribir. |
| `📢` Anuncios | Solo el propietario y los administradores pueden publicar; el resto solo lee. |
| `🎙` Voz | Canal de audio en tiempo real con WebRTC. |

### Navegar entre canales

Los canales aparecen en el sidebar izquierdo agrupados por **categorías**. Haz clic en el nombre de una categoría para colapsarla/expandirla.

### Crear un canal (propietario o con permiso)

En el menú desplegable del servidor hay un formulario **Nuevo canal**. Escribe el nombre y pulsa **+**.

### Reordenar canales (arrastrar y soltar)

Si tienes permiso de gestión de canales, arrastra cualquier canal a la posición deseada dentro del sidebar.

### Permisos por canal

Los canales pueden tener permisos específicos por rol que sobreescriben los permisos globales del servidor. Un canal sin permisos definidos es visible para todos. Si un canal tiene permisos explícitos de "ver", solo los roles con permiso explícito pueden verlo.

---

## Canales de voz

Los canales de voz permiten hablar en tiempo real con otros miembros del servidor.

### Unirse a un canal de voz

Haz clic en cualquier canal con icono 🎙 en el sidebar. Se abrirá la pantalla del canal con un botón **Unirse al canal de voz**. Al pulsarlo, el navegador pedirá permiso para acceder al micrófono.

### Probar el micrófono antes de entrar

En la pantalla del canal (sin estar en llamada) hay una sección **Probar micrófono y altavoces**. Pulsa **🎙 Iniciar test** para escucharte a ti mismo a través de los altavoces. Pulsa **⏹ Parar test** para detenerlo.

### Controles durante la llamada

| Control | Descripción |
|---------|-------------|
| **Micro** | Silencia o activa tu micrófono. |
| **Audio** | Ensordece o reactiva el audio de los demás. |
| **Volumen del micrófono** | Slider de 0 % a 200 % para ajustar el nivel de tu voz. |
| **Volumen por usuario** | Slider individual bajo el nombre de cada participante (0 %–100 %). |
| **Salir** | Abandona la llamada. |

### Navegar mientras estás en llamada

Puedes moverte a cualquier canal de texto sin salir de la llamada: la conexión de voz se mantiene activa en segundo plano. En la parte inferior del sidebar aparece la **barra de llamada activa** con el nombre del canal y accesos rápidos a silenciar, ensordecerte y salir.

### Ver quién está en voz

El sidebar muestra los participantes activos bajo cada canal de voz en tiempo real.

---

## Mensajes

### Enviar un mensaje

Escribe en el campo de texto inferior y pulsa **Enviar** o `Enter`. Para insertar un salto de línea sin enviar usa `Shift+Enter`.

### Adjuntar archivos

Haz clic en el icono 📎 junto al campo de texto para adjuntar imágenes, vídeos u otros archivos (máx. 20 MB).

- Las **imágenes** se muestran inline.
- Los **vídeos** (mp4, webm, etc.) muestran un reproductor con miniatura.
- Otros archivos aparecen como enlace de descarga.

### Responder a un mensaje

Pasa el cursor sobre un mensaje y haz clic en **↩** para responder. Tu mensaje mostrará una referencia al original. También puedes usar el menú contextual (botón derecho).

### Editar un mensaje

Solo puedes editar tus propios mensajes. Haz clic en ✏️ en la barra de acciones o en el menú contextual. Guarda con `Enter`, cancela con `Esc`.

Los mensajes editados muestran *(editado)*. Haz clic en *(editado)* para ver el historial completo de versiones anteriores.

### Eliminar un mensaje

Haz clic en 🗑️ en la barra de acciones. Se pedirá confirmación. Los administradores con permiso de gestión de mensajes pueden eliminar mensajes de otros.

### Reaccionar con emojis

Haz clic en 😊 en la barra de acciones y elige un emoji. Haz clic en una reacción existente para añadir o quitar la tuya.

### Fijar mensajes

Los administradores pueden fijar mensajes con el icono 📌 en la barra de acciones. Los mensajes fijados se muestran en el panel 📌 del header del canal.

### Cargar mensajes anteriores

Desplázate hacia arriba o pulsa el botón **↑ Cargar mensajes anteriores** para ver el historial.

---

## Formato de mensajes

MyTalk soporta markdown básico y bloques de código con syntax highlighting.

| Sintaxis | Resultado |
|----------|-----------|
| `**texto**` | **negrita** |
| `*texto*` | *cursiva* |
| `~~texto~~` | ~~tachado~~ |
| `` `código` `` | código inline |
| ` ```js\ncódigo\n``` ` | bloque de código con coloreado |
| `@Nombre` | mención (notifica al usuario) |

Pulsa el botón **?** junto al campo de texto para abrir la guía de formato con ejemplos.

### Lenguajes de código soportados

`javascript`, `typescript`, `python`, `php`, `html/xml`, `css`, `json`, `bash/sh`, `sql`, `java`, `csharp`, `cpp`, `rust`, `go`, `markdown`.

---

## Vista previa de enlaces

Al enviar un mensaje con una URL, la aplicación intenta obtener una vista previa (título, descripción, imagen). Los enlaces de **YouTube** muestran la miniatura del vídeo y se pueden reproducir inline.

---

## Hilos

Los hilos permiten responder a un mensaje específico en un espacio separado sin saturar el canal principal.

### Crear un hilo

Pasa el cursor sobre cualquier mensaje y pulsa 💬 en la barra de acciones. Se creará un hilo vinculado a ese mensaje y se abrirá el panel lateral.

### Abrir un hilo existente

- Haz clic en el badge **💬 N respuestas · Ver hilo →** que aparece bajo el mensaje.
- O pulsa el botón 💬 del header del canal para ver la **lista de todos los hilos** del canal.

### Título del hilo

El título aparece en el header del panel. Haz clic en él para editarlo (máx. 100 caracteres). Si no tiene título, se muestra el inicio del mensaje original.

### Lista de hilos del canal

Pulsa el icono 💬 en el header del canal para abrir el panel con todos los hilos, ordenados por actividad reciente.

---

## Menciones

Escribe `@` seguido del nombre o apodo de un miembro para mencionarlo. Aparecerá un desplegable con sugerencias; usa las flechas ↑↓ para navegar y `Enter` o `Tab` para seleccionar.

Los usuarios mencionados reciben una notificación y un badge en el canal correspondiente.

---

## Búsqueda

### Buscar en el canal actual

Pulsa el icono de filtro en el header del canal para buscar mensajes dentro del canal activo.

### Búsqueda global

Pulsa el icono de lupa o usa `Ctrl+K` para buscar en todos los servidores y canales a los que tienes acceso.

---

## Mensajes directos y amigos

### Solicitudes de amistad

1. En **Amigos** (icono 👥 en el rail de servidores), busca a un usuario por nombre y envíale una solicitud.
2. El destinatario la acepta o rechaza desde la misma sección.

### Conversaciones directas

Haz clic en el avatar de un miembro o usa el menú contextual → *Mensaje directo* para abrir una conversación privada.

### Grupos de DM

En *Mensajes directos*, crea un grupo e invita a varios usuarios.

---

## Estado y perfil

### Cambiar estado

Haz clic en tu avatar en la parte inferior del sidebar para desplegar el selector de estado:

| Estado | Color | Significado |
|--------|-------|-------------|
| En línea | 🟢 verde | Disponible |
| Ausente | 🟡 amarillo | Inactivo |
| No molestar | 🔴 rojo | Sin notificaciones |

### Estado personalizado

En el mismo menú, escribe un texto libre en el campo superior (máx. 60 caracteres) y pulsa ✓.

### Apodo en un servidor

Haz clic en el botón de apodo en la parte inferior del sidebar (dentro de un servidor) para establecer un nombre diferente visible solo en ese servidor.

---

## Notificaciones

Si concedes permiso, la aplicación envía **notificaciones push** al navegador incluso cuando la pestaña está cerrada: menciones, mensajes directos y nuevos mensajes en canales.

---

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Enter` | Enviar mensaje |
| `Shift+Enter` | Salto de línea |
| `Ctrl+K` | Búsqueda global |
| `↑ / ↓` | Navegar sugerencias de menciones |
| `Tab` / `Enter` | Seleccionar mención |
| `Esc` | Cancelar edición / cerrar menú |

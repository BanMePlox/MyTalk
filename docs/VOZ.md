# Voz en MyTalk — límites actuales / current voice limits

MyTalk usa **WebRTC en malla completa (full mesh)** para canales de voz y llamadas DM. La señalización (quién entra, ofertas SDP, ICE) pasa por **Laravel Reverb**; el audio va **directamente entre navegadores**.

## Qué hay hoy

| Aspecto | Estado |
|---------|--------|
| Servidores ICE | Solo **STUN** (`stun.l.google.com`) — sin TURN propio |
| Topología | **Full mesh**: cada par de participantes mantiene su propia conexión P2P |
| SFU / MCU | **No** — no hay servidor de medios centralizado |
| Compartir pantalla | Sí, vía `getDisplayMedia` (misma malla P2P) |

## Grupos recomendados

- **2–4 personas**: experiencia razonable en LAN o con buena conectividad.
- **5+**: la malla crece rápido (N×(N−1)/2 enlaces); más CPU, ancho de banda y fallos parciales.

## Qué falla con NAT estricto o redes corporativas

Sin **TURN**, muchos pares no pueden establecer ICE si ambos están detrás de NAT simétrico o firewalls que bloquean UDP:

- Un usuario **no escucha** a otro aunque ambos “estén en la llamada”.
- Conexiones **intermitentes** al cambiar de red (Wi‑Fi ↔ móvil).
- Redes que **bloquean UDP** o puertos altos: la llamada puede no arrancar.

MyTalk **no garantiza** conectividad P2P en todos los entornos. Para producción seria haría falta al menos un relay TURN (p. ej. coturn) y, para grupos grandes, un **SFU** (Livekit, mediasoup, etc.) — fuera del alcance actual del proyecto.

## Demo honesta

Para portfolio o pruebas locales:

1. Usa **2–3 pestañas o dispositivos** en la misma red cuando sea posible.
2. Prueba el canal **#sala-voz** del seed de demo (`php artisan db:seed --class=DemoSeeder`).
3. Si alguien no se oye, asume limitación de NAT/STUN, no un bug de UI.

## Referencia en código

Los servidores ICE están definidos en `resources/js/Contexts/VoiceContext.jsx` (`ICE_SERVERS`).

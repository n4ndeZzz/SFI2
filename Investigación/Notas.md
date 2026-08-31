**En Open Stage Control**

- **send** (`127.0.0.1:7000`) — a dónde manda Open Stage Control lo que generan los widgets. Es la dirección de salida: "lo que yo genero, va para allá".
- **port** (`8090` en tu caso) — el puerto HTTP de la interfaz web del propio Open Stage Control. Es por dónde abres el cliente en el navegador. No tiene nada que ver con el envío/recepción de OSC, es solo la puerta de entrada a la app.
- **osc-port** (`8001`) — el puerto donde Open Stage Control *escucha* mensajes OSC entrantes. Es la dirección de entrada: por ahí es donde otra app (como TD) le puede mandar datos de vuelta para actualizar sus widgets.

**En TouchDesigner**

- **Network Port (oscin)** (`7000`) — el puerto donde ese nodo escucha. Tiene que ser el mismo número que pusiste en "send" de Open Stage Control, porque ese es literalmente el destino al que Open Stage Control está mandando.
- **Network Port (oscout)** (`8001`) — el puerto de destino al que ese nodo manda sus mensajes. Tiene que coincidir con el "osc-port" de Open Stage Control, porque ahí es donde Open Stage Control está escuchando.
- **Network Address (oscout)** (`127.0.0.1`) — la IP de la máquina destino. Como todo corre en tu misma computadora, es siempre localhost.

**La forma de recordarlo:** cada par tiene que apuntarse mutuamente —

```
Open Stage Control  send: 7000        ──▶   TD  oscin  Network Port: 7000
Open Stage Control  osc-port: 8001    ◀──   TD  oscout Network Port: 8001 + Address: 127.0.0.1
```

`port` (el 8090) es el único que queda fuera de esa pareja — solo sirve para que tú abras la interfaz en el navegador, no participa en el puente de datos.
<img width="670" height="506" alt="image" src="https://github.com/user-attachments/assets/2e88f22c-2ef0-4dfe-ad1f-3def91c97344" />

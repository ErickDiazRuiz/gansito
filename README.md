# Gansito

Cashito, Taskito y Plansito en una sola web estática sobre Supabase. Sin servidor, sin coste.

```
Navegador (GitHub Pages) ──supabase-js──► Supabase
                                          ├── Postgres + RLS
                                          ├── Storage (videos)
                                          └── Realtime (websocket)
```

---

## 1. Base de datos

1. **Crea tu usuario**: Supabase → Authentication → Users → *Add user* → email + contraseña, marca **Auto Confirm User**.
2. Copia el **UUID** del usuario recién creado.
3. Abre `db.sql`, pega ese UUID en la línea `MI_UID :=` (línea 16).
4. Supabase → SQL Editor → New query → pega todo `db.sql` → **Run**.

> Antes de ejecutar, haz un backup: Database → Backups, o exporta `gastos` a CSV desde el Table Editor. El script mueve tablas y modifica datos.

### Paso que se olvida y rompe todo

Supabase → **Settings → API → Exposed schemas** → añade `cashito`, `taskito`, `plansito` a la lista (junto a `public`).

Sin esto, PostgREST devuelve 404 en todas las consultas y la web se queda cargando.

### Qué hace el script

- Crea los tres esquemas y mueve tus tablas de `public` a `cashito`.
- Crea `taskito` (aparatos → tareas → log, consumibles, videos) y `plansito`.
- Migra el cronograma de la EP3300 desde el código Python a filas editables.
- Añade `user_id` a las 12 tablas, rellena con tu UUID y activa **RLS**.
- Arregla `item_tipo`: el bot guardaba `necesidad`/`gusto` pero el código leía `essential`/`treat`, así que el split básico/gusto llevaba mostrando €0,00 desde siempre. Ahora todo queda en `basico`/`gusto`.
- Borra `unidades` y `precio_unidad`, que existían pero nunca se llenaron.
- Crea el bucket privado `taskito-videos`.

---

## 2. Configuración

Supabase → Settings → API. Copia *Project URL* y *anon public key* en `config.js`:

```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

La anon key es pública por diseño — va en el HTML y cualquiera puede verla. Lo que protege tus datos es RLS: sin sesión iniciada, las consultas devuelven cero filas.

---

## 3. GitHub Pages

```bash
cd gansito
git init && git add . && git commit -m "Gansito"
git branch -M main
git remote add origin https://github.com/ErickDiazRuiz/gansito.git
git push -u origin main
```

En el repo: **Settings → Pages → Source: Deploy from a branch → main / (root)**.

En un par de minutos: `https://erickdiazruiz.github.io/gansito/`

Cada `git push` redespliega. No hay build.

---

## 4. Los videos de Taskito

Súbelos a Storage → `taskito-videos`, con la ruta `{tarea_id}/nombre.mp4`. Luego registra la fila:

```sql
insert into taskito.videos (tarea_id, titulo, storage_path)
values (
  (select id from taskito.tareas where clave = 'descal'),
  'Descalcificación',
  '8/descalcificacion.mp4'
);
```

La app genera URLs firmadas de una hora, así que el bucket sigue privado.

---

## 5. Apagar Fly

Cuando la web funcione:

```bash
fly scale count 0 -a cashito-bot
```

O borra la app entera desde el panel de Fly. Supabase no se toca — es la misma base.

Lo que se pierde al apagar el bot: el resumen diario automático, el aviso de fijos del día y la alerta al 80% del presupuesto. Eran lo único que necesitaba un proceso corriendo. Si algún día quieres recuperar la alerta, un GitHub Action con `schedule:` la cubre gratis.

---

## Detalles que conviene saber

**Supabase free pausa el proyecto tras ~7 días sin actividad.** Si entras seguido no pasa nada; si te olvidas un mes, hay que despertarlo a mano desde el panel.

**El cálculo de vencimientos cambió.** El bot usaba un calendario fijo anclado al 05/06/2026: las fechas nunca se movían. Ahora la próxima fecha se calcula desde la última vez que marcaste la tarea. Si limpias el grupo dos semanas tarde, el siguiente ciclo se corre esas dos semanas. La `fecha_ancla` solo se usa para tareas que nunca has marcado.

**Tiempo real.** Cualquier escritura repinta todas las pestañas abiertas por websocket. Si más adelante conectas un ESP32 que escriba en Postgres, la web reacciona sola.

**Paginación.** `cargarTodo()` pide en bloques de 1000. El bot sumaba sin paginar, así que el balance habría empezado a inflarse silenciosamente al pasar esa cifra.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `db.sql` | Migración completa. Se ejecuta una vez. |
| `config.js` | Tus claves de Supabase. |
| `db.js` | Cliente, auth, lectura paginada, escrituras. |
| `app.js` | Estado, vistas y eventos. |
| `styles.css` | Tema oscuro y el barrido de navegación. |
| `index.html` | Estructura y login. |

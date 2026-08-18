# Gansito

Cashito, Taskito y Plansito en una sola web estática sobre Supabase. Sin servidor, sin coste.

```
Navegador (GitHub Pages) ──supabase-js──► Supabase
                                          ├── Postgres + RLS
                                          ├── Storage (videos)
                                          └── Realtime (websocket)
```

---

## Módulos

| Módulo | Qué guarda | Esquema |
|---|---|---|
| Cashito | Gastos, ingresos, fijos, presupuesto | `cashito` |
| Gansirato | Mantenimiento de aparatos | `gansirato` |
| Taskito | Procesos vivos (masa madre) | `taskito` |
| Chefcito | Recetario con fotos | `chefcito` |
| Comidita | Alimentos, registro diario y lista de compra | `comidita` |
| Plansito | Ideas y planes | `plansito` |

---

## 1. Base de datos

1. **Crea tu usuario**: Supabase → Authentication → Users → *Add user* → email + contraseña, marca **Auto Confirm User**.
2. Copia el **UUID** del usuario recién creado.
3. Los tres scripts ya traen tu UUID. No hay que editar nada.
4. Supabase → SQL Editor → New query → pega todo `db.sql` → **Run**.

> Antes de ejecutar, haz un backup: Database → Backups, o exporta `gastos` a CSV desde el Table Editor. El script mueve tablas y modifica datos.

5. Ejecuta después **`db2.sql`** y luego **`db3.sql`** igual que el anterior. `db2.sql` necesita tu UUID otra vez en su línea 11; `db3.sql` no pide nada. El primero renombra el esquema `taskito` a `gansirato` y crea un `taskito` nuevo; el segundo añade el plan de cultivo y el modo nevera.

### Paso que se olvida y rompe todo

Supabase → **Settings → Data API → Exposed schemas** → la lista debe quedar:

```
public, graphql_public, cashito, gansirato, taskito, plansito
```

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

`config.js` ya viene con tu Project URL y tu anon key. No hay que tocarlo.

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

## 5. Notificaciones

Ver `NOTIFICACIONES.md`. Un cron diario en GitHub Actions revisa vencimientos y manda un push, con la web cerrada. Gratis.

---

## 6. Sobre el bot apagado

Lo que se pierde sin el bot: el resumen diario automático, el aviso de fijos del día y la alerta al 80% del presupuesto. Eran lo único que necesitaba un proceso corriendo. Si algún día quieres recuperar la alerta, un GitHub Action con `schedule:` la cubre gratis.

---

## Detalles que conviene saber

**Supabase free pausa el proyecto tras ~7 días sin actividad.** Si entras seguido no pasa nada; si te olvidas un mes, hay que despertarlo a mano desde el panel.

**El cálculo de vencimientos cambió.** El bot usaba un calendario fijo anclado al 05/06/2026: las fechas nunca se movían. Ahora la próxima fecha se calcula desde la última vez que marcaste la tarea. Si limpias el grupo dos semanas tarde, el siguiente ciclo se corre esas dos semanas. La `fecha_ancla` solo se usa para tareas que nunca has marcado.

**Tiempo real.** Cualquier escritura repinta todas las pestañas abiertas por websocket. Si más adelante conectas un ESP32 que escriba en Postgres, la web reacciona sola.

**Comidita guarda los macros ya calculados en cada registro**, no una referencia al alimento. Si mañana corriges las calorías del pollo, tu historial de la semana pasada no cambia — refleja lo que sabías cuando lo comiste. Es la diferencia entre un registro y una consulta.

**La lista de compra sale del plan**, no del historial: cantidad diaria de cada alimento × los días que elijas. Cambias de 4 a 7 días y las cantidades se ajustan solas.

**Las cantidades de Chefcito se guardan separadas** (`200` · `g` · `pollo`) en vez de como texto, que es lo que permite escalar la receta a ½×, 2× o 3× sin volver a escribirla. El redondeo se ajusta a la magnitud: por debajo de 10 va a cuartos, por encima de 100 a enteros, porque «133,33 g de harina» no lo pesa nadie.

**Las harinas siguen la nomenclatura alemana.** El número Type mide cenizas (minerales) en mg por 100 g, no proteína: cuanto más alto, más salvado, más microbiota nativa y más actividad. Por eso se arranca con integral o centeno y se mantiene con Type 550. Cada opción del desplegable trae su nota y una etiqueta de si es recomendable — la Type 405 aparece marcada como no recomendada porque está demasiado refinada para sostener un cultivo.

**El plan de la masa madre es feedforward; los registros son el feedback.** Las etapas dan la trayectoria de referencia según velocidad (1 o 2 alimentaciones diarias) y duración (7, 10 o 14 días). Lo que observas y anotas es lo que corrige la estimación real.

**Modo nevera.** Una masa madre no se mantiene activa todo el año. "Guardar en nevera" la duerme y cambia el sistema a mantenimiento semanal: un botón para registrar cada alimentación y un contador de días de retraso. "Despertar" la devuelve a activa — dale 2–3 alimentaciones a temperatura ambiente antes de hornear.

**El modelo de la masa madre.** Con menos de 3 observaciones que tengan temperatura *y* horas al pico, usa un Q10 genérico (6 h a 24 °C, Q10 = 2,5). A partir de la tercera, ajusta una regresión de ln(horas) sobre temperatura con tus propios datos. La calculadora inversa resta las horas estimadas a la hora objetivo para decirte cuándo alimentar.

**Paginación.** `cargarTodo()` pide en bloques de 1000. El bot sumaba sin paginar, así que el balance habría empezado a inflarse silenciosamente al pasar esa cifra.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `db.sql` | Migración inicial. Se ejecuta una vez. |
| `db2.sql` | Gansirato + módulo de masa madre. Después de `db.sql`. |
| `db3.sql` | Plan de cultivo y modo nevera. Después de `db2.sql`. |
| `db4.sql` | Harina de arranque separada. Después de `db3.sql`. |
| `db5.sql` | Suscripciones push y vista de pendientes. Después de `db4.sql`. |
| `db6.sql` | Chefcito: recetas, categorías y fotos. Después de `db5.sql`. |
| `db7.sql` | Comidita: alimentos, registro, plan y compra. Después de `db6.sql`. |
| `sw.js` | Service Worker: recibe los push con la web cerrada. |
| `cron/avisar.mjs` | Job diario que revisa vencimientos y envía los avisos. |
| `.github/workflows/avisos.yml` | El cron de GitHub Actions. |
| `NOTIFICACIONES.md` | Cómo montar las notificaciones, paso a paso. |
| `config.js` | Tus claves de Supabase. |
| `supabase.js` | Cliente, auth, lectura paginada, escrituras. |
| `app.js` | Estado, vistas y eventos. |
| `styles.css` | Tema oscuro y el barrido de navegación. |
| `index.html` | Estructura y login. |

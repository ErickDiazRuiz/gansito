# Notificaciones push

Aviso diario a las 7:00 cuando algo vence o vence mañana. Funciona con la web cerrada.

```
GitHub Actions (cron diario)
   └─► lee Supabase con service_role
       └─► envía Web Push ──► tu móvil / portátil
```

Todo gratis: Actions da 2000 min/mes y este job tarda ~20 s.

---

## 1. Generar las claves VAPID

Identifican a tu servidor ante los servicios de push. En una terminal:

```bash
npx web-push generate-vapid-keys
```

Devuelve dos claves. Guárdalas, las usas en los pasos 2 y 3.

---

## 2. La clave pública va en `app.js`

Busca esta línea (cerca del principio):

```js
const VAPID_PUBLIC = 'PEGA_AQUI_TU_CLAVE_PUBLICA';
```

Pega ahí la **Public Key**. Es pública por diseño: solo identifica quién envía.

---

## 3. Los secrets van en GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**.

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | `https://wvfzaoxhlzitxwprntbr.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API Keys → **service_role** |
| `VAPID_PUBLIC` | La Public Key del paso 1 |
| `VAPID_PRIVATE` | La Private Key del paso 1 |
| `VAPID_SUBJECT` | `mailto:tu@correo.com` |

> La **service_role key salta RLS por completo**. Solo puede vivir en Secrets, nunca en `config.js` ni en ningún archivo del repo. Si se filtra, cualquiera lee y borra toda tu base.

---

## 4. Base de datos

Ejecuta `db5.sql` en el SQL Editor.

Luego: **Settings → Data API → Exposed schemas** → añade `gansito`. La lista queda:

```
public, graphql_public, cashito, gansirato, taskito, plansito, gansito
```

---

## 5. Activar en cada dispositivo

Sube todo (`git push`), abre la web y ve a **Gansirato**. Arriba hay una tarjeta de Notificaciones con un botón **Activar**.

Hay que hacerlo en cada dispositivo donde quieras recibirlas: el móvil y el portátil son suscripciones distintas.

**En iPhone** solo funciona si añades Gansito a la pantalla de inicio: Safari → Compartir → *Añadir a pantalla de inicio*, y lo abres desde ese icono. Es una limitación de iOS, no de la app. La tarjeta te lo recuerda si detecta que estás en Safari sin instalar.

---

## 6. Probar sin esperar a mañana

Repo → pestaña **Actions** → *Avisos de mantenimiento* → **Run workflow**.

Mira el log. Si dice "Nada pendiente hoy" es que no hay nada por vencer — funciona, simplemente no había qué avisar. Para forzarlo, edita una tarea y ponle una frecuencia de 1 día.

---

## Detalles

**La hora.** El cron está a las 06:00 UTC = 07:00 en Berlín en horario de verano. En invierno llegará a las 07:00 CET porque UTC no cambia... en realidad llegará a las 07:00 solo en verano; en invierno serán las 06:00 hora local. Si te molesta, cambia el `cron:` en `.github/workflows/avisos.yml`. GitHub no entiende zonas horarias.

**Puntualidad.** GitHub Actions no garantiza la hora exacta en los cron; puede retrasarse 5-30 minutos si hay carga. Para un aviso de mantenimiento da igual.

**Un aviso por persona, no por tarea.** Si vencen cuatro cosas, llega una sola notificación que las resume. Cuatro notificaciones seguidas se ignoran; una que dice "3 tareas vencidas" se lee.

**Suscripciones caducadas.** Los navegadores las revocan solos cada cierto tiempo. El script detecta el 404/410 y borra la fila, así que la tabla se limpia sola. Si dejas de recibir avisos, vuelve a darle a Activar.

**Qué avisa.** Tareas de Gansirato vencidas o que vencen mañana, y la alimentación semanal de cualquier masa madre en nevera.

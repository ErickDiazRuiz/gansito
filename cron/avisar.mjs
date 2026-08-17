/* Gansito — aviso diario de mantenimiento
   Corre en GitHub Actions. Lee Supabase con la service_role key
   (salta RLS, por eso vive en Secrets y nunca en el navegador). */

import webpush from 'web-push';

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT,
  APP_URL
} = process.env;

const faltan = Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC, VAPID_PRIVATE })
  .filter(([, v]) => !v).map(([k]) => k);
if (faltan.length) {
  console.error('Faltan estos secrets en el repo:', faltan.join(', '));
  console.error('→ Settings → Secrets and variables → Actions → New repository secret');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:nadie@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

/* Sin supabase-js: solo hacen falta dos lecturas y dos escrituras.
   La librería arrastra un cliente de realtime que exige WebSocket nativo
   y revienta en Node < 22 aunque no se use. PostgREST por REST es suficiente. */
async function rest(metodo, esquema, recurso, { query = '', body, prefer } = {}) {
  const h = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Accept-Profile': esquema,
    'Content-Profile': esquema,
    'Content-Type': 'application/json'
  };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${recurso}${query}`, {
    method: metodo, headers: h, body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) {
    const t = await r.text();
    const e = new Error(`${r.status} ${t}`);
    e.status = r.status;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}

const hoy = new Date().toISOString().slice(0, 10);
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

/* ── qué vence ── */
let pend;
try {
  pend = await rest('GET', 'gansito', 'v_pendientes', { query: '?select=*' });
} catch (e) {
  console.error('No pude leer gansito.v_pendientes:', e.message);
  if (/schema|not find|404|PGRST/i.test(e.message))
    console.error('→ Falta añadir "gansito" en Supabase: Settings → Data API → Exposed schemas.');
  process.exit(1);
}
console.log(`Tareas programadas encontradas: ${pend.length}`);

/* ── masa madre en nevera ── */
let cultivos = [];
try {
  cultivos = await rest('GET', 'taskito', 'cultivos',
    { query: '?select=user_id,nombre,estado,ultima_mant,guardado_en&estado=eq.nevera' });
} catch (e) { console.error('Aviso: no pude leer cultivos:', e.message); }

/* Agrupa por usuario: un solo aviso por persona, no uno por tarea. */
const porUsuario = {};
const add = (uid, linea, urgente) => {
  porUsuario[uid] ??= { vencidas: [], manana: [] };
  porUsuario[uid][urgente ? 'vencidas' : 'manana'].push(linea);
};

for (const p of pend || []) {
  const d = dias(hoy, p.proxima);
  if (d < 0) add(p.user_id, `${p.tarea} (${p.aparato})`, true);
  else if (d <= 1) add(p.user_id, `${p.tarea} (${p.aparato})`, false);
}

for (const c of cultivos || []) {
  const base = c.ultima_mant || c.guardado_en;
  if (!base) continue;
  const proxima = new Date(new Date(base).getTime() + 7 * 864e5).toISOString().slice(0, 10);
  const d = dias(hoy, proxima);
  if (d < 0) add(c.user_id, `Alimentar ${c.nombre}`, true);
  else if (d <= 1) add(c.user_id, `Alimentar ${c.nombre}`, false);
}

if (!Object.keys(porUsuario).length) {
  console.log('Nada pendiente hoy.');
  process.exit(0);
}

/* ── enviar ── */
let subs;
try {
  subs = await rest('GET', 'gansito', 'push_subs', { query: '?select=*' });
} catch (e) { console.error('No pude leer push_subs:', e.message); process.exit(1); }
console.log(`Suscripciones registradas: ${subs.length}`);
if (!subs.length) {
  console.log('Nadie ha activado las notificaciones todavía. Dale a Activar en Gansirato.');
  process.exit(0);
}

let ok = 0, muertas = 0;

for (const [uid, g] of Object.entries(porUsuario)) {
  const mias = (subs || []).filter(s => s.user_id === uid);
  if (!mias.length) continue;

  const total = g.vencidas.length + g.manana.length;
  const title = g.vencidas.length
    ? `${g.vencidas.length} tarea${g.vencidas.length > 1 ? 's' : ''} vencida${g.vencidas.length > 1 ? 's' : ''}`
    : `${total} tarea${total > 1 ? 's' : ''} para mañana`;

  const partes = [];
  if (g.vencidas.length) partes.push(g.vencidas.slice(0, 3).join(', '));
  if (g.manana.length) partes.push('Mañana: ' + g.manana.slice(0, 3).join(', '));
  const body = partes.join(' · ').slice(0, 180);

  const payload = JSON.stringify({ title, body, url: APP_URL || '/gansito/', tag: 'mant-' + hoy });

  for (const s of mias) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      ok++;
      await rest('PATCH', 'gansito', 'push_subs',
        { query: `?id=eq.${s.id}`, body: { ultimo_ok: new Date().toISOString() }, prefer: 'return=minimal' });
    } catch (err) {
      // 404/410 = el navegador revocó la suscripción; se limpia sola.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await rest('DELETE', 'gansito', 'push_subs', { query: `?id=eq.${s.id}` });
        muertas++;
      } else {
        console.error(`Fallo enviando a ${s.id}:`, err.statusCode, err.body || err.message);
      }
    }
  }
}

console.log(`Enviadas: ${ok}. Suscripciones caducadas eliminadas: ${muertas}.`);

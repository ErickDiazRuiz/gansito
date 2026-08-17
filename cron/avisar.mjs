/* Gansito — aviso diario de mantenimiento
   Corre en GitHub Actions. Lee Supabase con la service_role key
   (salta RLS, por eso vive en Secrets y nunca en el navegador). */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT,
  APP_URL
} = process.env;

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC, VAPID_PRIVATE })) {
  if (!v) { console.error(`Falta el secret ${k}`); process.exit(1); }
}

webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:nadie@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const hoy = new Date().toISOString().slice(0, 10);
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

/* ── qué vence ── */
const { data: pend, error: e1 } = await sb.schema('gansito').from('v_pendientes').select('*');
if (e1) { console.error('Error leyendo pendientes:', e1.message); process.exit(1); }

/* ── masa madre en nevera ── */
const { data: cultivos } = await sb.schema('taskito').from('cultivos')
  .select('user_id, nombre, estado, ultima_mant, guardado_en').eq('estado', 'nevera');

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
const { data: subs, error: e2 } = await sb.schema('gansito').from('push_subs').select('*');
if (e2) { console.error('Error leyendo suscripciones:', e2.message); process.exit(1); }

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
      await sb.schema('gansito').from('push_subs').update({ ultimo_ok: new Date().toISOString() }).eq('id', s.id);
    } catch (err) {
      // 404/410 = el navegador revocó la suscripción; se limpia sola.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await sb.schema('gansito').from('push_subs').delete().eq('id', s.id);
        muertas++;
      } else {
        console.error(`Fallo enviando a ${s.id}:`, err.statusCode, err.body || err.message);
      }
    }
  }
}

console.log(`Enviadas: ${ok}. Suscripciones caducadas eliminadas: ${muertas}.`);

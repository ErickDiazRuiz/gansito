import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

const cash = () => sb.schema('cashito');
const task = () => sb.schema('taskito');
const plan = () => sb.schema('plansito');

/* ── auth ── */
export const session = async () => (await sb.auth.getSession()).data.session;
export const login  = (email, password) => sb.auth.signInWithPassword({ email, password });
export const logout = () => sb.auth.signOut();

/* ── lectura paginada ──
   PostgREST corta en 1000 filas por defecto. El bot sumaba sin paginar,
   así que el balance habría empezado a mentir al pasar ese número. */
async function all(q, cols, order) {
  const out = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    let r = q().select(cols).range(from, from + step - 1);
    if (order) r = r.order(order.col, { ascending: order.asc !== false });
    const { data, error } = await r;
    if (error) throw error;
    out.push(...data);
    if (data.length < step) break;
  }
  return out;
}

export async function cargarTodo() {
  const [gastos, ingresos, fijos, items, presupuestos,
         aparatos, tareas, log, consumibles, videos, planes] = await Promise.all([
    all(() => cash().from('gastos'), '*', { col: 'fecha', asc: false }),
    all(() => cash().from('ingresos'), '*', { col: 'fecha', asc: false }),
    all(() => cash().from('gastos_fijos'), '*', { col: 'dia_cobro' }),
    all(() => cash().from('items'), '*', { col: 'nombre' }),
    all(() => cash().from('presupuesto'), '*'),
    all(() => task().from('aparatos'), '*', { col: 'orden' }),
    all(() => task().from('tareas'), '*', { col: 'orden' }),
    all(() => task().from('log'), '*', { col: 'fecha', asc: false }),
    all(() => task().from('consumibles'), '*', { col: 'codigo' }),
    all(() => task().from('videos'), '*'),
    all(() => plan().from('planes'), '*', { col: 'created_at', asc: false })
  ]);

  // Ensamblar el árbol de Taskito
  aparatos.forEach(a => {
    a.tareas = tareas.filter(t => t.aparato_id === a.id);
    a.cons   = consumibles.filter(c => c.aparato_id === a.id);
    a.tareas.forEach(t => {
      t.log    = log.filter(l => l.tarea_id === t.id);
      t.videos = videos.filter(v => v.tarea_id === t.id);
      t.ultima = t.log.length ? t.log[0].fecha : null;
    });
    a.log = log
      .filter(l => a.tareas.some(t => t.id === l.tarea_id))
      .map(l => ({ ...l, nombre: (tareas.find(t => t.id === l.tarea_id) || {}).nombre }));
  });

  return { gastos, ingresos, fijos, items, presupuestos, aparatos, planes };
}

/* ── escritura ──
   Todas devuelven la fila creada/actualizada para poder revertirla. */
const one = async (p) => { const { data, error } = await p.select().single(); if (error) throw error; return data; };

export const addGasto  = (g)     => one(cash().from('gastos').insert(g));
export const editGasto = (id, g) => one(cash().from('gastos').update(g).eq('id', id));
export const delGasto  = (id)    => cash().from('gastos').delete().eq('id', id);

export const addIngreso  = (i)     => one(cash().from('ingresos').insert(i));
export const editIngreso = (id, i) => one(cash().from('ingresos').update(i).eq('id', id));
export const delIngreso  = (id)    => cash().from('ingresos').delete().eq('id', id);

export const addFijo  = (f)     => one(cash().from('gastos_fijos').insert(f));
export const editFijo = (id, f) => one(cash().from('gastos_fijos').update(f).eq('id', id));
export const delFijo  = (id)    => cash().from('gastos_fijos').delete().eq('id', id);

export const addItem = (nombre) => one(cash().from('items').insert({ nombre }));

export async function setPresupuesto(year, mes, monto) {
  const { data } = await cash().from('presupuesto').select('id').eq('year', year).eq('mes', mes);
  if (data && data.length) return one(cash().from('presupuesto').update({ monto }).eq('id', data[0].id));
  return one(cash().from('presupuesto').insert({ year, mes, monto }));
}

export const addLog   = (tarea_id, nota) => one(task().from('log').insert({ tarea_id, nota }));
export const delLog   = (id)             => task().from('log').delete().eq('id', id);
export const setStock = (id, stock)      => one(task().from('consumibles').update({ stock }).eq('id', id));

export const addAparato  = (a)     => one(task().from('aparatos').insert(a));
export const editAparato = (id, a) => one(task().from('aparatos').update(a).eq('id', id));
export const delAparato  = (id)    => task().from('aparatos').delete().eq('id', id);
export const addTarea    = (t)     => one(task().from('tareas').insert(t));
export const editTarea   = (id, t) => one(task().from('tareas').update(t).eq('id', id));
export const delTarea    = (id)    => task().from('tareas').delete().eq('id', id);

export const addPlan  = (p)     => one(plan().from('planes').insert(p));
export const editPlan = (id, p) => one(plan().from('planes').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id));
export const delPlan  = (id)    => plan().from('planes').delete().eq('id', id);

/* ── videos ── */
export async function subirVideo(tarea_id, titulo, file) {
  const path = `${tarea_id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await sb.storage.from('taskito-videos').upload(path, file);
  if (error) throw error;
  return one(task().from('videos').insert({ tarea_id, titulo, storage_path: path }));
}
export async function urlVideo(storage_path) {
  const { data, error } = await sb.storage.from('taskito-videos').createSignedUrl(storage_path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/* ── tiempo real ──
   Cualquier escritura (esta pestaña, otra, o un script) repinta la vista. */
export function escuchar(onChange) {
  return sb.channel('gansito')
    .on('postgres_changes', { event: '*', schema: 'cashito' },  onChange)
    .on('postgres_changes', { event: '*', schema: 'taskito' },  onChange)
    .on('postgres_changes', { event: '*', schema: 'plansito' }, onChange)
    .subscribe();
}

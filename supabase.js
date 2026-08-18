import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

const cash = () => sb.schema('cashito');
const gans = () => sb.schema('gansirato');   // aparatos y mantenimiento
const task = () => sb.schema('taskito');     // procesos vivos (masa madre)
const plan = () => sb.schema('plansito');
const gnst = () => sb.schema('gansito');    // infraestructura (push)
const chef = () => sb.schema('chefcito');   // recetario

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
         aparatos, tareas, log, consumibles, videos, planes,
         cultivos, registros, categorias, recetas, ingredientes] = await Promise.all([
    all(() => cash().from('gastos'), '*', { col: 'fecha', asc: false }),
    all(() => cash().from('ingresos'), '*', { col: 'fecha', asc: false }),
    all(() => cash().from('gastos_fijos'), '*', { col: 'dia_cobro' }),
    all(() => cash().from('items'), '*', { col: 'nombre' }),
    all(() => cash().from('presupuesto'), '*'),
    all(() => gans().from('aparatos'), '*', { col: 'orden' }),
    all(() => gans().from('tareas'), '*', { col: 'orden' }),
    all(() => gans().from('log'), '*', { col: 'fecha', asc: false }),
    all(() => gans().from('consumibles'), '*', { col: 'codigo' }),
    all(() => gans().from('videos'), '*'),
    all(() => plan().from('planes'), '*', { col: 'created_at', asc: false }),
    all(() => task().from('cultivos'), '*', { col: 'inicio' }),
    all(() => task().from('registros'), '*', { col: 'fecha', asc: false }),
    all(() => chef().from('categorias'), '*', { col: 'orden' }),
    all(() => chef().from('recetas'), '*', { col: 'titulo' }),
    all(() => chef().from('ingredientes'), '*', { col: 'orden' })
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

  cultivos.forEach(c => { c.registros = registros.filter(r => r.cultivo_id === c.id); });

  recetas.forEach(r => { r.ings = ingredientes.filter(i => i.receta_id === r.id); });

  return { gastos, ingresos, fijos, items, presupuestos, aparatos, planes, cultivos,
           categorias, recetas };
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

export const addLog   = (tarea_id, nota) => one(gans().from('log').insert({ tarea_id, nota }));
export const delLog   = (id)             => gans().from('log').delete().eq('id', id);
export const setStock = (id, stock)      => one(gans().from('consumibles').update({ stock }).eq('id', id));

export const addAparato  = (a)     => one(gans().from('aparatos').insert(a));
export const editAparato = (id, a) => one(gans().from('aparatos').update(a).eq('id', id));
export const delAparato  = (id)    => gans().from('aparatos').delete().eq('id', id);
export const addTarea    = (t)     => one(gans().from('tareas').insert(t));
export const editTarea   = (id, t) => one(gans().from('tareas').update(t).eq('id', id));
export const delTarea    = (id)    => gans().from('tareas').delete().eq('id', id);

export const addPlan  = (p)     => one(plan().from('planes').insert(p));
export const editPlan = (id, p) => one(plan().from('planes').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id));
export const delPlan  = (id)    => plan().from('planes').delete().eq('id', id);

/* ── taskito: cultivos ── */
export const addCultivo   = (c)     => one(task().from('cultivos').insert(c));
export const editCultivo  = (id, c) => one(task().from('cultivos').update(c).eq('id', id));
export const delCultivo   = (id)    => task().from('cultivos').delete().eq('id', id);
export const addRegistro  = (r)     => one(task().from('registros').insert(r));
export const editRegistro = (id, r) => one(task().from('registros').update(r).eq('id', id));
export const delRegistro  = (id)    => task().from('registros').delete().eq('id', id);

/* ── chefcito ── */
export const addReceta  = (r)     => one(chef().from('recetas').insert(r));
export const editReceta = (id, r) => one(chef().from('recetas').update({ ...r, updated_at: new Date().toISOString() }).eq('id', id));
export const delReceta  = (id)    => chef().from('recetas').delete().eq('id', id);
export const addCategoria = (c)   => one(chef().from('categorias').insert(c));
export const delCategoria = (id)  => chef().from('categorias').delete().eq('id', id);

export async function setIngredientes(receta_id, lista) {
  await chef().from('ingredientes').delete().eq('receta_id', receta_id);
  if (!lista.length) return [];
  const { data, error } = await chef().from('ingredientes')
    .insert(lista.map((x, i) => ({ ...x, receta_id, orden: i }))).select();
  if (error) throw error;
  return data;
}

export async function subirFoto(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('chefcito-fotos').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
export async function urlFoto(path) {
  const { data, error } = await sb.storage.from('chefcito-fotos').createSignedUrl(path, 7200);
  if (error) throw error;
  return data.signedUrl;
}
export const borrarFoto = (path) => sb.storage.from('chefcito-fotos').remove([path]);

/* ── videos ── */
export async function subirVideo(tarea_id, titulo, file) {
  const path = `${tarea_id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await sb.storage.from('taskito-videos').upload(path, file);
  if (error) throw error;
  return one(gans().from('videos').insert({ tarea_id, titulo, storage_path: path }));
}
export async function urlVideo(storage_path) {
  const { data, error } = await sb.storage.from('taskito-videos').createSignedUrl(storage_path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/* ── notificaciones push ── */
export const listarSubs = async () => {
  const { data, error } = await gnst().from('push_subs').select('*');
  if (error) throw error; return data;
};
export const guardarSub = (s) => one(gnst().from('push_subs').upsert(s, { onConflict: 'endpoint' }));
export const borrarSub  = (endpoint) => gnst().from('push_subs').delete().eq('endpoint', endpoint);

/* ── tiempo real ──
   Cualquier escritura (esta pestaña, otra, o un script) repinta la vista. */
export function escuchar(onChange) {
  return sb.channel('gansito')
    .on('postgres_changes', { event: '*', schema: 'cashito' },  onChange)
    .on('postgres_changes', { event: '*', schema: 'gansirato' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'taskito' },   onChange)
    .on('postgres_changes', { event: '*', schema: 'plansito' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'chefcito' }, onChange)
    .subscribe();
}

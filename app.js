import * as api from './supabase.js';

/* ══ helpers ══ */
const $ = id => document.getElementById(id);
const eur = n => '€' + (+n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = d => new Date(d).toISOString().slice(0, 10);
const hoy = () => iso(new Date());
const dias = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
const suma = (a, k = 'monto') => a.reduce((x, y) => x + (+y[k] || 0), 0);
const val = id => { const e = $(id); return e ? e.value.trim() : ''; };
const dstr = f => {
  const d = iso(f), n = dias(d, hoy());
  return n === 0 ? 'hoy' : n === 1 ? 'ayer'
    : new Date(d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: n > 300 ? 'numeric' : undefined });
};

const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none"/>',
  coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9.5h1.8a2.2 2.2 0 0 1 0 4.4H17"/><path d="M7.5 4.5v1.6M11 4v2M14.5 4.5v1.6"/>',
  bike: '<circle cx="6" cy="17" r="3.4"/><circle cx="18" cy="17" r="3.4"/><path d="M6 17l4-8h4l4 8M9.5 9h4.5M14 9l2.5 4"/>',
  bulb: '<path d="M9.2 17.5h5.6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6h5.4c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
  play: '<path d="M8 5.5 18 12 8 18.5z"/>',
  flask: '<path d="M10 3v6.2L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M8.5 3h7M7.4 14h9.2"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  wash: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><circle cx="12" cy="14" r="4"/><path d="M7.5 6.5h.01M11 6.5h.01"/>',
  tool: '<path d="M14.5 5.5a4.5 4.5 0 0 0 5.9 5.9L21 12l-9 9-3-3 9-9z"/><path d="M8 8 4 4M3 9l6-6"/>',
  bread: '<path d="M4 11.5c0-3.6 3.6-5.5 8-5.5s8 1.9 8 5.5c0 1.3-1 2.1-2 2.1v3.6a2.3 2.3 0 0 1-2.3 2.3H8.3A2.3 2.3 0 0 1 6 17.2v-3.6c-1 0-2-.8-2-2.1z"/><path d="M9 9.5c.6 1 .3 2-.4 2.8M13 9.4c.6 1 .3 2-.4 2.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M4.5 12.5 9 17 19.5 6.5"/>'
};
const sv = (n, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.7}" stroke-linecap="round" stroke-linejoin="round">${IC[n] || IC.box}</svg>`;
const ICONOS = ['coffee', 'bike', 'wash', 'tool', 'box'];

const CATS = {
  'Comida': ['Supermercado', 'Restaurante', 'Delivery', 'Café/Bar'],
  'Transporte': ['Metro/Bus', 'Taxi', 'Gasolina', 'Tren', 'Vuelos'],
  'Hogar': ['Alquiler', 'Servicios', 'Internet', 'Muebles', 'Ferretería', 'Limpieza'],
  'Salud': ['Farmacia', 'Médico', 'Gimnasio', 'Seguro'],
  'Educación': ['Universidad', 'Libros', 'Cursos', 'Idiomas'],
  'Ocio': ['Cine', 'Videojuegos', 'Streaming', 'Deporte', 'Hobbies'],
  'Tecnología': ['Dispositivos', 'Componentes', 'Suscripciones'],
  'Otros': ['Otro']
};
const CATC = {
  'Comida': '#52B788', 'Transporte': '#4A9FD8', 'Hogar': '#F4A261', 'Salud': '#E76F8F',
  'Educación': '#8B7DDB', 'Ocio': '#E9C46A', 'Tecnología': '#6BC5C5', 'Otros': '#7A7872'
};
const colCat = c => CATC[c] || '#7A7872';
const EST = { idea: ['Idea', '#8B7DDB'], curso: ['En curso', '#F4A261'], hecho: ['Hecho', '#52B788'], desc: ['Descartado', '#63615B'] };
const MODS = [
  { id: 'cashito',   nm: 'Cashito',   ic: 'wallet', ac: '--cash', bg: '--cash-bg' },
  { id: 'gansirato', nm: 'Gansirato', ic: 'coffee', ac: '--task', bg: '--task-bg' },
  { id: 'taskito',   nm: 'Taskito',   ic: 'bread',  ac: '--mm',   bg: '--mm-bg' },
  { id: 'plansito',  nm: 'Plansito',  ic: 'bulb',   ac: '--plan', bg: '--plan-bg' }
];
const ACC = { home: '--task', cashito: '--cash', gansirato: '--task', aparato: '--task',
              taskito: '--mm', cultivo: '--mm', plansito: '--plan' };
/* Harinas como se venden en Rewe, Edeka, Aldi, Lidl.
   El número Type mide cenizas (minerales) en mg/100 g, no proteína:
   más alto = más salvado = más microbiota nativa y más actividad. */
const HARINAS = [
  { id: 'Roggenvollkornmehl',      g: 'arranque', r: 'top',
    h: 'Centeno integral. El arranque más rápido y fiable: máxima microbiota y enzimas. Si dudas, esta.' },
  { id: 'Roggenmehl Type 1150',    g: 'arranque', r: 'buena',
    h: 'Centeno oscuro. Casi tan bueno como el integral y más fácil de encontrar.' },
  { id: 'Weizenvollkornmehl',      g: 'arranque', r: 'buena',
    h: 'Trigo integral. Arranque fiable y sabor más suave que el centeno.' },
  { id: 'Roggenmehl Type 997',     g: 'arranque', r: 'ok',
    h: 'Centeno claro. Funciona, algo más lento que el 1150.' },
  { id: 'Weizenmehl Type 1050',    g: 'ambas',    r: 'buena',
    h: 'Trigo semi-integral. Sirve para arrancar y para mantener. Buen punto medio.' },
  { id: 'Weizenmehl Type 550',     g: 'mant',     r: 'top',
    h: 'La harina de pan estándar en Alemania, ~11-12 % proteína. La opción por defecto para mantener.' },
  { id: 'Weizenmehl Type 812',     g: 'mant',     r: 'buena',
    h: 'Algo más mineral que la 550. Cultivo un poco más activo, sabor más marcado.' },
  { id: 'Dinkelmehl Type 630',     g: 'mant',     r: 'ok',
    h: 'Espelta. Fermenta rápido pero el gluten es frágil: vigila el pico, se pasa antes.' },
  { id: 'Weizenmehl Type 405',     g: 'mant',     r: 'evitar',
    h: 'Harina de repostería, muy refinada. Poca ceniza y poca microbiota: el cultivo va lento y flojo. Evítala.' }
];
const harinaInfo = id => HARINAS.find(x => x.id === id) || { h: '', r: 'ok' };
const COLR = { top: 'var(--cash)', buena: 'var(--mm)', ok: 'var(--tx2)', evitar: 'var(--dng)' };
const LBLR = { top: 'recomendada', buena: 'buena', ok: 'aceptable', evitar: 'no recomendada' };
const optsHarina = (grupos, sel) => HARINAS.filter(x => grupos.includes(x.g) || x.g === 'ambas')
  .map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${x.id}</option>`).join('');

/* Clave pública VAPID. Es pública por diseño: identifica al servidor
   que envía. La privada vive solo en GitHub Secrets. */
const VAPID_PUBLIC = 'PEGA_AQUI_TU_CLAVE_PUBLICA';

const OLORES = [['acido-frutal','Ácido / frutal'],['neutro','Neutro'],['queso','Queso / pies'],
                ['acetona','Acetona'],['podrido','Podrido']];

/* ══ estado ══ */
let D = null;
let view = 'home', arg = null, tab = 'hoy', filt = 'todos', cat = null, per = 'month';
let undoFn = null, tmr = null, ch1 = null, ch2 = null, silencio = false;

/* ══ derivados ══ */
const catOf = g => g.categoria;
const fechaOf = g => iso(g.fecha);

function rango() {
  const e = new Date(), y = e.getFullYear(), m = e.getMonth();
  if (per === 'week') { const s = new Date(e); s.setDate(e.getDate() - ((e.getDay() + 6) % 7)); return [iso(s), iso(e)]; }
  if (per === 'month') return [iso(new Date(y, m, 1)), iso(e)];
  if (per === 'last_month') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (per === 'year') return [iso(new Date(y, 0, 1)), iso(e)];
  return [iso(new Date(y, m, 1)), iso(e)];
}
const enPer = () => { const [a, b] = rango(); return D.gastos.filter(g => { const f = fechaOf(g); return f >= a && f <= b; }); };
const fijosOn = () => D.fijos.filter(f => f.activo);
const totIng = () => suma(D.ingresos);
const balance = () => totIng() - suma(D.gastos);
const presupuesto = () => {
  const n = new Date(), p = D.presupuestos.find(x => x.year === n.getFullYear() && x.mes === n.getMonth() + 1);
  return p ? +p.monto : 0;
};
function proxima(t) {
  if (t.bajo_demanda || !t.freq_dias) return null;
  const base = t.ultima ? iso(t.ultima) : null;
  if (base) { const d = new Date(base + 'T12:00'); d.setDate(d.getDate() + t.freq_dias); return iso(d); }
  const anc = D.aparatos.find(a => a.id === t.aparato_id).fecha_ancla;
  const d = new Date(anc + 'T12:00');
  while (iso(d) < hoy()) d.setDate(d.getDate() + t.freq_dias);
  return iso(d);
}
const restan = t => { const p = proxima(t); return p == null ? null : dias(hoy(), p); };
const progTareas = a => a.tareas.filter(t => !t.bajo_demanda);
const vencidasDe = a => progTareas(a).filter(t => restan(t) < 0).length;
const vencidas = () => D.aparatos.reduce((n, a) => n + vencidasDe(a), 0);

/* ══ chrome ══ */
function drawer() {
  const cur = view === 'aparato' ? 'gansirato' : view === 'cultivo' ? 'taskito' : view;
  let h = `<button class="nav ${cur === 'home' ? 'sel' : ''}" data-go="home">
    <div class="ic" style="background:var(--sur2);color:var(--tx2)">${sv('home')}</div><div class="lb">Inicio</div></button>`;
  MODS.forEach(m => {
    let mt = '';
    if (m.id === 'cashito') mt = `<span class="mono">${eur(balance())}</span>`;
    if (m.id === 'gansirato') mt = vencidas() ? `<span class="chip" style="background:var(--task-bg);color:var(--task)">${vencidas()}</span>` : 'al día';
    if (m.id === 'taskito') mt = D.cultivos.length + (D.cultivos.length === 1 ? ' cultivo' : ' cultivos');
    if (m.id === 'plansito') mt = D.planes.filter(p => p.estado === 'curso').length + ' en curso';
    h += `<button class="nav ${cur === m.id ? 'sel' : ''}" data-go="${m.id}">
      <div class="ic" style="background:var(${m.bg});color:var(${m.ac})">${sv(m.ic)}</div>
      <div class="lb">${m.nm}</div><div class="mt">${mt}</div></button>`;
  });
  h += `<button class="nav" data-act="salir"><div class="ic" style="background:var(--sur2);color:var(--tx3)">${sv('box')}</div>
    <div class="lb" style="color:var(--tx3)">Cerrar sesión</div></button>`;
  $('dwin').innerHTML = h;
}
function crumb() {
  const p = [`<button data-go="home">gansito</button>`];
  const PADRE = { aparato: 'gansirato', cultivo: 'taskito' };
  if (view !== 'home') {
    const id = PADRE[view] || view;
    p.push('<span>/</span>', PADRE[view]
      ? `<button data-go="${id}">${id}</button>`
      : `<span style="color:var(${ACC[view]})">${id}</span>`);
  }
  if (view === 'aparato') {
    const a = ap();
    if (a) p.push('<span>/</span>', `<span style="color:var(--task)">${esc(a.nombre.toLowerCase())}</span>`);
  }
  if (view === 'cultivo') {
    const c = cul();
    if (c) p.push('<span>/</span>', `<span style="color:var(--mm)">${esc(c.nombre.toLowerCase())}</span>`);
  }
  $('cr').innerHTML = p.join('');
}
function go(v, a) {
  view = v; arg = a || null;
  if (v === 'cashito') tab = 'hoy';
  filt = 'todos'; cat = null; cerrarDw(); close(); render(); window.scrollTo(0, 0);
}
function cerrarDw() {
  $('dw').classList.remove('open');
  $('bg').classList.remove('on'); $('bg').setAttribute('aria-expanded', 'false');
}
function toast(m, fn, err) {
  const t = $('ts');
  $('tstx').textContent = m;
  undoFn = fn || null;
  $('tsun').style.display = fn ? '' : 'none';
  t.classList.toggle('err', !!err);
  t.classList.add('show');
  clearTimeout(tmr); tmr = setTimeout(() => t.classList.remove('show'), fn ? 5000 : 3200);
}
const fallo = e => { console.error(e); toast(e.message || 'Algo falló', null, true); };
function sheet(title, body) {
  $('mo').innerHTML = `<div class="ov"><div class="sheet">
    <div class="sh-h"><b>${title}</b><button data-act="cerrar" aria-label="Cerrar">×</button></div>${body}</div></div>`;
}
const close = () => { $('mo').innerHTML = ''; };

/* ══ vistas ══ */
function vHome() {
  const gp = enPer(), sp = suma(gp), bud = presupuesto();
  const pct = bud ? Math.min(100, Math.round(sp / bud * 100)) : 0;
  const fx = suma(fijosOn()), v = vencidas();
  return `<div class="view">
  <div class="proj tap" data-go="cashito">
    <div class="ptop"><div class="pic" style="background:var(--cash-bg);color:var(--cash)">${sv('wallet')}</div>
      <div class="grow"><div class="pnm">Cashito</div><div class="psb">Gastos e ingresos</div></div>
      <div class="amt" style="color:var(--cash)">${eur(balance())}</div></div>
    <div class="pbody">
      <div class="mini">
        <div><div class="k">Gastado</div><div class="v">${eur(sp)}</div></div>
        <div><div class="k">Budget</div><div class="v">${bud ? eur(bud) : '—'}</div></div>
        <div><div class="k">Fijos</div><div class="v">${eur(fx)}</div></div></div>
      <div class="track"><i style="width:${pct}%;background:${pct > 85 ? 'var(--dng)' : 'var(--cash)'}"></i></div>
      <button class="btn btn-q" style="width:100%;margin-top:11px" data-act="gasto-nuevo-home">+ Registrar gasto</button>
    </div></div>

  <button class="proj" data-go="gansirato"><div class="ptop">
    <div class="pic" style="background:var(--task-bg);color:var(--task)">${sv('coffee')}</div>
    <div class="grow"><div class="pnm">Gansirato</div><div class="psb">${D.aparatos.length} aparatos</div></div>
    ${v ? `<span class="chip" style="background:var(--task-bg);color:var(--task)">${v} vencida${v > 1 ? 's' : ''}</span>`
      : `<span class="chip" style="color:var(--tx3)">al día</span>`}</div></button>

  <button class="proj" data-go="taskito"><div class="ptop">
    <div class="pic" style="background:var(--mm-bg);color:var(--mm)">${sv('bread')}</div>
    <div class="grow"><div class="pnm">Taskito</div><div class="psb">Masa madre</div></div>
    ${(() => { const c = D.cultivos[0];
      if (!c) return `<span class="chip" style="color:var(--tx3)">sin cultivos</span>`;
      if (c.estado === 'nevera') { const mt = mantenimiento(c);
        return mt && mt.restan < 0
          ? `<span class="chip" style="background:var(--task-bg);color:var(--task)">alimentar</span>`
          : `<span class="chip" style="color:var(--tx3)">en nevera</span>`; }
      return `<span class="chip" style="background:var(--mm-bg);color:var(--mm)">día ${diaCultivo(c)}/${c.plan_dias}</span>`; })()}
    </div></button>

  <button class="proj" data-go="plansito"><div class="ptop">
    <div class="pic" style="background:var(--plan-bg);color:var(--plan)">${sv('bulb')}</div>
    <div class="grow"><div class="pnm">Plansito</div><div class="psb">${D.planes.length} planes</div></div>
    <span class="chip" style="color:var(--tx3)">${D.planes.filter(p => p.estado === 'curso').length} en curso</span>
    </div></button></div>`;
}

/* ── cashito ── */
const TABS = [['hoy', 'Hoy'], ['analisis', 'Análisis'], ['ajustes', 'Ajustes']];
const PERS = [['week', 'Semana'], ['month', 'Mes'], ['last_month', 'Anterior'], ['year', 'Año']];

const vCashito = () => `<div class="view">
  <div class="hrow"><div class="h1">Cashito</div><span class="sub mono">${eur(balance())}</span></div>
  <div class="ptabs">${TABS.map(([k, l]) => `<button class="ptab ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
  ${tab === 'hoy' ? tHoy() : tab === 'analisis' ? tAnal() : tAjus()}
  <button class="fab" data-act="gasto-nuevo" aria-label="Registrar gasto">${sv('plus', 2)}</button></div>`;

function frecuentes() {
  const lim = new Date(); lim.setDate(lim.getDate() - 30);
  const c = {};
  D.gastos.filter(g => g.item_nombre && fechaOf(g) >= iso(lim)).forEach(g => c[g.item_nombre] = (c[g.item_nombre] || 0) + 1);
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 7).map(x => x[0]);
}
function rowGasto(g) {
  return `<div class="row tap" data-gasto="${g.id}">
    <span style="width:5px;height:5px;border-radius:50%;background:${colCat(g.categoria)};flex:none"></span>
    <div class="grow"><div class="t1">${esc(g.item_nombre || g.subcategoria)}</div>
      <div class="t2">${esc(g.subcategoria)} · ${dstr(g.fecha)}${g.item_tipo ? ' · ' + (g.item_tipo === 'basico' ? 'básico' : 'gusto') : ''}${g.nota ? ' · ' + esc(g.nota) : ''}</div></div>
    <div class="amt">${eur(g.monto)}</div></div>`;
}
function tHoy() {
  const gp = enPer(), sp = suma(gp), bud = presupuesto();
  const pct = bud ? Math.min(100, Math.round(sp / bud * 100)) : 0;
  const rest = bud - sp, n = new Date();
  const quedan = Math.max(1, new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate() - n.getDate());
  const rec = D.gastos.slice(0, 12);
  const fr = frecuentes();
  return `<div class="kpis">
    <div class="kpi"><div class="k">Gastado este mes</div><div class="v">${eur(sp)}</div>
      <div class="s">${bud ? pct + '% de ' + eur(bud) : 'sin presupuesto'}</div>
      <div class="track" style="margin-top:6px"><i style="width:${pct}%;background:${pct > 85 ? 'var(--dng)' : 'var(--cash)'}"></i></div></div>
    <div class="kpi"><div class="k">Disponible</div>
      <div class="v" style="color:${rest < 0 ? 'var(--dng)' : 'var(--cash)'}">${bud ? eur(rest) : '—'}</div>
      <div class="s">${bud ? eur(rest / quedan) + '/día · ' + quedan + ' días' : 'defínelo en Ajustes'}</div></div></div>

  <div class="lbl">Frecuentes</div>
  <div class="frec mb">${fr.map(i => `<button data-frec="${esc(i)}">${esc(i)}</button>`).join('')}
    <button style="border-color:var(--cash);color:var(--cash)" data-act="gasto-nuevo">+ Otro</button></div>

  <div class="lbl" style="margin-top:12px">Movimientos</div>
  <div class="card">${rec.length ? rec.map(rowGasto).join('') : '<div class="empty">Sin gastos todavía.</div>'}</div>
  <div style="text-align:center;margin-top:10px"><button class="btn btn-q" data-tab="analisis">Ver todo el análisis</button></div>`;
}
function tAnal() {
  const gp = enPer(), gs = cat ? gp.filter(g => g.categoria === cat) : gp;
  const tot = {}; gp.forEach(g => tot[g.categoria] = (tot[g.categoria] || 0) + +g.monto);
  const cats = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  const sup = gp.filter(g => g.subcategoria === 'Supermercado');
  const nec = suma(sup.filter(g => g.item_tipo === 'basico')), gus = suma(sup.filter(g => g.item_tipo === 'gusto'));
  const [a, b] = rango(), nd = Math.max(1, dias(a, b) + 1);
  return `<div class="tabs">${PERS.map(([k, l]) => `<button class="tab ${per === k ? 'on' : ''}" data-per="${k}">${l}</button>`).join('')}</div>
  <div class="kpis">
    <div class="kpi"><div class="k">Total período</div><div class="v">${eur(suma(gp))}</div><div class="s">${gp.length} movimientos</div></div>
    <div class="kpi"><div class="k">Media diaria</div><div class="v">${eur(suma(gp) / nd)}</div>
      <div class="s">${dstr(a)} → ${dstr(b)}</div></div></div>

  <div class="rib">${cats.map(([k, v]) => `<button class="fcat ${cat === k ? 'on' : ''}" data-cat="${esc(k)}">
    <span style="width:6px;height:6px;border-radius:50%;background:${colCat(k)}"></span>${esc(k)}<b>${eur(v)}</b></button>`).join('')}</div>

  ${cat === 'Comida' && sup.length ? `<div class="lbl">Supermercado · básico vs gusto</div>
  <div class="card mb" style="padding:12px 13px">
    <div class="fl" style="justify-content:space-between;margin-bottom:7px">
      <span class="t1">Básico <span class="mono" style="color:var(--cash)">${eur(nec)}</span></span>
      <span class="t1">Gusto <span class="mono" style="color:var(--task)">${eur(gus)}</span></span></div>
    <div class="track"><i style="width:${nec + gus ? nec / (nec + gus) * 100 : 0}%;background:var(--cash)"></i></div>
    <div class="t2" style="margin-top:7px">${sup.length} compras de supermercado en el período</div></div>` : ''}

  <div class="card mb" style="padding:12px">
    <div class="donut"><canvas id="dnt"></canvas>
      <div class="dc"><div><div class="a">${eur(suma(gs))}</div><div class="b">${esc(cat || 'total')}</div></div></div></div></div>

  <div class="card mb" style="padding:12px"><div class="lbl">Gasto diario</div><div class="lineb"><canvas id="lin"></canvas></div></div>

  <div class="lbl">Movimientos${cat ? ' · ' + esc(cat) : ''}</div>
  <div class="card">${gs.length ? gs.map(rowGasto).join('') : '<div class="empty">Nada en este período.</div>'}</div>
  <div style="text-align:center;margin-top:10px"><button class="btn btn-q" data-act="csv">Exportar CSV</button></div>`;
}
function tAjus() {
  const n = new Date(), bud = presupuesto(), diaHoy = n.getDate();
  const porCobrar = fijosOn().filter(f => f.dia_cobro >= diaHoy);
  return `<div class="lbl">Presupuesto mensual</div>
  <div class="card mb"><div class="row">
    <div class="grow"><div class="t1">${n.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
      <div class="t2">Se aplica al mes en curso</div></div>
    <div class="amt">${bud ? eur(bud) : '—'}</div>
    <button class="btn btn-q" data-act="budget">Cambiar</button></div></div>

  <div class="lbl">Ingresos · ${eur(totIng())}</div>
  <div class="card mb">${D.ingresos.map(i => `<div class="row">
    <div class="grow"><div class="t1">${esc(i.descripcion || 'Ingreso')}</div><div class="t2">${dstr(i.fecha)}</div></div>
    <div class="amt" style="color:var(--cash)">+${eur(i.monto)}</div>
    <button class="btn btn-q" data-ing="${i.id}">Editar</button></div>`).join('')}
    <div class="row"><button class="btn btn-q" style="width:100%" data-act="ing-nuevo">+ Registrar ingreso</button></div></div>

  <div class="lbl">Gastos fijos · ${eur(suma(fijosOn()))} al mes</div>
  <div class="card mb">${D.fijos.map(f => `<div class="row">
    <div class="sw ${f.activo ? 'on' : ''}" data-toggle="${f.id}" role="switch" aria-checked="${f.activo}"><i></i></div>
    <div class="grow" style="${f.activo ? '' : 'opacity:.45'}"><div class="t1">${esc(f.nombre)}</div>
      <div class="t2">${esc(f.categoria)} → ${esc(f.subcategoria)} · día ${f.dia_cobro}</div></div>
    <div class="amt" style="${f.activo ? '' : 'opacity:.45'}">${eur(f.monto)}</div>
    <button class="btn btn-q" data-fijo="${f.id}">Editar</button></div>`).join('')}
    <div class="row"><button class="btn btn-q" style="width:100%" data-act="fijo-nuevo">+ Nuevo fijo</button></div></div>

  <div class="lbl">Fijos por cobrar este mes</div>
  <div class="card mb">${porCobrar.length ? porCobrar.map(f => `<div class="row">
    <div class="grow"><div class="t1">${esc(f.nombre)}</div><div class="t2">día ${f.dia_cobro}</div></div>
    <div class="amt">${eur(f.monto)}</div>
    <button class="btn" style="background:var(--cash);color:#04241A" data-pagar="${f.id}">Pagado</button></div>`).join('')
      : '<div class="empty">Todos cobrados este mes.</div>'}</div>

  <div class="lbl">Ítems · ${D.items.length}</div>
  <div class="card" style="padding:11px 13px"><div class="frec">
    ${D.items.map(i => `<button data-hist="${esc(i.nombre)}">${esc(i.nombre)}</button>`).join('')}</div></div>`;
}

/* ── formularios cashito ── */
function formGasto(id, pre) {
  const g = id ? D.gastos.find(x => x.id === id) : null;
  const c0 = g ? g.categoria : 'Comida';
  sheet(g ? 'Editar gasto' : 'Nuevo gasto', `
  <div class="fl"><div class="fg" style="width:120px"><label>Importe</label>
    <input id="fm" type="number" step="0.01" inputmode="decimal" class="mono" placeholder="0.00" value="${g ? g.monto : ''}"></div>
    <div class="fg grow"><label>Fecha</label><input id="ff" type="date" value="${g ? fechaOf(g) : hoy()}"></div></div>
  <div class="fl"><div class="fg grow"><label>Categoría</label>
    <select id="fc">${Object.keys(CATS).map(k => `<option ${k === c0 ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="fg grow"><label>Subcategoría</label><select id="fs"></select></div></div>
  <div class="fg"><label>Producto</label>
    <input id="fi" list="dl" placeholder="Café en grano…" value="${g ? esc(g.item_nombre || '') : (pre ? esc(pre) : '')}">
    <datalist id="dl">${D.items.map(i => `<option value="${esc(i.nombre)}">`).join('')}</datalist></div>
  <div class="fg"><label>Nota</label><input id="fn" placeholder="opcional" value="${g ? esc(g.nota || '') : ''}"></div>
  <div class="fg"><label>Tipo</label><div class="seg" id="segTipo">
    <button data-tipo="basico" class="${g && g.item_tipo === 'basico' ? 'on' : ''}">Básico</button>
    <button data-tipo="gusto" class="${g && g.item_tipo === 'gusto' ? 'on' : ''}">Gusto</button>
    <button data-tipo="" class="${!g || !g.item_tipo ? 'on' : ''}">N/A</button></div></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--cash);color:#04241A" data-save="gasto" data-id="${id || 0}">${g ? 'Guardar' : 'Registrar'}</button>
    ${g ? `<button class="btn btn-d" data-del="gasto" data-id="${id}">Eliminar</button>` : ''}</div>`);
  subOpts('fc', 'fs', g ? g.subcategoria : (pre ? 'Supermercado' : null));
  window._tipo = g ? (g.item_tipo || '') : '';
  setTimeout(() => $('fm').focus(), 60);
}
function subOpts(cid, sid, sel) {
  const c = $(cid).value, s = $(sid);
  s.innerHTML = (CATS[c] || ['Otro']).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
}
async function saveGasto(id) {
  const m = parseFloat(val('fm'));
  if (!m || m <= 0) return $('fm').focus();
  const nombre = val('fi') || null;
  const item = nombre ? D.items.find(i => i.nombre.toLowerCase() === nombre.toLowerCase()) : null;
  const g = {
    categoria: val('fc'), subcategoria: val('fs'), monto: m,
    nota: val('fn') || null, fecha: new Date(val('ff') + 'T12:00:00').toISOString(),
    item_nombre: nombre, item_tipo: window._tipo || null,
    item_id: item ? item.id : null
  };
  try {
    if (nombre && !item) { const nuevo = await api.addItem(nombre); g.item_id = nuevo.id; D.items.push(nuevo); }
    if (id) {
      const prev = { ...D.gastos.find(x => x.id === id) };
      const upd = await api.editGasto(id, g);
      Object.assign(D.gastos.find(x => x.id === id), upd);
      toast('Gasto actualizado', async () => {
        await api.editGasto(id, prev); Object.assign(D.gastos.find(x => x.id === id), prev);
      });
    } else {
      const nuevo = await api.addGasto(g);
      D.gastos.unshift(nuevo); ordenarGastos();
      toast('Gasto registrado', async () => {
        await api.delGasto(nuevo.id); D.gastos = D.gastos.filter(x => x.id !== nuevo.id);
      });
    }
    close(); render();
  } catch (e) { fallo(e); }
}
const ordenarGastos = () => D.gastos.sort((a, b) => a.fecha < b.fecha ? 1 : -1);

async function borrarGasto(id) {
  const g = D.gastos.find(x => x.id === id);
  try {
    await api.delGasto(id);
    D.gastos = D.gastos.filter(x => x.id !== id);
    toast('Gasto eliminado', async () => {
      const { id: _, user_id: __, ...campos } = g;
      const nuevo = await api.addGasto(campos); D.gastos.push(nuevo); ordenarGastos();
    });
    close(); render();
  } catch (e) { fallo(e); }
}

function formIngreso(id) {
  const i = id ? D.ingresos.find(x => x.id === id) : null;
  sheet(i ? 'Editar ingreso' : 'Registrar ingreso', `
  <div class="fl"><div class="fg" style="width:130px"><label>Importe</label>
    <input id="im" type="number" step="0.01" inputmode="decimal" class="mono" value="${i ? i.monto : ''}"></div>
    <div class="fg grow"><label>Fecha</label><input id="if" type="date" value="${i ? fechaOf(i) : hoy()}"></div></div>
  <div class="fg"><label>Descripción</label><input id="idd" placeholder="Beca, sueldo…" value="${i ? esc(i.descripcion || '') : ''}"></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--cash);color:#04241A" data-save="ingreso" data-id="${id || 0}">Guardar</button>
    ${i ? `<button class="btn btn-d" data-del="ingreso" data-id="${id}">Eliminar</button>` : ''}</div>`);
}
async function saveIngreso(id) {
  const m = parseFloat(val('im'));
  if (!m || m <= 0) return $('im').focus();
  const o = { monto: m, descripcion: val('idd') || null, fecha: new Date(val('if') + 'T12:00:00').toISOString() };
  try {
    if (id) { const upd = await api.editIngreso(id, o); Object.assign(D.ingresos.find(x => x.id === id), upd); toast('Ingreso actualizado'); }
    else {
      const nuevo = await api.addIngreso(o); D.ingresos.unshift(nuevo);
      toast('Ingreso registrado', async () => { await api.delIngreso(nuevo.id); D.ingresos = D.ingresos.filter(x => x.id !== nuevo.id); });
    }
    close(); render();
  } catch (e) { fallo(e); }
}
async function borrarIngreso(id) {
  try { await api.delIngreso(id); D.ingresos = D.ingresos.filter(x => x.id !== id); toast('Ingreso eliminado'); close(); render(); }
  catch (e) { fallo(e); }
}

function formBudget() {
  const n = new Date();
  sheet('Presupuesto mensual', `
  <div class="fg"><label>Importe para ${n.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</label>
    <input id="bm" type="number" step="10" inputmode="decimal" class="mono" value="${presupuesto() || ''}"></div>
  <button class="btn" style="width:100%;background:var(--cash);color:#04241A;margin-top:8px" data-save="budget">Guardar</button>`);
}
async function saveBudget() {
  const m = parseFloat(val('bm'));
  if (!m || m <= 0) return;
  const n = new Date();
  try {
    const p = await api.setPresupuesto(n.getFullYear(), n.getMonth() + 1, m);
    const i = D.presupuestos.findIndex(x => x.id === p.id);
    i >= 0 ? D.presupuestos[i] = p : D.presupuestos.push(p);
    toast('Presupuesto actualizado'); close(); render();
  } catch (e) { fallo(e); }
}

function formFijo(id) {
  const f = id ? D.fijos.find(x => x.id === id) : null;
  sheet(f ? 'Editar fijo' : 'Nuevo gasto fijo', `
  <div class="fg"><label>Nombre</label><input id="xn" placeholder="Alquiler" value="${f ? esc(f.nombre) : ''}"></div>
  <div class="fl"><div class="fg" style="width:120px"><label>Importe</label>
    <input id="xm" type="number" step="0.01" inputmode="decimal" class="mono" value="${f ? f.monto : ''}"></div>
    <div class="fg" style="width:120px"><label>Día de cobro</label>
    <input id="xd" type="number" min="1" max="31" inputmode="numeric" class="mono" value="${f ? f.dia_cobro : 1}"></div></div>
  <div class="fl"><div class="fg grow"><label>Categoría</label>
    <select id="xc">${Object.keys(CATS).map(k => `<option ${f && k === f.categoria ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="fg grow"><label>Subcategoría</label><select id="xs"></select></div></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--cash);color:#04241A" data-save="fijo" data-id="${id || 0}">Guardar</button>
    ${f ? `<button class="btn btn-d" data-del="fijo" data-id="${id}">Eliminar</button>` : ''}</div>`);
  subOpts('xc', 'xs', f ? f.subcategoria : null);
}
async function saveFijo(id) {
  const m = parseFloat(val('xm')), nombre = val('xn'), d = parseInt(val('xd'), 10);
  if (!nombre || !m || m <= 0 || !d) return;
  const o = { nombre, monto: m, dia_cobro: Math.min(31, Math.max(1, d)), categoria: val('xc'), subcategoria: val('xs') };
  try {
    if (id) { const u = await api.editFijo(id, o); Object.assign(D.fijos.find(x => x.id === id), u); toast('Fijo actualizado'); }
    else { const nuevo = await api.addFijo({ ...o, activo: true }); D.fijos.push(nuevo); toast('Fijo creado'); }
    close(); render();
  } catch (e) { fallo(e); }
}
async function borrarFijo(id) {
  try { await api.delFijo(id); D.fijos = D.fijos.filter(x => x.id !== id); toast('Fijo eliminado'); close(); render(); }
  catch (e) { fallo(e); }
}
async function toggleFijo(id) {
  const f = D.fijos.find(x => x.id === id);
  try { const u = await api.editFijo(id, { activo: !f.activo }); Object.assign(f, u);
    toast(f.nombre + (f.activo ? ' activado' : ' desactivado')); render(); }
  catch (e) { fallo(e); }
}
async function pagarFijo(id) {
  const f = D.fijos.find(x => x.id === id);
  try {
    const nuevo = await api.addGasto({
      categoria: f.categoria, subcategoria: f.subcategoria, monto: f.monto,
      item_nombre: f.nombre, fecha: new Date().toISOString(), nota: 'Gasto fijo'
    });
    D.gastos.unshift(nuevo); ordenarGastos();
    toast(f.nombre + ' registrado', async () => { await api.delGasto(nuevo.id); D.gastos = D.gastos.filter(x => x.id !== nuevo.id); });
    render();
  } catch (e) { fallo(e); }
}
function histItem(nombre) {
  const h = D.gastos.filter(g => g.item_nombre === nombre);
  const t = suma(h), avg = h.length ? t / h.length : 0;
  sheet(esc(nombre), `<div class="kpis" style="margin-bottom:10px">
    <div class="kpi"><div class="k">Total</div><div class="v">${eur(t)}</div><div class="s">${h.length} compras</div></div>
    <div class="kpi"><div class="k">Media</div><div class="v">${eur(avg)}</div><div class="s">por compra</div></div></div>
    <div class="card">${h.length ? h.map(g => `<div class="row"><div class="grow"><div class="t1">${dstr(g.fecha)}</div>
      <div class="t2">${esc(g.subcategoria)}${g.item_tipo ? ' · ' + (g.item_tipo === 'basico' ? 'básico' : 'gusto') : ''}</div></div>
      <div class="amt">${eur(g.monto)}</div></div>`).join('') : '<div class="empty">Sin compras registradas.</div>'}</div>`);
}
function csv() {
  const gp = enPer();
  const l = [['Fecha', 'Categoría', 'Subcategoría', 'Producto', 'Importe', 'Tipo', 'Nota'].join(',')];
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  gp.forEach(g => l.push([fechaOf(g), q(g.categoria), q(g.subcategoria), q(g.item_nombre), (+g.monto).toFixed(2), g.item_tipo || '', q(g.nota)].join(',')));
  const b = new Blob(['\ufeff' + l.join('\n')], { type: 'text/csv;charset=utf-8' });
  const u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = `cashito_${per}_${hoy()}.csv`; a.click(); URL.revokeObjectURL(u);
  toast(gp.length + ' movimientos exportados');
}

/* ── charts ── */
const tt = () => ({
  backgroundColor: '#131312', borderColor: '#333330', borderWidth: 1, padding: 9, displayColors: false,
  titleFont: { family: 'DM Sans', size: 11 }, bodyFont: { family: 'DM Mono', size: 11 },
  callbacks: { label: x => ' ' + eur(x.parsed.y !== undefined ? x.parsed.y : x.parsed) }
});
function donut() {
  const el = $('dnt'); if (!el || !window.Chart) return;
  const t = {}; enPer().forEach(g => t[g.categoria] = (t[g.categoria] || 0) + +g.monto);
  const ks = Object.keys(t); if (ch1) ch1.destroy();
  ch1 = new Chart(el, {
    type: 'doughnut',
    data: { labels: ks, datasets: [{ data: ks.map(k => t[k]),
      backgroundColor: ks.map(k => cat && cat !== k ? colCat(k) + '2E' : colCat(k)),
      borderColor: '#000', borderWidth: 2, hoverOffset: 5 }] },
    options: { cutout: '71%', plugins: { legend: { display: false }, tooltip: tt() },
      onClick: (e, a) => { if (a.length) { cat = cat === ks[a[0].index] ? null : ks[a[0].index]; render(); } },
      animation: { duration: 500, easing: 'easeOutQuart' }, maintainAspectRatio: false }
  });
}
function line() {
  const el = $('lin'); if (!el || !window.Chart) return;
  const [a, b] = rango(), d = {};
  for (let x = new Date(a + 'T12:00'); iso(x) <= b; x.setDate(x.getDate() + 1)) d[iso(x)] = 0;
  enPer().forEach(g => { const f = fechaOf(g); if (d[f] !== undefined) d[f] += +g.monto; });
  const ks = Object.keys(d); if (ch2) ch2.destroy();
  ch2 = new Chart(el, {
    type: 'bar',
    data: { labels: ks.map(k => k.slice(8)), datasets: [{ data: ks.map(k => d[k]), backgroundColor: '#52B788', borderRadius: 3, barPercentage: .72 }] },
    options: { plugins: { legend: { display: false }, tooltip: tt() },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#63615B', font: { family: 'DM Mono', size: 9 }, maxRotation: 0, autoSkipPadding: 12 } },
        y: { grid: { color: '#1C1C19' }, border: { display: false }, ticks: { color: '#63615B', font: { family: 'DM Mono', size: 9 }, maxTicksLimit: 4 } }
      }, animation: { duration: 480 }, maintainAspectRatio: false }
  });
}

/* ── taskito ── */
const ap = () => D.aparatos.find(a => String(a.id) === String(arg));
function vGansirato() {
  return `<div class="view">
  <div class="hrow"><div class="h1">Gansirato</div><span class="sub">${D.aparatos.length} aparatos</span></div>
  <div class="card mb" style="padding:12px 13px"><div class="lbl">Notificaciones</div>
    <div id="pushbox"><div class="t2">Comprobando…</div></div></div>
  ${D.aparatos.map(a => {
    const v = vencidasDe(a), pr = progTareas(a).map(restan).filter(x => x != null).sort((x, y) => x - y)[0];
    return `<button class="proj" data-aparato="${a.id}"><div class="ptop">
      <div class="pic" style="background:var(--task-bg);color:var(--task)">${sv(a.icono)}</div>
      <div class="grow"><div class="pnm">${esc(a.nombre)}</div>
        <div class="psb">${esc(a.modelo || '')} · ${a.tareas.length} tareas</div></div>
      ${v ? `<span class="chip" style="background:var(--task-bg);color:var(--task)">${v} vencida${v > 1 ? 's' : ''}</span>`
        : `<span class="chip" style="color:var(--tx3)">${pr != null ? 'en ' + pr + ' d' : 'sin tareas'}</span>`}</div></button>`;
  }).join('')}
  <button class="proj" data-act="aparato-nuevo" style="border-style:dashed"><div class="ptop">
    <div class="pic" style="background:var(--sur2);color:var(--tx3)">${sv('box')}</div>
    <div class="grow"><div class="pnm" style="color:var(--tx3)">Añadir aparato</div></div></div></button></div>`;
}
function vAparato() {
  const a = ap();
  if (!a) return '<div class="view"><div class="empty">Aparato no encontrado.</div></div>';
  const prog = progTareas(a).slice().sort((x, y) => restan(x) - restan(y));
  const od = a.tareas.filter(t => t.bajo_demanda);
  const hist = a.log.slice(0, 10);
  return `<div class="view">
  <div class="hrow"><div class="h1">${esc(a.nombre)}</div><span class="sub">${esc(a.modelo || '')}</span></div>

  <div class="lbl">Cronograma</div>
  <div class="card mb">${prog.length ? prog.map(t => filaTarea(t)).join('')
    : '<div class="empty">Sin tareas. Añade una abajo.</div>'}</div>

  ${od.length ? `<div class="lbl">Bajo demanda</div>
  <div class="card mb">${od.map(t => `<div class="row">
    <div class="pic" style="background:var(--task-bg);color:var(--task);width:28px;height:28px">${sv('flask')}</div>
    <div class="grow tap" data-tarea="${t.id}"><div class="t1">${esc(t.nombre)}</div>
      <div class="t2">${t.ultima ? 'Última: ' + dstr(t.ultima) : 'Sin registros'}${t.producto ? ' · ' + esc(t.producto) : ''}</div></div>
    <button class="btn btn-q" data-hecho="${t.id}">Hecho</button></div>`).join('')}</div>` : ''}

  ${a.cons.length ? `<div class="lbl">Consumibles</div>
  <div class="card mb">${a.cons.map(c => `<div class="row">
    <div class="grow"><div class="t1">${esc(c.nombre)}</div><div class="t2 mono">${esc(c.codigo)}</div></div>
    <button class="btn btn-q" style="padding:5px 10px" data-stock="${c.id}" data-d="-1">−</button>
    <span class="amt" style="min-width:22px;text-align:center;${c.stock <= 1 ? 'color:var(--task)' : ''}">${c.stock}</span>
    <button class="btn btn-q" style="padding:5px 10px" data-stock="${c.id}" data-d="1">+</button></div>`).join('')}</div>` : ''}

  <div class="lbl">Historial</div>
  <div class="card mb">${hist.length ? hist.map(l => `<div class="row">
    <div class="grow"><div class="t1">${esc(l.nombre || '—')}</div><div class="t2">${dstr(l.fecha)}${l.nota ? ' · ' + esc(l.nota) : ''}</div></div></div>`).join('')
      : '<div class="empty">Sin registros todavía.</div>'}</div>

  <div class="fl"><button class="btn btn-q" style="flex:1" data-act="tarea-nueva">+ Tarea</button>
    <button class="btn btn-q" data-act="aparato-editar">Editar aparato</button></div></div>`;
}
/* El botón cuenta el estado del ciclo, no repite "Hecho" siempre.
   hoy → bloqueado con la fecha
   vencida → sólido, urgente
   ≤2 días → discreto pero accionable
   lejos → solo informa cuánto falta */
function filaTarea(t) {
  const r = restan(t);
  const hechaHoy = t.ultima && iso(t.ultima) === hoy();
  const late = r < 0;
  const urge = !hechaHoy && r <= 0;
  const prox = proxima(t);

  // Misma caja siempre: 66 px de ancho. Lo que cambia es el color.
  let est;
  if (hechaHoy)  est = `<button class="est est-ok" disabled aria-label="Hecha hoy, vuelve en ${r} días"><span class="ck">${sv('check', 2.6)}</span>${r} d</button>`;
  else if (urge) est = `<button class="est est-go" data-hecho="${t.id}">Hecho</button>`;
  else if (r <= 3) est = `<button class="est est-mid" data-hecho="${t.id}" title="Adelantar">${r} d</button>`;
  else           est = `<button class="est est-far" data-hecho="${t.id}" title="Adelantar">${r} d</button>`;

  const cuando = late ? `Vencida hace ${-r} día${r < -1 ? 's' : ''}`
    : hechaHoy ? 'Hecha hoy · vuelve el ' + fechaCorta(prox)
    : r === 0 ? 'Toca hoy'
    : r === 1 ? 'Mañana'
    : `En ${r} días`;
  const sub = hechaHoy ? cuando : `${cuando} · ${fechaCorta(prox)}`;

  return `<div class="row${urge ? ' urge' : ''}">
    <div class="grow tap" data-tarea="${t.id}">
      <div class="t1">${esc(t.nombre)}</div>
      <div class="t2"${urge ? ' style="color:var(--task)"' : ''}>${sub}${t.producto ? ' · ' + esc(t.producto) : ''}</div></div>
    ${est}</div>`;
}
const fechaCorta = f => f ? new Date(f + 'T12:00').toLocaleDateString('es-ES',
  { weekday: 'short', day: 'numeric', month: 'short' }) : '—';

function verTarea(tid) {
  const a = ap(), t = a.tareas.find(x => x.id === tid);
  const r = restan(t), hechaHoy = t.ultima && iso(t.ultima) === hoy();
  const hist = t.log.slice(0, 4);
  sheet(esc(t.nombre), `
  <div class="fl mb" style="flex-wrap:wrap">
    ${t.freq_dias ? `<span class="chip" style="background:var(--sur2);color:var(--tx2)">Cada ${t.freq_dias} días</span>` : ''}
    ${t.producto ? `<span class="chip mono" style="background:var(--task-bg);color:var(--task)">${esc(t.producto)}</span>` : ''}
    ${r != null ? `<span class="chip" style="color:${r < 0 ? 'var(--task)' : 'var(--tx3)'}">${
      r < 0 ? 'vencida hace ' + (-r) + ' d' : r === 0 ? 'toca hoy' : 'en ' + r + ' d'}</span>` : ''}</div>

  <div class="card mb" style="padding:11px 12px;background:var(--sur2);border:none">
    <div class="fl" style="justify-content:space-between">
      <div><div class="t2">Última vez</div>
        <div class="t1" style="margin-top:2px">${t.ultima ? fechaCorta(iso(t.ultima)) : 'nunca'}</div></div>
      <div style="text-align:right"><div class="t2">Próxima</div>
        <div class="t1" style="margin-top:2px;color:${r < 0 ? 'var(--task)' : 'var(--tx)'}">${fechaCorta(proxima(t))}</div></div></div></div>

  <div id="vidbox">${t.videos.length ? '<div class="empty">Cargando video…</div>' : ''}</div>
  <div class="instr">${esc(t.instrucciones || 'Sin instrucciones.')}</div>

  ${hist.length ? `<div class="lbl" style="margin-top:14px">Últimas veces</div>
  <div class="card mb">${hist.map(l => `<div class="row" style="padding:9px 12px">
    <div class="grow"><div class="t2">${fechaCorta(iso(l.fecha))}</div></div>
    <button class="btn btn-q" style="padding:4px 9px;font-size:11px" data-dellog="${l.id}">Deshacer</button></div>`).join('')}</div>` : ''}

  <div class="fl" style="margin-top:14px">
    ${hechaHoy
      ? `<button class="btn" style="flex:1;background:var(--cash-bg);border:1px solid #1E5741;color:var(--cash);cursor:default" disabled>Ya la hiciste hoy</button>`
      : `<button class="btn" style="flex:1;background:var(--task);color:#2A1505" data-hecho="${t.id}" data-close="1">Marcar como hecho</button>`}
    <button class="btn btn-q" data-tarea-edit="${t.id}">Editar</button></div>`);
  if (t.videos.length) cargarVideos(t.videos);
}

/* Borrar un registro concreto del historial: corrige un "hecho" por error
   sin depender de que el deshacer del toast siga vivo. */
async function borrarLog(lid) {
  const a = ap();
  const t = a.tareas.find(x => x.log.some(l => l.id === lid));
  if (!t) return;
  try {
    await api.delLog(lid);
    t.log = t.log.filter(l => l.id !== lid);
    t.ultima = t.log.length ? t.log[0].fecha : null;
    a.log = a.log.filter(l => l.id !== lid);
    toast('Registro borrado');
    close(); render();
  } catch (e) { fallo(e); }
}
async function cargarVideos(vs) {
  try {
    const urls = await Promise.all(vs.map(v => api.urlVideo(v.storage_path)));
    const box = $('vidbox'); if (!box) return;
    box.innerHTML = urls.map((u, i) => `<div class="mb"><video controls preload="metadata" src="${u}"></video>
      <div class="t2" style="margin-top:4px">${esc(vs[i].titulo)}</div></div>`).join('');
  } catch (e) { const box = $('vidbox'); if (box) box.innerHTML = '<div class="empty">No se pudo cargar el video.</div>'; }
}
async function marcarHecho(tid) {
  const a = ap() || D.aparatos.find(x => x.tareas.some(t => t.id === tid));
  const t = a.tareas.find(x => x.id === tid);
  try {
    const l = await api.addLog(tid, null);
    t.log.unshift(l); t.ultima = l.fecha;
    a.log.unshift({ ...l, nombre: t.nombre });
    let cons = null;
    if (t.producto) {
      cons = a.cons.find(c => c.codigo === t.producto);
      if (cons && cons.stock > 0) { const u = await api.setStock(cons.id, cons.stock - 1); Object.assign(cons, u); }
      else cons = null;
    }
    toast(t.nombre + ' registrada', async () => {
      await api.delLog(l.id);
      t.log = t.log.filter(x => x.id !== l.id); t.ultima = t.log.length ? t.log[0].fecha : null;
      a.log = a.log.filter(x => x.id !== l.id);
      if (cons) { const u = await api.setStock(cons.id, cons.stock + 1); Object.assign(cons, u); }
    });
    render();
  } catch (e) { fallo(e); }
}
async function ajustarStock(cid, d) {
  const a = ap(), c = a.cons.find(x => x.id === cid);
  const nuevo = Math.max(0, c.stock + d);
  if (nuevo === c.stock) return;
  try { const u = await api.setStock(cid, nuevo); Object.assign(c, u); render(); } catch (e) { fallo(e); }
}
function formAparato(id) {
  const a = id ? D.aparatos.find(x => x.id === id) : null;
  sheet(a ? 'Editar aparato' : 'Nuevo aparato', `
  <div class="fg"><label>Nombre</label><input id="an" placeholder="Lavadora" value="${a ? esc(a.nombre) : ''}"></div>
  <div class="fg"><label>Modelo</label><input id="am" placeholder="Bosch WAN28" value="${a ? esc(a.modelo || '') : ''}"></div>
  <div class="fg"><label>Icono</label><div class="seg" id="segIco">
    ${ICONOS.map(i => `<button data-ico="${i}" class="${(a ? a.icono : 'box') === i ? 'on' : ''}" style="line-height:0;padding:9px">
      <span style="display:block;width:16px;height:16px;margin:0 auto">${sv(i)}</span></button>`).join('')}</div></div>
  <div class="fg"><label>Fecha ancla</label><input id="af" type="date" value="${a ? a.fecha_ancla : hoy()}">
    <div class="t2" style="margin-top:4px">Solo se usa para tareas que nunca has marcado como hechas.</div></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--task);color:#2A1505" data-save="aparato" data-id="${id || 0}">Guardar</button>
    ${a ? `<button class="btn btn-d" data-del="aparato" data-id="${id}">Eliminar</button>` : ''}</div>`);
  window._ico = a ? a.icono : 'box';
}
async function saveAparato(id) {
  const nombre = val('an'); if (!nombre) return $('an').focus();
  const o = { nombre, modelo: val('am') || null, icono: window._ico || 'box', fecha_ancla: val('af') };
  try {
    if (id) { const u = await api.editAparato(id, o); Object.assign(D.aparatos.find(x => x.id === id), u); toast('Aparato actualizado'); }
    else {
      const n = await api.addAparato({ ...o, orden: D.aparatos.length + 1 });
      D.aparatos.push({ ...n, tareas: [], cons: [], log: [] }); toast('Aparato creado');
    }
    close(); render();
  } catch (e) { fallo(e); }
}
async function borrarAparato(id) {
  try { await api.delAparato(id); D.aparatos = D.aparatos.filter(x => x.id !== id); toast('Aparato eliminado'); close(); go('gansirato'); }
  catch (e) { fallo(e); }
}
function formTarea(tid) {
  const a = ap(), t = tid ? a.tareas.find(x => x.id === tid) : null;
  sheet(t ? 'Editar tarea' : 'Nueva tarea', `
  <div class="fg"><label>Nombre</label><input id="tn" placeholder="Limpiar filtro" value="${t ? esc(t.nombre) : ''}"></div>
  <div class="fl"><div class="fg" style="width:130px"><label>Cada N días</label>
    <input id="tf" type="number" min="1" inputmode="numeric" class="mono" value="${t ? (t.freq_dias || '') : ''}"
      ${t && t.bajo_demanda ? 'disabled' : ''}></div>
    <div class="fg grow"><label>Consumible</label>
    <select id="tp"><option value="">Ninguno</option>
      ${a.cons.map(c => `<option value="${esc(c.codigo)}" ${t && t.producto === c.codigo ? 'selected' : ''}>${esc(c.codigo)} — ${esc(c.nombre)}</option>`).join('')}
    </select></div></div>
  <div class="fg"><label>Instrucciones</label>
    <textarea id="ti" style="min-height:120px;line-height:1.55" placeholder="1. Apaga la máquina…">${t ? esc(t.instrucciones || '') : ''}</textarea></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--task);color:#2A1505" data-save="tarea" data-id="${tid || 0}">Guardar</button>
    ${t ? `<button class="btn btn-d" data-del="tarea" data-id="${tid}">Eliminar</button>` : ''}</div>`);
}
async function saveTarea(tid) {
  const a = ap(), nombre = val('tn'); if (!nombre) return $('tn').focus();
  const f = parseInt(val('tf'), 10);
  const o = { nombre, freq_dias: f || null, producto: val('tp') || null, instrucciones: val('ti') || null };
  try {
    if (tid) {
      const u = await api.editTarea(tid, o);
      const t = a.tareas.find(x => x.id === tid); Object.assign(t, u);
      toast('Tarea actualizada');
    } else {
      const clave = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '_').slice(0, 24) + '_' + Date.now().toString(36).slice(-4);
      const n = await api.addTarea({ ...o, aparato_id: a.id, clave, bajo_demanda: !f, orden: a.tareas.length + 1 });
      a.tareas.push({ ...n, log: [], videos: [], ultima: null });
      toast('Tarea creada');
    }
    close(); render();
  } catch (e) { fallo(e); }
}
async function borrarTarea(tid) {
  const a = ap();
  try { await api.delTarea(tid); a.tareas = a.tareas.filter(x => x.id !== tid);
    a.log = a.log.filter(l => l.tarea_id !== tid); toast('Tarea eliminada'); close(); render(); }
  catch (e) { fallo(e); }
}

/* ══ taskito — procesos vivos ══ */
const cul = () => D.cultivos.find(c => String(c.id) === String(arg));
const conPico = c => c.registros.filter(r => r.horas_pico > 0 && r.temperatura != null);

/* Modelo temperatura → horas al pico.
   Con 3+ observaciones, regresión de ln(horas) sobre temperatura.
   Antes de eso, Q10 genérico: 6 h a 24 °C, Q10 = 2.5 */
function modelo(c) {
  const d = conPico(c);
  if (d.length < 3) return { tipo: 'q10', n: d.length, f: T => 6 * Math.pow(2.5, (24 - T) / 10) };
  const n = d.length;
  const x = d.map(r => +r.temperatura), y = d.map(r => Math.log(+r.horas_pico));
  const mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); den += (x[i] - mx) ** 2; }
  const b = den ? num / den : 0, a = my - b * mx;
  return { tipo: 'ajuste', n, f: T => Math.exp(a + b * T) };
}
/* Plan de cultivo — trayectoria de referencia día a día.
   Es feedforward: la referencia. Lo que corriges con los registros es el feedback. */
function etapas(c) {
  const rapido = c.velocidad === 2;
  const n = c.plan_dias;
  const fin1 = rapido ? 1 : 1;
  const fin2 = rapido ? 3 : 4;
  const fin3 = rapido ? 5 : 7;
  return [
    { hasta: fin1, nom: 'Mezcla inicial', ratio: '50 g harina + 50 g agua',
      accion: `Mezcla 50 g de ${c.harina_arranque} con 50 g de agua sin cloro a 24–27 °C. Tapa sin cerrar del todo.`,
      esperado: 'Nada visible. Es normal.' },
    { hasta: fin2, nom: 'Arranque bacteriano', ratio: '1:1:1',
      accion: `Descarta hasta dejar 50 g. Añade 50 g de ${c.harina_arranque} y 50 g de agua. ${rapido ? 'Dos veces al día, cada 12 h.' : 'Una vez al día.'}`,
      esperado: 'Burbujas dispersas. Puede haber una falsa subida con olor feo — no la deseches, es fermentación bacteriana temprana.' },
    { hasta: fin3, nom: 'Transición a levaduras', aviso: 'Aquí es donde más gente la tira. Si parece muerta, sigue alimentando: las bacterias iniciales están cediendo el sitio a las levaduras y hay un valle de actividad. Solo se descarta si aparece moho de colores o tonos rosa/naranja.', ratio: '1:1:1',
      accion: `Cambia a ${c.harina}, misma proporción. ${rapido ? 'Cada 12 h.' : 'Cada 24 h.'} Anota temperatura y horas al pico.`,
      esperado: 'Actividad irregular. El olor pasa de raro a ácido-frutal. Puede parecer que se muere: es la transición, no la tires.' },
    { hasta: n - 1, nom: 'Consolidación', ratio: rapido ? '1:2:2' : '1:1:1',
      accion: `Diluye más: ${rapido ? '30 g starter + 60 g' : '50 g starter + 50 g'} de ${c.harina} + la misma agua. ${rapido ? 'Cada 12 h.' : 'Cada 24 h.'}`,
      esperado: 'Debe duplicar en 4–8 h de forma repetible. Olor ácido-frutal estable, sin licor oscuro antes de alimentar.' },
    { hasta: 999, nom: 'Validación', ratio: rapido ? '1:2:2' : '1:1:1',
      accion: 'Alimenta y espera al pico. Haz la prueba de flotación: una cucharadita en agua.',
      esperado: 'Si flota, está lista para hornear. Si no, sigue alimentando un par de días más.' }
  ];
}
const etapaDe = (c, d) => etapas(c).find(e => d <= e.hasta) || etapas(c).slice(-1)[0];
const diaCultivo = c => Math.max(1, dias(c.inicio, hoy()) + 1);

function estadoCultivo(c) {
  const rs = c.registros.filter(r => !r.mantenimiento);
  if (c.estado === 'nevera') return ['En nevera', 'var(--tx2)'];
  if (!rs.length) return ['Sin datos', 'var(--tx3)'];
  const u = rs[0];
  const listo = rs.slice(0, 3).filter(r => +r.factor >= 2 && r.olor === 'acido-frutal').length >= 2;
  if (listo && rs.some(r => r.flota)) return ['Lista para hornear', 'var(--cash)'];
  if (listo) return ['Activa', 'var(--cash)'];
  if (['podrido', 'acetona'].includes(u.olor)) return ['Revisar', 'var(--dng)'];
  return ['En desarrollo', 'var(--mm)'];
}
/* Mantenimiento en nevera: alimentar cada 7 días */
function mantenimiento(c) {
  const base = c.ultima_mant || c.guardado_en;
  if (!base) return null;
  const p = new Date(base + 'T12:00'); p.setDate(p.getDate() + 7);
  return { proxima: iso(p), restan: dias(hoy(), iso(p)) };
}

function vTaskito() {
  return `<div class="view">
  <div class="hrow"><div class="h1">Taskito</div><span class="sub">procesos vivos</span></div>
  ${D.cultivos.length ? D.cultivos.map(c => {
    const [lb, col] = estadoCultivo(c), mt = mantenimiento(c);
    const sub = c.estado === 'nevera'
      ? `${esc(c.harina)} · ${mt ? (mt.restan < 0 ? 'alimentar ya' : 'alimentar en ' + mt.restan + ' d') : 'sin mantenimiento'}`
      : `Día ${diaCultivo(c)} de ${c.plan_dias} · ${esc(c.harina)} · ${c.velocidad === 2 ? '2/día' : '1/día'}`;
    return `<button class="proj" data-cultivo="${c.id}"><div class="ptop">
      <div class="pic" style="background:${c.estado === 'nevera' ? 'var(--sur2)' : 'var(--mm-bg)'};color:${
        c.estado === 'nevera' ? 'var(--tx3)' : 'var(--mm)'}">${sv('bread')}</div>
      <div class="grow"><div class="pnm">${esc(c.nombre)}</div><div class="psb">${sub}</div></div>
      <span class="chip" style="color:${col}">${lb}</span></div></button>`;
  }).join('') : '<div class="empty">Sin cultivos todavía.</div>'}
  <button class="proj" data-act="cultivo-nuevo" style="border-style:dashed"><div class="ptop">
    <div class="pic" style="background:var(--sur2);color:var(--tx3)">${sv('plus')}</div>
    <div class="grow"><div class="pnm" style="color:var(--tx3)">Nuevo cultivo</div></div></div></button></div>`;
}

function calcular() {
  const c = cul(), when = val('cwhen'), T = parseFloat(val('ctemp'));
  const out = $('cout');
  if (!when || !T) { out.innerHTML = '<div class="t2" style="color:var(--dng)">Falta la hora o la temperatura.</div>'; return; }
  const h = modelo(c).f(T);
  const objetivo = new Date(when);
  const alimentar = new Date(objetivo.getTime() - h * 3600e3);
  const faltan = (alimentar - new Date()) / 3600e3;
  const fmt = d => d.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  out.innerHTML = `<div class="card" style="padding:11px 12px;background:var(--sur2);border:none">
    <div class="t2">Alimentar el</div>
    <div style="font-size:16px;font-weight:600;margin:3px 0">${fmt(alimentar)}</div>
    <div class="t2">${h.toFixed(1)} h de fermentación a ${T} °C · ${
      faltan < 0 ? 'ya pasó, ajusta la hora objetivo'
      : faltan < 1 ? 'en menos de una hora' : 'en ' + faltan.toFixed(1) + ' h'}</div>
    <div class="t2" style="margin-top:6px">Ventana de vigilancia: ${fmt(new Date(objetivo.getTime() - 18e5))} → ${fmt(new Date(objetivo.getTime() + 18e5))}</div></div>`;
}

function chartMM() {
  const el = $('mmc'); if (!el || !window.Chart) return;
  const c = cul(), d = conPico(c).map(r => ({ x: +r.temperatura, y: +r.horas_pico }));
  if (!d.length) return;
  const m = modelo(c), ts = d.map(p => p.x);
  const lo = Math.min(...ts) - 1, hi = Math.max(...ts) + 1;
  const linea = []; for (let T = lo; T <= hi; T += 0.5) linea.push({ x: T, y: m.f(T) });
  if (ch2) ch2.destroy();
  ch2 = new Chart(el, {
    type: 'scatter',
    data: { datasets: [
      { data: linea, type: 'line', borderColor: '#4A9FD8', borderWidth: 1.5, pointRadius: 0, tension: .3 },
      { data: d, backgroundColor: '#F0EDE4', pointRadius: 3.5 }] },
    options: { plugins: { legend: { display: false }, tooltip: { ...tt(),
        callbacks: { label: x => ` ${x.parsed.x} °C → ${x.parsed.y.toFixed(1)} h` } } },
      scales: {
        x: { grid: { color: '#1C1C19' }, border: { display: false },
             ticks: { color: '#63615B', font: { family: 'DM Mono', size: 9 } } },
        y: { grid: { color: '#1C1C19' }, border: { display: false },
             ticks: { color: '#63615B', font: { family: 'DM Mono', size: 9 }, maxTicksLimit: 5 } }
      }, animation: { duration: 420 }, maintainAspectRatio: false }
  });
}

function vCultivo() {
  const c = cul();
  if (!c) return '<div class="view"><div class="empty">Cultivo no encontrado.</div></div>';
  const m = modelo(c), rs = c.registros, u = rs.find(r => !r.mantenimiento);
  const [lb, col] = estadoCultivo(c);
  const tRef = u && u.temperatura != null ? +u.temperatura : 24;
  const est = m.f(tRef);
  const nevera = c.estado === 'nevera';
  const d = diaCultivo(c), e = etapaDe(c, d), mt = mantenimiento(c);
  const eta = etapas(c);

  return `<div class="view">
  <div class="hrow"><div class="h1">${esc(c.nombre)}</div>
    <span class="sub">${nevera ? 'guardada ' + dstr(c.guardado_en) : 'día ' + d + ' de ' + c.plan_dias}</span></div>

  <div class="kpis">
    <div class="kpi"><div class="k">Estado</div>
      <div class="v" style="font-size:15px;color:${col};letter-spacing:-.2px">${lb}</div>
      <div class="s">${esc(c.harina)} · ${c.hidratacion}%</div></div>
    ${nevera ? `<div class="kpi"><div class="k">Mantenimiento</div>
      <div class="v" style="color:${mt && mt.restan < 0 ? 'var(--task)' : 'var(--tx)'}">${
        mt ? (mt.restan < 0 ? Math.abs(mt.restan) + ' d' : mt.restan + ' d') : '—'}</div>
      <div class="s">${mt ? (mt.restan < 0 ? 'de retraso' : 'para alimentar') : 'sin registro'}</div></div>`
    : `<div class="kpi"><div class="k">Pico estimado</div><div class="v">${est.toFixed(1)} h</div>
      <div class="s">a ${tRef} °C · ${m.tipo === 'q10' ? 'modelo Q10' : 'ajuste con ' + m.n + ' datos'}</div></div>`}</div>

  ${nevera ? `<div class="card mb" style="padding:13px;border-color:var(--bdr2)">
    <div class="lbl">En nevera</div>
    <div class="instr">Aliméntala una vez por semana: sácala, descarta hasta dejar 50 g, añade 50 g de harina y 50 g de agua, deja 1–2 h a temperatura ambiente y vuelve a guardarla.

Para hornear: sácala 2 días antes y dale 2–3 alimentaciones a temperatura ambiente hasta que vuelva a duplicar de forma fiable.</div>
    <div class="fl" style="margin-top:12px">
      <button class="btn btn-q" style="flex:1" data-act="mant">Alimentación de mantenimiento</button>
      <button class="btn" style="background:var(--mm);color:#04182B" data-act="despertar">Despertar</button></div></div>`
  : `<div class="card mb" style="padding:13px">
    <div class="fl" style="justify-content:space-between;align-items:baseline;margin-bottom:8px">
      <span class="lbl" style="margin:0">Hoy · día ${d}</span>
      <span class="chip" style="background:var(--mm-bg);color:var(--mm)">${esc(e.nom)}</span></div>
    <div class="t1" style="margin-bottom:6px">${esc(e.accion)}</div>
    <div class="t2">Esperado: ${esc(e.esperado)}</div>
    ${e.aviso ? `<div class="t2" style="margin-top:8px;padding:9px 10px;background:var(--task-bg);color:var(--task);border-radius:8px;line-height:1.5">${esc(e.aviso)}</div>` : ''}
    <div class="fl" style="margin-top:11px">
      <span class="chip mono" style="background:var(--sur2);color:var(--tx2)">${esc(e.ratio)}</span>
      <span class="chip" style="background:var(--sur2);color:var(--tx2)">${c.velocidad === 2 ? '2 alimentaciones/día' : '1 alimentación/día'}</span></div></div>

  <div class="lbl">Plan</div>
  <div class="card mb">${eta.map((x, i) => {
    const desde = i === 0 ? 1 : eta[i - 1].hasta + 1;
    const hasta = Math.min(x.hasta, c.plan_dias);
    const activa = d >= desde && d <= x.hasta;
    const pasada = d > x.hasta;
    return `<div class="row" style="${pasada ? 'opacity:.4' : ''}">
      <span style="width:6px;height:6px;border-radius:50%;flex:none;background:${
        activa ? 'var(--mm)' : pasada ? 'var(--cash)' : 'var(--tx3)'}"></span>
      <div class="grow"><div class="t1"${activa ? ' style="color:var(--mm)"' : ''}>${esc(x.nom)}</div>
        <div class="t2">${desde === hasta ? 'Día ' + desde : 'Días ' + desde + '–' + hasta} · ${esc(x.ratio)}</div></div>
      ${activa ? '<span class="chip" style="background:var(--mm-bg);color:var(--mm)">ahora</span>' : ''}</div>`;
  }).join('')}</div>

  <div class="card mb" style="padding:12px 13px">
    <div class="lbl">Calculadora de horario</div>
    <div class="t2 mb">¿A qué hora quieres usarla? Te digo cuándo alimentar.</div>
    <div class="fl mb"><input id="cwhen" type="datetime-local" style="flex:1">
      <input id="ctemp" type="number" step="0.5" inputmode="decimal" class="mono" placeholder="°C"
        value="${tRef}" style="width:78px"></div>
    <button class="btn btn-q" style="width:100%" data-act="calc">Calcular</button>
    <div id="cout" style="margin-top:10px"></div></div>

  <div class="fl mb">
    <button class="btn" style="flex:1;background:var(--mm);color:#04182B" data-act="registro-nuevo">Registrar observación</button>
    <button class="btn btn-q" data-act="guardar">Guardar en nevera</button></div>`}

  ${conPico(c).length >= 2 ? `<div class="card mb" style="padding:12px">
    <div class="lbl">Temperatura vs horas al pico</div><div class="lineb"><canvas id="mmc"></canvas></div></div>` : ''}

  <div class="lbl">Historial</div>
  <div class="card mb">${rs.length ? rs.slice(0, 20).map(r => `<div class="row tap" data-registro="${r.id}">
    <span style="width:6px;height:6px;border-radius:50%;flex:none;background:${
      r.mantenimiento ? 'var(--tx3)' : r.olor === 'acido-frutal' ? 'var(--cash)'
      : ['podrido','acetona'].includes(r.olor) ? 'var(--dng)' : 'var(--tx3)'}"></span>
    <div class="grow"><div class="t1">${r.mantenimiento ? 'Mantenimiento' : (r.factor ? '×' + (+r.factor).toFixed(1) : '—')}${
      r.alimentado && !r.mantenimiento ? ' · alimentada' : ''}${r.flota ? ' · flota' : ''}</div>
      <div class="t2">${dstr(r.fecha)}${r.temperatura != null ? ' · ' + r.temperatura + ' °C' : ''}${
        r.horas_pico ? ' · pico ' + r.horas_pico + ' h' : ''}${r.nota ? ' · ' + esc(r.nota) : ''}</div></div>
    ${r.mantenimiento ? '' : `<span class="chip" style="color:var(--tx3)">${esc((OLORES.find(o => o[0] === r.olor) || ['','—'])[1])}</span>`}</div>`).join('')
    : '<div class="empty">Sin observaciones. Registra la primera.</div>'}</div>

  <button class="btn btn-q" style="width:100%" data-act="cultivo-editar">Editar cultivo</button></div>`;
}

async function guardarNevera() {
  const c = cul();
  try {
    const u = await api.editCultivo(c.id, { estado: 'nevera', guardado_en: hoy(), ultima_mant: hoy() });
    Object.assign(c, u);
    toast('Guardada en nevera', async () => {
      const v = await api.editCultivo(c.id, { estado: 'activa', guardado_en: null });
      Object.assign(c, v);
    });
    render();
  } catch (e) { fallo(e); }
}
async function despertar() {
  const c = cul();
  try {
    const u = await api.editCultivo(c.id, { estado: 'activa', guardado_en: null });
    Object.assign(c, u);
    toast('Despierta. Dale 2–3 alimentaciones antes de hornear.');
    render();
  } catch (e) { fallo(e); }
}
async function alimentarMant() {
  const c = cul();
  try {
    const r = await api.addRegistro({ cultivo_id: c.id, mantenimiento: true, alimentado: true, nota: 'Mantenimiento semanal' });
    c.registros.unshift(r);
    const u = await api.editCultivo(c.id, { ultima_mant: hoy() });
    Object.assign(c, u);
    toast('Mantenimiento registrado', async () => {
      await api.delRegistro(r.id); c.registros = c.registros.filter(x => x.id !== r.id);
    });
    render();
  } catch (e) { fallo(e); }
}

function formCultivo(id) {
  const c = id ? D.cultivos.find(x => x.id === id) : null;
  sheet(c ? 'Editar cultivo' : 'Nuevo cultivo', `
  <div class="fg"><label>Nombre</label><input id="kn" placeholder="Masa madre" value="${c ? esc(c.nombre) : ''}"></div>
  <div class="fg"><label>Harina de arranque · días 1–4</label>
    <select id="ka">${optsHarina(['arranque'], c ? c.harina_arranque : 'Roggenvollkornmehl')}</select>
    <div class="hint" id="hka"></div></div>
  <div class="fg"><label>Harina de mantenimiento · resto</label>
    <select id="kh">${optsHarina(['mant'], c ? c.harina : 'Weizenmehl Type 550')}</select>
    <div class="hint" id="hkh"></div></div>
  <div class="fl"><div class="fg" style="width:110px"><label>Hidratación %</label>
    <input id="kw" type="number" inputmode="numeric" class="mono" value="${c ? c.hidratacion : 100}"></div>
    <div class="fg" style="width:110px"><label>Ratio</label>
    <input id="kr" class="mono" placeholder="1:1:1" value="${c ? esc(c.ratio) : '1:1:1'}"></div>
    <div class="fg grow"><label>Inicio</label><input id="ki" type="date" value="${c ? c.inicio : hoy()}"></div></div>
  <div class="fg"><label>Velocidad</label><div class="seg" id="segVel">
    <button data-vel="1" class="${!c || c.velocidad === 1 ? 'on' : ''}">1 al día · más lento</button>
    <button data-vel="2" class="${c && c.velocidad === 2 ? 'on' : ''}">2 al día · más rápido</button></div>
    <div class="t2" style="margin-top:4px">Dos alimentaciones aceleran la transición a levaduras, pero exigen estar encima.</div></div>
  <div class="fg"><label>Duración del plan</label><div class="seg" id="segDur">
    ${[7, 10, 14].map(n => `<button data-dur="${n}" class="${(c ? c.plan_dias : 10) === n ? 'on' : ''}">${n} días</button>`).join('')}</div></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--mm);color:#04182B" data-save="cultivo" data-id="${id || 0}">Guardar</button>
    ${c ? `<button class="btn btn-d" data-del="cultivo" data-id="${id}">Eliminar</button>` : ''}</div>`);
}
function pintaHint(sel, dest) {
  const el = $(sel), box = $(dest);
  if (!el || !box) return;
  const i = harinaInfo(el.value);
  box.innerHTML = `<span class="chip" style="background:var(--sur2);color:${COLR[i.r]};padding:2px 7px">${LBLR[i.r]}</span> ${esc(i.h)}`;
}

async function saveCultivo(id) {
  const nombre = val('kn') || 'Masa madre';
  const o = { nombre, harina: val('kh') || 'Weizenmehl Type 550',
              harina_arranque: val('ka') || 'Roggenvollkornmehl',
              hidratacion: parseInt(val('kw'), 10) || 100,
              ratio: val('kr') || '1:1:1', inicio: val('ki') || hoy(),
              velocidad: window._vel || 1, plan_dias: window._dur || 10 };
  try {
    if (id) { const u = await api.editCultivo(id, o); Object.assign(D.cultivos.find(x => x.id === id), u); toast('Cultivo actualizado'); }
    else { const n = await api.addCultivo(o); D.cultivos.push({ ...n, registros: [] }); toast('Cultivo creado'); }
    close(); render();
  } catch (e) { fallo(e); }
}
async function borrarCultivo(id) {
  try { await api.delCultivo(id); D.cultivos = D.cultivos.filter(x => x.id !== id);
    toast('Cultivo eliminado'); close(); go('taskito'); } catch (e) { fallo(e); }
}
function formRegistro(id) {
  const c = cul(), r = id ? c.registros.find(x => x.id === id) : null;
  const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  sheet(r ? 'Editar observación' : 'Nueva observación', `
  <div class="fg"><label>Cuándo</label><input id="rf" type="datetime-local"
    value="${r ? new Date(new Date(r.fecha) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ahora}"></div>
  <div class="fl"><div class="fg grow"><label>Factor de expansión</label>
    <input id="rx" type="number" step="0.1" inputmode="decimal" class="mono" placeholder="2.0" value="${r ? (r.factor || '') : ''}"></div>
    <div class="fg grow"><label>Horas al pico</label>
    <input id="rp" type="number" step="0.5" inputmode="decimal" class="mono" placeholder="6" value="${r ? (r.horas_pico || '') : ''}"></div>
    <div class="fg" style="width:90px"><label>Temp °C</label>
    <input id="rt" type="number" step="0.5" inputmode="decimal" class="mono" placeholder="24" value="${r ? (r.temperatura || '') : ''}"></div></div>
  <div class="fg"><label>Olor</label><select id="ro">
    ${OLORES.map(([k, l]) => `<option value="${k}" ${r && r.olor === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="fg"><label>Marcas</label><div class="seg" id="segMk">
    <button data-mk="alimentado" class="${r && r.alimentado ? 'on' : ''}">Alimentada</button>
    <button data-mk="flota" class="${r && r.flota ? 'on' : ''}">Flota</button></div></div>
  <div class="fg"><label>Nota</label><input id="rn" placeholder="opcional" value="${r ? esc(r.nota || '') : ''}"></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--mm);color:#04182B" data-save="registro" data-id="${id || 0}">Guardar</button>
    ${r ? `<button class="btn btn-d" data-del="registro" data-id="${id}">Eliminar</button>` : ''}</div>`);
  window._mk = { alimentado: !!(r && r.alimentado), flota: !!(r && r.flota) };
}
async function saveRegistro(id) {
  const c = cul();
  const o = {
    cultivo_id: c.id,
    fecha: new Date(val('rf')).toISOString(),
    factor: parseFloat(val('rx')) || null,
    horas_pico: parseFloat(val('rp')) || null,
    temperatura: parseFloat(val('rt')) || null,
    olor: val('ro') || null,
    alimentado: !!window._mk.alimentado,
    flota: window._mk.flota ? true : null,
    nota: val('rn') || null
  };
  try {
    if (id) {
      const u = await api.editRegistro(id, o);
      Object.assign(c.registros.find(x => x.id === id), u);
      toast('Observación actualizada');
    } else {
      const n = await api.addRegistro(o);
      c.registros.unshift(n);
      toast('Observación registrada', async () => {
        await api.delRegistro(n.id); c.registros = c.registros.filter(x => x.id !== n.id);
      });
    }
    c.registros.sort((a, b) => a.fecha < b.fecha ? 1 : -1);
    close(); render();
  } catch (e) { fallo(e); }
}
async function borrarRegistro(id) {
  const c = cul();
  try { await api.delRegistro(id); c.registros = c.registros.filter(x => x.id !== id);
    toast('Observación eliminada'); close(); render(); } catch (e) { fallo(e); }
}

/* ── plansito ── */
function vPlansito() {
  const l = filt === 'todos' ? D.planes : D.planes.filter(p => p.estado === filt);
  return `<div class="view">
  <div class="hrow"><div class="h1">Plansito</div><span class="sub">${D.planes.length} planes</span></div>
  <div class="card mb" style="padding:12px 13px">
    <textarea id="pt" placeholder="Cambiar el grinder por uno de muelas cónicas…" style="min-height:64px;resize:vertical"></textarea>
    <div class="fl" style="margin-top:7px">
      <select id="pe" style="flex:1"><option value="idea">Idea</option><option value="curso">En curso</option></select>
      <button class="btn" style="background:var(--plan);color:#120E28;flex:none" data-act="plan-add">Apuntar</button></div></div>
  <div class="tabs">${[['todos', 'Todos'], ['idea', 'Ideas'], ['curso', 'En curso'], ['hecho', 'Hechos'], ['desc', 'Descartados']]
    .map(([k, lb]) => `<button class="tab ${filt === k ? 'on' : ''}" data-filt="${k}">${lb}</button>`).join('')}</div>
  ${l.length ? `<div class="card">${l.map(p => { const e = EST[p.estado] || EST.idea;
    return `<div class="row tap" style="align-items:flex-start" data-plan="${p.id}">
      <span class="st" style="background:${e[1]}"></span>
      <div class="grow"><div class="t1">${esc(p.titulo)}</div>${p.notas ? `<div class="t2">${esc(p.notas)}</div>` : ''}
        <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
          <span class="chip" style="background:var(--sur2);color:var(--tx2)">${esc(p.categoria)}</span>
          ${p.coste_estimado ? `<span class="chip mono" style="color:var(--tx3)">~${eur(p.coste_estimado)}</span>` : ''}
          <span class="chip" style="color:${e[1]}">${e[0]}</span></div></div></div>`;
  }).join('')}</div>` : '<div class="empty">Nada aquí todavía.</div>'}</div>`;
}
async function addPlan() {
  const el = $('pt'), v = el.value.trim(); if (!v) return el.focus();
  const ln = v.split('\n');
  try {
    const n = await api.addPlan({ titulo: ln[0].slice(0, 200), notas: ln.slice(1).join(' ').trim() || null, estado: $('pe').value });
    D.planes.unshift(n);
    toast('Apuntado', async () => { await api.delPlan(n.id); D.planes = D.planes.filter(x => x.id !== n.id); });
    render();
  } catch (e) { fallo(e); }
}
function formPlan(id) {
  const p = D.planes.find(x => x.id === id);
  sheet('Editar plan', `
  <div class="fg"><label>Título</label><input id="qt" value="${esc(p.titulo)}"></div>
  <div class="fg"><label>Notas</label><textarea id="qn" style="min-height:70px">${esc(p.notas || '')}</textarea></div>
  <div class="fl"><div class="fg grow"><label>Categoría</label><input id="qc" value="${esc(p.categoria)}"></div>
    <div class="fg" style="width:120px"><label>Coste est.</label>
    <input id="qe" type="number" step="1" inputmode="decimal" class="mono" value="${p.coste_estimado || ''}"></div></div>
  <div class="fg"><label>Estado</label><div class="seg" id="segEst">
    ${Object.entries(EST).map(([k, e]) => `<button data-est="${k}" class="${p.estado === k ? 'on' : ''}"
      style="${p.estado === k ? 'border-color:' + e[1] + ';color:' + e[1] : ''}">${e[0]}</button>`).join('')}</div></div>
  <div class="fl" style="margin-top:12px">
    <button class="btn" style="flex:1;background:var(--plan);color:#120E28" data-save="plan" data-id="${id}">Guardar</button>
    <button class="btn btn-d" data-del="plan" data-id="${id}">Eliminar</button></div>`);
  window._est = p.estado;
}
async function savePlan(id) {
  const o = {
    titulo: val('qt') || 'Sin título', notas: val('qn') || null,
    categoria: val('qc') || 'Sin categoría',
    coste_estimado: parseFloat(val('qe')) || null, estado: window._est
  };
  try { const u = await api.editPlan(id, o); Object.assign(D.planes.find(x => x.id === id), u);
    toast('Plan actualizado'); close(); render(); }
  catch (e) { fallo(e); }
}
async function borrarPlan(id) {
  try { await api.delPlan(id); D.planes = D.planes.filter(x => x.id !== id); toast('Plan eliminado'); close(); render(); }
  catch (e) { fallo(e); }
}

/* ══ notificaciones push ══ */
const pushSoportado = () => 'serviceWorker' in navigator && 'PushManager' in window;
const b64 = s => {
  const p = '='.repeat((4 - s.length % 4) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};
async function estadoPush() {
  if (!pushSoportado()) return 'no-soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && await reg.pushManager.getSubscription();
  return sub ? 'activo' : 'inactivo';
}
async function activarPush() {
  try {
    if (!pushSoportado()) return toast('Este navegador no soporta notificaciones', null, true);
    if (VAPID_PUBLIC.startsWith('PEGA')) return toast('Falta la clave VAPID en app.js', null, true);

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return toast('Permiso denegado', null, true);

    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC)
    });

    const j = sub.toJSON();
    await api.guardarSub({
      endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      etiqueta: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'móvil' : 'escritorio'
    });
    toast('Notificaciones activadas');
    render();
  } catch (e) { fallo(e); }
}
async function desactivarPush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await api.borrarSub(sub.endpoint); await sub.unsubscribe(); }
    toast('Notificaciones desactivadas');
    render();
  } catch (e) { fallo(e); }
}
async function pintaPush() {
  const box = $('pushbox'); if (!box) return;
  const st = await estadoPush();
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (iOS && !standalone) {
    box.innerHTML = `<div class="t2">En iPhone las notificaciones solo funcionan si añades Gansito a la pantalla de inicio: Compartir → Añadir a inicio, y ábrelo desde ahí.</div>`;
    return;
  }
  box.innerHTML = {
    'no-soportado': `<div class="t2">Este navegador no soporta notificaciones push.</div>`,
    'bloqueado': `<div class="t2">Bloqueadas en los ajustes del navegador. Permítelas para este sitio y vuelve.</div>`,
    'activo': `<div class="fl" style="align-items:center">
        <div class="grow"><div class="t1" style="color:var(--cash)">Activas en este dispositivo</div>
          <div class="t2">Aviso diario a las 7:00 si algo vence o vence mañana.</div></div>
        <button class="btn btn-q" data-act="push-off">Desactivar</button></div>`,
    'inactivo': `<div class="fl" style="align-items:center">
        <div class="grow"><div class="t1">Desactivadas</div>
          <div class="t2">Recibe un aviso diario cuando algo esté por vencer.</div></div>
        <button class="btn" style="background:var(--task);color:#2A1505" data-act="push-on">Activar</button></div>`
  }[st];
}

/* ══ eventos (delegación global) ══ */
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-go],[data-act],[data-tab],[data-per],[data-cat],[data-filt],[data-gasto],[data-frec],[data-ing],[data-fijo],[data-toggle],[data-pagar],[data-hist],[data-aparato],[data-tarea],[data-tarea-edit],[data-hecho],[data-stock],[data-plan],[data-cultivo],[data-registro],[data-save],[data-del],[data-tipo],[data-ico],[data-est],[data-mk],[data-vel],[data-dur],[data-dellog]');
  if (!el) {
    if (ev.target.classList.contains('ov')) close();
    return;
  }
  const d = el.dataset;

  if (d.go) return go(d.go);
  if (d.tab) { tab = d.tab; cat = null; return render(); }
  if (d.per) { per = d.per; return render(); }
  if (d.cat !== undefined && d.cat) { cat = cat === d.cat ? null : d.cat; return render(); }
  if (d.filt) { filt = d.filt; return render(); }
  if (d.gasto) return formGasto(+d.gasto);
  if (d.frec) return formGasto(null, d.frec);
  if (d.ing) return formIngreso(+d.ing);
  if (d.fijo) return formFijo(+d.fijo);
  if (d.toggle) return toggleFijo(+d.toggle);
  if (d.pagar) return pagarFijo(+d.pagar);
  if (d.hist) return histItem(d.hist);
  if (d.aparato) return go('aparato', d.aparato);
  if (d.tareaEdit) return formTarea(+d.tareaEdit);
  if (d.hecho) { if (d.close) close(); return marcarHecho(+d.hecho); }
  if (d.tarea) return verTarea(+d.tarea);
  if (d.stock) return ajustarStock(+d.stock, +d.d);
  if (d.plan) return formPlan(+d.plan);
  if (d.cultivo) return go('cultivo', d.cultivo);
  if (d.registro) return formRegistro(+d.registro);
  if (d.dellog) return borrarLog(+d.dellog);

  if (d.mk) {
    window._mk[d.mk] = !window._mk[d.mk];
    el.classList.toggle('on', window._mk[d.mk]);
    return;
  }
  if (d.vel) {
    window._vel = +d.vel;
    $('segVel').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.vel === window._vel));
    return;
  }
  if (d.dur) {
    window._dur = +d.dur;
    $('segDur').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.dur === window._dur));
    return;
  }

  if (d.tipo !== undefined) {
    window._tipo = d.tipo;
    $('segTipo').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tipo === d.tipo));
    return;
  }
  if (d.ico) {
    window._ico = d.ico;
    $('segIco').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.ico === d.ico));
    return;
  }
  if (d.est) {
    window._est = d.est;
    $('segEst').querySelectorAll('button').forEach(b => {
      const on = b.dataset.est === d.est;
      b.classList.toggle('on', on);
      b.style.borderColor = on ? EST[b.dataset.est][1] : '';
      b.style.color = on ? EST[b.dataset.est][1] : '';
    });
    return;
  }

  if (d.save) {
    const id = +d.id || 0;
    el.disabled = true;
    const f = { gasto: saveGasto, ingreso: saveIngreso, budget: saveBudget, fijo: saveFijo,
                aparato: saveAparato, tarea: saveTarea, plan: savePlan,
                cultivo: saveCultivo, registro: saveRegistro }[d.save];
    await f(id);
    el.disabled = false;
    return;
  }
  if (d.del) {
    const id = +d.id;
    const f = { gasto: borrarGasto, ingreso: borrarIngreso, fijo: borrarFijo,
                aparato: borrarAparato, tarea: borrarTarea, plan: borrarPlan,
                cultivo: borrarCultivo, registro: borrarRegistro }[d.del];
    return f(id);
  }

  switch (d.act) {
    case 'cerrar': return close();
    case 'gasto-nuevo': return formGasto();
    case 'gasto-nuevo-home': go('cashito'); return formGasto();
    case 'ing-nuevo': return formIngreso();
    case 'fijo-nuevo': return formFijo();
    case 'budget': return formBudget();
    case 'csv': return csv();
    case 'aparato-nuevo': return formAparato();
    case 'aparato-editar': return formAparato(ap().id);
    case 'tarea-nueva': return formTarea();
    case 'plan-add': return addPlan();
    case 'cultivo-nuevo': return formCultivo();
    case 'cultivo-editar': return formCultivo(cul().id);
    case 'registro-nuevo': return formRegistro();
    case 'calc': return calcular();
    case 'guardar': return guardarNevera();
    case 'despertar': return despertar();
    case 'mant': return alimentarMant();
    case 'push-on': return activarPush();
    case 'push-off': return desactivarPush();
    case 'salir': await api.logout(); return location.reload();
  }
});
document.addEventListener('change', ev => {
  if (ev.target.id === 'fc') subOpts('fc', 'fs');
  if (ev.target.id === 'xc') subOpts('xc', 'xs');
  if (ev.target.id === 'ka') pintaHint('ka', 'hka');
  if (ev.target.id === 'kh') pintaHint('kh', 'hkh');
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
$('bg').onclick = () => {
  const o = $('dw').classList.toggle('open');
  $('bg').classList.toggle('on', o); $('bg').setAttribute('aria-expanded', o);
};
$('tsun').onclick = async () => {
  const f = undoFn; undoFn = null;
  $('ts').classList.remove('show');
  if (f) { try { await f(); } catch (e) { fallo(e); } render(); }
};

/* ══ render ══ */
function render() {
  const acc = getComputedStyle(document.documentElement).getPropertyValue(ACC[view]).trim();
  document.documentElement.style.setProperty('--sweep', acc || '#52B788');
  const s = $('scan'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
  const v = { home: vHome, cashito: vCashito, gansirato: vGansirato, aparato: vAparato,
              taskito: vTaskito, cultivo: vCultivo, plansito: vPlansito }[view];
  $('app').innerHTML = v();
  $('mk').style.color = 'var(' + ACC[view] + ')';
  crumb(); drawer();
  if (view === 'gansirato') pintaPush();
  if (view === 'cashito' && tab === 'analisis') requestAnimationFrame(() => { donut(); line(); });
  else if (view === 'cultivo') { if (ch1) { ch1.destroy(); ch1 = null; } requestAnimationFrame(chartMM); }
  else { if (ch1) { ch1.destroy(); ch1 = null; } if (ch2) { ch2.destroy(); ch2 = null; } }
}

/* ══ arranque ══ */
async function arrancar() {
  $('boot').classList.remove('hide');
  try {
    D = await api.cargarTodo();
    $('boot').classList.add('hide');
    $('auth').classList.add('hide');
    $('shell').classList.remove('hide');
    render();
    api.escuchar(async () => {
      if (silencio) return;
      silencio = true;
      setTimeout(async () => {
        try { D = await api.cargarTodo(); render(); } catch (e) { console.error(e); }
        silencio = false;
      }, 400);
    });
  } catch (e) {
    $('boot').classList.add('hide');
    fallo(e);
  }
}
function mostrarLogin(msg) {
  $('boot').classList.add('hide');
  $('shell').classList.add('hide');
  $('auth').classList.remove('hide');
  if (msg) $('au-err').textContent = msg;
}
$('au-btn').onclick = async () => {
  $('au-err').textContent = '';
  $('au-btn').disabled = true;
  const { error } = await api.login(val('au-mail'), $('au-pass').value);
  $('au-btn').disabled = false;
  if (error) return $('au-err').textContent = 'Correo o contraseña incorrectos';
  $('auth').classList.add('hide');
  arrancar();
};
$('au-pass').addEventListener('keydown', e => { if (e.key === 'Enter') $('au-btn').click(); });

(async () => {
  const s = await api.session();
  if (s) arrancar(); else mostrarLogin();
})();

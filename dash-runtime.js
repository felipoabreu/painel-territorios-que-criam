/*
 * dash-runtime.js — runtime local do Painel de Dados (Territórios que Criam | Senac SP)
 *
 * Reproduz, fora do claude.ai, a pequena API "dash" usada por js/app.js:
 *   dash.data(id)            -> {status: 'loading'|'ok'|'error'|'missing', data}
 *   dash.draw(nome, fn)      -> registra fn(el) para cada elemento [data-draw=nome];
 *   dash.draw(nome)          -> redesenha só esse nome
 *   dash.calc(id, {inputs, fn}) -> conjunto derivado, calculado quando as entradas carregam
 *   dash.params() / dash.setParams(obj) -> estado na query string (?t=3550308&ind=...)
 *   dash.setLink(id)         -> grava a aba no hash (#visao, #economia ...)
 *   dash.onData(fn)          -> chamado ao fim de cada ciclo de desenho
 *   dash.colors              -> paleta categórica (8 cores)
 *
 * Os conjuntos de dados vêm de data/manifest.json (lista de arquivos em data/) e são baixados
 * sob demanda: só quando um gráfico de uma aba aberta os pede.
 */
(function () {
  'use strict';

  const BASE = (document.currentScript && document.currentScript.dataset.base) || 'data/';
  const store = new Map();      // id -> {status, data}
  const calcs = new Map();      // id -> {inputs, fn, srcs, value, status}
  const draws = new Map();      // nome -> fn
  const dataCbs = [];
  let scheduled = false;

  // ---------- parâmetros na URL ----------
  const readParams = () => {
    const o = {};
    new URLSearchParams(location.search).forEach((v, k) => { o[k] = v; });
    return o;
  };
  let params = readParams();

  const writeParams = () => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') q.set(k, String(v)); });
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  };

  // ---------- conjuntos calculados ----------
  const calcData = (id) => {
    const c = calcs.get(id);
    const ins = c.inputs.map((i) => get(i));
    if (ins.some((d) => d.status === 'error' || d.status === 'missing')) return {status: 'error', data: null};
    if (!ins.every((d) => d.status === 'ok')) return {status: 'loading', data: null};
    const srcs = ins.map((d) => d.data);
    if (!c.srcs || c.srcs.some((s, i) => s !== srcs[i])) {
      try {
        const rows = (d) => (Array.isArray(d) ? d : (d && (d.rows || d.data)) || []);
        c.value = {status: 'ok', data: c.fn(...srcs.map(rows))};
      } catch (e) {
        console.error('[dash] cálculo "' + id + '" falhou:', e);
        c.value = {status: 'error', data: null};
      }
      c.srcs = srcs;
    }
    return c.value;
  };

  // carga sob demanda: um conjunto só é baixado quando um gráfico visível o pede
  let manifestOk = false;
  const get = (id) => {
    if (calcs.has(id)) return calcData(id);
    const e = store.get(id);
    if (!e) return {status: manifestOk ? 'missing' : 'loading', data: null};
    if (e.status === 'idle') { load(e.item); return store.get(id); }
    return e;
  };

  // ---------- desenho ----------
  const runDraw = (name) => {
    const fn = draws.get(name);
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + CSS.escape(name) + '"]').forEach((el) => {
      if (el.closest('[role=tabpanel][hidden]')) return;   // abas fechadas não são desenhadas nem carregam dados
      try { fn(el); } catch (e) { console.error('[dash] desenho "' + name + '" falhou:', e); }
    });
  };

  const render = () => {
    scheduled = false;
    draws.forEach((_, name) => runDraw(name));
    dataCbs.forEach((cb) => { try { cb(); } catch (e) { console.error('[dash] onData falhou:', e); } });
    document.documentElement.dataset.dashReady = manifestOk && [...store.values()].every((d) => d.status !== 'loading') ? 'true' : 'false';
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  };

  // ---------- API pública ----------
  const dash = {
    colors: ['#2f6fd0', '#e07b2a', '#1f9e74', '#c2459a', '#7a5fd3', '#b8961a', '#2a9fb3', '#d1493f'],
    data: get,
    params: () => ({...params}),
    setParams: (o) => { params = {...params, ...o}; writeParams(); schedule(); },
    setLink: (id) => { history.replaceState(null, '', location.pathname + location.search + '#' + id); },
    onData: (cb) => { dataCbs.push(cb); schedule(); },
    calc: (id, def) => { calcs.set(id, {inputs: def.inputs || [], fn: def.fn, title: def.title, description: def.description}); schedule(); },
    draw: (name, fn) => {
      if (typeof fn === 'function') { draws.set(name, fn); schedule(); }
      else runDraw(name);
    },
    manifest: [],
  };
  window.dash = dash;

  // ---------- carga dos dados ----------
  function load(item) {
    store.set(item.id, {status: 'loading', data: null, item});
    return fetch(BASE + item.file)
      .then((r) => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
      .then((d) => { store.set(item.id, {status: 'ok', data: d}); })
      .catch((e) => { console.error('[dash] falha ao carregar ' + item.file + ':', e); store.set(item.id, {status: 'error', data: null}); })
      .finally(schedule);
  }

  fetch(BASE + 'manifest.json')
    .then((r) => r.json())
    .then((m) => {
      dash.manifest = m.datasets;
      m.datasets.forEach((it) => store.set(it.id, {status: 'idle', data: null, item: it}));
      manifestOk = true;
      // territorios primeiro: monta os filtros e o texto de abertura; o resto vem quando a aba pede
      const t = m.datasets.find((d) => d.id === 'territorios');
      if (t) load(t);
      schedule();
    })
    .catch((e) => {
      console.error('[dash] manifest.json não carregou. Abra o painel por um servidor local (veja README.md).', e);
      const b = document.getElementById('dash-erro');
      if (b) b.hidden = false;
    });

  // ao abrir uma aba, desenha (e carrega) o que ela precisa
  const obs = new MutationObserver((recs) => {
    if (recs.some((r) => (r.oldValue !== null) !== r.target.hasAttribute('hidden'))) schedule();
  });
  const watch = () => document.querySelectorAll('[role=tabpanel]').forEach((p) => obs.observe(p, {attributes: true, attributeFilter: ['hidden'], attributeOldValue: true}));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();

  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(schedule, 150); });
  window.addEventListener('popstate', () => { params = readParams(); schedule(); });
})();

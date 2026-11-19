(() => {
  // ---------- formatação (pt-BR) ----------
  d3.formatDefaultLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['R$ ', '']});
  const nf = (min, max) => new Intl.NumberFormat('pt-BR', {minimumFractionDigits: min, maximumFractionDigits: max});
  const N0 = nf(0, 0), N1 = nf(1, 1), N2 = nf(2, 2), N3 = nf(3, 3);
  const has = (v) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && isNaN(v));
  const F = {
    text: (v) => has(v) ? String(v) : '—',
    int: (v) => has(v) ? N0.format(v) : '—',
    d1: (v) => has(v) ? N1.format(v) : '—',
    d3: (v) => has(v) ? N3.format(v) : '—',
    pct1: (v) => has(v) ? N1.format(v) + '%' : '—',
    pct2: (v) => has(v) ? N2.format(v) + '%' : '—',
    sig: (v) => has(v) ? (v > 0 ? '+' : '') + N1.format(v) + '%' : '—',
    brl: (v) => has(v) ? 'R$ ' + N0.format(v) : '—',
    brl2: (v) => has(v) ? 'R$ ' + N2.format(v) : '—',
    brlmil: (v) => {
      if (!has(v)) return '—';
      const r = v * 1000;
      if (Math.abs(r) >= 1e9) return 'R$ ' + N1.format(r / 1e9) + ' bi';
      if (Math.abs(r) >= 1e6) return 'R$ ' + N1.format(r / 1e6) + ' mi';
      return 'R$ ' + N0.format(r);
    },
    brlc: (v) => {
      if (!has(v)) return '—';
      if (Math.abs(v) >= 1e9) return 'R$ ' + N1.format(v / 1e9) + ' bi';
      if (Math.abs(v) >= 1e6) return 'R$ ' + N1.format(v / 1e6) + ' mi';
      if (Math.abs(v) >= 1e3) return 'R$ ' + N1.format(v / 1e3) + ' mil';
      return 'R$ ' + N0.format(v);
    },
    ord: (v) => has(v) ? N0.format(v) + 'º de 645' : '—',
    porte: (v) => has(v) ? String(v).replace(/^\d\.\s*/, '') : '—',
    badge: (v) => has(v) ? String(v) : '—',
  };
  const compact = new Intl.NumberFormat('pt-BR', {notation: 'compact', maximumFractionDigits: 1});

  const IND = {
    cri_part_emp: {lab: 'Participação criativa no emprego', f: F.pct2, hi: true},
    cri_emp: {lab: 'Empregos formais criativos', f: F.int, hi: true},
    cri_ul_10mil: {lab: 'Estabelecimentos criativos por 10 mil hab.', f: F.d1, hi: true},
    cri_rem_media: {lab: 'Remuneração média mensal criativa', f: F.brl, hi: true},
    cri_var_emp: {lab: 'Variação do emprego criativo 2022–2024', f: F.sig, hi: true},
    rou_pc: {lab: 'Captação Rouanet por habitante', f: F.brl2, hi: true},
    ideb_ai: {lab: 'IDEB anos iniciais', f: F.d1, hi: true},
    ideb_af: {lab: 'IDEB anos finais', f: F.d1, hi: true},
    ideb_em: {lab: 'IDEB ensino médio', f: F.d1, hi: true},
    afd_ai_2024: {lab: 'Docentes com formação adequada (AI)', f: F.pct1, hi: true},
    abandono_em_2024: {lab: 'Abandono no ensino médio', f: F.pct1, hi: false},
    ifdm_geral_2023: {lab: 'IFDM geral', f: F.d3, hi: true},
    pib_pc_2023: {lab: 'PIB per capita', f: F.brl, hi: true},
    densidade: {lab: 'Densidade demográfica', f: F.d1, hi: true},
    idpec: {lab: 'IDPEC-SP (0 a 100)', f: F.d1, hi: true},
    d1_capacidades_humanas: {lab: 'Capacidades humanas (0 a 100)', f: F.d1, hi: true},
    d2_atratividade_conectividade: {lab: 'Atratividade e conectividade (0 a 100)', f: F.d1, hi: true},
    d3_ambiente_cultural_empreend: {lab: 'Ambiente cultural e empreendedorismo (0 a 100)', f: F.d1, hi: true},
    ql_criativo_2024: {lab: 'Quociente locacional criativo', f: (v) => has(v) ? N2.format(v) : '—', hi: true},
    pib_criativo_part_pct: {lab: 'PIB criativo no PIB total', f: F.pct2, hi: true},
  };
  const AREA_ORDER = ['Consumo', 'Cultura', 'Mídia', 'Tecnologia'];
  const enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const where = (o) => Object.entries(o).map(([k, v]) => enc(k) + '=' + enc(v)).join('&');

  // paleta Senac SP para os gráficos (azul e laranja da marca primeiro; distinguíveis também para daltonismo)
  try { if (Array.isArray(dash.colors)) dash.colors.splice(0, dash.colors.length, '#005594', '#F78B1F', '#1B9E77', '#7FB8E6', '#C7533C', '#D16BA5', '#2C2C54', '#8C564B'); } catch (e) { /* plataforma não permite trocar a paleta: segue a padrão */ }

  // ---------- estado e utilidades ----------
  const ui = {tab: 'visao', rankSort: {k: 'rk', dir: 1}, munSort: {k: 'pop_censo', dir: -1}, rankQ: '', munQ: ''};
  const P = () => dash.params();
  const T = () => String(P().t ?? '35');
  const rowsOf = (id) => {
    const d = dash.data(id);
    if (d.status !== 'ok') return null;
    const x = d.data;
    return Array.isArray(x) ? x : (x && (x.rows || x.data)) || null;
  };
  let tIndex = null, tIndexSrc = null;
  const terr = () => {
    const r = rowsOf('territorios');
    if (!r) return null;
    if (tIndexSrc !== r) { tIndex = new Map(r.map((x) => [String(x.cod), x])); tIndexSrc = r; }
    return tIndex;
  };
  const cur = (cod) => { const m = terr(); return m ? m.get(String(cod ?? T())) : null; };
  const isMun = (cod) => String(cod).length === 7;
  const munsIn = (cod) => {
    const m = terr(); if (!m) return [];
    const c = String(cod);
    const all = [...m.values()].filter((x) => x.nivel === 'Município');
    if (c === '35') return all;
    if (c.length === 4) return all.filter((x) => String(x.cod_rgint) === c);
    if (c.length === 6) return all.filter((x) => String(x.cod_rgi) === c);
    if (c.length === 3) return all.filter((x) => String(x.cod_go) === c);
    if (c.length === 5) return all.filter((x) => String(x.cod_un) === c);
    return all.filter((x) => String(x.cod) === c);
  };
  const css = (name) => getComputedStyle(document.getElementById('painel') || document.body).getPropertyValue(name).trim();
  const status = (...ids) => {
    const st = ids.map((i) => dash.data(i).status);
    if (st.includes('error') || st.includes('missing') || st.includes('declined')) return 'error';
    if (st.every((s) => s === 'ok')) return 'ok';
    return 'loading';
  };
  const failLine = (el) => { el.replaceChildren(); const d = document.createElement('div'); d.className = 'fail'; d.textContent = 'Falha ao carregar'; el.append(d); };
  const mark = (tag, src, field, w, text, cls) => {
    const e = document.createElement(tag);
    e.dataset.source = src;
    if (field) e.dataset.field = field;
    if (w) e.dataset.where = w;
    e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const tipBox = (el) => { const t = document.createElement('div'); t.className = 'tip'; t.hidden = true; el.append(t); return t; };
  const showTip = (el, tip, ev, title, lines) => {
    tip.replaceChildren();
    const h = document.createElement('div'); h.className = 'tt'; h.textContent = title; tip.append(h);
    for (const [sw, txt] of lines) {
      const l = document.createElement('div');
      if (sw) { const i = document.createElement('i'); i.style.cssText = `display:inline-block;width:.6rem;height:.6rem;border-radius:2px;margin-right:5px;background:${sw}`; l.append(i); }
      l.append(document.createTextNode(txt)); tip.append(l);
    }
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    let x = ev.clientX - r.left + 12, y = ev.clientY - r.top + 12;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > r.width) x = Math.max(0, ev.clientX - r.left - tw - 12);
    if (y + th > r.height) y = Math.max(0, ev.clientY - r.top - th - 12);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  const textW = (svg, s, cls = 'lbl') => { const t = svg.append('text').attr('class', cls).text(s); const w = t.node().getComputedTextLength(); t.remove(); return w; };
  const svgIn = (el, h) => {
    const w = Math.max(280, el.clientWidth || 600);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h);
    return {svg, w, h};
  };
  const fit = (svg, s, max) => { if (textW(svg, s) <= max) return s; let t = s; while (t.length > 3 && textW(svg, t + '…') > max) t = t.slice(0, -1); return t + '…'; };
  const areaColor = (a) => dash.colors[Math.max(0, AREA_ORDER.indexOf(a))];

  // ---------- controles fixos (somente ouvem e ajustam atributos) ----------
  const setTab = (id, push) => {
    ui.tab = id;
    document.querySelectorAll('[role=tabpanel]').forEach((s) => { s.hidden = s.id !== id; });
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    if (push) dash.setLink(id);
  };
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab, true)));
  const named = location.hash.slice(1);
  if (named && document.getElementById(named) && document.getElementById(named).getAttribute('role') === 'tabpanel') setTab(named, false);

  document.querySelectorAll('.help').forEach((b) => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open));
    document.querySelectorAll('#' + b.getAttribute('aria-controls')).forEach((p) => { p.hidden = open; });
  }));
  // barra compacta de filtros: aparece quando o bloco de filtros sai da tela ao rolar
  document.querySelectorAll('#filtro-compacto').forEach((bar) => {
    const f = document.getElementById('filtros');
    if (!f || !('IntersectionObserver' in window)) return;
    const aba = bar.querySelector('.fc-aba');
    const nomeAba = () => { const t = document.querySelector('.tab[aria-selected="true"]'); if (aba) aba.textContent = t ? t.textContent : ''; };
    new IntersectionObserver(([e]) => { nomeAba(); bar.hidden = e.isIntersecting || e.boundingClientRect.top > 0; }).observe(f);
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', nomeAba));
    bar.querySelector('button').addEventListener('click', () => f.scrollIntoView({behavior: 'smooth', block: 'start'}));
  });
  document.querySelectorAll('#limpar').forEach((b) => b.addEventListener('click', () => dash.setParams({t: '35'})));
  document.querySelectorAll('#contraste').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    document.querySelectorAll('#painel').forEach((p) => p.classList.toggle('hc', on));
  }));
  document.querySelectorAll('#ind-mapa').forEach((s) => s.addEventListener('change', () => dash.setParams({ind: s.value})));
  document.querySelectorAll('#seg-metrica').forEach((s) => s.addEventListener('change', () => dash.setParams({segm: s.value})));
  document.querySelectorAll('#seg-ano').forEach((s) => s.addEventListener('change', () => dash.setParams({sega: s.value})));
  document.querySelectorAll('#cmp-ind').forEach((s) => s.addEventListener('change', () => dash.setParams({cmpi: s.value})));
  document.querySelectorAll('#busca-rank').forEach((s) => s.addEventListener('input', () => { ui.rankQ = s.value; dash.draw('ranking'); }));
  document.querySelectorAll('#busca-mun').forEach((s) => s.addEventListener('input', () => { ui.munQ = s.value; dash.draw('municipios'); }));
  document.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.sort; ui.rankSort = {k, dir: ui.rankSort.k === k ? -ui.rankSort.dir : (k === 'valor' ? -1 : 1)}; dash.draw('ranking');
  }));
  document.querySelectorAll('[data-msort]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.msort; ui.munSort = {k, dir: ui.munSort.k === k ? -ui.munSort.dir : (k === 'nome' || k === 'porte' ? 1 : -1)}; dash.draw('municipios');
  }));
  const cmpList = () => String(P().cmp ?? '').split(',').filter(Boolean);
  const setCmp = (l) => dash.setParams({cmp: [...new Set(l)].slice(0, 6).join(',')});
  document.querySelectorAll('#cmp-atual').forEach((b) => b.addEventListener('click', () => setCmp([...cmpList(), T()])));
  document.querySelectorAll('#cmp-limpar').forEach((b) => b.addEventListener('click', () => setCmp([])));

  dash.onData(() => {
    const p = P();
    document.querySelectorAll('#ind-mapa').forEach((s) => { s.value = p.ind ?? 'cri_part_emp'; });
    document.querySelectorAll('#seg-metrica').forEach((s) => { s.value = p.segm ?? 'emp'; });
    document.querySelectorAll('#seg-ano').forEach((s) => { s.value = String(p.sega ?? '2024'); });
    document.querySelectorAll('#cmp-ind').forEach((s) => { s.value = p.cmpi ?? 'cri_part_emp'; });
    const r = cur();
    const nivel = r ? r.nivel : 'Estado';
    document.querySelectorAll('[data-show-nivel]').forEach((e) => { e.hidden = !e.dataset.showNivel.split('|').includes(nivel); });
    document.querySelectorAll('[role=tabpanel]').forEach((s) => { s.hidden = s.id !== ui.tab; });
  });

  // ---------- cálculo: ranking de todos os indicadores ----------
  dash.calc('ranking', {
    inputs: ['territorios'],
    title: 'Ranking dos municípios por indicador',
    description: 'Para cada indicador do mapa, ordena os 645 municípios (1º = melhor; no abandono, menor é melhor).',
    fn: (territorios) => {
      const inds = {mtc_intens_emprego_pct: 1, mtc_ql_especializados: 1, c3_governanca_cultural: 1, gc_mun_pc_2024: 1, cx_part_export_pct: 1, idpec: 1, d1_capacidades_humanas: 1, d2_atratividade_conectividade: 1, d3_ambiente_cultural_empreend: 1, ql_criativo_2024: 1, pib_criativo_part_pct: 1, cri_part_emp: 1, cri_emp: 1, cri_ul_10mil: 1, cri_rem_media: 1, rou_pc: 1, ideb_ai: 1, ideb_af: 1, ideb_em: 1, afd_ai_2024: 1, abandono_em_2024: -1, ifdm_geral_2023: 1, pib_pc_2023: 1};
      const muns = territorios.filter((r) => r.nivel === 'Município');
      const out = [];
      for (const [ind, dir] of Object.entries(inds)) {
        const v = muns.filter((r) => r[ind] !== null && r[ind] !== undefined).sort((a, b) => dir * (b[ind] - a[ind]));
        let last = null, rk = 0;
        v.forEach((r, i) => { if (r[ind] !== last) { rk = i + 1; last = r[ind]; } out.push({cod: r.cod, ind, rk, nome: r.nome, valor: r[ind], rgi: r.rgi, cod_rgi: r.cod_rgi, cod_rgint: r.cod_rgint}); });
      }
      return out;
    },
  });

  // ---------- desenhos ----------
  dash.draw('kv', (el) => {
    const cod = el.dataset.cod || T();
    const r = cur(cod);
    if (!r) { el.textContent = '—'; return; }
    const k = el.dataset.k, f = F[el.dataset.f] || F.text;
    const v = r[k];
    const s = mark('span', 'territorios', k, where({cod: r.cod}), f(v));
    if (el.dataset.f === 'badge' && has(v)) s.className = 'badge ' + (v === 'Atingiu' ? 'ok' : 'bad');
    if (el.dataset.f === 'sig' && has(v)) s.className = v >= 0 ? 'ok' : 'bad';
    el.replaceChildren(s);
  });

  dash.draw('carga', (el) => {
    const r = rowsOf('fontes');
    if (!r) { el.textContent = '—'; return; }
    const top = r.reduce((a, b) => (b.coletado_em > a.coletado_em ? b : a), r[0]);
    const [y, m, d] = String(top.coletado_em).split('-');
    el.replaceChildren(mark('span', 'fontes', 'coletado_em', where({fonte: top.fonte}), `${d}/${m}/${y}`));
  });

  const fillSelect = (sel, items, value, first) => {
    sel.replaceChildren(new Option(first, ''), ...items.map((x) => new Option(x.nome.replace(/^RGI(nt)? /, ''), String(x.cod))));
    sel.value = value;
  };
  dash.draw('sel-rgint', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const r = cur();
    const items = [...m.values()].filter((x) => x.nivel === 'Região intermediária').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    fillSelect(sel, items, r && r.cod_rgint ? String(r.cod_rgint) : '', 'Todas (Estado de SP)');
    sel.onchange = () => dash.setParams({t: sel.value || '35'});
  });
  dash.draw('sel-rgi', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const r = cur();
    const g = r && r.cod_rgint ? String(r.cod_rgint) : null;
    const items = [...m.values()].filter((x) => x.nivel === 'Região imediata' && (!g || String(x.cod_rgint) === g)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    fillSelect(sel, items, r && r.cod_rgi ? String(r.cod_rgi) : '', g ? 'Todas da região intermediária' : 'Todas');
    sel.onchange = () => dash.setParams({t: sel.value || (g || '35')});
  });
  dash.draw('sel-mun', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const t = T(), r = cur(t);
    const scope = r && r.cod_rgi ? String(r.cod_rgi) : (r && r.cod_rgint ? String(r.cod_rgint) : '35');
    const items = munsIn(scope).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    fillSelect(sel, items, isMun(t) ? t : '', `Todos (${items.length} municípios)`);
    sel.onchange = () => dash.setParams({t: sel.value || scope});
  });

  // ---------- frase de abertura, ajustada ao nível do território ----------
  dash.draw('takeaway', (el) => {
    const r = cur();
    if (!r) { el.textContent = '—'; return; }
    const nm = String(r.nome || '').replace(/^RGI(nt)? /, '');
    const cap = String(r.cod_go) === '900';
    let lugar;
    if (r.nivel === 'Estado') lugar = 'No Estado de São Paulo';
    else if (r.nivel === 'Região intermediária') lugar = 'Na região intermediária de ' + nm;
    else if (r.nivel === 'Região imediata') lugar = 'Na região imediata de ' + nm;
    else if (r.nivel === 'GO Senac') lugar = cap ? 'Na cidade de São Paulo, atendida por unidades das GO1, GO2 e GO3 do Senac' : 'Na área de atuação da ' + nm + ' do Senac';
    else if (r.nivel === 'Unidade Senac') {
      if (cap) lugar = 'Na área de atuação das 16 unidades do Senac na capital';
      else { const us = nm.split(' / '); lugar = 'Na área de atuação ' + us.map((u) => 'do ' + u).join(' e '); }
    } else lugar = 'Em ' + nm;
    const b = (k, txt) => mark('b', 'territorios', k, where({cod: r.cod}), txt);
    const emp = r.cri_emp, ul = r.cri_ul, pc = r.cri_part_emp;
    if (!has(emp) || !has(ul)) { el.replaceChildren(document.createTextNode(lugar + ', os dados de emprego criativo de 2024 não estão disponíveis.')); return; }
    const parts = [lugar + ', a economia criativa reúne ', b('cri_emp', F.int(emp)), ' ' + (emp === 1 ? 'emprego formal' : 'empregos formais')];
    if (has(pc)) parts.push(' (', b('cri_part_emp', F.pct2(pc)), ' do emprego formal)');
    parts.push(' em ', b('cri_ul', F.int(ul)), ' ' + (ul === 1 ? 'estabelecimento' : 'estabelecimentos') + ', em 2024.');
    el.replaceChildren(...parts.map((p) => typeof p === 'string' ? document.createTextNode(p) : p));
  });

  // ---------- recorte Senac SP: GO → unidade → municípios da área de atuação ----------
  const SPU = {GO1: ['Lapa Faustolo', 'Lapa Scipião', 'Tiradentes'], GO2: ['Francisco Matarazzo', 'Largo Treze', 'Itaquera', 'Penha', 'Jardim Primavera', 'Santana'], GO3: ['Aclimação', 'Tatuapé Cel. Luís Americano', 'Jabaquara', 'Tatuapé Serra de Bragança', 'Lapa Tito', 'Vila Prudente', 'São Miguel Paulista']};
  const goOrd = (x) => (String(x.cod) === '900' ? 999 : Number(x.cod));
  dash.draw('sel-go', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const r = cur();
    const items = [...m.values()].filter((x) => x.nivel === 'GO Senac').sort((a, b) => goOrd(a) - goOrd(b));
    fillSelect(sel, items, r && r.cod_go ? String(r.cod_go) : '', 'Todas (Estado de SP)');
    sel.onchange = () => dash.setParams({t: sel.value || '35'});
  });
  dash.draw('sel-un', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const r = cur();
    const g = r && r.cod_go ? String(r.cod_go) : null;
    const items = [...m.values()].filter((x) => x.nivel === 'Unidade Senac' && (!g || String(x.cod_go) === g)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    fillSelect(sel, items, r && r.cod_un ? String(r.cod_un) : '', g ? 'Todas da GO' : 'Todas');
    sel.onchange = () => dash.setParams({t: sel.value || (g || '35')});
  });
  dash.draw('sel-mun-senac', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const t = T(), r = cur(t);
    const scope = r && r.cod_un ? String(r.cod_un) : (r && r.cod_go ? String(r.cod_go) : '35');
    const items = munsIn(scope).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    fillSelect(sel, items, isMun(t) ? t : '', items.length === 1 ? 'Todos (1 município)' : `Todos (${items.length} municípios)`);
    sel.onchange = () => dash.setParams({t: sel.value || scope});
  });
  dash.draw('senac-info', (el) => {
    const r = cur(), m = terr();
    if (!r || !m) { el.replaceChildren(); return; }
    const muns = munsIn(String(r.cod));
    const units = (cods) => [...new Set(cods)].map((c) => m.get(String(c))).filter(Boolean);
    // linhas fixas: Unidade Senac e Gerência de Operações, sempre conectadas ao território selecionado
    const capU = '16 unidades na capital: ' + Object.entries(SPU).map(([g, l]) => g + ' – ' + l.join(', ')).join('; ');
    let un = '—', go = '—', detail = null;
    if (r.nivel === 'Município') {
      if (!r.cod_go) { un = 'Não consta nas áreas de atuação (documentos de 26/6/2026)'; go = '—'; }
      else if (String(r.cod_go) === '900') { un = 'Unidades em São Paulo-SP'; go = 'GO1, GO2 e GO3'; detail = capU; }
      else { un = r.unidade; go = r.go; }
    } else if (r.nivel === 'Unidade Senac') {
      un = r.nome + ' (todos os ' + muns.length + (muns.length === 1 ? ' município' : ' municípios') + ' da área de atuação)';
      if (muns.length === 1) un = r.nome + ' (1 município na área de atuação)';
      go = String(r.cod_go) === '900' ? 'GO1, GO2 e GO3' : (m.get(String(r.cod_go)) || {}).nome || '—';
      if (String(r.cod_go) === '900') detail = capU;
    } else if (r.nivel === 'GO Senac') {
      const u = units(muns.map((x) => x.cod_un));
      if (String(r.cod) === '900') { un = 'Unidades em São Paulo-SP'; go = 'GO1, GO2 e GO3'; detail = capU; }
      else { un = 'Todas da ' + r.nome + ': ' + u.length + ' áreas de atuação, ' + muns.length + ' municípios'; go = r.nome; detail = u.map((x) => x.nome.replace(/Senac /g, '')).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', '); }
    } else if (r.nivel === 'Estado') {
      un = 'Todas: 42 áreas de atuação fora da capital e 16 unidades na capital'; go = 'GO1, GO2 e GO3';
    } else {
      const u = units(muns.map((x) => x.cod_un)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const gos = [...new Set(muns.map((x) => x.cod_go).filter(Boolean).map(String))].map((c) => m.get(c)).filter(Boolean).sort((a, b) => goOrd(a) - goOrd(b));
      un = u.map((x) => x.nome.replace(/Senac /g, '')).join(', ') || '—';
      go = [...new Set(gos.flatMap((x) => String(x.cod) === '900' ? ['GO1', 'GO2', 'GO3'] : [x.nome]))].sort().join(', ') || '—';
    }
    // cada informação em um bloco: título acima, valor abaixo (lidos lado a lado na barra de filtros)
    const line = (lab, val, field) => {
      const d = document.createElement('div'); d.className = 'ni';
      const l = document.createElement('span'); l.className = 'nl'; l.textContent = lab;
      const v = mark('span', 'territorios', field, where({cod: r.cod}), val); v.className = 'nv';
      d.append(l, v); return d;
    };
    el.replaceChildren(line('Unidade Senac', un, r.nivel === 'Município' ? 'unidade' : 'nome'), line('Gerência de Operações', go, r.nivel === 'Município' ? 'go' : 'nome'));
    if (detail) { const d = document.createElement('span'); d.className = 'nd'; d.textContent = detail; el.append(d); }
  });

  dash.draw('mapa', (el) => {
    const st = status('geo', 'territorios');
    if (st === 'error') return failLine(el);
    if (st !== 'ok') { el.replaceChildren(); return; }
    const geo = dash.data('geo').data;
    const m = terr();
    const ind = P().ind ?? 'cri_part_emp', meta = IND[ind] || IND.cri_part_emp;
    el.replaceChildren();
    const w = Math.max(300, el.clientWidth), h = Math.round(Math.min(540, Math.max(340, w * 0.64)));
    const feats = geo.features.map((f) => (d3.geoArea(f) > 2 * Math.PI ? {...f, geometry: {...f.geometry, coordinates: f.geometry.type === 'Polygon' ? f.geometry.coordinates.map((r) => [...r].reverse()) : f.geometry.coordinates.map((p) => p.map((r) => [...r].reverse()))}} : f));
    const fc = {type: 'FeatureCollection', features: feats};
    const proj = d3.geoMercator().fitSize([w, h - 52], fc);
    const path = d3.geoPath(proj);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h);
    const vals = [...m.values()].filter((x) => x.nivel === 'Município' && has(x[ind])).map((x) => x[ind]);
    const lo = css('--color-bg') || '#fff';
    const ramp = d3.interpolateRgb(d3.interpolateRgb(lo, dash.colors[0])(0.12), dash.colors[0]);
    const cols = [0, 0.25, 0.5, 0.75, 1].map((t) => ramp(meta.hi ? t : 1 - t));
    const q = d3.scaleQuantile(vals, cols);
    const sel = new Set(munsIn(T()).map((x) => String(x.cod)));
    const muted = css('--cds-chart-muted') || '#ccc';
    const tip = tipBox(el);
    const g = svg.append('g').attr('class', 'grow');
    g.selectAll('path').data(feats).join('path')
      .attr('class', (f) => 'mun' + (T() !== '35' && sel.has(String(f.properties.cod)) ? ' hl' : ''))
      .attr('d', path)
      .attr('fill', (f) => { const r = m.get(String(f.properties.cod)); return r && has(r[ind]) ? q(r[ind]) : muted; })
      .on('mousemove', (ev, f) => { const r = m.get(String(f.properties.cod)); if (r) showTip(el, tip, ev, r.nome, [[null, meta.lab + ': ' + meta.f(r[ind])], [null, r.rgi ? 'RGI ' + r.rgi : ''], [null, r.go ? (String(r.cod_go) === '900' ? 'Senac: Unidades em São Paulo-SP (GO1, GO2 e GO3)' : 'Senac: ' + r.go + ' · ' + r.unidade) : '']]); })
      .on('mouseleave', () => { tip.hidden = true; })
      .on('click', (ev, f) => dash.setParams({t: String(f.properties.cod)}));
    g.selectAll('path.hl').raise();
    const qs = q.quantiles();
    const lg = svg.append('g').attr('transform', `translate(0, ${h - 40})`);
    const labels = [];
    cols.forEach((c, i) => {
      const a = i === 0 ? d3.min(vals) : qs[i - 1];
      labels.push([c, i === 0 ? 'até ' + meta.f(qs[0]) : (i === cols.length - 1 ? 'acima de ' + meta.f(a) : meta.f(a) + ' a ' + meta.f(qs[i]))]);
    });
    labels.push([muted, 'sem dado']);
    let x = 0, row = 0;
    for (const [c, t] of labels) {
      const tw = textW(svg, t);
      if (x > 0 && x + tw + 22 > w) { x = 0; row += 1; }
      lg.append('rect').attr('x', x).attr('y', row * 16).attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', c);
      lg.append('text').attr('class', 'lbl').attr('x', x + 16).attr('y', row * 16 + 10).text(t);
      x += tw + 30;
    }
  });

  dash.draw('ranking', (tb) => {
    const rk = rowsOf('ranking');
    if (!rk || !terr()) { tb.replaceChildren(); return; }
    const ind = P().ind ?? 'cri_part_emp', meta = IND[ind] || IND.cri_part_emp;
    const t = T();
    const scope = new Set(munsIn(t.length === 7 ? (cur(t).cod_rgint) : t).map((x) => String(x.cod)));
    let rows = rk.filter((r) => r.ind === ind && scope.has(String(r.cod)));
    const qn = ui.rankQ.trim().toLocaleLowerCase('pt-BR');
    if (qn) rows = rows.filter((r) => r.nome.toLocaleLowerCase('pt-BR').includes(qn));
    const {k, dir} = ui.rankSort;
    rows.sort((a, b) => (k === 'nome' ? a.nome.localeCompare(b.nome, 'pt-BR') : (a[k] - b[k])) * dir);
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = `${r.cod},${ind}`;
      tr.className = 'clk' + (String(r.cod) === t ? ' sel' : '');
      tr.tabIndex = 0;
      const c = (txt, cls) => { const td = document.createElement('td'); td.textContent = txt; if (cls) td.className = cls; return td; };
      tr.append(c(r.rk + 'º', 'n'), c(r.nome), c(meta.f(r.valor), 'n'), c(r.rgi || ''));
      const go = () => dash.setParams({t: String(r.cod)});
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      return tr;
    }));
  });

  const hbars = (el, items, fmt, opt = {}) => {
    el.replaceChildren();
    if (!items.length) { el.textContent = '—'; return; }
    const rowH = 26, top = 6;
    const h = top + items.length * rowH + 6;
    const {svg, w} = svgIn(el, h);
    const lw = Math.min(w * 0.42, d3.max(items, (d) => textW(svg, d.label)) + 10);
    const vw = d3.max(items, (d) => textW(svg, d.txt ?? fmt(d.value), 'val')) + 8;
    const max = opt.max ?? d3.max(items, (d) => d.value) ?? 1;
    const x = d3.scaleLinear([0, max || 1], [0, Math.max(10, w - lw - vw - 4)]);
    const tip = tipBox(el);
    const g = svg.append('g').attr('class', 'grow');
    items.forEach((d, i) => {
      const y = top + i * rowH;
      g.append('text').attr('class', 'lbl').attr('x', lw - 8).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').text(fit(svg, d.label, lw - 10));
      g.append('rect').attr('x', lw).attr('y', y + 4).attr('height', rowH - 10).attr('width', Math.max(1, x(d.value || 0))).attr('rx', 3).attr('fill', d.color || dash.colors[0])
        .on('mousemove', (ev) => showTip(el, tip, ev, d.label, [[d.color || dash.colors[0], (opt.name || '') + (d.txt ?? fmt(d.value))], ...(d.extra || []).map((e) => [null, e])]))
        .on('mouseleave', () => { tip.hidden = true; });
      g.append('text').attr('class', 'val').attr('x', lw + x(d.value || 0) + 4).attr('y', y + rowH / 2 + 4).text(d.txt ?? fmt(d.value));
    });
  };

  const cols = (el, data, fmt, opt = {}) => {
    el.replaceChildren();
    const h = opt.h || 240;
    const {svg, w} = svgIn(el, h);
    if (!data.length) return;
    const yMax = d3.max(data, (d) => d.v) || 1;
    const yl = d3.scaleLinear([0, yMax], [h - 26, 18]).nice(4);
    const ticks = yl.ticks(4);
    const ml = d3.max(ticks, (t) => textW(svg, (opt.tick || fmt)(t))) + 8;
    const x = d3.scaleBand(data.map((d) => d.x), [ml, w - 6]).padding(0.28);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'grid-l').attr('x1', ml).attr('x2', w).attr('y1', (t) => yl(t)).attr('y2', (t) => yl(t));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'lbl').attr('x', ml - 6).attr('y', (t) => yl(t) + 4).attr('text-anchor', 'end').text((t) => (opt.tick || fmt)(t));
    svg.append('g').selectAll('text').data(data).join('text').attr('class', 'lbl').attr('x', (d) => x(d.x) + x.bandwidth() / 2).attr('y', h - 8).attr('text-anchor', 'middle').text((d) => d.x);
    const tip = tipBox(el);
    const bw = Math.min(32, x.bandwidth());
    svg.append('g').attr('class', 'grow').selectAll('rect').data(data).join('rect')
      .attr('x', (d) => x(d.x) + (x.bandwidth() - bw) / 2).attr('width', bw).attr('y', (d) => yl(d.v || 0)).attr('height', (d) => yl(0) - yl(d.v || 0)).attr('rx', 3)
      .attr('fill', (d) => d.c || dash.colors[0])
      .on('mousemove', (ev, d) => showTip(el, tip, ev, String(d.x), [[d.c || dash.colors[0], (opt.name || '') + fmt(d.v)], ...(d.extra || []).map((e) => [null, e])]))
      .on('mouseleave', () => { tip.hidden = true; });
    if (opt.breakAt && x(opt.breakAt) !== undefined) {
      const bx = x(opt.breakAt) - x.step() * x.paddingInner() / 2;
      svg.append('line').attr('x1', bx).attr('x2', bx).attr('y1', 12).attr('y2', h - 26).attr('stroke', css('--cds-chart-reference')).attr('stroke-dasharray', '4 3');
      svg.append('text').attr('class', 'lbl').attr('x', bx + 4).attr('y', 12).text('nova série');
    }
  };

  const lines = (el, series, fmt, opt = {}) => {
    el.replaceChildren();
    const h = opt.h || 240;
    const {svg, w} = svgIn(el, h);
    const pts = series.flatMap((s) => s.pts.filter((p) => has(p.y)));
    if (!pts.length) { svg.remove(); el.textContent = '—'; return; }
    const xs = [...new Set(series.flatMap((s) => s.pts.map((p) => p.x)))].sort((a, b) => a - b);
    let [y0, y1] = d3.extent(pts, (p) => p.y);
    const pad = (y1 - y0) * 0.12 || 1;
    const yl = d3.scaleLinear([opt.y0 ?? y0 - pad, y1 + pad], [h - 26, 12]).nice(4);
    const ticks = yl.ticks(4);
    const endW = d3.max(series, (s) => { const l = [...s.pts].reverse().find((p) => has(p.y)); return l && !s.noLabel ? textW(svg, s.name + ' ' + fmt(l.y)) : 0; }) || 0;
    const ml = d3.max(ticks, (t) => textW(svg, fmt(t))) + 8;
    const right = Math.min(endW + 10, w * 0.4);
    const x = d3.scalePoint(xs, [ml + 6, w - right]);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'grid-l').attr('x1', ml).attr('x2', w - right + 4).attr('y1', (t) => yl(t)).attr('y2', (t) => yl(t));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'lbl').attr('x', ml - 6).attr('y', (t) => yl(t) + 4).attr('text-anchor', 'end').text((t) => fmt(t));
    const every = Math.ceil(xs.length / Math.max(2, Math.floor((w - ml - right) / 44)));
    svg.append('g').selectAll('text').data(xs.filter((_, i) => i % every === 0 || i === xs.length - 1)).join('text').attr('class', 'lbl').attr('x', (d) => x(d)).attr('y', h - 8).attr('text-anchor', 'middle').text((d) => d);
    const g = svg.append('g').attr('class', 'grow');
    const ends = [];
    series.forEach((s) => {
      const p = s.pts.filter((q) => has(q.y));
      if (!p.length) return;
      g.append('path').datum(p).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', s.dash ? '5 4' : null).attr('opacity', s.dash ? 0.7 : 1).attr('d', d3.line((q) => x(q.x), (q) => yl(q.y)));
      if (!s.dash) g.selectAll(null).data(p).join('circle').attr('cx', (q) => x(q.x)).attr('cy', (q) => yl(q.y)).attr('r', 3).attr('fill', s.c);
      const l = p[p.length - 1];
      if (!s.noLabel) ends.push({y: yl(l.y), x: x(l.x), t: s.name + ' ' + fmt(l.y), c: s.c});
    });
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
    ends.forEach((e) => g.append('text').attr('class', 'lbl').attr('x', e.x + 6).attr('y', e.y + 4).style('fill', e.c).text(e.t));
    const tip = tipBox(el);
    const rule = svg.append('line').attr('y1', 12).attr('y2', h - 26).attr('stroke', css('--cds-chart-axis')).attr('opacity', 0);
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', Math.max(0, w - right - ml)).attr('height', h - 20).attr('fill', 'transparent')
      .on('mousemove', (ev) => {
        const [mx] = d3.pointer(ev);
        const xv = xs.reduce((a, b) => (Math.abs(x(b) - mx) < Math.abs(x(a) - mx) ? b : a), xs[0]);
        rule.attr('x1', x(xv)).attr('x2', x(xv)).attr('opacity', 1);
        showTip(el, tip, ev, String(xv), series.map((s) => { const q = s.pts.find((p) => p.x === xv); return q && has(q.y) ? [s.c, s.name + ': ' + fmt(q.y)] : null; }).filter(Boolean));
      })
      .on('mouseleave', () => { tip.hidden = true; rule.attr('opacity', 0); });
  };

  const legend = (el, pairs) => {
    const lg = document.createElement('div'); lg.className = 'legend';
    pairs.forEach(([c, l]) => { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = c; s.append(i, document.createTextNode(l)); lg.append(s); });
    el.append(lg);
  };
  const noData = (el, msg) => { el.replaceChildren(); const d = document.createElement('div'); d.className = 'fail'; d.style.cssText = 'min-height:15rem'; d.textContent = msg; el.append(d); };

  dash.draw('segmentos', (el) => {
    const r = rowsOf('segmentos');
    if (dash.data('segmentos').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const p = P(), t = T(), ano = Number(p.sega ?? 2024), k = p.segm ?? 'emp';
    const fm = k === 'sal_mil' ? F.brlmil : F.int;
    const nm = {emp: 'Empregos: ', ul: 'Estabelecimentos: ', sal_mil: 'Massa salarial: '}[k];
    const items = r.filter((x) => String(x.cod) === t && x.ano === ano)
      .sort((a, b) => AREA_ORDER.indexOf(a.area) - AREA_ORDER.indexOf(b.area) || (b[k] || 0) - (a[k] || 0))
      .map((x) => ({label: x.segmento, value: x[k] || 0, color: areaColor(x.area), extra: ['Área: ' + x.area, 'Estabelecimentos: ' + F.int(x.ul), 'Empregos: ' + F.int(x.emp)]}));
    if (!items.length) return noData(el, 'Nenhum estabelecimento criativo registrado neste ano.');
    hbars(el, items, fm, {name: nm});
    legend(el, AREA_ORDER.map((a) => [areaColor(a), a]));
  });

  dash.draw('serie-cri', (el) => {
    const r = rowsOf('serie');
    if (dash.data('serie').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const s = r.filter((x) => String(x.cod) === t && x.ano <= 2024 && has(x.cri_emp)).sort((a, b) => a.ano - b.ano);
    cols(el, s.map((x) => ({x: x.ano, v: x.cri_emp, extra: ['Participação no emprego: ' + F.pct2(x.cri_part_emp), 'Estabelecimentos: ' + F.int(x.cri_ul)]})), F.int, {name: 'Empregos criativos: ', breakAt: 2022, tick: (v) => compact.format(v)});
  });

  dash.draw('rouanet', (el) => {
    const r = rowsOf('rouanet');
    if (dash.data('rouanet').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const by = new Map(r.filter((x) => String(x.cod) === t).map((x) => [x.ano, x]));
    const data = d3.range(2019, 2027).map((y) => { const x = by.get(y); return {x: y, v: x ? x.captado : 0, c: y === 2026 ? css('--cds-chart-muted') : dash.colors[1], extra: x ? ['Projetos: ' + F.int(x.projetos), 'Projetos que captaram: ' + F.int(x.projetos_captaram), 'Valor aprovado: ' + F.brlc(x.aprovado)] : ['Nenhum projeto']}; });
    cols(el, data, F.brlc, {name: 'Captado: ', tick: (v) => 'R$ ' + compact.format(v)});
    legend(el, [[dash.colors[1], 'Valor captado'], [css('--cds-chart-muted'), '2026: ano em curso']]);
  });

  dash.draw('ideb', (el) => {
    const r = rowsOf('ideb');
    if (dash.data('ideb').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const mine = r.filter((x) => String(x.cod) === t);
    if (!mine.length) return noData(el, 'Sem IDEB para este nível territorial: escolha um município.');
    const E = [['ai', 'Anos iniciais'], ['af', 'Anos finais'], ['em', 'Ensino médio']];
    const series = [];
    E.forEach(([e, nm], i) => {
      const s = mine.filter((x) => x.etapa === e).sort((a, b) => a.ano - b.ano);
      series.push({name: nm, c: dash.colors[i], pts: s.map((x) => ({x: x.ano, y: x.ideb}))});
      series.push({name: 'Meta ' + nm.toLowerCase(), c: dash.colors[i], dash: true, noLabel: true, pts: s.filter((x) => x.ano <= 2021).map((x) => ({x: x.ano, y: x.meta}))});
    });
    lines(el, series, F.d1);
  });

  dash.draw('fluxo', (tb) => {
    const r = rowsOf('educacao');
    if (!r) { tb.replaceChildren(); return; }
    const t = T();
    const order = ['Educação infantil', 'Anos iniciais (EF)', 'Anos finais (EF)', 'Ensino médio'];
    const rows = r.filter((x) => String(x.cod) === t).sort((a, b) => order.indexOf(a.etapa) - order.indexOf(b.etapa));
    tb.replaceChildren(...rows.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = `${x.cod},${enc(x.etapa)}`;
      const c = (v, cls) => { const td = document.createElement('td'); td.textContent = v; if (cls) td.className = cls; return td; };
      tr.append(c(x.etapa), c(F.int(x.matriculas), 'n'), c(F.pct1(x.aprovacao), 'n'), c(F.pct1(x.reprovacao), 'n'), c(F.pct1(x.abandono), 'n'), c(F.d1(x.alunos_turma), 'n'), c(F.pct1(x.docentes_formacao_adequada_pct), 'n'));
      return tr;
    }));
  });

  dash.draw('infra', (el) => {
    const r = rowsOf('infra');
    if (dash.data('infra').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const creative = new Set(['Ateliê de artes', 'Sala de música/coral', 'Estúdio de dança', 'Auditório']);
    const items = r.filter((x) => String(x.cod) === t).sort((a, b) => b.pct - a.pct)
      .map((x) => ({label: x.item, value: x.pct, color: creative.has(x.item) ? dash.colors[1] : dash.colors[0], extra: [F.int(x.escolas_com) + ' de ' + F.int(x.escolas) + ' escolas públicas']}));
    if (!items.length) return noData(el, 'Sem escolas públicas em atividade registradas.');
    hbars(el, items, F.pct1, {max: 100});
    legend(el, [[dash.colors[0], 'Infraestrutura básica e pedagógica'], [dash.colors[1], 'Espaços para artes e cultura']]);
  });

  dash.draw('serie-pop', (el) => {
    const r = rowsOf('serie');
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const s = r.filter((x) => String(x.cod) === t && has(x.populacao)).sort((a, b) => a.ano - b.ano);
    lines(el, [{name: 'População', c: dash.colors[0], pts: s.map((x) => ({x: x.ano, y: x.populacao}))}], (v) => compact.format(v));
  });
  dash.draw('serie-pib', (el) => {
    const r = rowsOf('serie');
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const s = r.filter((x) => String(x.cod) === t && has(x.pib_mil) && x.ano <= 2023).sort((a, b) => a.ano - b.ano);
    cols(el, s.map((x) => ({x: x.ano, v: x.pib_mil, c: dash.colors[2]})), F.brlmil, {name: 'PIB: ', tick: (v) => compact.format(v * 1000)});
  });
  dash.draw('va', (el) => {
    const r = cur();
    if (!r) { el.replaceChildren(); return; }
    const parts = [['Agropecuária', r.va_agro_2021_mil], ['Indústria', r.va_ind_2021_mil], ['Serviços', r.va_serv_2021_mil], ['Adm. pública, defesa, saúde e educação públicas', r.va_adm_2021_mil]];
    const tot = d3.sum(parts, (p) => p[1] || 0);
    if (!tot) return noData(el, 'Sem dado de valor adicionado.');
    hbars(el, parts.map(([l, v], i) => ({label: l, value: (v || 0) / tot * 100, color: dash.colors[(i + 3) % dash.colors.length], extra: ['Valor adicionado: ' + F.brlmil(v)]})), F.pct1, {max: 100});
  });
  dash.draw('ifdm', (el) => {
    const r = rowsOf('ifdm');
    if (dash.data('ifdm').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const t = T();
    const s = r.filter((x) => String(x.cod) === t).sort((a, b) => a.ano - b.ano);
    if (!s.length) return noData(el, 'IFDM disponível apenas para municípios.');
    const D = [['ifdm_geral', 'Geral'], ['ifdm_educacao', 'Educação'], ['ifdm_saude', 'Saúde'], ['ifdm_emprego_renda', 'Emprego & Renda']];
    lines(el, D.map(([k, n], i) => ({name: n, c: dash.colors[i], pts: s.map((x) => ({x: x.ano, y: x[k]}))})), F.d3);
  });
  dash.draw('municipios', (tb) => {
    const m = terr();
    if (!m) { tb.replaceChildren(); return; }
    const t = T();
    const scope = t.length === 7 ? String(cur(t).cod_rgi) : t;
    let rows = munsIn(scope);
    const qn = ui.munQ.trim().toLocaleLowerCase('pt-BR');
    if (qn) rows = rows.filter((r) => r.nome.toLocaleLowerCase('pt-BR').includes(qn));
    const {k, dir} = ui.munSort;
    rows.sort((a, b) => {
      if (k === 'nome' || k === 'porte') return String(a[k] || '').localeCompare(String(b[k] || ''), 'pt-BR') * dir;
      const av = has(a[k]) ? a[k] : -Infinity, bv = has(b[k]) ? b[k] : -Infinity; return (av - bv) * dir;
    });
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = String(r.cod); tr.className = 'clk' + (String(r.cod) === t ? ' sel' : ''); tr.tabIndex = 0;
      const c = (v, cls) => { const td = document.createElement('td'); td.textContent = v; if (cls) td.className = cls; return td; };
      tr.append(c(r.nome), c(F.porte(r.porte)), c(F.int(r.pop_censo), 'n'), c(F.brl(r.pib_pc_2023), 'n'), c(F.pct2(r.cri_part_emp), 'n'), c(F.d1(r.ideb_ai), 'n'), c(F.d3(r.ifdm_geral_2023), 'n'));
      const go = () => dash.setParams({t: String(r.cod)});
      tr.addEventListener('click', go); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      return tr;
    }));
  });

  dash.draw('cmp-add', (sel) => {
    const m = terr(); if (!m) { sel.replaceChildren(); return; }
    const groups = [['Estado', 'Estado'], ['Região intermediária', 'Regiões intermediárias'], ['Região imediata', 'Regiões imediatas'], ['GO Senac', 'GOs Senac SP'], ['Unidade Senac', 'Unidades Senac (área de atuação)'], ['Município', 'Municípios']];
    const chosen = new Set(cmpList());
    sel.replaceChildren(new Option('Adicionar território…', ''), ...groups.map(([nv, lab]) => {
      const og = document.createElement('optgroup'); og.label = lab;
      [...m.values()].filter((x) => x.nivel === nv && !chosen.has(String(x.cod))).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach((x) => og.append(new Option(x.nome, String(x.cod))));
      return og;
    }));
    sel.value = '';
    sel.onchange = () => { if (sel.value) setCmp([...cmpList(), sel.value]); };
  });
  dash.draw('cmp-chips', (el) => {
    const m = terr(); if (!m) { el.replaceChildren(); return; }
    const l = cmpList().filter((c) => m.has(c));
    el.replaceChildren(...l.map((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-label', 'Remover ' + m.get(c).nome);
      const dot = document.createElement('i'); dot.style.background = dash.colors[i % dash.colors.length];
      b.append(dot, mark('span', 'territorios', 'nome', where({cod: c}), m.get(c).nome), document.createTextNode(' ×'));
      b.addEventListener('click', () => setCmp(cmpList().filter((x) => x !== c)));
      return b;
    }));
    if (!l.length) { const s = document.createElement('span'); s.className = 'muted'; s.textContent = 'Nenhum território escolhido ainda.'; el.append(s); }
  });
  dash.draw('cmp-tabela', (tb) => {
    const m = terr(); if (!m) { tb.replaceChildren(); return; }
    const l = cmpList().filter((c) => m.has(c));
    tb.replaceChildren(...l.map((c) => {
      const r = m.get(c);
      const tr = document.createElement('tr'); tr.dataset.key = c;
      const td = (v, cls) => { const e = document.createElement('td'); e.textContent = v; if (cls) e.className = cls; return e; };
      tr.append(td(r.nome), td(F.int(r.pop_censo), 'n'), td(F.brl(r.pib_pc_2023), 'n'), td(F.int(r.cri_emp), 'n'), td(F.pct2(r.cri_part_emp), 'n'), td(F.d1(r.cri_ul_10mil), 'n'), td(F.brl(r.cri_rem_media), 'n'), td(F.brlc(r.rou_captado), 'n'), td(F.d1(r.ideb_ai), 'n'), td(F.d1(r.ideb_af), 'n'), td(F.d1(r.ideb_em), 'n'), td(F.d3(r.ifdm_geral_2023), 'n'), td(F.d1(r.idpec), 'n'), td(has(r.ql_criativo_2024) ? N2.format(r.ql_criativo_2024) : '—', 'n'));
      return tr;
    }));
  });
  dash.draw('cmp-barras', (el) => {
    const m = terr(); if (!m) { el.replaceChildren(); return; }
    const ind = P().cmpi ?? 'cri_part_emp', meta = IND[ind] || IND.cri_part_emp;
    const l = cmpList().filter((c) => m.has(c));
    if (!l.length) return noData(el, 'Adicione territórios acima para comparar.');
    const items = l.map((c, i) => { const v = m.get(c)[ind]; return {label: m.get(c).nome, value: has(v) ? Math.max(0, v) : 0, txt: meta.f(v), color: dash.colors[i % dash.colors.length]}; });
    hbars(el, items, meta.f, {name: meta.lab + ': '});
  });

  dash.draw('fontes', (tb) => {
    const r = rowsOf('fontes'); if (!r) { tb.replaceChildren(); return; }
    tb.replaceChildren(...r.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.fonte;
      const td = (v) => { const e = document.createElement('td'); e.textContent = v; return e; };
      const [y, mo, d] = String(x.coletado_em).split('-');
      tr.append(td(x.fonte), td(x.base), td(x.periodo), td(`${d}/${mo}/${y}`), td(x.endereco));
      return tr;
    }));
  });
  dash.draw('cnae', (tb) => {
    const r = rowsOf('cnae'); if (!r) { tb.replaceChildren(); return; }
    tb.replaceChildren(...r.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.cnae_classe;
      const td = (v) => { const e = document.createElement('td'); e.textContent = v; return e; };
      tr.append(td(x.area_criativa), td(x.segmento), td(x.cnae_classe), td(x.cnae_descricao));
      return tr;
    }));
  });

  dash.draw('cbo', (tb) => {
    const r = rowsOf('cbo_criativas'); if (!r) { tb.replaceChildren(); return; }
    tb.replaceChildren(...r.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.cbo;
      const td = (v) => { const e = document.createElement('td'); e.textContent = v; return e; };
      tr.append(td(x.cod_isco), td(x.familia + ' · ' + x.familia_nome), td(x.cbo), td(x.ocupacao));
      return tr;
    }));
  });

  // ---------- IDPEC-SP (adaptado do IDPEC/ESPM) ----------
  F.d2 = (v) => has(v) ? N2.format(v) : '—';
  const DIM = [
    {k: 'd1_capacidades_humanas', nome: 'Capacidades humanas', ind: [['h1_superior_pct', 'Ensino superior (25+)'], ['h2_ideb', 'IDEB ensino médio'], ['h3_gasto_educ_rel_porte', 'Gasto em educação por aluno']]},
    {k: 'd2_atratividade_conectividade', nome: 'Atratividade e conectividade espacial', ind: [['a1_mortes_viol_100mil', 'Segurança (mortes violentas)'], ['a2_banda_larga_100hab', 'Banda larga fixa'], ['a3_conect_aerea_log', 'Conectividade aérea']]},
    {k: 'd3_ambiente_cultural_empreend', nome: 'Ambiente cultural e empreendedorismo', ind: [['c1_gasto_cult_rel_porte', 'Gasto em cultura'], ['c2_cresc_estab_22_24_pct', 'Criação de estabelecimentos'], ['c3_governanca_cultural', 'Governança cultural (SNC + MUNIC)']]},
  ];
  let iIndex = null, iSrc = null;
  const idp = (cod) => { const r = rowsOf('idpec'); if (!r) return null; if (iSrc !== r) { iIndex = new Map(r.map((x) => [String(x.cod), x])); iSrc = r; } return iIndex.get(String(cod ?? T())); };

  dash.calc('correlacao', {
    inputs: ['idpec', 'territorios'],
    title: 'Correlação com a concentração criativa',
    description: 'Correlação de postos (Spearman) entre cada componente do IDPEC-SP e o quociente locacional do emprego criativo de 2024, nos 645 municípios; e correlação parcial de postos descontando o tamanho da população (Censo 2022).',
    fn: (idpec, territorios) => {
      const vars = [['idpec', 'IDPEC-SP\n(índice geral)'], ['d1_capacidades_humanas', 'Dimensão 1\nCapacidades humanas'], ['d2_atratividade_conectividade', 'Dimensão 2\nAtratividade e conectividade espacial'], ['d3_ambiente_cultural_empreend', 'Dimensão 3\nAmbiente cultural e empreendedorismo criativo'], ['n_h1_superior_pct', 'Ensino superior (25+)'], ['n_h2_ideb', 'IDEB ensino médio'], ['n_h3_gasto_educ_rel_porte', 'Gasto em educação por aluno'], ['n_a1_mortes_viol_100mil', 'Segurança (mortes violentas, invertido)'], ['n_a2_banda_larga_100hab', 'Banda larga fixa'], ['n_a3_conect_aerea_log', 'Conectividade aérea'], ['n_c1_gasto_cult_rel_porte', 'Gasto em cultura'], ['n_c2_cresc_estab_22_24_pct', 'Criação de estabelecimentos'], ['n_c3_governanca_cultural', 'Governança cultural (SNC + MUNIC 2024)'], ['snc_score', 'Sistema Nacional de Cultura (SNC)'], ['munic_gov_score', 'Governança | MUNIC (2024)'], ['rouanet_pc', 'Complemento\nCaptação via Lei Rouanet (R$ por habitante)'], ['mtc_intens_emprego_pct', 'Complemento\nIntensidade Criativa do Emprego']];
      const muns = idpec.filter((r) => String(r.cod).length === 7);
      const rank = (a) => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const out = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) out[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return out; };
      const pear = (x, y) => { const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
      const popm = new Map(territorios.map((t) => [String(t.cod), t.pop_censo]));
      return vars.map(([v, rotulo]) => {
        const p = muns.filter((r) => r[v] !== null && r[v] !== undefined && r.ql_criativo_2024 !== null && r.ql_criativo_2024 !== undefined && popm.get(String(r.cod)) != null);
        const x = rank(p.map((r) => r[v])), y = rank(p.map((r) => r.ql_criativo_2024)), z = rank(p.map((r) => popm.get(String(r.cod))));
        const rho = pear(x, y), rxz = pear(x, z), ryz = pear(y, z);
        const par = (rho - rxz * ryz) / Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
        return {variavel: v, rotulo, rho: Math.round(rho * 1000) / 1000, rho_parcial: Math.round(par * 1000) / 1000, rho_porte: Math.round(rxz * 1000) / 1000, n: p.length};
      });
    },
  });

  dash.draw('ik', (el) => {
    const r = idp(el.dataset.cod || T());
    if (!r) { el.textContent = '—'; return; }
    const k = el.dataset.k, f = F[el.dataset.f] || F.text;
    el.replaceChildren(mark('span', 'idpec', k, where({cod: r.cod}), f(r[k])));
  });

  dash.draw('idpec-barras', (el) => {
    if (dash.data('idpec').status === 'error') return failLine(el);
    const r = idp(), sp = idp('35');
    if (!r) { el.replaceChildren(); return; }
    const items = [];
    DIM.forEach((d, di) => d.ind.forEach(([k, lab]) => items.push({label: lab, value: r['n_' + k] ?? 0, txt: F.d1(r['n_' + k]), color: dash.colors[di], extra: ['Dimensão: ' + d.nome, 'Estado de SP: ' + F.d1(sp ? sp['n_' + k] : null)]})));
    hbars(el, items, F.d1, {max: 100, name: 'Pontuação (0 a 100): '});
    legend(el, DIM.map((d, i) => [dash.colors[i], d.nome]));
  });

  dash.draw('idpec-disp', (el) => {
    const rows = rowsOf('idpec');
    if (dash.data('idpec').status === 'error') return failLine(el);
    if (!rows) { el.replaceChildren(); return; }
    el.replaceChildren();
    const muns = rows.filter((r) => String(r.cod).length === 7 && has(r.idpec) && has(r.ql_criativo_2024));
    const h = 320;
    const {svg, w} = svgIn(el, h);
    const t = T();
    const scope = new Set(t === '35' ? [] : munsIn(t).map((x) => String(x.cod)));
    const x = d3.scaleLinear(d3.extent(muns, (r) => r.idpec), [52, w - 16]).nice();
    const ymax = d3.max(muns, (r) => r.ql_criativo_2024);
    const y = d3.scaleSymlog([0, ymax], [h - 34, 12]).constant(0.5);
    const yt = [0, 0.25, 0.5, 1, 2, 4, 8].filter((v) => v <= ymax);
    svg.append('g').selectAll('line').data(yt).join('line').attr('class', 'grid-l').attr('x1', 52).attr('x2', w - 16).attr('y1', (v) => y(v)).attr('y2', (v) => y(v));
    svg.append('g').selectAll('text').data(yt).join('text').attr('class', 'lbl').attr('x', 46).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').text((v) => N2.format(v));
    svg.append('g').selectAll('text').data(x.ticks(5)).join('text').attr('class', 'lbl').attr('x', (v) => x(v)).attr('y', h - 16).attr('text-anchor', 'middle').text((v) => N0.format(v));
    svg.append('text').attr('class', 'lbl').attr('x', w - 16).attr('y', h - 2).attr('text-anchor', 'end').text('IDPEC-SP (0 a 100) →');
    svg.append('text').attr('class', 'lbl').attr('x', 52).attr('y', 8).text('↑ Quociente locacional do emprego criativo (2024)');
    svg.append('line').attr('x1', 52).attr('x2', w - 16).attr('y1', y(1)).attr('y2', y(1)).attr('stroke', css('--cds-chart-reference')).attr('stroke-dasharray', '4 3');
    svg.append('text').attr('class', 'lbl').attr('x', w - 16).attr('y', y(1) - 4).attr('text-anchor', 'end').text('QL = 1: mesma concentração do Estado');
    const tip = tipBox(el);
    const muted = css('--cds-chart-muted');
    const ord = [...muns].sort((a, b) => (String(a.cod) === t) - (String(b.cod) === t) || scope.has(String(a.cod)) - scope.has(String(b.cod)));
    svg.append('g').attr('class', 'grow').selectAll('circle').data(ord).join('circle')
      .attr('cx', (r) => x(r.idpec)).attr('cy', (r) => y(r.ql_criativo_2024))
      .attr('r', (r) => String(r.cod) === t ? 6 : (scope.has(String(r.cod)) ? 4 : 3))
      .attr('fill', (r) => String(r.cod) === t ? dash.colors[0] : (scope.has(String(r.cod)) ? dash.colors[1] : muted))
      .attr('fill-opacity', (r) => String(r.cod) === t || scope.has(String(r.cod)) ? 0.95 : 0.55)
      .attr('stroke', (r) => String(r.cod) === t ? css('--color-fg') : 'none')
      .style('cursor', 'pointer')
      .on('mousemove', (ev, r) => showTip(el, tip, ev, r.nome, [[null, 'IDPEC-SP: ' + F.d1(r.idpec) + ' (' + r.idpec_faixa + ')'], [null, 'QL criativo: ' + F.d2(r.ql_criativo_2024)], [null, 'Capacidades: ' + F.d1(r.d1_capacidades_humanas) + ' · Conectividade: ' + F.d1(r.d2_atratividade_conectividade) + ' · Cultura/empreend.: ' + F.d1(r.d3_ambiente_cultural_empreend)]]))
      .on('mouseleave', () => { tip.hidden = true; })
      .on('click', (ev, r) => dash.setParams({t: String(r.cod)}));
    legend(el, [[dash.colors[0], 'Município selecionado'], [dash.colors[1], 'Municípios da região selecionada'], [muted, 'Demais municípios de SP']]);
  });

  dash.draw('corr-idpec', (el) => {
    const r = rowsOf('correlacao');
    if (!r) { el.textContent = '—'; return; }
    const row = r.find((x) => x.variavel === 'idpec');
    el.replaceChildren(mark('span', 'correlacao', 'rho', where({variavel: 'idpec'}), row ? N2.format(row.rho) : '—'));
  });

  // ---------- leitura local das correlações (município ou território escolhido) ----------
  const CORR_VARS = [['idpec', 'IDPEC-SP\n(índice geral)'], ['d1_capacidades_humanas', 'Dimensão 1\nCapacidades humanas'], ['d2_atratividade_conectividade', 'Dimensão 2\nAtratividade e conectividade espacial'], ['d3_ambiente_cultural_empreend', 'Dimensão 3\nAmbiente cultural e empreendedorismo criativo'], ['n_h1_superior_pct', 'Ensino superior (25+)'], ['n_h2_ideb', 'IDEB ensino médio'], ['n_h3_gasto_educ_rel_porte', 'Gasto em educação por aluno'], ['n_a1_mortes_viol_100mil', 'Segurança (mortes violentas, invertido)'], ['n_a2_banda_larga_100hab', 'Banda larga fixa'], ['n_a3_conect_aerea_log', 'Conectividade aérea'], ['n_c1_gasto_cult_rel_porte', 'Gasto em cultura'], ['n_c2_cresc_estab_22_24_pct', 'Criação de estabelecimentos'], ['n_c3_governanca_cultural', 'Governança cultural (SNC + MUNIC 2024)'], ['snc_score', 'Sistema Nacional de Cultura (SNC)'], ['munic_gov_score', 'Governança | MUNIC (2024)'], ['rouanet_pc', 'Complemento\nCaptação via Lei Rouanet (R$ por habitante)'], ['mtc_intens_emprego_pct', 'Complemento\nIntensidade Criativa do Emprego']];
  const rankAvg = (a) => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const out = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) out[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return out; };
  const pearson = (x, y) => { const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : NaN; };
  // correlação parcial de postos: associação entre componente e QL descontado o tamanho da população (Censo 2022)
  const spPartial = (rows, v, popOf) => { const p = rows.filter((r) => has(r[v]) && has(r.ql_criativo_2024) && has(popOf(r.cod))); if (p.length < 5) return {rho: NaN, par: NaN, n: p.length}; const x = rankAvg(p.map((r) => r[v])), y = rankAvg(p.map((r) => r.ql_criativo_2024)), z = rankAvg(p.map((r) => popOf(r.cod))); const rxy = pearson(x, y), rxz = pearson(x, z), ryz = pearson(y, z); return {rho: rxy, par: (rxy - rxz * ryz) / Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz)), n: p.length}; };
  // IC 95% pela transformação de Fisher com erro-padrão de Bonett & Wright (2000) para Spearman: sqrt((1 + rho²/2) / (n − 3 − k)), k = variáveis de controle
  const ciSp = (rho, n, k = 0) => { if (!(n > 4 + k) || !isFinite(rho)) return [NaN, NaN]; const z = Math.atanh(Math.max(-0.999, Math.min(0.999, rho))), se = Math.sqrt((1 + rho * rho / 2) / (n - 3 - k)); return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)]; };
  const pctRank = (arr, v) => { if (!has(v) || !arr.length) return null; let lo = 0, eq = 0; for (const a of arr) { if (a < v) lo++; else if (a === v) eq++; } return (lo + eq / 2) / arr.length * 100; };
  const forcaTxt = (v) => { const a = Math.abs(v); return a >= 0.5 ? 'forte' : a >= 0.3 ? 'moderada' : a >= 0.1 ? 'fraca' : 'desprezível'; };

  dash.draw('corr-local-titulo', (el) => {
    const r = cur();
    const NV = {'Município': 'Município selecionado', 'Região intermediária': 'Região intermediária selecionada', 'Região imediata': 'Região imediata selecionada', 'GO Senac': 'GO selecionada', 'Unidade Senac': 'Área de atuação da unidade selecionada'};
    if (!r || r.nivel === 'Estado') { el.textContent = 'Quadro 2 · Território selecionado: escolha um município, uma região, uma GO ou uma unidade nos filtros'; return; }
    el.replaceChildren(document.createTextNode('Quadro 2 · ' + (NV[r.nivel] || 'Território selecionado') + ': '), mark('span', 'territorios', 'nome', where({cod: r.cod}), String(r.nome).replace(/^RGI(nt)? /, '')));
  });

  dash.draw('corr-local', (el) => {
    const rows = rowsOf('idpec'), cr = rowsOf('correlacao');
    if (dash.data('idpec').status === 'error') return failLine(el);
    if (!rows || !cr || !terr()) { el.replaceChildren(); return; }
    el.replaceChildren();
    const t = T(), me = rows.find((x) => String(x.cod) === t), tr = cur(t);
    const muns = rows.filter((r) => String(r.cod).length === 7);
    const stPar = new Map(cr.map((x) => [x.variavel, x.rho_parcial]));
    const stN = new Map(cr.map((x) => [x.variavel, x.n]));
    const stRho = new Map(cr.map((x) => [x.variavel, x.rho]));
    // célula de correlação simples do Estado: valor e força, como no Quadro 1
    const rhoCell = (rho) => {
      if (!has(rho)) return ['—', 'n'];
      const f = document.createDocumentFragment();
      f.append(N2.format(rho));
      const s = document.createElement('div'); s.style.cssText = 'font-size:var(--cds-font-size-caption);font-weight:normal;color:var(--color-fg-muted)'; s.textContent = (rho >= 0 ? 'positiva ' : 'negativa ') + forcaTxt(rho);
      f.append(s);
      return [f, 'n ' + (rho >= 0 ? 'ok' : 'bad')];
    };
    const popOf = (c) => { const x = cur(c); return x ? x.pop_censo : null; };
    const note = (txt) => { const p = document.createElement('p'); p.className = 'card-n'; p.textContent = txt; el.append(p); return p; };
    const table = (head, body) => {
      const w = document.createElement('div'); w.className = 'tbl-wrap'; w.style.maxHeight = 'none';
      const tb = document.createElement('table');
      const th = document.createElement('thead'); const hr = document.createElement('tr');
      head.forEach(([h, n]) => { const c = document.createElement('th'); c.textContent = h; if (n) c.className = 'n'; hr.append(c); });
      th.append(hr); const bd = document.createElement('tbody');
      body.forEach((r) => { const row = document.createElement('tr'); if (r.sel) row.className = 'sel'; r.cells.forEach(([v, cls]) => { const c = document.createElement('td'); if (v instanceof Node) c.append(v); else c.textContent = v; if (cls) c.className = cls; row.append(c); }); bd.append(row); });
      tb.append(th, bd); w.append(tb); el.append(w);
    };
    if (t === '35' || !me || !tr) { note('Com o Estado selecionado, a análise é a do Quadro 1. Ao escolher um território, este quadro mostra a sua leitura própria.'); return; }
    if (tr.nivel === 'Município') {
      const qlAll = muns.filter((r) => has(r.ql_criativo_2024) && has(r.idpec) && has(popOf(r.cod)));
      const qlP = pctRank(qlAll.map((r) => r.ql_criativo_2024), me.ql_criativo_2024);
      // QL esperado: 60 municípios mais parecidos em potencial (IDPEC) e em tamanho (população), medidos em postos, sem supor forma funcional
      const rI = rankAvg(qlAll.map((r) => r.idpec)), rP = rankAvg(qlAll.map((r) => popOf(r.cod)));
      const iMe = qlAll.findIndex((r) => String(r.cod) === t);
      const viz = iMe < 0 ? [] : qlAll.map((r, i) => ({ql: r.ql_criativo_2024, d: Math.hypot(rI[i] - rI[iMe], rP[i] - rP[iMe]), i})).filter((o) => o.i !== iMe).sort((p, q) => p.d - q.d).slice(0, 60).map((o) => o.ql).sort((p, q) => p - q);
      const q = (p) => viz.length ? viz[Math.min(viz.length - 1, Math.max(0, Math.round(p * (viz.length - 1))))] : null;
      const [q25, q50, q75] = [q(0.25), q(0.5), q(0.75)];
      const ql = me.ql_criativo_2024;
      const pos = !has(ql) || !viz.length ? 'sem comparação possível' : ql > q75 ? 'acima do esperado' : ql < q25 ? 'abaixo do esperado' : 'dentro do esperado';
      const ce = tr.cri_emp;
      note(`${tr.nome}: quociente locacional criativo ${F.d2(ql)} (percentil ${F.int(qlP)} entre os municípios paulistas). Os 60 municípios mais parecidos com ele em potencial (IDPEC-SP ${F.d1(me.idpec)}) e em tamanho de população têm QL mediano de ${F.d2(q50)}, com metade entre ${F.d2(q25)} e ${F.d2(q75)}: a concentração criativa está ${pos}.` + (iMe >= 0 && rP[iMe] > qlAll.length - 10 ? ' Como está entre os 10 municípios mais populosos, os comparáveis são necessariamente menores: leia essa comparação com cautela.' : '') + (has(ce) && ce < 30 ? ` Atenção: o QL se apoia em ${F.int(ce)} empregos criativos formais; uma única empresa muda o resultado, leia como indicativo.` : ''));
      const peers = muns.filter((r) => { const x = cur(r.cod); return x && x.porte === tr.porte; });
      const body = CORR_VARS.map(([v, lab]) => {
        const vals = muns.filter((r) => has(r[v])).map((r) => r[v]);
        const p = pctRank(vals, me[v]);
        const pp = pctRank(peers.filter((r) => has(r[v])).map((r) => r[v]), me[v]);
        const par = stPar.get(v);
        const leitura = leitMun(v, me[v], p, pp, par, stN.get(v), pos);
        const fmtV = v.startsWith('n_') || v.startsWith('d') || v === 'idpec' || v.endsWith('_score') ? F.d1 : (v === 'rouanet_pc' ? F.brl2 : F.pct2);
        return {sel: HL.has(v), cells: [[lab], rhoCell(stRho.get(v)), [fmtV(me[v]), 'n'], [has(p) ? F.int(p) : '—', 'n'], [has(pp) ? F.int(pp) : '—', 'n'], [leitura, 'leit']]};
      });
      table([['Componente'], ['Correlação simples (Spearman)', 1], ['Valor no município', 1], ['Percentil em SP', 1], ['Percentil no porte', 1], ['Análise | Perspectiva para o município']], body);
      note(`Porte de comparação: ${F.porte(tr.porte)} (${F.int(peers.length)} municípios). Percentil 50 = mediana. A correlação simples é a do Estado (645 municípios), a mesma do Quadro 1: um único município não tem correlação própria, e o valor serve de referência para ler a posição do município. Quanto mais forte, mais a posição no componente tende a acompanhar a concentração criativa; perto de zero, a posição diz pouco sobre ela. “Associado” descreve uma regularidade entre municípios, não um efeito causal do componente sobre o município.`);
      return;
    }
    // território agregado: correlação entre os municípios que o compõem
    const ids = new Set(munsIn(t).map((x) => String(x.cod)));
    const sub = muns.filter((r) => ids.has(String(r.cod)));
    const n = sub.filter((r) => has(r.ql_criativo_2024)).length;
    if (n < 10) { note(`${tr.nome} reúne ${n} ${n === 1 ? 'município' : 'municípios'}: poucos casos para estimar correlações com segurança (mínimo de 10). Escolha um município para a leitura individual, ou um território maior.`); return; }
    note(`Correlações de Spearman entre os ${n} municípios de ${tr.nome}: simples e descontado o tamanho da população (correlação parcial de postos), com intervalo de confiança de 95% para a parcial. ` + (n < 30 ? 'Com menos de 30 municípios os intervalos são largos: leia apenas as relações cujo intervalo não cruza zero.' : 'Para comparar com o conjunto do Estado, consulte o Quadro 1.'));
    const body = CORR_VARS.map(([v, lab]) => {
      const {rho, par, n: nn} = spPartial(sub, v, popOf);
      const [lo, hi] = ciSp(par, nn, 1);
      const sig = isFinite(lo) && (lo > 0 || hi < 0);
      const st = stPar.get(v);
      return {sel: HL.has(v), cells: [[lab], [isFinite(rho) ? N2.format(rho) : '—', 'n'], [isFinite(par) ? N2.format(par) : '—', 'n ' + (isFinite(par) ? (par >= 0 ? 'ok' : 'bad') : '')], [isFinite(lo) ? N2.format(lo) + ' a ' + N2.format(hi) : '—', 'n'], [!isFinite(par) ? 'sem variação suficiente' : (sig ? (par >= 0 ? 'positiva ' : 'negativa ') + forcaTxt(par) : 'não distinguível de zero')], [F.int(nn), 'n']]};
    });
    table([['Componente'], ['Correlação simples (Spearman)', 1], ['Descontado o porte', 1], ['IC 95% (descontado o porte)', 1], ['Leitura'], ['Municípios', 1]], body);
  });

  // Quadro 1 (Estado): análise crítica por componente — diagnóstico (correlação simples, parcial descontado o porte e IC 95%), desafios e oportunidades para a educação profissional técnica
  const HL = new Set(['idpec', 'd1_capacidades_humanas', 'd2_atratividade_conectividade', 'd3_ambiente_cultural_empreend', 'rouanet_pc', 'mtc_intens_emprego_pct']);
  const LEIT_EST = {
    idpec: {d: 'Associação forte no agregado, mas menos da metade resiste ao controle do porte: o índice capta, em boa parte, o efeito de escala urbana. É instrumento de diagnóstico de potencial, insuficiente sozinho para priorizar territórios.', des: 'evitar que a distribuição da oferta formativa reproduza a concentração já existente nos grandes centros, com o índice bruto como critério único.', op: 'combinar IDPEC-SP e porte para identificar municípios médios e pequenos com potencial acima do seu tamanho, candidatos a ofertas criativas em rede.'},
    d1_capacidades_humanas: {d: 'Dimensão mais robusta: a associação pouco se reduz entre municípios de mesmo porte. O estoque de qualificação aparece como condição estrutural da economia criativa, e não como reflexo do tamanho da cidade.', des: 'nos municípios com baixa escolaridade, a falta de base formativa tende a limitar a absorção de ocupações criativas qualificadas, mesmo quando há demanda.', op: 'ampliar itinerários de educação profissional técnica em áreas criativas: é a alavanca com maior sustentação estatística no painel.'},
    d2_atratividade_conectividade: {d: 'Associação moderada que fica fraca entre municípios comparáveis: conectividade e atratividade acompanham a urbanização.', des: 'fora dos polos, infraestrutura e acesso a mercados limitam a escala dos negócios criativos e a retenção de quem se forma.', op: 'ofertas híbridas e cursos de produção e circulação digital (audiovisual, design, marketing digital), que reduzem a dependência da localização.'},
    d3_ambiente_cultural_empreend: {d: 'A associação moderada desaparece quando se controla o porte: gasto cultural, governança e abertura de empresas são, nos dados, atributos das cidades grandes, sem relação própria com a concentração criativa entre municípios comparáveis.', des: 'política cultural municipal isolada não gera emprego criativo formal; recursos e instrumentos institucionais não se convertem automaticamente em trabalho.', op: 'articular formação técnica e fomento (PNAB, editais) para transformar investimento cultural em ocupações qualificadas e negócios sustentáveis.'},
    n_h1_superior_pct: {d: 'Relação mais forte e mais robusta do painel: persiste, moderada, entre municípios de mesmo porte. A economia criativa formal se concentra onde há população com ensino superior, o que indica complementaridade entre níveis de formação.', des: 'risco de seletividade social: ocupações criativas formais tendem a se fechar a quem não tem diploma superior.', op: 'a educação profissional técnica como ponte, com itinerários verticalizados (qualificação, técnico, tecnólogo) e reconhecimento de saberes em municípios com baixa escolaridade superior.'},
    n_h2_ideb: {d: 'Associação praticamente nula no agregado e fraca após o porte. O IDEB mede proficiência em língua portuguesa e matemática, não competências criativas, e por isso pouco discrimina a concentração criativa.', des: 'o vínculo entre escola e trabalho criativo é frágil: bom desempenho no ensino médio não se traduz, por si, em inserção em ocupações criativas.', op: 'integrar ensino médio e formação técnica e profissional em áreas criativas, em parceria com as redes de ensino.'},
    n_h3_gasto_educ_rel_porte: {d: 'Associação desprezível no agregado e fraca após o porte: o volume de gasto por aluno, por si, não se traduz em economia criativa.', des: 'o investimento educacional municipal não está orientado às vocações produtivas locais.', op: 'parcerias com redes municipais para direcionar parte desses recursos a formação técnica alinhada às cadeias criativas do território.'},
    n_a1_mortes_viol_100mil: {d: 'O sinal negativo da correlação simples se inverte e perde significância após o porte: cidades grandes concentram ao mesmo tempo economia criativa e violência. Não há evidência de que a segurança, isoladamente, explique a concentração criativa.', des: 'evitar leituras causais: o dado não autoriza tratar a segurança como fator de atração ou de repulsão de atividades criativas.', op: 'usar o indicador como contexto no planejamento de ofertas noturnas, eventos e ocupação de espaços públicos, sem efeito esperado sobre a concentração criativa.'},
    n_a2_banda_larga_100hab: {d: 'Associação moderada que se dissolve entre municípios comparáveis: a conectividade é condição difundida nas cidades maiores, mas não diferencia pares.', des: 'onde a infraestrutura existe, o gargalo passa a ser a competência de uso produtivo, e não o acesso.', op: 'cursos de produção de conteúdo, design digital e comércio eletrônico de bens e serviços criativos.'},
    n_a3_conect_aerea_log: {d: 'Moderada no agregado e fraca após o porte: sinaliza o papel dos polos regionais conectados a mercados nacionais.', des: 'municípios distantes dos polos tendem a ter acesso restrito a mercados, clientes e eventos de maior porte.', op: 'concentrar ofertas de maior complexidade (tecnologia, audiovisual, eventos) nos polos e organizar ações em rede para os municípios do entorno.'},
    n_c1_gasto_cult_rel_porte: {d: 'Associação nula nas duas medidas. O gasto municipal em cultura não acompanha a economia criativa formal, provavelmente por se orientar a eventos e manutenção de equipamentos, e não à geração de trabalho e renda.', des: 'investimento público cultural não convertido em capacidade produtiva nem em emprego formal.', op: 'formação técnica de gestores, produtores e agentes culturais para qualificar a aplicação dos recursos, inclusive da PNAB.'},
    n_c2_cresc_estab_22_24_pct: {d: 'Fraca no agregado e não distinguível de zero após o porte: abrir empresas é dinâmica geral das cidades em crescimento, não marca de especialização criativa.', des: 'a abertura de negócios não garante sobrevivência nem formalização duradoura das atividades criativas.', op: 'empreendedorismo criativo como conteúdo transversal dos cursos, com foco em formalização, gestão e sobrevivência dos negócios.'},
    n_c3_governanca_cultural: {d: 'Moderada no agregado, mas nula entre municípios de mesmo porte: Conselho, Plano e Fundo de cultura e boa gestão administrativa são típicos dos municípios maiores e não distinguem, entre pares, os que concentram economia criativa.', des: 'a governança é condição de acesso a recursos, não motor de emprego; sem capacidade técnica, os instrumentos ficam apenas formais.', op: 'formar quadros municipais para que os instrumentos de governança resultem em programas com efeito econômico.'},
    snc_score: {d: 'Mesmo padrão da governança: a adesão ao Sistema Nacional de Cultura acompanha o porte e não tem associação própria com a concentração criativa.', des: 'municípios fora do SNC tendem a ficar à margem dos repasses fundo a fundo, o que amplia desigualdades de fomento.', op: 'usar a adesão ao SNC para mapear parceiros institucionais e apoiar, com formação, a estruturação do CPF da cultura (Conselho, Plano e Fundo) onde ele ainda não existe.'},
    munic_gov_score: {d: 'Moderada no agregado e nula após o porte: transparência e controle interno expressam capacidade administrativa geral, sem relação própria com a economia criativa.', des: 'baixa capacidade administrativa dificulta a execução de convênios e parcerias de formação.', op: 'considerar o indicador na escolha de parceiros públicos e no desenho de parcerias que exigem mais gestão.'},
    rouanet_pc: {d: 'Forte no agregado, fraca entre municípios comparáveis: o mecanismo se concentra nos grandes centros e em proponentes já estruturados.', des: 'desigualdade territorial do fomento federal e dependência de captação junto a patrocinadores concentrados.', op: 'formação técnica em elaboração, captação e prestação de contas de projetos culturais, para ampliar o acesso de municípios médios e pequenos.'},
    mtc_intens_emprego_pct: {d: 'Forte no agregado e fraca após o porte. A medida por ocupação (método OIC) e a medida por atividade (QL, CNAE) apontam na mesma direção, o que reforça a validade do diagnóstico.', des: 'não usar a intensidade como fator explicativo: ela mede o mesmo fenômeno por outra via e serve como verificação de consistência.', op: 'onde as duas medidas divergem, investigar as ocupações criativas fora dos setores criativos (incorporados), público relevante para a formação técnica.'},
  };

  // Quadro 2 (município): desafios e oportunidades conforme a posição do município entre os pares de mesmo porte (b = abaixo da mediana, a = acima)
  const LEIT_MUN = {
    idpec: {bd: 'potencial abaixo dos pares de mesmo porte limita a base para expandir atividades criativas.', bo: 'priorizar formação de base e ofertas de entrada em áreas criativas, combinadas às vocações já presentes no município.', ad: 'garantir que o potencial acima dos pares se converta em ocupações formais e negócios.', ao: 'ofertas técnicas de maior complexidade em áreas criativas, apoiadas em condições acima da média do porte.'},
    d1_capacidades_humanas: {bd: 'base de qualificação abaixo dos pares, justamente o fator que, no Estado, mais acompanha a concentração criativa.', bo: 'expandir qualificação e cursos técnicos em áreas criativas, a alavanca com maior sustentação estatística.', ad: 'reter a mão de obra qualificada no território e evitar a migração para polos maiores.', ao: 'itinerários de especialização e cursos técnicos de nível mais alto, apoiados na base de qualificação existente.'},
    d2_atratividade_conectividade: {bd: 'acesso restrito a mercados e infraestrutura limita a escala dos negócios criativos locais.', bo: 'ofertas híbridas e cursos de produção e circulação digital, que reduzem a dependência da localização.', ad: 'converter conectividade em produção local, e não apenas em consumo de conteúdo criativo de fora.', ao: 'cursos voltados a mercados regionais e nacionais: audiovisual, design, marketing digital e eventos.'},
    d3_ambiente_cultural_empreend: {bd: 'ambiente cultural e empreendedor menos estruturado que o dos pares.', bo: 'formação de agentes culturais e empreendedores criativos, articulada a editais e à PNAB.', ad: 'ambiente favorável que, no Estado, não se traduz por si em concentração criativa: risco de investimento sem retorno em trabalho.', ao: 'vincular a estrutura cultural existente a formação técnica e geração de renda (produção cultural, gestão de projetos).'},
    n_h1_superior_pct: {bd: 'escolaridade superior abaixo dos pares, o fator mais robustamente associado à concentração criativa.', bo: 'itinerários verticalizados (qualificação, técnico, tecnólogo) como ponte para ocupações criativas qualificadas.', ad: 'evitar seletividade: ocupações criativas restritas a quem tem diploma superior.', ao: 'cursos técnicos complementares à formação superior (tecnologia, design, audiovisual) e programas de atualização profissional.'},
    n_h2_ideb: {bd: 'desempenho escolar abaixo dos pares fragiliza a base para cursos técnicos mais exigentes.', bo: 'percursos formativos com nivelamento e integração ao ensino médio em áreas criativas.', ad: 'bom desempenho escolar não garante, por si, inserção em ocupações criativas.', ao: 'parcerias com a rede de ensino para itinerários de formação técnica e profissional em áreas criativas.'},
    n_h3_gasto_educ_rel_porte: {bd: 'investimento educacional municipal menor que o dos pares.', bo: 'parcerias que complementem a oferta pública com formação técnica alinhada às cadeias criativas locais.', ad: 'investimento educacional que não está orientado às vocações produtivas locais.', ao: 'direcionar parte do investimento a formação técnica em áreas criativas, em parceria com a rede municipal.'},
    n_a1_mortes_viol_100mil: {bd: 'violência acima dos pares afeta a circulação, os eventos e o uso de espaços públicos.', bo: 'considerar o contexto no desenho das ofertas (horários e locais), sem esperar efeito sobre a concentração criativa.', ad: 'sem desafio estratégico direto para a economia criativa associado a este componente.', ao: 'contexto favorável a eventos, atividades noturnas e ocupação cultural de espaços públicos.'},
    n_a2_banda_larga_100hab: {bd: 'conectividade abaixo dos pares limita a produção e a venda digital.', bo: 'ofertas presenciais com laboratórios conectados, que supram a infraestrutura doméstica.', ad: 'o gargalo é a competência de uso produtivo, não o acesso.', ao: 'cursos de produção de conteúdo, design digital e comércio eletrônico criativo.'},
    n_a3_conect_aerea_log: {bd: 'distância de polos com ligação aérea restringe o acesso a mercados e eventos de maior porte.', bo: 'articulação em rede com o polo regional e ofertas digitais.', ad: 'polo conectado que atrai demanda de fora: risco de a oferta local de profissionais não acompanhar.', ao: 'ofertas de maior complexidade (eventos, turismo criativo, audiovisual) com alcance regional.'},
    n_c1_gasto_cult_rel_porte: {bd: 'investimento cultural municipal abaixo dos pares reduz a base de fomento local.', bo: 'formação para captação de recursos (PNAB, editais estaduais e federais).', ad: 'gasto que, no Estado, não se converte em emprego criativo formal.', ao: 'formação técnica de gestores e produtores para orientar o gasto a trabalho e renda.'},
    n_c2_cresc_estab_22_24_pct: {bd: 'dinâmica empresarial abaixo dos pares.', bo: 'empreendedorismo criativo e formalização como conteúdo dos cursos.', ad: 'abertura de empresas sem garantia de sobrevivência e formalização duradoura.', ao: 'apoio à gestão e à sobrevivência dos negócios criativos nascentes.'},
    n_c3_governanca_cultural: {bd: 'instrumentos de governança abaixo dos pares podem restringir o acesso a repasses.', bo: 'formação de gestores e conselheiros para estruturar Conselho, Plano e Fundo de cultura.', ad: 'governança estruturada que, entre pares, não se associa a mais economia criativa: risco de instrumentos apenas formais.', ao: 'parceria institucional com a prefeitura para programas formativos ligados ao fomento.'},
    snc_score: {bd: 'adesão incompleta ao SNC limita os repasses fundo a fundo.', bo: 'apoio formativo à estruturação do CPF da cultura (Conselho, Plano e Fundo).', ad: 'adesão que não garante, por si, efeito econômico.', ao: 'usar o sistema estruturado como canal para parcerias formativas.'},
    munic_gov_score: {bd: 'capacidade administrativa abaixo dos pares dificulta convênios e parcerias.', bo: 'parcerias de menor exigência de gestão e apoio formativo a servidores.', ad: 'sem desafio estratégico direto para a economia criativa associado a este componente.', ao: 'parceiro público com capacidade para projetos formativos de maior escala.'},
    rouanet_pc: {bd: 'acesso ao fomento federal abaixo dos pares.', bo: 'formação em elaboração, captação e prestação de contas de projetos culturais.', ad: 'dependência de captação concentrada em poucos proponentes.', ao: 'ampliar a base de proponentes com formação em gestão de projetos culturais.'},
    mtc_intens_emprego_pct: {bd: 'poucas ocupações criativas no emprego formal, mesmo diante dos pares.', bo: 'formação para ocupações criativas incorporadas a outros setores (marketing, design e tecnologia nas empresas locais).', ad: 'sustentar a especialização com renovação de competências.', ao: 'atualização profissional e cursos de especialização nas ocupações criativas já presentes.'},
  };

  // célula: diagnóstico + lista "Desafios / Oportunidades"
  const leitNode = (o) => {
    const f = document.createDocumentFragment();
    if (!o) { f.append('—'); return f; }
    const p = document.createElement('p'); p.textContent = o.d; f.append(p);
    const ul = document.createElement('ul');
    [['Desafios:', o.des], ['Oportunidades:', o.op]].forEach(([k, t]) => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = k; li.append(b, ' ' + t); ul.append(li); });
    f.append(ul);
    return f;
  };
  const leitMun = (v, val, p, pp, par, nSt, qlPos) => {
    const L = LEIT_MUN[v];
    if (!has(val) || !has(pp)) return leitNode({d: 'Sem dado para o município neste componente.', des: 'sem base para diagnóstico.', op: 'verificar a fonte e a atualização do dado antes de usar o componente na decisão.'});
    const alto = pp >= 50;
    const faixa = pp >= 75 ? 'quartil superior' : pp > 50 ? 'acima da mediana' : pp === 50 ? 'na mediana' : pp >= 25 ? 'abaixo da mediana' : 'quartil inferior';
    let d = `Percentil ${F.int(p)} no Estado e ${F.int(pp)} entre os municípios do mesmo porte (${faixa}).`;
    const [lo, hi] = has(par) ? ciSp(par, nSt, 1) : [NaN, NaN];
    const sig = isFinite(lo) && (lo > 0 || hi < 0);
    if (sig) {
      d += ` No Estado, entre municípios de mesmo porte, o componente tem associação ${par > 0 ? 'positiva' : 'negativa'} ${forcaTxt(par)} com o QL criativo (ρ parcial ${N2.format(par)}).`;
      const favor = (par > 0) === alto;
      if (favor && qlPos === 'abaixo do esperado') d += ' A posição favorável ainda não se converteu em concentração criativa: o QL do município está abaixo do esperado.';
      else if (favor && qlPos === 'acima do esperado') d += ' Posição coerente com o QL acima do esperado.';
      else if (!favor && qlPos === 'acima do esperado') d += ' Ainda assim, o QL está acima do esperado, o que indica outros fatores locais (vocação setorial, empresas âncora).';
      else if (!favor && qlPos === 'abaixo do esperado') d += ' Posição coerente com o QL abaixo do esperado: componente a priorizar.';
    } else {
      d += ' No Estado, descontado o porte, o componente não tem associação distinguível de zero com o QL criativo: a posição do município não indica, por si, maior ou menor concentração criativa.';
    }
    return leitNode({d, des: L ? (alto ? L.ad : L.bd) : '—', op: L ? (alto ? L.ao : L.bo) : '—'});
  };

  dash.draw('corr-tab', (tb) => {
    const r = rowsOf('correlacao');
    if (!r) { tb.replaceChildren(); return; }
    const forca = (v) => { const a = Math.abs(v); return a >= 0.5 ? 'forte' : a >= 0.3 ? 'moderada' : a >= 0.1 ? 'fraca' : 'desprezível'; };
    tb.replaceChildren(...r.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.variavel;
      if (HL.has(x.variavel)) tr.className = 'sel';
      const td = (v, cls) => { const e = document.createElement('td'); e.textContent = v; if (cls) e.className = cls; return e; };
      tr.append(td(x.rotulo), td(N2.format(x.rho), 'n ' + (x.rho >= 0 ? 'ok' : 'bad')), td((x.rho >= 0 ? 'positiva ' : 'negativa ') + forca(x.rho)), (() => { const e = td('', 'leit'); e.replaceChildren(leitNode(LEIT_EST[x.variavel])); return e; })());
      return tr;
    }));
  });

  // texto da ajuda: correlações descontado o porte (antes colunas do Quadro 1), com IC 95%
  dash.draw('corr-parcial-txt', (el) => {
    const r = rowsOf('correlacao');
    if (!r) { el.textContent = ''; return; }
    const parts = r.filter((x) => has(x.rho_parcial)).map((x) => {
      const [lo, hi] = ciSp(x.rho_parcial, x.n, 1);
      const sig = isFinite(lo) && (lo > 0 || hi < 0);
      const lab = x.rotulo.replace(/\n\(/, ' (').replace(/\n/g, ' · ');
      return `${lab}: ${N2.format(x.rho)} → ${N2.format(x.rho_parcial)} (${sig ? (x.rho_parcial >= 0 ? 'positiva ' : 'negativa ') + forcaTxt(x.rho_parcial) : 'não distinguível de zero'})`;
    });
    el.textContent = parts.join('; ') + '.';
  });

  // ---------- Intensidade criativa, gasto público e comércio internacional (método OIC) ----------
  F.usd = (v) => {
    if (!has(v)) return '—';
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e9) return s + 'US$ ' + N1.format(a / 1e9) + ' bi';
    if (a >= 1e6) return s + 'US$ ' + N1.format(a / 1e6) + ' mi';
    if (a >= 1e3) return s + 'US$ ' + N1.format(a / 1e3) + ' mil';
    return s + 'US$ ' + N0.format(a);
  };
  Object.assign(IND, {
    mtc_intens_emprego_pct: {lab: 'Intensidade criativa do emprego formal', f: F.pct2, hi: true},
    mtc_ql_especializados: {lab: 'QL dos especializados criativos', f: F.d2, hi: true},
    c3_governanca_cultural: {lab: 'Governança cultural e municipal (0 a 100)', f: F.d1, hi: true},
    gc_mun_pc_2024: {lab: 'Gasto municipal com cultura por habitante', f: F.brl2, hi: true},
    cx_part_export_pct: {lab: 'Bens criativos nas exportações', f: F.pct2, hi: true},
  });
  const pair = (el, groups, fmt, names, colors) => {
    el.replaceChildren();
    if (!groups.length) { el.textContent = '—'; return; }
    const rowH = 34, top = 4;
    const h = top + groups.length * rowH + 6;
    const {svg, w} = svgIn(el, h);
    const lw = Math.min(w * 0.4, d3.max(groups, (d) => textW(svg, d.label)) + 10);
    const vw = d3.max(groups, (d) => Math.max(textW(svg, fmt(d.a), 'val'), textW(svg, fmt(d.b), 'val'))) + 8;
    const max = d3.max(groups, (d) => Math.max(d.a || 0, d.b || 0)) || 1;
    const x = d3.scaleLinear([0, max], [0, Math.max(10, w - lw - vw - 4)]);
    const tip = tipBox(el);
    const g = svg.append('g').attr('class', 'grow');
    groups.forEach((d, i) => {
      const y = top + i * rowH;
      g.append('text').attr('class', 'lbl').attr('x', lw - 8).attr('y', y + rowH / 2 + 3).attr('text-anchor', 'end').text(fit(svg, d.label, lw - 10));
      [['a', 0], ['b', 1]].forEach(([k, j]) => {
        const yy = y + 3 + j * 14;
        g.append('rect').attr('x', lw).attr('y', yy).attr('height', 12).attr('width', Math.max(1, x(d[k] || 0))).attr('rx', 2).attr('fill', colors[j])
          .on('mousemove', (ev) => showTip(el, tip, ev, d.label, [[colors[0], names[0] + ': ' + fmt(d.a)], [colors[1], names[1] + ': ' + fmt(d.b)], ...(d.extra || []).map((e) => [null, e])]))
          .on('mouseleave', () => { tip.hidden = true; });
        g.append('text').attr('class', 'val').attr('x', lw + x(d[k] || 0) + 4).attr('y', yy + 10).text(fmt(d[k]));
      });
    });
    legend(el, [[colors[0], names[0]], [colors[1], names[1]]]);
  };
  const byCod = (id) => { const r = rowsOf(id); if (!r) return null; const t = T(); return r.filter((x) => String(x.cod) === t); };

  dash.draw('tridente', (el) => {
    const r = rowsOf('tridente');
    if (dash.data('tridente').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const sp = new Map(r.filter((x) => x.escopo === 'SP').map((x) => [x.categoria, x]));
    const br = new Map(r.filter((x) => x.escopo === 'BR').map((x) => [x.categoria, x]));
    const cats = [['especializados', 'Especializados'], ['incorporados', 'Incorporados'], ['apoio', 'Apoio']];
    const items = cats.map(([k, l], i) => ({label: l, value: sp.get(k).pessoas, txt: F.int(sp.get(k).pessoas), color: dash.colors[i],
      extra: ['Renda média habitual: ' + F.brl(sp.get(k).renda_media), '% dos ocupados em SP: ' + F.pct2(sp.get(k).part_ocupados_pct), 'Brasil: ' + F.int(br.get(k).pessoas) + ' (' + F.pct2(br.get(k).part_ocupados_pct) + ')', 'Observações na amostra (SP): ' + F.int(sp.get(k).n_obs)]}));
    hbars(el, items, F.int, {name: 'Pessoas ocupadas: '});
    const tc = sp.get('trabalhadores_criativos'), tot = sp.get('total');
    const n = document.createElement('div'); n.className = 'legend';
    n.append(mark('span', 'tridente', 'pessoas', where({escopo: 'SP', categoria: 'trabalhadores_criativos'}), 'Trabalhadores criativos em SP: ' + F.int(tc.pessoas) + ' (' + F.pct2(tc.part_ocupados_pct) + ' dos ocupados), renda média ' + F.brl(tc.renda_media) + ' vs. ' + F.brl(tot.renda_media) + ' do total.'));
    el.append(n);
  });

  dash.draw('mtc-grupos', (el) => {
    const r = byCod('mtc');
    if (dash.data('mtc').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const g = r.filter((x) => x.ano === 2024 && x.grupo !== 'Total' && (x.ocupados || 0) > 0).sort((a, b) => b.ocupados - a.ocupados)
      .map((x) => ({label: x.grupo, a: x.especializados, b: x.apoio, extra: ['Empreendimentos: ' + F.int(x.empreendimentos), 'Ocupados formais: ' + F.int(x.ocupados), 'Intensidade aplicada: ' + F.pct1(x.intens_pct)]}));
    if (!g.length) return noData(el, 'Nenhum empreendimento nos setores criativos em 2024.');
    pair(el, g, F.int, ['Especializados (ocupação criativa)', 'Apoio (demais ocupações)'], [dash.colors[0], dash.colors[3]]);
  });

  dash.draw('mtc-serie', (el) => {
    const r = byCod('mtc');
    if (!r) { el.replaceChildren(); return; }
    const s = r.filter((x) => x.grupo === 'Total').sort((a, b) => a.ano - b.ano);
    cols(el, s.map((x) => ({x: x.ano, v: x.especializados, c: dash.colors[0], extra: ['Ocupados nos setores: ' + F.int(x.ocupados), 'Empreendimentos: ' + F.int(x.empreendimentos)]})), F.int, {name: 'Especializados: ', tick: (v) => compact.format(v)});
  });

  // ---------- intensidade criativa: Brasil, Estado e território, setor a setor ----------
  const barsN = (el, groups, fmt, series) => {
    el.replaceChildren();
    if (!groups.length) { el.textContent = '—'; return; }
    const k = series.length, bh = 11, gap = 3, rowH = k * (bh + gap) + 10, top = 4;
    const h = top + groups.length * rowH + 4;
    const {svg, w} = svgIn(el, h);
    const lw = Math.min(w * 0.42, d3.max(groups, (d) => textW(svg, d.label)) + 10);
    const vw = d3.max(groups, (d) => d3.max(d.vals, (v, j) => textW(svg, d.txts && d.txts[j] ? d.txts[j] : fmt(v), 'val'))) + 8;
    const max = d3.max(groups, (d) => d3.max(d.vals, (v) => v || 0)) || 1;
    const x = d3.scaleLinear([0, max], [0, Math.max(10, w - lw - vw - 4)]);
    const tip = tipBox(el);
    const g = svg.append('g').attr('class', 'grow');
    groups.forEach((d, i) => {
      const y = top + i * rowH;
      if (d.sep) g.append('line').attr('x1', 0).attr('x2', w).attr('y1', y + rowH - 3).attr('y2', y + rowH - 3).attr('stroke', css('--color-border-line'));
      g.append('text').attr('class', 'lbl').attr('x', lw - 8).attr('y', y + rowH / 2 + 1).attr('text-anchor', 'end').style('font-weight', d.bold ? 600 : null).text(fit(svg, d.label, lw - 10));
      series.forEach((s, j) => {
        const v = d.vals[j], yy = y + 2 + j * (bh + gap);
        const lines = series.map((q, jj) => [q.color, q.name + ': ' + (d.txts && d.txts[jj] ? d.txts[jj] : fmt(d.vals[jj]))]).concat((d.extra || []).map((e) => [null, e]));
        if (!has(v)) { g.append('text').attr('class', 'lbl').attr('x', lw + 2).attr('y', yy + bh - 2).text(d.txts && d.txts[j] ? d.txts[j] : '—'); return; }
        g.append('rect').attr('x', lw).attr('y', yy).attr('height', bh).attr('width', Math.max(1, x(v))).attr('rx', 2).attr('fill', s.color).attr('fill-opacity', s.opacity ?? 1)
          .attr('stroke', s.outline ? s.color : 'none').attr('stroke-dasharray', s.outline ? '3 2' : null)
          .on('mousemove', (ev) => showTip(el, tip, ev, d.label, lines)).on('mouseleave', () => { tip.hidden = true; });
        g.append('text').attr('class', 'val').attr('x', lw + x(v) + 4).attr('y', yy + bh - 1).text(d.txts && d.txts[j] ? d.txts[j] : fmt(v));
      });
    });
    legend(el, series.map((s) => [s.color, s.name]));
  };

  dash.draw('intens-setores', (el) => {
    const r = rowsOf('setores_intens'), loc = rowsOf('intens_setor_mun'), tri = rowsOf('tridente'), pb = rowsOf('intens_ponte');
    if (dash.data('setores_intens').status === 'error' || dash.data('intens_setor_mun').status === 'error') return failLine(el);
    if (!r || !loc || !tri || !pb || !terr()) { el.replaceChildren(); return; }
    const t = T(), tr = cur(t), isSt = t === '35';
    const nome = isSt ? 'Estado de SP' : String((tr || {}).nome || 'Território').replace(/^RGI(nt)? /, '');
    const L = new Map(loc.filter((x) => String(x.cod) === t).map((x) => [String(x.setor), x]));
    const S = new Map(loc.filter((x) => String(x.cod) === '35').map((x) => [String(x.setor), x]));
    const PB = new Map(pb.map((x) => [String(x.setor), x]));
    const tp = (esc, cat) => (tri.find((q) => q.escopo === esc && q.categoria === cat) || {}).pessoas;
    const totBR = tp('BR', 'especializados') / (tp('BR', 'especializados') + tp('BR', 'apoio')) * 100;
    const totSP = tp('SP', 'especializados') / (tp('SP', 'especializados') + tp('SP', 'apoio')) * 100;
    const series = [{name: 'Brasil · PNAD (todos os ocupados)', color: dash.colors[2]}, {name: 'Estado de SP · PNAD (todos os ocupados)', color: dash.colors[0]}, {name: 'Estado de SP · RAIS (empregados formais)', color: dash.colors[4 % dash.colors.length]}];
    if (!isSt) series.push({name: nome + ' · RAIS (empregados formais)', color: dash.colors[1]});
    const pick = (row) => (row && row.rais_vinc > 0 ? (has(row.rais_int) ? row.rais_int : null) : null);
    const why = (row) => (!row || !row.rais_vinc ? 'sem vínculos' : (has(row.rais_int) ? null : 'menos de 30 vínculos'));
    const lt = L.get('TOTAL'), st = S.get('TOTAL');
    const groups = [];
    const mk = (label, br, sp, spR, loR, loRow, extra, bold) => {
      const vals = isSt ? [br, sp, spR] : [br, sp, spR, loR];
      const txts = isSt ? null : [null, null, null, why(loRow)];
      groups.push({label, vals, txts, extra, bold, sep: bold});
    };
    mk('Conjunto dos 14 setores', totBR, totSP, st ? st.rais_int : null, pick(lt), lt, [
      'RAIS: ' + F.int(st ? st.rais_vinc : null) + ' vínculos ativos em 31/12/2024 no Estado' + (!isSt && lt ? '; ' + F.int(lt.rais_vinc) + ' em ' + nome : ''),
      !isSt && lt && has(lt.rais_int) && st ? 'Diferença para o Estado na mesma base (RAIS): ' + (lt.rais_int - st.rais_int >= 0 ? '+' : '') + N1.format(lt.rais_int - st.rais_int) + ' p.p.' : '',
      !isSt && lt && has(lt.rais_int_2023) ? 'Mesmo indicador em 2023: ' + F.pct1(lt.rais_int_2023) : ''].filter(Boolean), true);
    [...r].sort((a, b) => b.intens_br_pct - a.intens_br_pct).forEach((x) => {
      const k = String(x.setor), l = L.get(k), s = S.get(k), p = PB.get(k) || {};
      const ex = ['PNAD SP só com empregados formais: ' + F.pct1(p.pnad_sp_formal) + (p.n_cri_formal < 30 ? ' (amostra pequena: ' + F.int(p.n_cri_formal) + ' casos criativos)' : ''), 'Conta própria e empregadores no setor em SP: ' + F.pct1(p.pct_autonomo) + ' dos ocupados (fora da RAIS)'];
      if (!isSt) ex.push(l && l.rais_vinc ? nome + ': ' + F.int(l.rais_vinc) + ' vínculos, ' + F.int(l.rais_cri) + ' em ocupações criativas' + (has(l.rais_ql) ? ' · QL ' + N2.format(l.rais_ql) + ' (1 = Estado)' : '') + (has(l.rais_int_2023) ? ' · 2023: ' + F.pct1(l.rais_int_2023) : '') : nome + ': nenhum vínculo formal no setor em 2024');
      if (!isSt && l && has(l.intens_pct)) ex.push('Estimativa anterior (PNAD aplicada ao CEMPRE): ' + F.pct1(l.intens_pct));
      mk(x.nome + (x.fonte_intens.includes('Brasil') ? ' *' : ''), x.intens_br_pct, x.intens_sp_pct, s ? s.rais_int : null, pick(l), l, ex, false);
    });
    barsN(el, groups, F.pct1, series);
    const n = document.createElement('div'); n.className = 'legend';
    const comp = !isSt && lt && st && has(lt.rais_int) ? ` No conjunto dos setores, ${nome} tem ${F.pct1(lt.rais_int)} dos empregados formais em ocupações criativas, contra ${F.pct1(st.rais_int)} no Estado (RAIS 2024).` : (!isSt ? ` ${nome} tem menos de 30 vínculos formais nos setores criativos: a intensidade não é exibida.` : '');
    n.append(mark('span', 'intens_setor_mun', 'rais_int', where({cod: t, setor: 'TOTAL'}), 'Compare barras da mesma fonte: PNAD com PNAD, RAIS com RAIS. A RAIS mede só empregados com vínculo formal; a PNAD inclui conta própria e informais, que chegam a ser maioria em artes e audiovisual.' + comp + ' * setor em que a PNAD usa a amostra nacional.'));
    el.append(n);
  });

  dash.draw('gasto-serie', (el) => {
    const r = byCod('gastocult');
    if (dash.data('gastocult').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const esf = [...new Set(r.map((x) => x.esfera))];
    const series = esf.map((e, i) => ({name: e, c: dash.colors[i], pts: r.filter((x) => x.esfera === e).sort((a, b) => a.ano - b.ano).map((x) => ({x: x.ano, y: x.cult_pc}))}));
    lines(el, series, F.brl2, {y0: 0});
  });

  dash.draw('gasto-sub', (el) => {
    const r = byCod('gastocult');
    if (!r) { el.replaceChildren(); return; }
    const x = r.find((q) => q.esfera === 'Prefeituras' && q.ano === 2024) || r.find((q) => q.ano === 2024);
    if (!x || !x.cultura) return noData(el, 'Sem despesa em cultura registrada em 2024.');
    const items = [['Difusão cultural (13.392)', x.cult_difusao], ['Patrimônio histórico, artístico e arqueológico (13.391)', x.cult_patrimonio], ['Outras subfunções (administração, etc.)', x.cult_outras]]
      .map(([l, v], i) => ({label: l, value: (v || 0) / x.cultura * 100, txt: F.pct1((v || 0) / x.cultura * 100), color: dash.colors[i], extra: ['Valor: ' + F.brlc(v)]}));
    hbars(el, items, F.pct1, {max: 100});
    const n = document.createElement('div'); n.className = 'legend';
    n.textContent = 'Para comparação: turismo (23.695) ' + F.brlc(x.turismo) + ' · ' + F.brl2(x.turismo_pc) + ' por habitante.';
    el.append(n);
  });

  dash.draw('gov-comp', (el) => {
    const r = byCod('governanca');
    if (dash.data('governanca').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const x = r[0];
    if (!x) return noData(el, 'Sem dados de governança.');
    const C = [['snc_adesao', 'SNC: adesão publicada'], ['snc_lei_sistema', 'SNC: lei do sistema de cultura'], ['snc_orgao_gestor', 'SNC: órgão gestor'], ['snc_conselho_lei', 'SNC: conselho de política cultural'], ['snc_conselho_ativo', 'SNC: conselho ativo (ata desde 2023)'], ['snc_fundo_lei', 'SNC: fundo de cultura (lei)'], ['snc_fundo_cnpj', 'SNC: fundo com CNPJ próprio'], ['snc_plano_vigente', 'SNC: plano de cultura vigente'], ['snc_plano_metas_monit', 'SNC: plano com metas/monitoramento'], ['snc_formacao', 'SNC: formação de gestores/conselheiros'], ['gov_lai', 'MUNIC: acesso à informação (LAI)'], ['gov_transparencia', 'MUNIC: transparência e dados abertos'], ['gov_controle', 'MUNIC: controle interno']];
    const items = C.map(([k, l]) => ({label: l, value: x[k] || 0, txt: F.d1(x[k]), color: k.startsWith('snc') ? dash.colors[2] : dash.colors[4 % dash.colors.length]}));
    hbars(el, items, F.d1, {max: 100, name: isMun(T()) ? 'Pontuação (0 a 100): ' : '% dos municípios / pontuação média: '});
    legend(el, [[dash.colors[2], 'Sistema Nacional de Cultura (MinC)'], [dash.colors[4 % dash.colors.length], 'MUNIC 2024 (IBGE)']]);
  });

  dash.draw('comex-serie', (el) => {
    const r = byCod('comex');
    if (dash.data('comex').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    if (!r.length) return noData(el, 'Nenhuma empresa do território exportou ou importou bens criativos em 2023–2025.');
    const s = [...r].sort((a, b) => a.ano - b.ano);
    pair(el, s.map((x) => ({label: String(x.ano), a: x.export_cri, b: x.import_cri, extra: ['Saldo: ' + F.usd(x.saldo_cri), 'Nas exportações totais: ' + F.pct2(x.part_export_pct), 'Nas importações totais: ' + F.pct2(x.part_import_pct)]})), F.usd, ['Exportações', 'Importações'], [dash.colors[0], dash.colors[1]]);
  });

  dash.draw('comex-grupos', (el) => {
    const r = byCod('comex_grupos');
    if (dash.data('comex_grupos').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const g = r.filter((x) => x.ano === 2025 && ((x.export || 0) + (x.import || 0)) > 0).sort((a, b) => (b.export + b.import) - (a.export + a.import))
      .map((x) => ({label: x.grupo, a: x.export, b: x.import, extra: ['Saldo: ' + F.usd((x.export || 0) - (x.import || 0))]}));
    if (!g.length) return noData(el, 'Sem comércio de bens criativos em 2025.');
    pair(el, g, F.usd, ['Exportações 2025', 'Importações 2025'], [dash.colors[0], dash.colors[1]]);
  });

  dash.draw('triangulo', (el) => {
    const r = rowsOf('triangulo');
    if (dash.data('triangulo').status === 'error') return failLine(el);
    if (!r || !terr()) { el.replaceChildren(); return; }
    el.replaceChildren();
    const t = T();
    const macro = r.find((x) => String(x.cod) === '35' && x.base.startsWith('PNAD'));
    const spF = r.find((x) => String(x.cod) === '35' && x.base.startsWith('Emprego'));
    const micro = r.find((x) => String(x.cod) === t && x.base.startsWith('Emprego'));
    const nomeT = (cur(t) || {}).nome || '';
    const V = [['especializados', 'Especializados', dash.colors[0]], ['incorporados', 'Incorporados', dash.colors[1]], ['apoio', 'Apoio', dash.colors[3]]];
    const panels = [{row: macro, title: 'Estado de SP · macro', sub: 'PNAD Contínua: formal e informal'}, {row: micro, title: (t === '35' ? 'Estado de SP' : nomeT) + ' · micro', sub: 'Estimativa no emprego formal (CEMPRE 2024)'}];
    const w = Math.max(300, el.clientWidth || 600), two = w >= 560;
    const pw = two ? w / 2 : w, ph = 300, h = two ? ph : ph * 2;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h);
    const tip = tipBox(el);
    panels.forEach((p, i) => {
      const ox = two ? i * pw : 0, oy = two ? 0 : i * ph;
      const g = svg.append('g').attr('transform', `translate(${ox},${oy})`).attr('class', 'grow');
      g.append('text').attr('class', 'val').attr('x', pw / 2).attr('y', 16).attr('text-anchor', 'middle').style('font-weight', 600).text(p.title);
      g.append('text').attr('class', 'lbl').attr('x', pw / 2).attr('y', 32).attr('text-anchor', 'middle').text(p.sub);
      if (!p.row || !p.row.nucleo) { g.append('text').attr('class', 'lbl').attr('x', pw / 2).attr('y', ph / 2).attr('text-anchor', 'middle').text('Sem ocupações criativas estimadas'); return; }
      const cx = pw / 2, top = 78, base = ph - 62, half = Math.min(pw * 0.34, 130);
      const P = {especializados: [cx, top], incorporados: [cx - half, base], apoio: [cx + half, base]};
      g.append('path').attr('d', `M${P.especializados}L${P.incorporados}L${P.apoio}Z`).attr('fill', css('--cds-chart-grid') || '#eee').attr('fill-opacity', 0.5).attr('stroke', css('--cds-chart-axis') || '#999');
      g.append('text').attr('class', 'lbl').attr('x', cx).attr('y', (top + 2 * base) / 3 - 4).attr('text-anchor', 'middle').text('Criativos');
      g.append('text').attr('class', 'val').attr('x', cx).attr('y', (top + 2 * base) / 3 + 12).attr('text-anchor', 'middle').text(F.pct2(p.row.pct_ocup_criativos) + ' dos ocupados');
      V.forEach(([k, lab, c]) => {
        const [x, y] = P[k], share = p.row['comp_' + k];
        const rad = 6 + 22 * Math.sqrt(Math.max(0, share) / 60);
        const lines = [[c, lab + ': ' + F.int(p.row[k]) + ' pessoas'], [null, F.pct1(share) + ' do triângulo · ' + F.pct2(p.row['pct_ocup_' + k]) + ' dos ocupados']];
        if (p.row.base.startsWith('PNAD')) lines.push([null, 'Renda média habitual: ' + F.brl(p.row[{especializados: 'renda_esp', incorporados: 'renda_inc', apoio: 'renda_apo'}[k]]) + ' (média geral ' + F.brl(p.row.renda_total) + ')']);
        else if (spF && i === 1) { const d = share - spF['comp_' + k]; lines.push([null, 'Diferença para o Estado (base formal): ' + (d >= 0 ? '+' : '') + N1.format(d) + ' p.p.']); }
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', rad).attr('fill', c).attr('fill-opacity', 0.9).attr('stroke', css('--color-panel') || '#fff').attr('stroke-width', 2)
          .on('mousemove', (ev) => showTip(el, tip, ev, p.title, lines)).on('mouseleave', () => { tip.hidden = true; });
        const ly = k === 'especializados' ? y - rad - 6 : y + rad + 14;
        g.append('text').attr('class', 'val').attr('x', x).attr('y', ly).attr('text-anchor', 'middle').text(lab + ' ' + F.pct1(share));
        g.append('text').attr('class', 'lbl').attr('x', x).attr('y', k === 'especializados' ? ly - 14 : ly + 14).attr('text-anchor', 'middle').text(F.int(p.row[k]));
      });
    });
    const n = document.createElement('div'); n.className = 'legend';
    const sp = spF ? ` Mesma base formal no Estado: ${F.pct1(spF.comp_especializados)} / ${F.pct1(spF.comp_incorporados)} / ${F.pct1(spF.comp_apoio)}.` : '';
    n.append(mark('span', 'triangulo', 'comp_especializados', micro ? where({cod: micro.cod, base: micro.base}) : '', 'Percentuais = composição do triângulo (especializados / incorporados / apoio). Compare percentuais entre macro e micro; os totais têm bases diferentes.' + sp));
    el.append(n);
  });

  dash.draw('triangulo-barras', (el) => {
    const r = rowsOf('triangulo');
    if (dash.data('triangulo').status === 'error') return failLine(el);
    if (!r || !terr()) { el.replaceChildren(); return; }
    const t = T();
    const macro = r.find((x) => String(x.cod) === '35' && x.base.startsWith('PNAD'));
    const spF = r.find((x) => String(x.cod) === '35' && x.base.startsWith('Emprego'));
    const micro = r.find((x) => String(x.cod) === t && x.base.startsWith('Emprego'));
    if (!macro) return noData(el, 'Sem dados do Triângulo Criativo.');
    const nomeT = t === '35' ? 'Estado de SP (base formal)' : ((cur(t) || {}).nome || 'Território');
    if (!micro || !micro.nucleo) return noData(el, 'Sem ocupações criativas estimadas para este território.');
    const C = [['especializados', 'Especializados', 'renda_esp'], ['incorporados', 'Incorporados', 'renda_inc'], ['apoio', 'Apoio', 'renda_apo']];
    const groups = C.map(([k, lab, rk]) => {
      const d = micro['comp_' + k] - (spF ? spF['comp_' + k] : macro['comp_' + k]);
      return {label: lab, a: macro['comp_' + k], b: micro['comp_' + k], extra: [
        'Estado (PNAD): ' + F.int(macro[k]) + ' pessoas · renda média ' + F.brl(macro[rk]),
        nomeT + ': ' + F.int(micro[k]) + ' pessoas (emprego formal 2024)',
        'Diferença para o Estado na mesma base formal: ' + (d >= 0 ? '+' : '') + N1.format(d) + ' p.p.']};
    });
    pair(el, groups, F.pct1, ['Estado de SP · macro (PNAD, formal e informal)', nomeT + ' · micro (emprego formal)'], [dash.colors[2], dash.colors[0]]);
    const n = document.createElement('div'); n.className = 'legend';
    n.append(mark('span', 'triangulo', 'pct_ocup_criativos', where({cod: micro.cod, base: micro.base}),
      'Trabalhadores criativos (especializados + incorporados): ' + F.pct2(macro.pct_ocup_criativos) + ' dos ocupados no Estado; ' + F.pct2(micro.pct_ocup_criativos) + ' do emprego formal em ' + nomeT + '.' + (spF ? ' Estado na base formal: ' + F.pct1(spF.comp_especializados) + ' / ' + F.pct1(spF.comp_incorporados) + ' / ' + F.pct1(spF.comp_apoio) + '.' : '')));
    el.append(n);
  });

  dash.draw('triangulo-duplo', (el) => {
    const r = rowsOf('triangulo');
    if (dash.data('triangulo').status === 'error') return failLine(el);
    if (!r || !terr()) { el.replaceChildren(); return; }
    const t = T();
    const macro = r.find((x) => String(x.cod) === '35' && x.base.startsWith('PNAD'));
    const spF = r.find((x) => String(x.cod) === '35' && x.base.startsWith('Emprego'));
    const micro = r.find((x) => String(x.cod) === t && x.base.startsWith('Emprego'));
    if (!macro) return noData(el, 'Sem dados do Triângulo Criativo.');
    const nomeT = t === '35' ? 'Estado de SP (base formal)' : ((cur(t) || {}).nome || 'Território');
    const C = [['especializados', 'Especializados', 'renda_esp', dash.colors[0]], ['incorporados', 'Incorporados', 'renda_inc', dash.colors[1]], ['apoio', 'Apoio', 'renda_apo', dash.colors[3]]];
    const max = Math.max(60, Math.ceil(d3.max([macro, micro].filter(Boolean).flatMap((x) => C.map(([k]) => x['comp_' + k] || 0))) / 10) * 10);
    el.replaceChildren();
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:var(--cds-gap-md)';
    el.append(wrap);
    const panel = (title, sub, row, extraFn) => {
      const box = document.createElement('div');
      const h = document.createElement('div'); h.style.cssText = 'font-weight:600'; h.textContent = title;
      const s = document.createElement('div'); s.className = 'lbl muted'; s.style.cssText = 'font-size:var(--cds-font-size-caption);margin-bottom:4px'; s.textContent = sub;
      const ch = document.createElement('div'); ch.style.cssText = 'min-height:6rem;position:relative';
      box.append(h, s, ch); wrap.append(box);
      if (!row || !row.nucleo) { const d = document.createElement('div'); d.className = 'fail'; d.textContent = 'Sem ocupações criativas estimadas para este território.'; ch.append(d); return; }
      hbars(ch, C.map(([k, lab, rk, c]) => ({label: lab, value: row['comp_' + k] || 0, txt: F.pct1(row['comp_' + k]), color: c, extra: extraFn(k, rk)})), F.pct1, {max, name: '% da força de trabalho criativa: '});
      const f = document.createElement('div'); f.className = 'legend';
      f.append(mark('span', 'triangulo', 'pct_ocup_criativos', where({cod: row.cod, base: row.base}), 'Criativos (especializados + incorporados): ' + F.pct2(row.pct_ocup_criativos) + (row.base.startsWith('PNAD') ? ' dos ocupados' : ' do emprego formal') + ' · ' + F.int(row.nucleo) + ' pessoas no triângulo'));
      box.append(f);
    };
    panel('Estado de SP', 'PNAD Contínua: trabalho formal e informal', macro, (k, rk) => [F.int(macro[k]) + ' pessoas', 'Renda média habitual: ' + F.brl(macro[rk]) + ' (média geral ' + F.brl(macro.renda_total) + ')']);
    panel(nomeT, 'Estimativa no emprego formal (CEMPRE 2024)', micro, (k) => {
      const d = micro['comp_' + k] - (spF ? spF['comp_' + k] : macro['comp_' + k]);
      return [F.int(micro[k]) + ' pessoas', 'Diferença para o Estado na mesma base formal: ' + (d >= 0 ? '+' : '') + N1.format(d) + ' p.p.'];
    });
    const n = document.createElement('div'); n.className = 'legend';
    n.textContent = 'Mesma escala (0 a ' + max + '%) e mesmas cores nos dois gráficos para comparação direta.' + (spF ? ' Estado na base formal: ' + F.pct1(spF.comp_especializados) + ' / ' + F.pct1(spF.comp_incorporados) + ' / ' + F.pct1(spF.comp_apoio) + '.' : '');
    el.append(n);
  });

  dash.draw('pnab-tempo', (el) => {
    const all = byCod('pnab_tempo');
    if (dash.data('pnab_tempo').status === 'error') return failLine(el);
    if (!all) { el.replaceChildren(); return; }
    const r = all.filter((x) => x.esfera === 'Prefeituras').sort((a, b) => a.ano - b.ano);
    const ge = all.filter((x) => x.esfera === 'Governo do Estado');
    if (!r.length || !r.some((x) => (x.repasse || 0) + (x.aplicado || 0) + (x.previsto_c2 || 0) > 0)) return noData(el, 'O município não aderiu à PNAB nos ciclos 1 e 2.');
    el.replaceChildren();
    const S = [['repasse', 'Ciclo 1: repasse recebido', dash.colors[1], 1], ['aplicado', 'Ciclo 1: aplicação (pagamentos líquidos)', dash.colors[2], 1], ['previsto_c2', 'Ciclo 2: previsto (média anual do plano)', dash.colors[0], 0.55]];
    const yrs = r.map((x) => x.ano);
    const h = 270, top = 34, bot = h - 26;
    const {svg, w} = svgIn(el, h);
    const ymax = d3.max(r, (x) => Math.max(x.repasse || 0, x.aplicado || 0, x.previsto_c2 || 0)) || 1;
    const y = d3.scaleLinear([0, ymax], [bot, top + 6]).nice(4);
    const ticks = y.ticks(4);
    const ml = d3.max(ticks, (t) => textW(svg, 'R$ ' + compact.format(t))) + 8;
    const x0 = d3.scaleBand(yrs, [ml, w - 6]).padding(0.22);
    const x1 = d3.scaleBand(S.map((s) => s[0]), [0, x0.bandwidth()]).padding(0.12);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'grid-l').attr('x1', ml).attr('x2', w).attr('y1', (t) => y(t)).attr('y2', (t) => y(t));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'lbl').attr('x', ml - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').text((t) => 'R$ ' + compact.format(t));
    svg.append('g').selectAll('text').data(yrs).join('text').attr('class', 'lbl').attr('x', (d) => x0(d) + x0.bandwidth() / 2).attr('y', h - 8).attr('text-anchor', 'middle').text((d) => d + (d === 2025 ? '*' : ''));
    // faixas dos ciclos
    const band = (a, b, lab, row) => {
      const xa = x0(a), xb = x0(b) + x0.bandwidth();
      const yy = 6 + row * 13;
      svg.append('line').attr('x1', xa).attr('x2', xb).attr('y1', yy + 5).attr('y2', yy + 5).attr('stroke', css('--cds-chart-axis') || '#999');
      [xa, xb].forEach((xx) => svg.append('line').attr('x1', xx).attr('x2', xx).attr('y1', yy + 1).attr('y2', yy + 9).attr('stroke', css('--cds-chart-axis') || '#999'));
      svg.append('text').attr('class', 'lbl').attr('x', (xa + xb) / 2).attr('y', yy + 3).attr('text-anchor', 'middle').style('paint-order', 'stroke').style('stroke', css('--color-panel') || '#fff').style('stroke-width', 4).text(lab);
    };
    band(2023, 2025, 'Ciclo 1 · recursos de 2023', 0);
    band(2025, 2028, 'Ciclo 2 · plano 2025–2028', 1);
    const tip = tipBox(el);
    const geBy = new Map(ge.map((q) => [q.ano, q]));
    const g = svg.append('g').attr('class', 'grow');
    r.forEach((d) => S.forEach(([k, lab, c, op]) => {
      const v = d[k];
      if (!has(v) || v <= 0) return;
      const extra = [];
      const q = geBy.get(d.ano);
      if (q && has(q[k])) extra.push('Governo do Estado: ' + F.brlc(q[k]));
      if (k === 'aplicado' && d.ano === 2025) extra.push('Parcial: extratos até 12/10/2025');
      if (k === 'previsto_c2') extra.push('Plano de 4 anos ÷ 4 (não é repasse realizado)');
      g.append('rect').attr('x', x0(d.ano) + x1(k)).attr('width', x1.bandwidth()).attr('y', y(v)).attr('height', bot - y(v)).attr('rx', 2).attr('fill', c).attr('fill-opacity', op)
        .attr('stroke', k === 'previsto_c2' ? c : 'none').attr('stroke-dasharray', k === 'previsto_c2' ? '3 2' : null)
        .on('mousemove', (ev) => showTip(el, tip, ev, String(d.ano), [[c, lab + ': ' + F.brlc(v)], ...extra.map((e) => [null, e])]))
        .on('mouseleave', () => { tip.hidden = true; });
    }));
    legend(el, S.map(([, lab, c]) => [c, lab]));
    const tot = r.reduce((a, q) => ({rep: a.rep + (q.repasse || 0), apl: a.apl + (q.aplicado || 0)}), {rep: 0, apl: 0});
    const n = document.createElement('div'); n.className = 'legend';
    n.append(mark('span', 'pnab_tempo', 'aplicado', where({cod: T(), esfera: 'Prefeituras'}), 'Ciclo 1: ' + F.brlc(tot.apl) + ' aplicados de ' + F.brlc(tot.rep) + ' recebidos (' + F.pct1(tot.rep ? tot.apl / tot.rep * 100 : null) + '). * 2025 parcial.'));
    el.append(n);
  });

  dash.draw('incorp-secao', (el) => {
    const r = byCod('incorp_secao');
    if (dash.data('incorp_secao').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    if (!r.length) return noData(el, 'Sem incorporados estimados para este território.');
    const tot = d3.sum(r, (x) => x.incorporados);
    const s = [...r].sort((a, b) => b.incorporados - a.incorporados);
    const top = s.slice(0, 8), rest = s.slice(8);
    const SENAC = new Set(['G', 'I', 'H', 'N', 'S']);
    const items = top.map((x) => ({label: x.secao, value: x.incorporados, txt: F.int(x.incorporados) + ' (' + F.pct1(x.incorporados / tot * 100) + ')', color: SENAC.has(x.sec) ? dash.colors[1] : dash.colors[4 % dash.colors.length],
      extra: ['Taxa de ocupações criativas na atividade (SP): ' + F.pct2(x.taxa_pct), 'Ocupados formais na atividade (fora dos setores criativos): ' + F.int(x.base)]}));
    if (rest.length) items.push({label: 'Demais atividades (' + rest.length + ')', value: d3.sum(rest, (x) => x.incorporados), txt: F.int(d3.sum(rest, (x) => x.incorporados)) + ' (' + F.pct1(d3.sum(rest, (x) => x.incorporados) / tot * 100) + ')', color: css('--cds-chart-muted'), extra: rest.map((x) => x.secao + ': ' + F.int(x.incorporados))});
    hbars(el, items, F.int, {name: 'Incorporados: '});
    legend(el, [[dash.colors[1], 'Comércio, serviços e turismo (áreas do Senac)'], [dash.colors[4 % dash.colors.length], 'Demais atividades']]);
  });

  dash.draw('familias-criativas', (el) => {
    const r = rowsOf('familias_criativas');
    if (dash.data('familias_criativas').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const fams = [...new Set(r.map((x) => x.fam))];
    const get = (f, t) => r.find((x) => x.fam === f && x.tipo === t);
    const groups = fams.map((f) => {
      const e = get(f, 'especializados'), i = get(f, 'incorporados');
      const ev = e ? e.pessoas : 0, iv = i ? i.pessoas : 0;
      const low = [e, i].filter((x) => x && x.baixa_precisao).length > 0;
      return {label: f + (low ? ' †' : ''), a: ev, b: iv, extra: [
        'Incorporados: ' + F.pct1(iv / ((ev + iv) || 1) * 100) + ' da família',
        'Renda média: especializados ' + F.brl(e ? e.renda_media : null) + ' · incorporados ' + F.brl(i ? i.renda_media : null),
        'Observações na amostra: ' + F.int(e ? e.n : 0) + ' / ' + F.int(i ? i.n : 0) + (low ? ' — baixa precisão (menos de 30)' : '')]};
    }).sort((a, b) => (b.a + b.b) - (a.a + a.b));
    pair(el, groups, F.int, ['Especializados (em setores criativos)', 'Incorporados (em outros setores)'], [dash.colors[0], dash.colors[1]]);
    const n = document.createElement('div'); n.className = 'legend';
    n.textContent = '† menos de 30 observações na amostra: estimativa de baixa precisão. Arquitetura aparece quase toda como incorporada porque o setor de arquitetura e engenharia tem intensidade criativa de 23% (abaixo do corte de 30%); chefs de cozinha trabalham em restaurantes e hotéis, que não são setores criativos — ambos são efeitos da definição, não erros.';
    el.append(n);
  });

  dash.draw('familias-mun', (el) => {
    const r = byCod('familias_mun');
    if (dash.data('familias_mun').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const rows = r.filter((x) => (x.total || 0) > 0).sort((a, b) => b.total - a.total);
    if (!rows.length) return noData(el, 'Sem ofícios criativos estimados para este território.');
    const est = T() === '35';
    const leQL = (q) => {
      if (est) return 'Quociente locacional (QL): no Estado vale 1 por definição, porque o próprio Estado é a referência. Escolha um município ou região para comparar.';
      if (!has(q)) return 'Quociente locacional (QL): não calculado para este ofício no território.';
      const c = Math.round(q * 100), base = 'Quociente locacional (QL) ' + N2.format(q) + ': para cada 100 profissionais deste ofício que a média paulista levaria a esperar, considerando o tamanho do emprego formal do território, há ' + F.int(c) + '.';
      return base + (q >= 1.2 ? ' É um ofício que se destaca aqui.' : q >= 0.8 ? ' Presença próxima à do Estado.' : ' Presença abaixo da média paulista.');
    };
    const groups = rows.map((x) => ({label: x.fam + (x.baixa_precisao ? ' †' : ''), a: x.especializados, b: x.incorporados, extra: [
      'Total: ' + F.int(x.total) + ', dos quais ' + F.pct1(x.pct_incorporados) + ' trabalham fora dos setores criativos (incorporados).',
      'Densidade: ' + F.d1(x.por_mil_ocup) + ' por mil ocupados formais.',
      leQL(x.ql),
      'Oferta Senac relacionada: ' + x.eixo_senac + '.',
      'Amostra estadual: ' + F.int(x.n_amostra_sp) + ' casos' + (x.baixa_precisao ? ' (baixa precisão; leia como indicação).' : '.')]}));
    pair(el, groups, F.int, ['Especializados (em setores criativos)', 'Incorporados (em outros setores)'], [dash.colors[0], dash.colors[1]]);
    const sp = rows.filter((x) => has(x.ql) && x.ql >= 1.2).map((x) => x.fam);
    const n = document.createElement('div'); n.className = 'legend';
    n.append(mark('span', 'familias_mun', 'ql', where({cod: T()}), (T() === '35' ? 'Estado de SP: QL = 1 por definição.' : (sp.length ? 'Ofícios com concentração acima do Estado (QL ≥ 1,2): ' + sp.join(', ') + '.' : 'Nenhum ofício com concentração 20% acima do Estado.')) + ' Passe o mouse sobre a barra para ver o QL de cada ofício e como lê-lo. † menos de 60 casos na amostra estadual. Arquitetos aparecem como incorporados porque arquitetura e engenharia ficam abaixo do corte de 30% de intensidade; chefs, porque restaurantes e hotéis não são setores criativos.'));
    el.append(n);
  });

  dash.draw('comex-blocos-mun', (el) => {
    const t = T();
    if (t === '35') {
      const r = rowsOf('comex_blocos');
      if (!r) { el.replaceChildren(); return; }
      pair(el, [...r].sort((a, b) => b.export_2025 - a.export_2025).map((x) => ({label: x.bloco, a: x.export_2025, b: x.import_2025})), F.usd, ['Exportações 2025', 'Importações 2025'], [dash.colors[0], dash.colors[1]]);
      const n = document.createElement('div'); n.className = 'legend'; n.textContent = 'Estado selecionado: mesmo dado do cartão ao lado. Escolha um município ou região para ver o recorte local.'; el.append(n);
      return;
    }
    const r = byCod('comex_blocos_mun');
    if (dash.data('comex_blocos_mun').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const rows = r.filter((x) => (x.export_2025 || 0) + (x.import_2025 || 0) > 0);
    if (!rows.length) return noData(el, 'Nenhuma empresa do território exportou ou importou bens criativos em 2025.');
    const te = d3.sum(rows, (x) => x.export_2025), ti = d3.sum(rows, (x) => x.import_2025);
    pair(el, [...rows].sort((a, b) => (b.export_2025 + b.import_2025) - (a.export_2025 + a.import_2025)).map((x) => ({label: x.bloco, a: x.export_2025, b: x.import_2025, extra: [
      'Exportações: ' + F.pct1(te ? x.export_2025 / te * 100 : null) + ' do total exportado pelo território',
      'Importações: ' + F.pct1(ti ? x.import_2025 / ti * 100 : null) + ' do total importado',
      'Saldo: ' + F.usd(x.export_2025 - x.import_2025)]})), F.usd, ['Exportações 2025', 'Importações 2025'], [dash.colors[0], dash.colors[1]]);
    const n = document.createElement('div'); n.className = 'legend';
    n.append(mark('span', 'comex_blocos_mun', 'export_2025', where({cod: t}), 'Total do território: exportou ' + F.usd(te) + ' e importou ' + F.usd(ti) + ' em bens criativos.' + (te + ti < 1e5 ? ' Volume pequeno: poucas operações podem definir a distribuição.' : '')));
    el.append(n);
  });

  dash.draw('gasto-hist', (el) => {
    const all = byCod('gasto_hist');
    if (dash.data('gasto_hist').status === 'error') return failLine(el);
    if (!all) { el.replaceChildren(); return; }
    if (!all.length) return noData(el, 'Sem dados de gasto com cultura para este território.');
    el.replaceChildren();
    const esf = [...new Set(all.map((x) => x.esfera))];
    const cols2 = {'Prefeituras': dash.colors[0], 'Governo do Estado': dash.colors[2]};
    const yrs = d3.range(2014, 2025);
    const h = 284, top = 48, bot = h - 26;
    const {svg, w} = svgIn(el, h);
    const vals = all.filter((x) => has(x.cult_pc_real)).map((x) => x.cult_pc_real);
    const y = d3.scaleLinear([0, d3.max(vals) || 1], [bot, top]).nice(4);
    const ticks = y.ticks(4);
    const ml = d3.max(ticks, (t) => textW(svg, 'R$ ' + N0.format(t))) + 8;
    const x = d3.scalePoint(yrs, [ml + 8, w - 70]);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'grid-l').attr('x1', ml).attr('x2', w - 64).attr('y1', (t) => y(t)).attr('y2', (t) => y(t));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'lbl').attr('x', ml - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').text((t) => 'R$ ' + N0.format(t));
    svg.append('g').selectAll('text').data(yrs).join('text').attr('class', 'lbl').attr('x', (d) => x(d)).attr('y', h - 8).attr('text-anchor', 'middle').text((d) => (w < 520 && d % 2) ? '' : d);
    [[2020, 'Aldir Blanc emergencial'], [2023, 'Lei Paulo Gustavo'], [2024, 'PNAB']].forEach(([yy, lab], i) => {
      svg.append('line').attr('x1', x(yy)).attr('x2', x(yy)).attr('y1', top - 4).attr('y2', bot).attr('stroke', css('--cds-chart-reference')).attr('stroke-dasharray', '3 3');
      svg.append('text').attr('class', 'lbl').attr('x', x(yy) + (yy === 2024 ? -3 : 3)).attr('y', 11 + i * 15).attr('text-anchor', yy === 2024 ? 'end' : 'start').text(lab);
    });
    const tip = tipBox(el);
    const g = svg.append('g').attr('class', 'grow');
    const fins = [];
    esf.forEach((e) => {
      const pts = all.filter((q) => q.esfera === e && has(q.cult_pc_real)).sort((a, b) => a.ano - b.ano);
      const c = cols2[e] || dash.colors[1];
      g.append('path').datum(pts).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2).attr('d', d3.line((q) => x(q.ano), (q) => y(q.cult_pc_real)));
      g.selectAll(null).data(pts).join('circle').attr('cx', (q) => x(q.ano)).attr('cy', (q) => y(q.cult_pc_real)).attr('r', 4)
        .attr('fill', (q) => (q.cobertura_pct ?? 100) < 95 ? css('--color-panel') : c).attr('stroke', c).attr('stroke-width', 1.5)
        .on('mousemove', (ev, q) => showTip(el, tip, ev, e + ' · ' + q.ano, [[c, 'Por habitante: ' + F.brl2(q.cult_pc_real) + ' (R$ de 2024)'], [null, 'Valor da época: ' + F.brl2(q.cult_pc_nom) + ' por habitante'], [null, 'Total: ' + F.brlc(q.cultura_real) + ' (R$ de 2024) · ' + F.brlc(q.cultura_nom) + ' nominais'], [null, 'Cultura no orçamento: ' + F.pct2(q.pct_orc)], ...(has(q.n_mun) ? [[null, 'Municípios com balanço no Siconfi: ' + F.int(q.n_com_dca) + ' de ' + F.int(q.n_mun) + ' (' + F.pct1(q.cobertura_pct) + ' da população)']] : [])]))
        .on('mouseleave', () => { tip.hidden = true; });
      const l = pts[pts.length - 1];
      if (l) fins.push({x: x(l.ano) + 8, y: y(l.cult_pc_real) + 4, c, t: e === 'Prefeituras' ? 'Prefeituras' : 'Gov. Estado'});
    });
    fins.sort((p, q) => p.y - q.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 14) fins[i].y = fins[i - 1].y + 14;
    fins.forEach((f) => g.append('text').attr('class', 'lbl').attr('x', f.x).attr('y', f.y).style('fill', f.c).text(f.t));
    legend(el, [...esf.map((e) => [cols2[e] || dash.colors[1], e]), [css('--cds-chart-muted'), 'Ponto vazado: balanços de menos de 95% da população']]);
    const p = all.filter((q) => q.esfera === 'Prefeituras').sort((a, b) => a.ano - b.ano);
    const a = p.find((q) => q.ano === 2014), b = p.find((q) => q.ano === 2024), c19 = p.find((q) => q.ano === 2019);
    if (a && b && has(a.cult_pc_real) && has(b.cult_pc_real)) {
      const n = document.createElement('div'); n.className = 'legend';
      n.append(mark('span', 'gasto_hist', 'cult_pc_real', where({cod: T(), esfera: 'Prefeituras', ano: 2024}), 'Prefeituras, em R$ de 2024: ' + F.brl2(a.cult_pc_real) + ' por habitante em 2014, ' + (c19 && has(c19.cult_pc_real) ? F.brl2(c19.cult_pc_real) + ' em 2019, ' : '') + F.brl2(b.cult_pc_real) + ' em 2024 (' + (b.cult_pc_real >= a.cult_pc_real ? '+' : '') + N1.format((b.cult_pc_real / a.cult_pc_real - 1) * 100) + '% reais em 10 anos).'));
      el.append(n);
    }
  });

  dash.draw('pnab', (el) => {
    const r = byCod('pnab');
    if (dash.data('pnab').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const x = r.find((q) => q.esfera === 'Prefeituras');
    if (!x) return noData(el, 'Sem dados da PNAB para este território.');
    if (!x.valor_c1 && !x.valor_c2) return noData(el, 'O município não aderiu à PNAB nos ciclos 1 e 2.');
    const ge = r.find((q) => q.esfera === 'Governo do Estado');
    const c1 = dash.colors[1], c1b = dash.colors[2], c2 = dash.colors[0];
    const geLine = ge ? ['Governo do Estado: Ciclo 1 ' + F.brlc(ge.valor_c1) + ' · Ciclo 2 ' + F.brlc(ge.valor_c2_anual) + '/ano'] : [];
    const data = [
      {x: 'C1 plano', v: x.valor_c1, c: c1, extra: ['Ciclo 1 (recursos de 2023)', 'Por habitante: ' + F.brl2(x.pc_c1), ...geLine]},
      {x: 'C1 recebido', v: x.recebido_c1, c: c1, extra: ['Rendimentos da conta: ' + F.brlc(x.rendimentos_c1)]},
      {x: 'C1 gasto', v: x.gasto_c1, c: c1b, extra: ['Execução: ' + F.pct1(x.exec_pct_c1) + ' de recebido + rendimentos (até 01/11/2025)', 'Saldo em conta: ' + F.brlc(x.saldo_c1)]},
      {x: 'C2 média anual', v: x.valor_c2_anual, c: c2, extra: ['Ciclo 2 (2025–2028), total ' + F.brlc(x.valor_c2), 'Por habitante/ano: ' + F.brl2(x.pc_c2_anual), ...geLine]},
    ];
    cols(el, data, F.brlc, {name: 'Valor: ', tick: (v) => 'R$ ' + compact.format(v)});
    legend(el, [[c1, 'Ciclo 1: plano e recebido'], [c1b, 'Ciclo 1: gasto'], [c2, 'Ciclo 2: média anual']]);
  });

  dash.draw('pnab-resumo', (el) => {
    const r = byCod('pnab');
    if (!r) { el.textContent = ''; return; }
    const x = r.find((q) => q.esfera === 'Prefeituras');
    if (!x) { el.textContent = ''; return; }
    const txt = x.n_mun > 1 ? `${x.aderiu_c2} de ${x.n_mun} municípios aderiram ao Ciclo 2 (${x.aderiu_c1} ao Ciclo 1).` : (x.aderiu_c2 ? 'Município aderiu ao Ciclo 2' + (x.aderiu_c1 ? ' e ao Ciclo 1.' : ', mas não ao Ciclo 1.') : 'Município sem adesão ao Ciclo 2.');
    el.replaceChildren(mark('span', 'pnab', 'aderiu_c2', where({cod: x.cod, esfera: 'Prefeituras'}), txt));
  });

  dash.draw('comex-blocos', (el) => {
    const r = rowsOf('comex_blocos');
    if (dash.data('comex_blocos').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    pair(el, [...r].sort((a, b) => b.export_2025 - a.export_2025).map((x) => ({label: x.bloco, a: x.export_2025, b: x.import_2025})), F.usd, ['Exportações 2025', 'Importações 2025'], [dash.colors[0], dash.colors[1]]);
  });
  // ---------- Empresas criativas (Receita Federal/CNPJ, perímetro do Panorama Territorial da Economia Criativa Paulista) ----------
  const EG = ['Arquitetura e design de interiores', 'Atividades artesanais e produtos de design', 'Audiovisual, multimídia e fotografia', 'Editorial', 'Moda', 'Música, artes cênicas e visuais', 'Patrimônio cultural e natural', 'Publicidade, pesquisa e suporte à inovação cultural', 'Software, videogames, serviços de computador e web'];
  const EGC = ['#005594', '#7A8AA3', '#F78B1F', '#C7533C', '#1B9E77', '#7FB8E6', '#8E5FB5', '#2E7FC4', '#2C2C54'];
  let eIdx = null, eSrc = null;
  const emp = (cod) => { const r = rowsOf('empresas_resumo'); if (!r) return null; if (eSrc !== r) { eIdx = new Map(r.map((x) => [String(x.cod), x])); eSrc = r; } return eIdx.get(String(cod ?? T())); };
  const nomeT = () => { const r = cur(); return r ? String(r.nome).replace(/^RGI(nt)? /, '') : 'Território'; };
  const emT = () => { const r = cur(); if (!r || r.nivel === 'Estado') return 'No Estado de São Paulo'; if (r.nivel === 'Unidade Senac') return (nomeT().startsWith('Senac') ? 'Na área de atuação do ' : 'Na área de atuação das ') + nomeT(); if (r.nivel === 'GO Senac') return 'Na ' + nomeT(); return 'Em ' + nomeT(); };

  dash.draw('ek', (el) => {
    if (dash.data('empresas_resumo').status === 'error') { el.textContent = '—'; return; }
    const r = emp(el.dataset.cod || T());
    if (!r) { el.textContent = '—'; return; }
    const k = el.dataset.k, f = F[el.dataset.f] || F.text;
    el.replaceChildren(mark('span', 'empresas_resumo', k, where({cod: r.cod}), f(r[k])));
  });

  dash.draw('emp-mort-sub', (el) => {
    const r = emp(), st = emp('35');
    if (!r || !st) { el.textContent = ''; return; }
    el.replaceChildren();
    el.append(document.createTextNode('Abertas em 2020: '), mark('span', 'empresas_resumo', 'coorte_5a', where({cod: r.cod}), F.int(r.coorte_5a)), document.createTextNode(' · em até 2 anos: '), mark('span', 'empresas_resumo', 'mort_2a', where({cod: r.cod}), F.pct1(r.mort_2a)), document.createTextNode(' · Estado: '), mark('span', 'empresas_resumo', 'mort_5a', where({cod: 35}), F.pct1(st.mort_5a)));
    if (r.coorte_5a < 30) { const w = document.createElement('span'); w.className = 'warn'; w.style.color = 'var(--color-warn)'; w.textContent = ' · menos de 30 empresas na coorte: leia como indicativo'; el.append(w); }
  });

  // leitura crítica do território: compara o cadastro com as demais bases do painel
  dash.draw('emp-leitura', (el) => {
    const r = emp(), st = emp('35'), t = cur();
    if (!r || !st) { el.textContent = ''; return; }
    const partes = [];
    const dif = r.mort_5a - r.tot_mort_5a;
    if (has(r.mort_5a) && has(r.tot_mort_5a) && r.coorte_5a >= 30) partes.push(`${emT()}, ${F.pct1(r.mort_5a)} das empresas criativas abertas em 2020 não estavam mais ativas ao fim de 2025, ${Math.abs(dif) < 1 ? 'praticamente o mesmo que no' : dif < 0 ? 'abaixo do' : 'acima do'} conjunto das empresas do território (${F.pct1(r.tot_mort_5a)}); só por baixa formal, ${F.pct1(r.mort_5a_baixa)}.`);
    if (has(r.mei_pct)) partes.push(`${F.pct1(r.mei_pct)} das empresas criativas são MEI (Estado: ${F.pct1(st.mei_pct)}), o que indica um tecido de trabalho por conta própria, mais do que de empresas empregadoras.`);
    if (t && has(t.cri_emp) && r.estoque_2025 > 0) partes.push(`Para dimensionar: são ${F.int(r.estoque_2025)} registros de empresas para ${F.int(t.cri_emp)} empregos formais criativos (IBGE, 2024, recorte FIRJAN).`);
    el.textContent = partes.join(' ');
  });

  dash.draw('emp-grupo', (el) => {
    const all = byCod('empresas_grupo');
    if (dash.data('empresas_grupo').status === 'error') return failLine(el);
    if (!all) { el.replaceChildren(); return; }
    if (!all.length) return noData(el, 'Sem empresas criativas registradas neste território.');
    const by = new Map(all.map((x) => [x.g, x]));
    const items = EG.map((nm, i) => { const x = by.get(i + 1) || {ativas: 0, part_pct: 0, criadas: 0, fechadas: 0}; return {label: nm, value: x.ativas, txt: F.int(x.ativas) + ' (' + F.pct1(x.part_pct) + ')', color: EGC[i], extra: ['Participação no Estado: ' + F.pct1(x.part_sp_pct), 'Criadas em 2025: ' + F.int(x.criadas), 'Fechadas em 2025: ' + F.int(x.fechadas)]}; }).sort((a, b) => b.value - a.value);
    hbars(el, items, F.int, {name: 'Empresas ativas: '});
  });

  const shareBars = (el, r, defs, color) => {
    const tot = defs.reduce((s, [k]) => s + (r[k] || 0), 0);
    if (!tot) return noData(el, 'Sem empresas criativas registradas neste território.');
    const st = emp('35'); const stTot = st ? defs.reduce((s, [k]) => s + (st[k] || 0), 0) : 0;
    hbars(el, defs.map(([k, l], i) => ({label: l, value: (r[k] || 0) / tot * 100, txt: F.pct1((r[k] || 0) / tot * 100) + ' (' + F.int(r[k] || 0) + ')', color: Array.isArray(color) ? color[i] : color, extra: stTot ? ['Estado: ' + F.pct1((st[k] || 0) / stTot * 100)] : []})), F.pct1, {max: 100});
  };
  dash.draw('emp-porte', (el) => {
    if (dash.data('empresas_resumo').status === 'error') return failLine(el);
    const r = emp(); if (!r) { el.replaceChildren(); return; }
    shareBars(el, r, [['porte_mei', 'Microempresa – MEI'], ['porte_me', 'Microempresa'], ['porte_epp', 'Pequeno porte'], ['porte_demais', 'Demais']], dash.colors[0]);
  });
  dash.draw('emp-setor', (el) => {
    if (dash.data('empresas_resumo').status === 'error') return failLine(el);
    const r = emp(); if (!r) { el.replaceChildren(); return; }
    shareBars(el, r, [['setor_serv', 'Serviços'], ['setor_ind', 'Indústria'], ['setor_com', 'Comércio']], dash.colors[2]);
  });

  // barras empilhadas a 100%: um ano por linha, um segmento por grupo
  dash.draw('emp-ano-grupo', (el) => {
    const all = byCod('empresas_ano');
    if (dash.data('empresas_ano').status === 'error') return failLine(el);
    if (!all) { el.replaceChildren(); return; }
    const rows = all.filter((x) => x.estoque > 0).sort((a, b) => a.ano - b.ano);
    if (!rows.length) return noData(el, 'Sem empresas criativas registradas neste território.');
    el.replaceChildren();
    const rowH = 26, top = 4, h = top + rows.length * rowH + 4;
    const {svg, w} = svgIn(el, h);
    const lw = textW(svg, '2025') + 12;
    const x = d3.scaleLinear([0, 100], [lw, w - 4]);
    const tip = tipBox(el);
    rows.forEach((r, i) => {
      const y = top + i * rowH; let acc = 0;
      svg.append('text').attr('class', 'lbl').attr('x', lw - 8).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').text(r.ano);
      EG.forEach((nm, j) => {
        const v = (r['g' + (j + 1)] || 0) / r.estoque * 100; if (v <= 0) return;
        const x0 = x(acc), x1 = x(acc + v); acc += v;
        svg.append('rect').attr('x', x0).attr('y', y + 3).attr('width', Math.max(0.5, x1 - x0 - 1)).attr('height', rowH - 7).attr('fill', EGC[j])
          .on('mousemove', (ev) => showTip(el, tip, ev, String(r.ano), [[EGC[j], nm + ': ' + F.pct1(v) + ' (' + F.int(r['g' + (j + 1)]) + ' empresas)'], [null, 'Total do ano: ' + F.int(r.estoque)]]))
          .on('mouseleave', () => { tip.hidden = true; });
        if (x1 - x0 > 34) svg.append('text').attr('class', 'val').attr('x', (x0 + x1) / 2).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'middle').attr('pointer-events', 'none').style('fill', '#fff').style('font-size', '.68rem').text(F.pct1(v));
      });
    });
    legend(el, EG.map((nm, j) => [EGC[j], nm]));
  });

  dash.draw('emp-ano', (tb) => {
    const all = byCod('empresas_ano');
    if (!all) { tb.replaceChildren(); return; }
    const rows = [...all].sort((a, b) => b.ano - a.ano);
    tb.replaceChildren(...rows.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.cod + ',' + x.ano;
      const td = (v, cls) => { const e = document.createElement('td'); e.textContent = v; if (cls) e.className = cls; return e; };
      tr.append(td(x.ano), td(F.int(x.estoque), 'n'), td(has(x.var_pct) ? (x.var_pct > 0 ? '+' : '') + N1.format(x.var_pct) + '%' : '—', 'n ' + (has(x.var_pct) ? (x.var_pct >= 0 ? 'ok' : 'bad') : '')), td(F.int(x.criadas), 'n'), td(F.int(x.fechadas), 'n'), td(F.int(x.outras_saidas), 'n'), td(N1.format(x.criadas / 12), 'n'));
      return tr;
    }));
  });

  dash.draw('emp-mes', (tb) => {
    const all = byCod('empresas_ano');
    if (!all) { tb.replaceChildren(); return; }
    const rows = [...all].sort((a, b) => a.ano - b.ano);
    const MS = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10', 'm11', 'm12'];
    const max = d3.max(rows, (r) => d3.max(MS, (m) => r[m] || 0)) || 1;
    const base = dash.colors[0];
    tb.replaceChildren(...rows.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.cod + ',' + x.ano;
      const th = document.createElement('td'); th.textContent = x.ano; tr.append(th);
      MS.forEach((m) => { const v = x[m] || 0; const c = document.createElement('td'); c.className = 'n'; c.textContent = F.int(v); const a = Math.round(v / max * 70); c.style.background = `color-mix(in srgb, ${base} ${a}%, transparent)`; if (a > 45) c.style.color = '#fff'; tr.append(c); });
      const tt = document.createElement('td'); tt.className = 'n'; tt.style.fontWeight = '600'; tt.textContent = F.int(x.criadas); tr.append(tt);
      return tr;
    }));
  });

  dash.draw('emp-ponte', (el) => {
    if (dash.data('empresas_resumo').status === 'error') return failLine(el);
    const r = emp(); if (!r) { el.replaceChildren(); return; }
    if (!r.ativas) return noData(el, 'Sem empresas criativas registradas neste território.');
    const items = [
      {label: 'Receita · Panorama (87 atividades)', value: r.ativas, color: dash.colors[0], extra: ['Empresas ativas em janeiro de 2026']},
      {label: 'Receita · recorte FIRJAN (51)', value: r.fj_ativas, color: dash.colors[0], extra: [F.pct1(r.fj_ativas / r.ativas * 100) + ' do perímetro do Panorama']},
      {label: 'Receita · FIRJAN, sem MEI', value: r.fj_sem_mei, color: dash.colors[4 % dash.colors.length], extra: ['MEI no recorte: ' + F.int(r.fj_porte_mei)]},
      {label: 'IBGE · com atividade (2024)', value: r.cempre_ul_2024 || 0, color: dash.colors[2], extra: ['Estabelecimentos criativos usados no restante do painel']},
    ];
    hbars(el, items, F.int, {});
  });
  dash.draw('emp-ponte-txt', (el) => {
    const r = emp(), st = emp('35');
    if (!r || !st || !r.ativas) { el.textContent = ''; return; }
    const partes = [`${emT()}, ${F.pct1(r.pan_fj_ativas / r.ativas * 100)} das empresas do Panorama estão também no recorte FIRJAN (Estado: ${F.pct1(st.pan_fj_ativas / st.ativas * 100)}).`];
    if (has(r.razao_cempre_cnpj) && r.fj_sem_mei >= 30) partes.push(`O IBGE encontra ${F.int(r.cempre_ul_2024)} unidades com atividade para ${F.int(r.fj_sem_mei)} empresas não MEI registradas: ${F.pct1(r.razao_cempre_cnpj)} (Estado: ${F.pct1(st.razao_cempre_cnpj)}).` + (r.razao_cempre_cnpj < st.razao_cempre_cnpj - 10 ? ' A proporção abaixo da estadual sugere mais registros sem operação efetiva ou sedes fiscais de empresas que atuam em outro lugar.' : r.razao_cempre_cnpj > 100 ? ' O valor acima de 100% ocorre porque o IBGE conta também filiais, e o cadastro aqui conta só matrizes.' : ''));
    partes.push('As bases têm datas diferentes (Receita: janeiro de 2026; IBGE: 2024) e o IBGE conta unidades locais, inclusive filiais: a comparação é de ordem de grandeza.');
    el.textContent = partes.join(' ');
  });

  dash.draw('emp-mort', (el) => {
    const r = rowsOf('empresas_mortalidade_porte');
    if (dash.data('empresas_mortalidade_porte').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    const ord = ['Todas', 'MEI (optou pelo MEI em algum momento)', 'Microempresa', 'Pequeno porte', 'Demais'];
    const g = ord.map((p) => { const a = r.find((x) => x.porte === p && x.janela.startsWith('2')), b = r.find((x) => x.porte === p && x.janela.startsWith('5')); return {label: p === 'Todas' ? 'Todas as empresas criativas' : p, vals: [a ? a.mort_pct : 0, b ? b.mort_pct : 0], extra: [a ? 'Abertas em 2023: ' + F.int(a.abertas) + ' · só baixa formal: ' + F.pct1(a.mort_baixa_pct) : '', b ? 'Abertas em 2020: ' + F.int(b.abertas) + ' · só baixa formal: ' + F.pct1(b.mort_baixa_pct) : ''].filter(Boolean)}; });
    barsN(el, g, F.pct1, [{name: 'Em até 2 anos (abertas em 2023)', color: dash.colors[1]}, {name: 'Em até 5 anos (abertas em 2020)', color: dash.colors[0]}]);
  });

  dash.draw('emp-ref', (tb) => {
    const r = rowsOf('empresas_ref_panorama');
    if (!r) { tb.replaceChildren(); return; }
    tb.replaceChildren(...r.map((x) => {
      const tr = document.createElement('tr'); tr.dataset.key = x.indicador;
      const td = (v, cls) => { const e = document.createElement('td'); e.textContent = v; if (cls) e.className = cls; return e; };
      tr.append(td(x.indicador), td(F.int(x.panorama), 'n'), td(F.int(x.painel), 'n'), td((x.dif_pct > 0 ? '+' : '') + N1.format(x.dif_pct) + '%', 'n'), td(x.nota || ''));
      return tr;
    }));
  });

  // nome do território selecionado em títulos de cartões
  dash.draw('nome-t', (el) => { const r = cur(); el.textContent = !r ? 'Território selecionado' : r.nivel === 'Estado' ? 'Estado de São Paulo' : String(r.nome).replace(/^RGI(nt)? /, ''); });

  dash.draw('emp-per', (el) => {
    const r = rowsOf('empresas_perimetros');
    if (dash.data('empresas_perimetros').status === 'error') return failLine(el);
    if (!r) { el.replaceChildren(); return; }
    hbars(el, r.map((x, i) => ({label: x.recorte, value: x.empresas, txt: F.int(x.empresas) + ' (' + F.pct1(x.pct) + ')', color: i === 3 ? dash.colors[2] : dash.colors[0]})), F.int, {});
  });
})();

(() => {
  // ================= Boletim Estratégico · Territórios que Criam =================
  // Camada 1: cálculos declarados (bol_ficha, bol_setores) sobre os conjuntos do painel.
  // Camada 2: pontuação explícita dos nove grupos de atividades criativas (bol_setores).
  // Camada 3: biblioteca editorial fixa (conjunto boletim_biblioteca), combinada aqui com os números.
  const nf = (a, b) => new Intl.NumberFormat('pt-BR', {minimumFractionDigits: a, maximumFractionDigits: b});
  const N0 = nf(0, 0), N1 = nf(1, 1), N2 = nf(2, 2), N3 = nf(3, 3);
  const has = (v) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && !isFinite(v));
  const num = (v) => (has(v) ? Number(v) : null);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const mean = (a) => { const v = a.filter((x) => has(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const S = (v) => String(v).replace(/\.0$/, '');
  const F = {
    int: (v) => (has(v) ? N0.format(v) : '—'),
    d1: (v) => (has(v) ? N1.format(v) : '—'),
    d2: (v) => (has(v) ? N2.format(v) : '—'),
    d3: (v) => (has(v) ? N3.format(v) : '—'),
    pct: (v) => (has(v) ? N1.format(v) + '%' : '—'),
    pct2: (v) => (has(v) ? N2.format(v) + '%' : '—'),
    brl: (v) => (has(v) ? 'R$ ' + N0.format(v) : '—'),
    brl2: (v) => (has(v) ? 'R$ ' + N2.format(v) : '—'),
    brlmil: (v) => { if (!has(v)) return '—'; const r = v * 1000; if (Math.abs(r) >= 1e9) return 'R$ ' + N1.format(r / 1e9) + ' bi'; if (Math.abs(r) >= 1e6) return 'R$ ' + N1.format(r / 1e6) + ' mi'; return 'R$ ' + N0.format(r); },
    brlmilx: (v) => { if (!has(v)) return '—'; const r = v * 1000; if (Math.abs(r) >= 1e12) return 'R$ ' + N1.format(r / 1e12) + (r >= 2e12 ? ' trilhões' : ' trilhão'); if (Math.abs(r) >= 1e9) return 'R$ ' + N1.format(r / 1e9) + (r >= 2e9 ? ' bilhões' : ' bilhão'); if (Math.abs(r) >= 1e6) return 'R$ ' + N1.format(r / 1e6) + (r >= 2e6 ? ' milhões' : ' milhão'); return 'R$ ' + N0.format(r); },
    usd: (v) => { if (!has(v)) return '—'; const a = Math.abs(v); if (a >= 1e9) return 'US$ ' + N1.format(a / 1e9) + ' bilhão'; if (a >= 1e6) return 'US$ ' + N1.format(a / 1e6) + (a >= 2e6 ? ' milhões' : ' milhão'); if (a >= 1e3) return 'US$ ' + N1.format(a / 1e3) + ' mil'; return 'US$ ' + N0.format(a); },
  };
  const rowsOf = (id) => { const d = dash.data(id); if (!d || d.status !== 'ok') return null; const x = d.data; return Array.isArray(x) ? x : (x && (x.rows || x.data)) || null; };
  const T = () => String(dash.params().t ?? '35');
  const split = (s) => (has(s) ? String(s).split('|').map((x) => x.trim()).filter(Boolean) : []);
  const SENAC_SEC = new Set(['G', 'I', 'H', 'N', 'S']);
  const LIMITES = {s1: 3000, s2: 3000, s31: 2400, s32: 1000, s33: 3200, s34: 2800, s35: 1500, s41: 3600, s42: 2000};
  window.BOL_LIMITES = LIMITES;

  // ---------- biblioteca editorial ----------
  const libParse = (rows) => {
    const L = {grupos: new Map(), oficios: new Map(), sit: {}, dif: [], tat: [], con: {}};
    (rows || []).forEach((r) => {
      if (r.tipo === 'grupo') L.grupos.set(Number(r.g), {...r, g: Number(r.g), aderencia: Number(r.aderencia), rais: split(r.rais), firjan: split(r.firjan), fam: split(r.fam), comex: split(r.comex), palavras: split(r.palavras)});
      else if (r.tipo === 'oficio') L.oficios.set(r.chave, r);
      else if (r.tipo === 'situacao') L.sit[r.chave] = r.texto;
      else if (r.tipo === 'diferenciar') L.dif.push(r);
      else if (r.tipo === 'diferenciar2') (L.dif2 = L.dif2 || []).push(r);
      else if (r.tipo === 'tatica') L.tat.push(r);
      else if (r.tipo === 'conectivo') L.con[r.chave] = r.texto;
    });
    return L;
  };

  // ---------- montagem: segmentos de texto com marcação de origem ----------
  // um parágrafo é uma lista de partes: texto, {v, s, f, w} (número marcado) ou {b: [...]} (negrito)
  const enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const where = (o) => Object.entries(o).map(([k, v]) => enc(k) + '=' + enc(v)).join('&');
  const len = (parts) => parts.reduce((s, p) => s + (typeof p === 'string' ? p.length : p.b ? len(p.b) : String(p.v).length), 0);
  // "<b>…</b>" nas frases da biblioteca vira negrito, sem HTML
  const rich = (s) => { const out = []; String(s).split(/(<b>.*?<\/b>)/).forEach((x) => { if (!x) return; const m = x.match(/^<b>(.*)<\/b>$/); out.push(m ? {b: [m[1]]} : x); }); return out; };
  // troca {chaves} por texto ou por números marcados
  const fill = (s, vars) => {
    const out = [];
    String(s).split(/(\{[a-zA-Z0-9_]+\})/).forEach((x) => {
      const m = x.match(/^\{([a-zA-Z0-9_]+)\}$/);
      if (!m) { if (x) out.push(...rich(x)); return; }
      const v = vars[m[1]];
      if (v === undefined || v === null) out.push(x); else if (typeof v === 'object' && !Array.isArray(v)) out.push(v); else out.push(String(v));
    });
    return out;
  };
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

  const lugar = (f) => {
    const nm = String(f.nome || '').replace(/^RGI(nt)? /, '');
    const capital = f.cod === '3550308' || f.cod_go === '900' && f.nivel !== 'Município';
    switch (f.nivel) {
      case 'Estado': return {em: 'no Estado', de: 'do Estado', suj: 'O Estado de São Paulo', curto: 'Estado de São Paulo', recorte: 'Estado de São Paulo (645 municípios)', N: 'São Paulo', tipo: 'estado'};
      case 'Região intermediária': return {em: 'na região de ' + nm, de: 'da região de ' + nm, suj: 'A região intermediária de ' + nm, curto: nm, recorte: 'região intermediária de ' + nm + ' (IBGE)', N: nm, tipo: 'regiao'};
      case 'Região imediata': return {em: 'na região de ' + nm, de: 'da região de ' + nm, suj: 'A região imediata de ' + nm, curto: nm, recorte: 'região imediata de ' + nm + ' (IBGE)', N: nm, tipo: 'regiao'};
      case 'GO Senac': return capital ? {em: 'na capital', de: 'da capital', suj: 'A capital', curto: 'Capital', recorte: 'cidade de São Paulo (GO1, GO2 e GO3)', N: 'São Paulo', tipo: 'go'} : {em: 'na área da ' + nm, de: 'da área da ' + nm, suj: 'A área da ' + nm, curto: nm, recorte: 'municípios atendidos pela ' + nm + ' do Senac SP', N: nm, tipo: 'go'};
      case 'Unidade Senac': return {em: 'na área de atuação ' + (nm.startsWith('Senac') ? 'do ' : 'das ') + nm, de: 'da área de atuação ' + (nm.startsWith('Senac') ? 'do ' : 'das ') + nm, suj: 'A área de atuação ' + (nm.startsWith('Senac') ? 'do ' : 'das ') + nm, curto: nm.replace(/^Senac /, ''), recorte: 'área de atuação da unidade (municípios atendidos)', N: nm.replace(/^Senac /, '').split(' / ')[0], tipo: 'unidade'};
      default: return {em: 'em ' + nm, de: 'de ' + nm, suj: nm, curto: nm, recorte: 'município de ' + nm, N: nm, tipo: 'municipio'};
    }
  };

  let memo = {key: null, model: null};
  let libAtual = null;
  const L0 = () => libAtual || {sit: {}};
  const fillRaw = (s) => fill(s || '', {});
  const modelo = () => {
    const ficha = rowsOf('bol_ficha'), set = rowsOf('bol_setores'), libr = rowsOf('boletim_biblioteca'), inc = rowsOf('incorp_secao'), fam = rowsOf('familias_mun'), fontes = rowsOf('fontes');
    if (!ficha || !set || !libr || !inc || !fam || !fontes) return null;
    const t = T();
    const key = t + '|' + ficha.length + '|' + set.length;
    if (memo.key === key && memo.src === ficha) return memo.model;
    const L = libParse(libr);
    const fx = ficha.find((r) => r.cod === t);
    if (!fx) return null;
    const m = construir(t, fx, ficha, set, L, inc, fam, fontes);
    libAtual = L;
    memo = {key, src: ficha, model: m};
    return m;
  };
  window.BOL_MODELO = () => modelo();

  const construir = (t, f, ficha, set, L, inc, fam, fontes) => {
    const fmap = new Map(ficha.map((r) => [r.cod, r]));
    const lg = lugar(f);
    const est = f.nivel === 'Estado';
    const fc = (field, fmt, cod = t) => ({v: fmt((fmap.get(cod) || {})[field]), s: 'bol_ficha', f: field, w: where({cod})});
    const sc = (r, field, fmt) => ({v: fmt(r[field]), s: 'bol_setores', f: field, w: where({cod: r.cod, g: r.g})});
    // leitura dos setores: o próprio recorte ou, em recortes pequenos, a região imediata
    const scod = f.pequeno && f.apoio_cod && fmap.has(f.apoio_cod) ? f.apoio_cod : t;
    const sf = fmap.get(scod);
    const slg = lugar(sf);
    const rows = set.filter((r) => r.cod === scod);
    const G = (r) => L.grupos.get(Number(r.g));
    const top = rows.filter((r) => r.papel === 'potencial').sort((a, b) => a.ordem - b.ordem);
    const fr = rows.filter((r) => r.papel === 'menos estruturado').sort((a, b) => a.ordem - b.ordem);
    const sit = (k, vars) => fill(L.sit[k] || '', vars);
    const V = {T: lg.em, D: lg.de, N: lg.N, Tc: lg.suj};
    const unid = est ? 'o Senac São Paulo' : f.nivel === 'Unidade Senac' ? (f.nome.startsWith('Senac') ? 'o ' + f.nome : 'as unidades ' + f.nome) : f.nivel === 'GO Senac' ? (f.cod === '900' ? 'o Senac na capital' : 'a ' + f.nome) : f.unidade && f.cod_go !== '900' ? 'o ' + f.unidade : 'o Senac';
    const nomes = (arr, k = 'curto') => { const n = arr.map((r) => G(r)[k] || G(r).curto); return n.length > 1 ? n.slice(0, -1).join(', ') + (n.length > 2 && n.slice(-2).some((x) => x.includes(' e ')) ? ', e ' : ' e ') + n[n.length - 1] : (n[0] || ''); };
    const M = {t, f, lg, est, scod, slg, apoio: scod !== t, top, fr, secoes: {}};

    // ---------- capa ----------
    const cmpTxt = (a, b, tol = 0.1) => (!has(a) || !has(b) ? null : a > b * (1 + tol) ? 'acima' : a < b * (1 - tol) ? 'abaixo' : 'proximo');
    const hasEmp = has(f.cri_emp) && f.cri_emp > 0 && has(f.cri_part);
    const poucas = !has(f.empresas) || f.empresas < 30;
    const empCmp = est ? 'proximo' : hasEmp ? cmpTxt(f.cri_part, f.cri_part_sp, 0.15) : null;
    const contraste = !est && hasEmp && !poucas && has(f.empresas_part) && f.cri_part < f.cri_part_sp * 0.8 && f.empresas_part >= (f.empresas_part_sp || 0) * 0.8;
    M.capa = {
      nome: est ? 'ESTADO DE SÃO PAULO' : lg.curto.toUpperCase(),
      sub: [f.nivel === 'Município' ? (f.unidade && f.cod_go !== '900' ? f.unidade + ' · ' + f.go : f.cod_go === '900' ? 'Unidades em São Paulo-SP · GO1, GO2 e GO3' : 'fora das áreas de atuação mapeadas') : f.nivel === 'Unidade Senac' ? (fmap.get(f.cod_go) || {}).nome || '' : f.nivel === 'GO Senac' ? 'Senac SP' : 'Senac SP', 'recorte: ' + lg.recorte].filter(Boolean).join(' · '),
      territorio: est ? 'Estado de São Paulo' : f.nivel === 'Município' ? 'Município de ' + f.nome : cap(lg.recorte),
      unidade: f.nivel === 'Município' ? (f.cod_go === '900' ? 'Unidades da capital · GO1, GO2 e GO3' : f.unidade ? f.unidade + ' · ' + f.go : '—') : f.nivel === 'Unidade Senac' ? f.nome + ' · ' + ((fmap.get(f.cod_go) || {}).nome || '') : f.nivel === 'GO Senac' ? f.nome : 'Todas as unidades',
      carga: f.carga ? f.carga.split('-').reverse().join('/') : '—',
      apresentacao: ['Este boletim traduz os dados do ', {b: ['Painel Territórios que Criam']}, ' em orientação para ' + (est ? 'as unidades' : 'a unidade') + '. Ele reúne, num só lugar, o retrato do ecossistema criativo ' + lg.de + ', os setores com mais potencial e caminhos para que gerência, área técnica e docentes decidam juntos que ofertas de formação técnica e livre podem fortalecer os negócios criativos do território.'],
    };
    const d = [];
    if (est) d.push([{b: ['Escala estadual:']}, ' o Estado tem ', fc('empresas', F.int), ' empresas criativas e ', fc('cri_emp', F.int), ' empregos formais criativos, ', fc('cri_part', F.pct2), ' do emprego formal.']);
    else if (contraste) d.push([{b: ['Muitas empresas, pouco emprego formal:']}, ' ' + lg.suj + ' tem ', fc('empresas', F.int), ' empresas criativas, mas só ', fc('cri_part', F.pct2), ' do emprego formal está nos setores criativos (Estado: ', fc('cri_part_sp', F.pct2), ').']);
    else if (!hasEmp) d.push([{b: ['Economia criativa incipiente:']}, ' ' + lg.suj + ' tem ', fc('empresas', F.int), (f.empresas === 1 ? ' empresa criativa' : ' empresas criativas') + ', e o IBGE não divulga emprego formal nos setores criativos em 2024.']);
    else if (empCmp === 'acima') d.push([{b: ['Emprego criativo acima da média:']}, ' ', fc('cri_part', F.pct2), ' do emprego formal está nos setores criativos (Estado: ', fc('cri_part_sp', F.pct2), '), com ', fc('empresas', F.int), ' empresas criativas ativas.']);
    else d.push([{b: ['Economia criativa em construção:']}, ' ', fc('empresas', F.int), ' empresas criativas e ', fc('cri_part', F.pct2), ' do emprego formal nos setores criativos (Estado: ', fc('cri_part_sp', F.pct2), ').']);
    if (poucas && M.apoio) d.push([{b: ['Leitura regional:']}, ' com poucos registros no município, os setores deste boletim foram escolhidos com os dados da região de ' + slg.curto + '.']);
    else if (has(f.mei_micro_pct) && !poucas) {
      const curto = has(f.mort_5a) && f.coorte_5a >= 30 && f.mort_5a >= 45;
      d.push([{b: [curto ? 'Negócios pequenos e de fôlego curto:' : 'Negócios pequenos:']}, ' ', fc('mei_micro_pct', F.pct), ' são MEI ou microempresas' + (has(f.mort_5a) && f.coorte_5a >= 30 ? ', e ' : '.'), ...(has(f.mort_5a) && f.coorte_5a >= 30 ? [fc('mort_5a', F.pct), ' das abertas em 2020 não estavam ativas no fim de 2025' + (est ? '.' : ' (Estado: '), ...(est ? [] : [fc('mort_5a_sp', F.pct), ').'])] : [])]);
    }
    if (top[0]) {
      const r = top[0], g = G(r);
      const motor = has(r.fatia_var_pp) && r.fatia_var_pp >= 3
        ? [' reúne ', sc(r, 'ativas', F.int), ' empresas, e sua fatia nas empresas criativas subiu de ', sc(r, 'fatia_2014', F.pct), ' (2014) para ', sc(r, 'fatia_2025', F.pct), ' (2025)' + (M.apoio ? ' na região.' : '.')]
        : has(r.intens_pct) && has(r.intens_sp_pct) && !est && r.intens_pct > r.intens_sp_pct * 1.1
          ? [' ', sc(r, 'intens_pct', F.pct), ' dos empregados formais do grupo exercem ocupações criativas, acima dos ', sc(r, 'intens_sp_pct', F.pct), ' do Estado.']
          : [' reúne ', sc(r, 'ativas', F.int), ' empresas, ', sc(r, 'part_pct', F.pct), ' das empresas criativas' + (M.apoio ? ' da região.' : '.')];
      d.push([{b: [cap(g.curto) + ' como motor:']}, ...motor]);
    }
    if (has(f.incorp_pct) && !f.pequeno && f.incorp_pct < 95) {
      d.push(f.incorp_pct >= 35
        ? [{b: ['Criatividade espalhada pela economia:']}, ' ', fc('incorp_pct', F.pct), ' da força de trabalho criativa estimada atua fora dos setores criativos, na indústria, no comércio e nos serviços.']
        : [{b: ['Criatividade concentrada nos setores:']}, ' só ', fc('incorp_pct', F.pct), ' da força de trabalho criativa estimada atua fora dos setores criativos; a maior parte está nas próprias empresas criativas.']);
    }
    M.destaques = d.slice(0, 4);

    // ---------- 1 · panorama ----------
    M.stats = [
      {c: fc('empresas', F.int), t: est ? ['empresas criativas ativas, ', fc('empresas_part', F.pct), ' das empresas do Estado'] : ['empresas criativas ativas, ', fc('empresas_part', F.pct), ' das empresas ' + (f.nivel === 'Município' ? 'do município' : 'do recorte')]},
      !hasEmp ? {c: fc('rais_vinc_criativos', F.int), t: ['vínculos formais nos setores criativos (RAIS 2024)']} : {c: fc('cri_part', F.pct2), t: est ? ['do emprego formal está nos setores criativos (', fc('cri_emp', F.int), ' empregos)'] : ['do emprego formal está nos setores criativos (Estado: ', fc('cri_part_sp', F.pct2), ')']},
      has(f.mort_5a) && f.coorte_5a >= 30 ? {c: fc('mort_5a', F.pct), lj: true, t: ['das empresas criativas abertas em 2020 fecharam em até 5 anos']} : {c: fc('mei_micro_pct', F.pct), lj: true, t: ['das empresas criativas são MEI ou microempresas']},
      {c: fc('idpec', F.d1), t: f.nivel === 'Município' && has(f.idpec_rank) ? ['no IDPEC-SP, faixa “' + String(f.idpec_faixa || '').toLowerCase() + '”, ', fc('idpec_rank', (v) => N0.format(v) + 'º'), ' lugar entre 645 municípios'] : ['no IDPEC-SP (0 a 100)' + (f.idpec_faixa ? ', faixa “' + String(f.idpec_faixa).toLowerCase() + '”' : '')]},
    ];
    const P1 = [];
    // porte
    const p1 = [];
    if (est) p1.push('O Estado de São Paulo tem PIB de ', fc('pib_mil', F.brlmilx), '. ');
    else {
      const pib = f.pib_mil || 0;
      p1.push(lg.suj + (pib >= 1e7 ? ' é um polo econômico robusto, com PIB de ' : pib >= 1e6 ? ' tem uma economia de porte médio, com PIB de ' : ' tem uma economia de pequeno porte, com PIB de '), fc('pib_mil', F.brlmilx));
      if (has(f.ifdm_er)) p1.push(' e IFDM Emprego e Renda de ', fc('ifdm_er', F.d3));
      p1.push('. ');
      if (empCmp) p1.push(...sit(empCmp === 'acima' ? 'emprego_acima' : empCmp === 'abaixo' ? 'emprego_abaixo' : 'emprego_proximo', V), ' ');
    }
    if (hasEmp) p1.push('São ', fc('cri_emp', F.int), ' empregos formais criativos em ', fc('cri_ul', F.int), ' estabelecimentos (2024), ', fc('cri_part', F.pct2), ' do emprego formal' + (est ? '. ' : ', contra '), ...(est ? [] : [fc('cri_part_sp', F.pct2), ' no Estado. ']));
    else p1.push(...sit('emprego_sem', V), ' ');
    const temPibC = has(f.pib_cri_mil) && f.pib_cri_mil > 0 && has(f.pib_cri_pct);
    if (temPibC) p1.push('O PIB criativo estimado, de ', fc('pib_cri_mil', F.brlmilx), ', equivale a ', fc('pib_cri_pct', F.pct2), est ? ' do PIB paulista' : ' do PIB local (Estado: ', ...(est ? [] : [fc('pib_cri_pct_sp', F.pct2), ')']));
    if (hasEmp && has(f.rem)) {
      const ini = temPibC ? ', e a remuneração média criativa' : 'A remuneração média criativa';
      if (est) p1.push(ini + ' é de ', fc('rem', F.brl), '.');
      else { const rc = cmpTxt(f.rem, f.rem_sp, 0.05); p1.push(ini + ', de ', fc('rem', F.brl), rc === 'abaixo' ? ', fica abaixo da paulista (' : rc === 'acima' ? ', supera a paulista (' : ', fica perto da paulista (', fc('rem_sp', F.brl), ').'); }
    } else if (temPibC) p1.push('.');
    P1.push({k: 'porte', p: p1});
    // empresas
    const p2 = [];
    if (has(f.empresas)) {
      p2.push(L.con[contraste ? 'retrato_muda' : 'retrato_amplia'] + ' ' + lg.suj + ' tem ', fc('empresas', F.int), ' empresas criativas ativas, ', fc('empresas_part', F.pct), ' de todas as empresas');
      if (!est) { const c2 = cmpTxt(f.empresas_part, f.empresas_part_sp, 0.08); p2.push(c2 === 'proximo' ? ', quase a mesma proporção do Estado (' : c2 === 'acima' ? ', acima da proporção do Estado (' : ', abaixo da proporção do Estado (', fc('empresas_part_sp', F.pct), ')'); }
      p2.push('. ');
      if (!poucas && has(f.empresas_cresc_pct) && has(f.empresas_2014)) {
        const g = f.empresas_cresc_pct;
        const verbo = g >= 100 ? 'mais que dobrou' : g >= 5 ? 'cresceu ' : g <= -5 ? 'caiu ' : 'ficou praticamente estável';
        p2.push('O número ' + verbo, ...(g >= 5 && g < 100 || g <= -5 ? [fc('empresas_cresc_pct', (v) => N1.format(Math.abs(v)) + '%')] : []), ' desde 2014 (', fc('empresas_2014', F.int), ')');
        if (has(f.empresas_var_2025) && f.criadas_2025 >= 10) p2.push(f.empresas_var_2025 >= 0 ? ' e cresceu ' : ' e recuou ', fc('empresas_var_2025', (v) => N1.format(Math.abs(v)) + '%'), ' só em 2025, com ', fc('criadas_2025', F.int), ' aberturas. ');
        else p2.push('. ');
      }
      if (has(f.mei_pct) && !poucas) {
        const peq = f.mei_micro_pct >= 80;
        p2.push(peq ? 'Há, portanto, um ecossistema ' + (f.empresas_cresc_pct >= 20 ? 'vivo e em expansão' : 'vivo') + ', mas majoritariamente pequeno: ' : 'O tecido empresarial mistura portes: ', fc('mei_pct', F.pct), ' são MEI e ', fc('me_pct', F.pct), ' microempresas. ');
      }
      if (has(f.mort_5a) && f.coorte_5a >= 30) p2.push(...sit(est ? 'mort_estado' : (cmpTxt(f.mort_5a, f.mort_5a_sp, 0.05) === 'acima' ? 'mort_acima' : cmpTxt(f.mort_5a, f.mort_5a_sp, 0.05) === 'abaixo' ? 'mort_abaixo' : 'mort_proximo'), {mort: fc('mort_5a', F.pct), mort_sp: fc('mort_5a_sp', F.pct)}));
    }
    P1.push({k: 'empresas', p: p2});
    // contraste
    const papel = f.pequeno ? 'construir' : contraste || f.mei_micro_pct >= 85 ? 'durar' : empCmp === 'acima' ? 'qualificar' : 'durar';
    const eqEmp = cmpTxt(f.empresas_part, f.empresas_part_sp, 0.15);
    P1.push({k: 'contraste', p: sit(est ? 'contraste_estado' : f.pequeno || poucas ? 'contraste_pequeno' : contraste ? 'contraste_muitas_empresas' : empCmp === 'acima' ? 'contraste_emprego_forte' : (est || empCmp === 'proximo' && eqEmp !== 'abaixo') ? 'contraste_equilibrio' : 'contraste_abaixo', {...V, R: slg.em})});
    // forças
    const forca = (r) => {
      const g = G(r);
      if (has(r.emp_2024) && r.emp_2024 >= 100 && !r.emp_sigilo) return [g.curto + ', com ', sc(r, 'emp_2024', F.int), ' empregos formais'];
      return [g.curto + ', com ', sc(r, 'part_pct', F.pct), ' das empresas criativas'];
    };
    if (top.length >= 2) {
      const p4 = [(M.apoio ? L.con.forcas_regiao.replace('{R}', slg.em) : L.con.forcas) + ' '];
      const itens = [forca(top[0]), forca(top[1])];
      if (has(f.incorp_pct) && f.incorp_pct >= 30 && f.incorp_pct < 95 && !f.pequeno) itens.push(['uma base relevante de criativos que trabalham fora dos setores criativos, os incorporados, que somam ', fc('incorp_pct', F.pct), ' da força de trabalho criativa estimada']);
      else if (top[2]) itens.push(forca(top[2]));
      itens.forEach((it, i) => { p4.push(...it, i === itens.length - 1 ? '.' : i === itens.length - 2 ? '; e ' : '; '); });
      if (M.apoio) p4.push(' A leitura usa a região porque ' + lg.suj + ' tem poucos registros.');
      P1.push({k: 'forcas', p: p4});
    }
    // atenção
    const p5 = [];
    const atn = [];
    if (f.gasto_pc === 0 && !est) atn.push({neg: true, p: sit('gasto_zero', {gasto_sp: fc('gasto_pc_sp', F.brl2)})});
    else if (has(f.gasto_pc) && has(f.gasto_pc_sp) && !est) {
      const s = [...sit(f.gasto_pc < f.gasto_pc_sp ? 'gasto_abaixo' : 'gasto_acima', {gasto: fc('gasto_pc', F.brl2), gasto_sp: fc('gasto_pc_sp', F.brl2)})];
      if (has(f.gasto_var_10a) && Math.abs(f.gasto_var_10a) >= 5) s.push(...sit(f.gasto_var_10a < 0 ? 'gasto_var_queda' : 'gasto_var_alta', {var: fc('gasto_var_10a', (v) => N1.format(Math.abs(v)) + '%')}));
      else s.push('.');
      atn.push({neg: f.gasto_pc < f.gasto_pc_sp, p: s});
    } else if (est && has(f.gasto_pc)) atn.push({neg: has(f.gasto_var_10a) && f.gasto_var_10a < 0, p: ['As prefeituras paulistas gastam, em média, ', fc('gasto_pc', F.brl2), ' por habitante com cultura', ...(has(f.gasto_var_10a) ? [f.gasto_var_10a < 0 ? ', ' : ', ', fc('gasto_var_10a', (v) => N1.format(Math.abs(v)) + '%'), f.gasto_var_10a < 0 ? ' menos que em 2014, em termos reais.' : ' a mais que em 2014, em termos reais.'] : ['.'])]});
    if (has(f.atelie_pct) && has(f.musica_pct) && f.escolas >= 5) {
      const baixo = f.atelie_pct < 10 && f.musica_pct < 10;
      atn.push({neg: baixo, p: [baixo ? 'Só ' : '', fc('atelie_pct', F.pct), ' das escolas públicas têm ateliê de artes, e ', fc('musica_pct', F.pct), ' sala de música.']});
    }
    if ((f.export_2023 || 0) + (f.export_2025 || 0) > 0) {
      const a = f.export_2023 || 0, b = f.export_2025 || 0;
      const k = b < a * 0.85 ? 'export_queda' : b > a * 1.15 ? 'export_alta' : 'export_estavel';
      atn.push({neg: k === 'export_queda', p: sit(k, {ex0: fc('export_2023', F.usd), ex1: fc('export_2025', F.usd), T: lg.em})});
    } else if (!est) atn.push({neg: false, p: sit('export_sem', V)});
    if (atn.length) { p5.push(L.sit[atn.some((x) => x.neg) ? 'atencao_abre' : 'atencao_abre_pos'] + ' '); atn.forEach((x, i) => p5.push(...x.p, i < atn.length - 1 ? ' ' : '')); }
    P1.push({k: 'atencao', p: p5, opt: true, sub: atn});
    // horizonte
    if (has(f.idpec)) {
      const dims = [['capacidades humanas', f.d1, 'd1'], ['atratividade e conectividade', f.d2, 'd2'], ['ambiente cultural e empreendedorismo', f.d3, 'd3']].filter((x) => has(x[1])).sort((a, b) => b[1] - a[1]);
      if (dims[0]) P1.push({k: 'horizonte', p: sit(f.idpec >= 50 ? 'horizonte_alto' : f.idpec >= 35 ? 'horizonte_medio' : 'horizonte_baixo', {...V, idpec: fc('idpec', F.d1), dim: dims[0][0], dimv: fc(dims[0][2], F.d1)})});
    }
    // teto de caracteres: tira primeiro frases de contexto, depois parágrafos opcionais
    const fit = (paras, lim) => {
      let ps = paras.filter((x) => x.p && x.p.length);
      const tot = () => ps.reduce((s, x) => s + len(x.p), 0) + (ps.length - 1);
      const atn2 = ps.find((x) => x.k === 'atencao');
      while (tot() > lim && atn2 && atn2.sub && atn2.sub.length > 1) { atn2.sub.pop(); atn2.p = [atn2.p[0], ...atn2.sub.flatMap((x, i) => [...x.p, i < atn2.sub.length - 1 ? ' ' : ''])]; }
      while (tot() > lim && ps.some((x) => x.opt)) { const i = ps.findIndex((x) => x.opt); ps.splice(i, 1); }
      while (tot() > lim && ps.length > 2) ps.pop();
      return ps;
    };
    M.s1 = fit(P1, LIMITES.s1).map((x) => x.p);
    M.evid = [
      has(f.pib_cri_mil) && f.pib_cri_mil > 0 ? {n: fc('pib_cri_mil', F.brlmil), s: est ? ['PIB criativo estimado, ', fc('pib_cri_pct', F.pct2), ' do PIB · IBGE 2023'] : ['PIB criativo estimado, ', fc('pib_cri_pct', F.pct2), ' do PIB local (Estado ', fc('pib_cri_pct_sp', F.pct2), ') · IBGE 2023']} : null,
      has(f.empresas_2014) ? {n: [fc('empresas_2014', F.int), ' → ', fc('empresas_2025', F.int)], s: ['empresas criativas ativas no fim de 2014 e de 2025 · Receita Federal']} : null,
      has(f.rem) && hasEmp ? {n: fc('rem', F.brl), s: est ? ['remuneração média criativa · CEMPRE 2024'] : ['remuneração média criativa (Estado ', fc('rem_sp', F.brl), ') · CEMPRE 2024']} : null,
      has(f.gasto_pc) && f.gasto_pc > 0 ? {n: fc('gasto_pc', F.brl2), s: est ? ['gasto médio das prefeituras com cultura por habitante · Siconfi 2024'] : ['gasto municipal com cultura por habitante (média SP ', fc('gasto_pc_sp', F.brl2), ') · Siconfi 2024']} : null,
      (() => { const dims = [['Capacidades humanas', 'd1'], ['Atratividade e conectividade', 'd2'], ['Ambiente cultural e empreendedorismo', 'd3']].filter((x) => has(f[x[1]])).sort((a, b) => f[b[1]] - f[a[1]]); return dims[0] ? {n: fc(dims[0][1], F.d1), s: ['dimensão ' + dims[0][0] + ' do IDPEC-SP, a mais forte do recorte']} : null; })(),
    ].filter(Boolean);

    // ---------- 2 · setores ----------
    const tot = rows.reduce((s, r) => s + (r.ativas || 0), 0);
    M.placar = [...rows].filter((r) => r.ativas > 0).sort((x, y) => (y.papel === 'potencial') - (x.papel === 'potencial') || y.potencial - x.potencial).map((r) => ({r, nome: G(r).curto, papel: r.papel}));
    M.barras = [...rows].sort((a, b) => b.ativas - a.ativas).map((r) => ({nome: G(r).nome.replace('Publicidade, pesquisa e suporte à inovação cultural', 'Publicidade, pesquisa e inovação').replace('Software, videogames, serviços de computador e web', 'Software, games e web').replace('Atividades artesanais e produtos de design', 'Artesanato e produtos de design').replace('Música, artes cênicas e visuais', 'Música, artes cênicas e visuais'), r, pct: tot ? r.ativas / tot * 100 : 0, lj: r.papel === 'menos estruturado', destaque: r.papel === 'potencial'}));
    M.barrasMax = Math.max(1, ...rows.map((r) => r.ativas));
    M.barrasTit = M.apoio ? 'Empresas criativas por grupo (jan/2026) · região' : 'Empresas criativas por grupo de atividade (jan/2026)';
    M.apoioTxt = M.apoio ? [lg.suj + ' tem ', fc('empresas', F.int), ' empresas criativas e ', ...(f.rais_vinc_criativos ? [fc('rais_vinc_criativos', F.int), ' vínculos formais'] : ['nenhum vínculo formal']), ' nos setores criativos: poucos registros para escolher setores com segurança. Por isso, os setores abaixo foram escolhidos com os dados da região imediata de ' + slg.curto + ', onde o município está inserido.'] : null;
    M.pontos = [...top, ...fr].map((r) => ({r, nome: G(r).curto, papel: r.papel}));
    const por = (r) => {
      const g = G(r), out = [];
      if (has(r.intens_pct) && has(r.intens_sp_pct) && !est && r.intens_pct >= r.intens_sp_pct) out.push([sc(r, 'intens_pct', F.pct), ' dos empregados formais do grupo exercem ocupações criativas (Estado: ', sc(r, 'intens_sp_pct', F.pct), ').']);
      else if (has(r.ql_emp) && r.ql_emp >= 1 && !est) out.push(['Seu peso no emprego criativo local tem QL ', sc(r, 'ql_emp', F.d2), ' frente ao Estado (1 = mesmo peso).']);
      if (has(r.fatia_var_pp) && r.fatia_var_pp >= 1) out.push(['Sua fatia nas empresas criativas subiu de ', sc(r, 'fatia_2014', F.pct), ' (2014) para ', sc(r, 'fatia_2025', F.pct), ' (2025).']);
      else if (has(r.saldo_2025_pct) && r.saldo_2025_pct > 0 && r.criadas_2025 >= 20) out.push(['Em 2025, abriu ', sc(r, 'criadas_2025', F.int), ' empresas e fechou ', sc(r, 'fechadas_2025', F.int), '.']);
      else out.push(['Reúne ', sc(r, 'ativas', F.int), ' empresas, ', sc(r, 'part_pct', F.pct), ' das empresas criativas' + (est ? '.' : ' (Estado: '), ...(est ? [] : [sc(r, 'part_pct_sp', F.pct), ').'])]);
      if (out.length < 2 && r.oficios_total >= 30) out.push(['Reúne ', sc(r, 'oficios_esp', F.int), ' especializados e ', sc(r, 'oficios_inc', F.int), ' incorporados em outros setores (estimativa).']);
      if (out.length < 2) out.push([g.porque]);
      return out.slice(0, 2).flatMap((x, i) => (i ? [' ', ...x] : x));
    };
    const sinal = (r) => {
      const g = G(r), out = [];
      if (has(r.fatia_var_pp) && r.fatia_var_pp <= -1) out.push(['A fatia caiu de ', sc(r, 'fatia_2014', F.pct), ' (2014) para ', sc(r, 'fatia_2025', F.pct), ' (2025).']);
      if (has(r.emp_2024) && !r.emp_sigilo && r.emp_2024 < 30) out.push(r.emp_2024 === 0 ? ['Sem emprego formal registrado no segmento (CEMPRE 2024).'] : ['Só ', sc(r, 'emp_2024', F.int), ' empregos formais para ', sc(r, 'ativas', F.int), ' empresas.']);
      else if (r.emp_sigilo && (!has(r.emp_2024) || r.emp_2024 < 30)) out.push(['Emprego formal muito pequeno ou sob sigilo no CEMPRE 2024.']);
      if (out.length < 2 && has(r.intens_pct) && has(r.intens_sp_pct) && r.intens_pct < r.intens_sp_pct && !est) out.push(['Intensidade criativa abaixo do Estado (', sc(r, 'intens_pct', F.pct), ' contra ', sc(r, 'intens_sp_pct', F.pct), ').']);
      if (out.length < 2 && has(r.emp_100_empresas) && has(r.emp_100_empresas_sp) && r.emp_100_empresas < r.emp_100_empresas_sp * 0.7) out.push([sc(r, 'emp_100_empresas', F.d1), ' empregos formais para cada 100 empresas (Estado: ', sc(r, 'emp_100_empresas_sp', F.d1), ').']);
      if (!out.length) out.push([g.sinal]);
      return out.slice(0, 2).flatMap((x, i) => (i ? [' ', ...x] : x));
    };
    const desafioFr = (r) => {
      const g = G(r);
      if (r.import_2025 > 0 && r.import_2025 > (r.export_2025 || 0) * 1.5 && r.import_2025 >= 50000) return ['Importações (', sc(r, 'import_2025', F.usd), ') acima das exportações (', sc(r, 'export_2025', F.usd), ') em 2025.'];
      return [g.de_fr];
    };
    const kpi = (r) => (has(r.emp_2024) && r.emp_2024 >= r.ativas && r.emp_2024 >= 50 ? [sc(r, 'emp_2024', F.int), ' empregos formais'] : [sc(r, 'ativas', F.int), ' empresas']);
    M.cardsPot = top.map((r, i) => ({n: i + 1, nome: cap(G(r).curto), kpi: kpi(r), cols: [['Por que', por(r)], ['Oportunidade', [G(r).oportunidade]], ['Desafio', [G(r).desafio]]], r}));
    M.cardsFr = fr.map((r, i) => ({n: i + 1, nome: cap(G(r).curto), kpi: kpi(r), cols: [['Sinal', sinal(r)], ['Oportunidade', [G(r).op_fr]], ['Desafio', desafioFr(r)]], r}));
    M.s2len = len(M.apoioTxt || []) + [...M.cardsPot, ...M.cardsFr].reduce((s, c) => s + c.nome.length + len(c.kpi) + c.cols.reduce((a, [l, p]) => a + l.length + len(p), 0), 0);
    // incorporados
    const icr = inc.filter((x) => S(x.cod) === t && x.incorporados > 0).sort((a, b) => b.incorporados - a.incorporados);
    const icTot = icr.reduce((s, x) => s + x.incorporados, 0);
    M.incorp = icr.slice(0, 8).map((x) => ({nome: x.secao.replace(/ \(fora dos setores criativos\)/, ''), v: x.incorporados, pct: icTot ? x.incorporados / icTot * 100 : 0, lj: SENAC_SEC.has(x.sec), x}));
    if (icr.length > 8) { const rest = icr.slice(8); const v = rest.reduce((s, x) => s + x.incorporados, 0); M.incorp.push({nome: 'Demais atividades (' + rest.length + ')', v, pct: icTot ? v / icTot * 100 : 0, cinza: true}); }
    M.incorpMax = Math.max(1, ...M.incorp.map((x) => x.v));
    // ofícios no radar: consolidados (escala e concentração), emergentes (grupo ganhando espaço) e potenciais (oportunidade a construir)
    const famRows = fam.filter((x) => S(x.cod) === scod && has(x.ql) && x.total >= 30 && L.oficios.has(x.fam));
    const famGrupo = (nm) => [...L.grupos.values()].find((g) => g.fam.includes(nm));
    const rowG = (g) => (g ? rows.find((r) => Number(r.g) === g.g) : null);
    const ofm = (o, field, fmt) => ({v: fmt(o[field]), s: 'familias_mun', f: field, w: where({cod: scod, fam: o.fam})});
    const consol = famRows.filter((x) => x.ql >= 1 && x.total >= 100 && !x.baixa_precisao).sort((a, b) => b.ql - a.ql);
    const emerg = famRows.filter((x) => x.ql >= 0.8 && !consol.includes(x)).map((x) => ({x, r: rowG(famGrupo(x.fam))})).filter((o) => o.r && has(o.r.fatia_var_pp) && o.r.fatia_var_pp >= 1).sort((a, b) => b.r.fatia_var_pp - a.r.fatia_var_pp);
    const topG = new Set(top.map((r) => Number(r.g)));
    const poten = famRows.filter((x) => x.ql < 0.8 && x.incorporados >= 30).sort((a, b) => (topG.has((famGrupo(b.fam) || {}).g) - topG.has((famGrupo(a.fam) || {}).g)) || b.incorporados - a.incorporados);
    const radar = [];
    if (!est) {
      consol.slice(0, emerg.length || poten.length ? 1 : 2).forEach((o) => radar.push({tipo: 'consolidado', o, p: [{b: ['Consolidado · ' + L.oficios.get(o.fam).nome + '.']}, ' '].concat(sit('oficio_consolidado', {nome: L.oficios.get(o.fam).nome, n: ofm(o, 'total', F.int), ql: ofm(o, 'ql', F.d2)}))}));
      if (emerg[0]) { const {x: o, r} = emerg[0]; radar.push({tipo: 'emergente', o, p: [{b: ['Emergente · ' + L.oficios.get(o.fam).nome + '.']}, ' '].concat(sit('oficio_emergente', {ql: ofm(o, 'ql', F.d2), f14: sc(r, 'fatia_2014', F.pct), f25: sc(r, 'fatia_2025', F.pct)}))}); }
      if (poten[0] && radar.length < 3) { const o = poten[0]; radar.push({tipo: 'potencial', o, p: [{b: ['Potencial · ' + L.oficios.get(o.fam).nome + '.']}, ' '].concat(sit('oficio_potencial', {ql: ofm(o, 'ql', F.d2), inc: ofm(o, 'incorporados', F.int)}))}); }
    }
    M.radar = radar;
    M.radarVazio = !est && !radar.length;
    const oc = consol[0];
    M.oficio = oc && !est ? {fam: oc.fam, nome: L.oficios.get(oc.fam).nome, lib: L.oficios.get(oc.fam)} : null;
    // aderência do recorte ao Programa: diversidade, ponte com o terciário, ofícios, dinâmica e base empreendedora
    const nDiv = rows.filter((r) => r.part_pct >= 5).length;
    const nOf = famRows.filter((x) => x.ql > 1).length;
    const comp = [
      {k: 'div', s: Math.min(1, nDiv / 7), bom: [String(nDiv) + ' grupos de atividade com ao menos 5% das empresas criativas, o que permite conectar segmentos'], mau: ['atividade criativa concentrada em poucos grupos (', String(nDiv), ' com ao menos 5% das empresas)']},
      has(f.incorp_senac_pct) && !f.pequeno ? {k: 'terc', s: Math.min(1, f.incorp_senac_pct / 50), bom: [fc('incorp_senac_pct', F.pct), ' dos criativos incorporados atuam em comércio, serviços e turismo, áreas do Senac'], mau: ['só ', fc('incorp_senac_pct', F.pct), ' dos criativos incorporados atuam em comércio, serviços e turismo']} : null,
      est ? null : {k: 'ofi', s: Math.min(1, nOf / 3), bom: [String(nOf) + (nOf === 1 ? ' ofício criativo' : ' ofícios criativos') + ' acima da média paulista'], mau: [nOf ? 'só ' + nOf + ' ofício acima da média paulista' : 'nenhum ofício criativo acima da média paulista']},
      has(f.empresas_cresc_pct) && !poucas ? {k: 'dyn', s: clamp(f.empresas_cresc_pct / 100), bom: ['empresas criativas ', f.empresas_cresc_pct >= 100 ? 'mais que dobraram' : ['cresceram ', fc('empresas_cresc_pct', F.pct)], ' desde 2014'].flat(), mau: ['pouco crescimento das empresas criativas desde 2014 (', fc('empresas_cresc_pct', F.pct), ')']} : null,
      has(f.mei_micro_pct) && !poucas ? {k: 'base', s: f.mei_micro_pct >= 80 ? 0.75 : 0.45, bom: [fc('mei_micro_pct', F.pct), ' de MEI e microempresas, público para inclusão produtiva'], mau: ['base empreendedora menos numerosa (', fc('mei_micro_pct', F.pct), ' de MEI e micro)']} : null,
    ].filter(Boolean);
    const aderScore = Math.round(comp.reduce((s, c) => s + c.s, 0) / Math.max(1, comp.length) * 100);
    const fortes = comp.filter((c) => c.s >= 0.6).sort((a, b) => b.s - a.s).slice(0, 2);
    const lac = comp.filter((c) => c.s < 0.5).sort((a, b) => a.s - b.s)[0];
    const ap = [{b: [L.sit[aderScore >= 60 ? 'ader_alta' : aderScore >= 40 ? 'ader_media' : 'ader_baixa']]}, ' '];
    if (fortes.length) { ap.push('A favor: '); fortes.forEach((c, i) => ap.push(...c.bom, i < fortes.length - 1 ? '; ' : '.')); }
    if (lac) ap.push(fortes.length ? ' Lacuna: ' : 'Lacuna: ', ...lac.mau, '.');
    if (M.apoio) ap.push(' Leitura dos setores apoiada na região de ' + slg.curto + '.');
    M.aderencia = ap;
    M.aderScore = aderScore;

    // ---------- 3 · ancoragem ----------
    const s31 = [];
    s31.push(sit(f.mei_micro_pct >= 80 ? 'atrair_mei' : 'atrair_misto', {...V, micro: fc('mei_micro_pct', F.pct)}));
    top.forEach((r) => s31.push([G(r).atrair]));
    if (has(f.mort_5a) && f.coorte_5a >= 30 && f.mort_5a >= 35) s31.push(sit('atrair_mort', {mort: fc('mort_5a', F.pct)}).map((x) => (typeof x === 'string' && top.length < 3 ? x.replace('os três setores', 'os setores escolhidos') : x)));
    else if (has(f.incorp_pct) && f.incorp_pct >= 35 && f.incorp_sec1) s31.push(sit('atrair_incorp', {inc: fc('incorp_pct', F.pct), sec: f.incorp_sec1.toLowerCase() + (f.incorp_sec2 ? ' e ' + f.incorp_sec2.toLowerCase().replace(/ \(fora.*\)/, '') : '')}));
    M.s31 = trim(s31, LIMITES.s31);
    M.s32 = trim([sit(est ? 'comunicar_estado' : 'comunicar', V)], LIMITES.s32);
    const s33 = [[L.sit.titulos_intro]];
    const ab = [(r) => ['Para um grupo com ', sc(r, 'ativas', F.int), ' empresas ' + slg.em + ', fazem sentido '], (r) => ['Com ', sc(r, 'ativas', F.int), ' empresas no território, cabem '], (r) => ['Para ampliar a renda de quem já atua no setor (', sc(r, 'ativas', F.int), ' empresas), vale considerar ']];
    top.forEach((r, i) => {
      const g = G(r), p = [{b: [cap(g.curto) + '.']}, ' ', ...ab[i % 3](r), g.ofertas, '.'];
      if (r.oficios_inc > r.oficios_esp && r.oficios_inc >= 100) p.push(' Como a maior parte desses profissionais (', sc(r, 'oficios_inc', F.int), ') trabalha fora dos setores criativos, turmas fechadas para empresas de outros setores são uma frente promissora.');
      s33.push(p);
    });
    if (fr.length) {
      const p = [{b: ['Setores menos estruturados.']}, ' ' + L.sit.titulos_fr + ' '];
      fr.forEach((r, i) => p.push((i === 0 ? 'Em ' : i === fr.length - 1 ? '; e em ' : '; em ') + G(r).curto + ', ' + G(r).ofertas_curtas));
      p.push('.');
      s33.push(p);
    }
    if (M.oficio) s33.push([{b: [cap(M.oficio.nome) + '.']}, (consol[0].ql >= 1.2 ? ' Ofício criativo com concentração acima da média paulista' : ' Ofício criativo com presença equivalente à média paulista e escala para turmas regulares') + ', pede ' + M.oficio.lib.ofertas + '.']);
    M.s33 = trim(s33, LIMITES.s33);
    // 3.4 · diferenciação: característica identificada → oportunidade → desenvolvimento, primeiro nos setores de maior potencial, depois nos traços do território
    const s34 = [sit('dif_intro', V)];
    top.slice(0, 2).forEach((r) => { const g = G(r); if (g.dif_texto) s34.push([{b: [g.dif_titulo]}, ' ', ...fill(g.dif_texto, {...V, ...(M.apoio ? {T: 'na região de ' + slg.curto, D: 'da região de ' + slg.curto} : {}), ativas: sc(r, 'ativas', F.int), fatia: sc(r, 'part_pct', F.pct)})]); });
    const secInc = f.incorp_sec1 ? f.incorp_sec1.toLowerCase().replace(/ \(fora.*\)/, '') + (f.incorp_sec2 ? ' e ' + f.incorp_sec2.toLowerCase().replace(/ \(fora.*\)/, '') : '') : '';
    const conds = [
      ['mort', has(f.mort_5a) && f.coorte_5a >= 30 && f.mort_5a >= 40, f.mort_5a || 0],
      ['ponte_incorp', has(f.incorp_pct) && f.incorp_pct >= 35 && !f.pequeno && !!secInc, (f.incorp_pct || 0) - 5],
      ['espaco', has(f.atelie_pct) && f.atelie_pct < 10 && f.escolas >= 5, 30],
      ['mercado', (f.export_2025 || 0) >= 100000, 25],
      ['politica', !est && has(f.gasto_pc) && f.gasto_pc > 0 && has(f.gasto_pc_sp) && f.gasto_pc < f.gasto_pc_sp * 0.8, 20],
      ['etapas', has(f.mei_pct) && f.mei_pct >= 45, 15],
    ].filter((c) => c[1]).sort((a, b) => b[2] - a[2]);
    const D2 = new Map((L.dif2 || []).map((x) => [x.chave === 'durar' ? 'mort' : x.chave, x]));
    conds.forEach(([k]) => { const x = D2.get(k); if (x) s34.push([{b: [x.titulo]}, ' ', ...fill(x.texto, {...V, mort: fc('mort_5a', F.pct), inc: fc('incorp_pct', F.pct), sec: secInc, infra: fc('atelie_pct', F.pct), mei: fc('mei_pct', F.pct), ex: fc('export_2025', F.usd), gasto: fc('gasto_pc', F.brl2)})]); });
    M.s34 = trim(s34, LIMITES.s34);
    // palavras-chave
    const kw = [];
    const add = (k) => { const s = k.trim(); if (s && !kw.some((x) => x.toLowerCase() === s.toLowerCase())) kw.push(s); };
    add('economia criativa ' + lg.N);
    top.forEach((r) => G(r).palavras.forEach(add));
    if (top[0]) add(G(top[0]).palavras[0] + ' ' + lg.N);
    if (has(f.mei_pct) && f.mei_pct >= 35) add('gestão para MEI');
    add('empreendedorismo criativo');
    if (M.oficio) add(M.oficio.lib.palavra);
    fr.forEach((r) => add(G(r).palavras[0]));
    add('editais de cultura PNAB');
    add(f.nivel === 'Município' && f.unidade && f.cod_go !== '900' ? 'qualificação profissional ' + f.unidade : 'cursos livres ' + lg.N);
    add('cursos Senac ' + lg.N);
    M.kw = kw.slice(0, 15);
    M.kwIntro = sit('kw_intro', V);
    M.s35len = len(M.kwIntro) + M.kw.join('').length;

    // ---------- 4 · caminhos ----------
    const s41 = [];
    s41.push(sit('p41_abre', {...V, U: unid, papel: L.sit['papel_' + papel]}).map((x, i) => (i === 0 && typeof x === 'string' ? cap(x.replace(/^Que papel o /, 'Que papel o ')) : x)));
    // perspectivas: mesmos três movimentos, agora ancorados nos dados do recorte e marcados pelos pilares do Programa quando pertinentes
    const conexaoInc = has(f.incorp_pct) && f.incorp_pct >= 35 && secInc ? fill(L.sit.conexao_incorp, {inc: fc('incorp_pct', F.pct), sec: secInc}) : null;
    const conexao = M.apoio ? fill(L.sit.conexao_regiao, {R: slg.curto}) : conexaoInc ? conexaoInc : [L.sit.conexao_politica];
    if (!poucas && has(f.mei_micro_pct) && has(f.incorp_pct) && top[0] && !f.pequeno) {
      const rec = fill(L.sit.mov_reconhecer_dados, {...V, mei: fc('mei_micro_pct', F.pct), inc: fc('incorp_pct', F.pct), top1: G(top[0]).curto, leitura: L.sit[f.mei_micro_pct >= 85 && empCmp !== 'acima' ? 'leitura_peq' : 'leitura_emp']});
      s41.push([...rec, ' ', ...(conexao === conexaoInc ? fill(L.sit.conexao_incorp2, {sec: secInc}) : conexao)]);
    } else s41.push([...sit(f.pequeno ? 'mov_reconhecer_pequeno' : 'mov_reconhecer_emp', V), ' ', ...conexao]);
    if (top.length && fr.length) s41.push(fill(L.sit.mov_escolher_v2, {top: cap(nomes(top, 'sigla')), fr: cap(nomes(fr, 'sigla'))}));
    const base = [];
    if (has(f.mort_5a) && f.coorte_5a >= 30) base.push([fc('mort_5a', F.pct), ' de mortalidade em cinco anos']);
    if (hasEmp) base.push([fc('cri_part', F.pct2), ' do emprego formal nos setores criativos']);
    if (has(f.empresas)) base.push([fc('empresas', F.int), ' empresas criativas ativas']);
    s41.push(fill(L.sit.mov_medir_v2, {base: '\u0000'}).flatMap((x) => (x === '\u0000' ? base.flatMap((b, i) => [...b, i === base.length - 1 ? '' : i === base.length - 2 ? ' e ' : ', ']) : [x])));
    M.s41 = trim(s41, LIMITES.s41 - 900);
    M.ampliar = top.map((r) => G(r).ampliar);
    M.escutar = fr.map((r) => G(r).ampliar);
    M.ampliarExtra = M.oficio ? '+ ' + M.oficio.nome + ' como ponte' : '+ ofertas de gestão para negócios criativos';
    M.perguntas = split(L.sit.perguntas).map((q) => fill(q, V));
    // encerramento: destaque do recorte → vocação → oportunidade → papel do Senac
    const fe = [];
    if (!poucas && has(f.empresas_cresc_pct) && f.empresas_cresc_pct >= 20) fe.push('O número de empresas criativas ' + lg.em + ' ' + (f.empresas_cresc_pct >= 100 ? 'mais que dobrou' : 'cresceu ' + N1.format(f.empresas_cresc_pct) + '%') + ' desde 2014 (', fc('empresas_2014', F.int), ' → ', fc('empresas_2025', F.int), '). ');
    else if (top[0] && has(top[0].fatia_var_pp) && top[0].fatia_var_pp >= 3) fe.push(cap(G(top[0]).curto) + ' passou de ', sc(top[0], 'fatia_2014', F.pct), ' para ', sc(top[0], 'fatia_2025', F.pct), ' das empresas criativas ' + slg.de + ' desde 2014. ');
    else if (empCmp === 'acima') fe.push(cap(lg.em) + ', ', fc('cri_part', F.pct2), ' do emprego formal está nos setores criativos, acima da média paulista. ');
    else if (has(f.empresas)) fe.push(cap(lg.em) + ' há ', fc('empresas', F.int), f.empresas < 50 ? ' empresas criativas ativas, uma base ainda pequena. ' : ' empresas criativas ativas, uma base que se renova todos os anos. ');
    if (M.oficio && consol[0].ql >= 1.2) fe.push('A vocação mais nítida está no ofício de ' + M.oficio.nome + ', com concentração acima da média paulista' + (top[0] ? ', e ' + G(top[0]).sigla + ' reúne os sinais mais fortes de potencial. ' : '. '));
    else if (top[0]) fe.push((M.apoio ? 'Na região de ' + slg.curto + ', ' + G(top[0]).sigla : cap(G(top[0]).sigla)) + ' reúne os sinais mais fortes de potencial' + (top[1] ? ', seguida de ' + G(top[1]).sigla : '') + '. ');
    if (fr[0]) fe.push('A oportunidade menos óbvia está em ' + G(fr[0]).sigla + ', hoje pouco estruturada, que pode ganhar fôlego com formação de base e acesso a mercado. ');
    fe.push(L.sit['fecho_reflexao_' + papel] + ' ', L.sit.fecho_pergunta);
    M.fecho41 = fe;
    M.s41len = M.s41.reduce((s, p) => s + len(p), 0) + len(M.fecho41) + M.perguntas.reduce((s, p) => s + len(p), 0) + 'Onde ampliarofertas regulares e escaláveisOnde escutarpilotos e escuta qualificada'.length + M.ampliar.join('').length + M.escutar.join('').length + M.ampliarExtra.length + '+ parceria com a política cultural'.length;
    while (M.s41len > LIMITES.s41 - 150 && M.perguntas.length > 3) { M.s41len -= len(M.perguntas.pop()); }
    const vT = {T: lg.em, top3: nomes(top, 'sigla'), area_inc: top.some((r) => r.g === 9) ? 'tecnologia ou design' : 'design ou comunicação'};
    M.taticas = L.tat.map((x) => ({icone: x.icone, titulo: x.titulo, texto: fill(x.texto, vT)}));
    M.s42len = M.taticas.reduce((s, x) => s + x.titulo.length + len(x.texto), 0);

    // ---------- fontes e notas ----------
    const FT = new Map(fontes.map((x) => [x.fonte, x]));
    const per = (nome) => (FT.get(nome) ? FT.get(nome).periodo : '');
    M.fontes = [
      ['Emprego e estabelecimentos criativos', 'IBGE, Cadastro Central de Empresas (CEMPRE), classificação FIRJAN · ' + per('IBGE – Cadastro Central de Empresas (CEMPRE)') + '.'],
      ['Empresas criativas', 'Receita Federal, cadastro de CNPJ (via Base dos Dados), perímetro do Panorama Territorial da Economia Criativa Paulista (SCEIC e Fundação Seade) · ' + per('Receita Federal – Cadastro Nacional da Pessoa Jurídica (via Base dos Dados)') + '.'],
      ['Mortalidade em até 5 anos', 'métrica Sebrae: empresas abertas em 2020 e não ativas em 31/12/2025.'],
      ['Intensidade criativa por setor', 'RAIS (' + per('Ministério do Trabalho – RAIS (via Base dos Dados)') + ') e PNAD Contínua (' + per('IBGE – PNAD Contínua (microdados trimestrais)') + '), método do Observatório Itaú Cultural.'],
      ['Especializados, incorporados e apoio', 'estimativa sobre o emprego formal (CEMPRE 2024) com proporções da PNAD Contínua; não inclui o trabalho informal.'],
      ['PIB e PIB criativo', 'IBGE, PIB dos Municípios · ' + per('IBGE – PIB dos Municípios') + '; PIB criativo estimado pelo painel.'],
      ['Gasto público com cultura', 'Tesouro Nacional, Siconfi/DCA (função 13) · ' + per('Tesouro Nacional – Siconfi (DCA)') + ', valores reais pelo IPCA.'],
      ['Comércio exterior', 'MDIC, Comex Stat · ' + per('MDIC – Comex Stat') + '; para municípios, vale o domicílio fiscal da empresa.'],
      ['IDPEC-SP', 'adaptação do índice da ESPM pelo painel, 9 indicadores em 3 dimensões.'],
      ['Educação', 'INEP, Censo Escolar · ' + per('INEP – Censo Escolar (microdados)') + '.'],
    ];
    if (f.nivel === 'Município' && has(f.ifdm_er)) M.fontes.push(['IFDM', 'FIRJAN · ' + per('FIRJAN – IFDM') + '.']);
    const notas = ['empresas (Receita Federal), estabelecimentos (CEMPRE) e vínculos (RAIS) são unidades diferentes e não devem ser somados ou comparados diretamente.'];
    if (f.nivel === 'Município' && f.unidade && f.cod_go !== '900') notas.push('este boletim usa o município de ' + f.nome + '; a área de atuação do ' + f.unidade + ' pode incluir outros municípios.');
    if (f.nivel === 'Unidade Senac') notas.push('o recorte soma os municípios da área de atuação da unidade; compare com a GO e com o Estado nas outras abas do painel.');
    if (M.apoio) notas.push('pelo pequeno número de registros ' + lg.em + ', a escolha dos setores usa a região imediata de ' + slg.curto + '.');
    if (has(f.coorte_5a) && f.coorte_5a < 30) notas.push('a coorte de empresas abertas em 2020 tem menos de 30 empresas: a mortalidade não é usada.');
    if (has(f.gasto_cobertura) && f.gasto_cobertura < 95) notas.push('o gasto com cultura cobre municípios com balanço no Siconfi que somam ' + N1.format(f.gasto_cobertura) + '% da população do recorte.');
    notas.push('as áreas e os tipos de oferta da seção 3 não foram conferidos no portfólio vigente.');
    M.notas = 'Notas de cautela: ' + notas.map((x) => x[0].toUpperCase() + x.slice(1)).join(' ');
    M.secoes = {
      s1: M.s1.reduce((s, p) => s + len(p), 0), s2: M.s2len, s31: M.s31.reduce((s, p) => s + len(p), 0), s32: M.s32.reduce((s, p) => s + len(p), 0), s33: M.s33.reduce((s, p) => s + len(p), 0),
      s34: M.s34.reduce((s, p) => s + len(p), 0), s35: M.s35len, s41: M.s41len, s42: M.s42len,
    };
    M.arquivo = 'Boletim_Estrategico_' + (est ? 'Estado_de_Sao_Paulo' : lg.curto).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    return M;
  };
  // corta parágrafos do fim até caber no teto (o primeiro sempre fica)
  const trim = (paras, lim) => { const ps = paras.filter((p) => p && p.length); let n = ps.reduce((s, p) => s + len(p), 0) + ps.length - 1; while (n > lim && ps.length > 1) { const p = ps.pop(); n -= len(p) + 1; } return ps; };

  // ---------- desenho ----------
  const el = (tag, cls, kids) => { const e = document.createElement(tag); if (cls) e.className = cls; (kids || []).forEach((k) => e.append(k)); return e; };
  const parts = (ps) => ps.map((p) => {
    if (typeof p === 'string') return document.createTextNode(p);
    if (p.b) { const s = document.createElement('strong'); s.append(...parts(p.b)); return s; }
    const s = document.createElement('span'); s.className = 'bol-n'; s.dataset.source = p.s; s.dataset.field = p.f; if (p.w) s.dataset.where = p.w; s.textContent = p.v; return s;
  });
  const P = (ps, cls) => el('p', cls, parts(ps));
  const empty = (e) => { e.replaceChildren(); };
  const draw = (name, fn) => dash.draw(name, (e) => { const M = modelo(); if (!M) { if (e.tagName === 'UL' || e.tagName === 'DIV' && e.children.length) empty(e); else e.textContent = '—'; return; } fn(e, M); });

  draw('bol-titulo', (e, M) => { e.textContent = M.est ? 'Estado de São Paulo' : M.lg.curto + (M.f.nivel === 'Município' ? '' : ' · ' + M.f.nivel); });
  draw('bol-capa-nome', (e, M) => { e.textContent = M.capa.nome; e.dataset.tam = M.capa.nome.length > 22 ? 'p' : M.capa.nome.length > 14 ? 'm' : 'g'; });
  draw('bol-capa-sub', (e, M) => { e.textContent = M.capa.sub; });
  draw('bol-apresentacao', (e, M) => { e.replaceChildren(...parts(M.capa.apresentacao)); });
  draw('bol-meta-territorio', (e, M) => { e.textContent = M.capa.territorio; });
  draw('bol-meta-unidade', (e, M) => { e.textContent = M.capa.unidade; });
  draw('bol-carga', (e, M) => { e.replaceChildren(...parts([{v: M.capa.carga, s: 'fontes', f: 'coletado_em'}])); });
  draw('bol-destaques', (e, M) => { e.replaceChildren(...M.destaques.map((d) => el('li', null, parts(d)))); });
  draw('bol-folio-nome', (e, M) => { e.textContent = 'Boletim Estratégico · ' + (M.est ? 'Estado de São Paulo' : M.lg.curto); });
  draw('bol-stats', (e, M) => { e.replaceChildren(...M.stats.map((s) => { const c = el('div', 'c' + (s.lj ? ' lj' : ''), parts([s.c])); if (String(s.c.v).length > 6) c.classList.add('long'); return el('div', 'stat', [c, el('div', 't', parts(s.t))]); })); });
  draw('bol-s1', (e, M) => { e.replaceChildren(...M.s1.map((p) => P(p))); });
  draw('bol-evid1', (e, M) => { e.replaceChildren(...M.evid.map((x) => el('div', 'i', [el('span', 'n', parts(Array.isArray(x.n) ? x.n : [x.n])), el('span', 's', parts(x.s))]))); });
  const bars = (items, max, fmt) => items.map((x) => {
    const fl = el('div', 'fl' + (x.lj ? ' lj' : '') + (x.cinza ? ' cz' : '')); fl.style.width = Math.max(0.4, x.v / max * 100).toFixed(1) + '%';
    return el('div', 'bar', [el('span', 'nm', [x.nome]), el('div', 'tr', [fl]), el('span', 'v', parts(fmt(x)))]);
  });
  draw('bol-placar', (e, M) => {
    const th = el('tr', null, ['Grupo', 'Empresas', 'Fatia 2014 → 2025', 'Potencial', 'Fragilidade', 'Leitura'].map((t, i) => el('th', i && i < 5 ? 'n' : null, [t])));
    const sv = (r, f, fmt) => parts([{v: fmt(r[f]), s: 'bol_setores', f, w: where({cod: r.cod, g: r.g})}]);
    const rows = M.placar.map(({r, nome, papel}) => el('tr', papel === 'potencial' ? 'pot' : papel ? 'fr' : null, [
      el('td', null, [(M.barras.find((x) => x.r.g === r.g) || {nome: cap(nome)}).nome]), el('td', 'n', sv(r, 'ativas', F.int)),
      el('td', 'n', has(r.fatia_2014) ? [...sv(r, 'fatia_2014', F.pct), ' → ', ...sv(r, 'fatia_2025', F.pct)] : ['—']),
      el('td', 'n', sv(r, 'potencial', String)), el('td', 'n', sv(r, 'fragilidade', String)),
      el('td', null, [papel === 'potencial' ? 'maior potencial' : papel ? 'a estruturar' : 'acompanhar'])]));
    e.replaceChildren(el('thead', null, [th]), el('tbody', null, rows));
  });
  draw('bol-barras', (e, M) => { e.replaceChildren(...bars(M.barras.map((b) => ({...b, v: b.r.ativas})), M.barrasMax, (b) => [{v: F.int(b.r.ativas), s: 'bol_setores', f: 'ativas', w: where({cod: b.r.cod, g: b.r.g})}, ' · ' + N1.format(b.pct) + '%'])); });
  draw('bol-barras-tit', (e, M) => { e.textContent = M.barrasTit; });
  draw('bol-apoio', (e, M) => { e.replaceChildren(...(M.apoioTxt ? parts(M.apoioTxt) : [])); });
  const card = (c, fr) => (c.fr = fr, el('div', 'setor' + (fr ? ' fr' : ''), [
    el('div', 'top', [el('span', 'nro', [String(c.n)]), el('span', 'nm', [c.nome]), el('span', 'kpi', [...parts(c.kpi), el('span', 'sc', [' · pontuação ', ...parts([{v: String(c.r[c.fr ? 'fragilidade' : 'potencial']), s: 'bol_setores', f: c.fr ? 'fragilidade' : 'potencial', w: where({cod: c.r.cod, g: c.r.g})}])])])]),
    el('div', 'cols', c.cols.map(([l, p]) => el('div', 'col', [el('span', 'lb', [l]), el('div', null, parts(p))]))),
  ]));
  draw('bol-cards-pot', (e, M) => { e.replaceChildren(...M.cardsPot.map((c) => card(c, false))); });
  draw('bol-cards-fr', (e, M) => { e.replaceChildren(...M.cardsFr.map((c) => card(c, true))); });
  draw('bol-incorp', (e, M) => { e.replaceChildren(...bars(M.incorp, M.incorpMax, (x) => [x.x ? {v: F.int(x.v), s: 'incorp_secao', f: 'incorporados', w: where({cod: M.t, sec: x.x.sec})} : F.int(x.v), ' · ' + N1.format(x.pct) + '%'])); });
  draw('bol-oficio', (e, M) => {
    if (M.est) { e.replaceChildren(); return; }
    const t = el('p', 'rt', [el('strong', null, ['Ofícios no radar.']), ' ', ...(M.radar.length ? [L0().sit.oficios_intro] : parts(fillRaw(L0().sit.oficios_nenhum)))]);
    e.replaceChildren(t, ...M.radar.map((x) => el('div', 'ri ' + x.tipo, parts(x.p))));
  });
  draw('bol-aderencia', (e, M) => { e.replaceChildren(...parts(M.aderencia)); });
  ['s31', 's32', 's33', 's34', 's41'].forEach((k) => draw('bol-' + k, (e, M) => { e.replaceChildren(...M[k].map((p) => P(p))); }));
  draw('bol-kw-intro', (e, M) => { e.replaceChildren(...parts(M.kwIntro)); });
  draw('bol-kw', (e, M) => { e.replaceChildren(...M.kw.map((k) => el('li', null, [k]))); });
  draw('bol-ampliar', (e, M) => { e.replaceChildren(...M.ampliar.map((n) => el('b', null, [n])), document.createTextNode(M.ampliarExtra)); });
  draw('bol-escutar', (e, M) => { e.replaceChildren(...M.escutar.map((n) => el('b', null, [n])), document.createTextNode('+ parceria com a política cultural')); });
  draw('bol-perguntas', (e, M) => { e.replaceChildren(...M.perguntas.map((q) => el('div', null, ['→ ', ...parts(q)]))); });
  draw('bol-fecho41', (e, M) => { e.replaceChildren(...parts(M.fecho41)); });
  const ICON = {
    tela: 'M4 5h16v11H4z M8 20h8 M12 16v4', grupo: 'M6 8a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 19c0-3 3-5 6-5s6 2 6 5 M14 19c.3-2 1.6-3.5 3-3.5 2 0 4 1.5 4 3.5 M15 9a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0',
    moeda: 'M12 3v18 M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6', casa: 'M3 21V9l9-6 9 6v12 M9 21v-6h6v6', fabrica: 'M3 21h18 M5 21V10l5 3V10l5 3V6l4 2v13',
    camera: 'M3 8a2 2 0 0 1 2-2h3l1.5-2h5L16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M8.5 12.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', doc: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h5', grafico: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  };
  const NS = 'http://www.w3.org/2000/svg';
  draw('bol-taticas', (e, M) => {
    e.replaceChildren(...M.taticas.map((x) => {
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      (ICON[x.icone] || ICON.doc).split(' M').forEach((d, i) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', (i ? 'M' : '') + d); svg.append(p); });
      return el('li', null, [el('span', 'ic', [svg]), el('div', null, [el('span', 'tt', [x.titulo]), el('span', 'ds', parts(x.texto))])]);
    }));
  });
  draw('bol-fontes', (e, M) => { e.replaceChildren(...M.fontes.map(([k, v]) => el('p', null, [el('b', null, [k + ':']), ' ' + v])), el('p', null, [el('b', null, ['Notas de cautela:']), ' ' + M.notas.replace(/^Notas de cautela: /, '')])); });
  draw('bol-pdf-nome', (e, M) => { e.textContent = M.arquivo; });
  // imagens do boletim (logo Senac e selo CC BY-NC-SA) guardadas como conjunto de dados, quando a página não as traz no CSS
  dash.onData(() => {
    const r = rowsOf('boletim_imagens');
    if (!r) return;
    document.querySelectorAll('.bol-wrap').forEach((w) => r.forEach((x) => { if (/^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+\/=]+$/.test(String(x.uri))) w.style.setProperty('--bol-' + x.id, 'url("' + x.uri + '")'); }));
  });
  // ajuste fino de diagramação: se o texto de uma página passar do rodapé, a página usa uma versão compacta (só classe; nada é cortado)
  dash.onData(() => {
    document.querySelectorAll('.bol-doc .bol-page').forEach((pg) => {
      const sobra = () => { const pr = pg.getBoundingClientRect(); const fol = pg.querySelector('.bol-folio'); if (!fol || !pr.height) return 0; let mx = 0; pg.querySelectorAll('.bol-sec ~ *:not(.bol-folio), .corpo').forEach((e) => { mx = Math.max(mx, e.getBoundingClientRect().bottom); }); return mx - fol.getBoundingClientRect().top; };
      pg.classList.remove('aperta', 'aperta2');
      if (sobra() > -2) pg.classList.add('aperta');
      if (sobra() > -2) pg.classList.add('aperta2');
    });
  });

  // ---------- PDF ----------
  // Na versão do site (GitHub/VS Code), gera o arquivo direto com html2canvas + jsPDF (cdnjs).
  // Onde a página não pode carregar bibliotecas externas (artifact do Claude), abre a impressão do navegador:
  // escolha "Salvar como PDF" (A4, texto selecionável).
  const carregar = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
  const status = (msg) => document.querySelectorAll('#bol-pdf-status').forEach((s) => { s.hidden = !msg; s.textContent = msg || ''; });
  const imprimir = (nome) => {
    const doc = document.querySelector('.bol-doc');
    if (!doc) return;
    const old = document.title; document.title = nome.replace(/\.pdf$/, '');
    // esconde o restante da página ao longo da cadeia de elementos até o boletim (só classes)
    const marcados = [];
    for (let n = doc; n && n.parentElement && n !== document.body; n = n.parentElement) {
      n.classList.add('bol-cadeia'); marcados.push([n, 'bol-cadeia']);
      [...n.parentElement.children].forEach((s) => { if (s !== n) { s.classList.add('bol-oculto'); marcados.push([s, 'bol-oculto']); } });
    }
    document.documentElement.classList.add('bol-imprimindo');
    let feito = false;
    const fim = () => { if (feito) return; feito = true; document.title = old; document.documentElement.classList.remove('bol-imprimindo'); marcados.forEach(([e, c]) => e.classList.remove(c)); window.removeEventListener('afterprint', fim); };
    window.addEventListener('afterprint', fim);
    try { window.print(); } catch (err) { fim(); status('A impressão foi bloqueada neste ambiente. Abra o painel no site (GitHub Pages) para baixar o PDF.'); return; }
    setTimeout(fim, 60000);
  };
  const direto = async (nome) => {
    status('Gerando o PDF…');
    // bibliotecas locais (pasta js/ do pacote); se faltarem, tenta o cdnjs
    const libs = window.BOL_PDF_LIBS || {};
    if (!window.html2canvas) await carregar(libs.html2canvas || 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if (!window.jspdf) await carregar(libs.jspdf || 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const doc = document.querySelector('.bol-doc');
    doc.classList.add('bol-captura');
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const pdf = new window.jspdf.jsPDF({unit: 'mm', format: 'a4', compress: true});
      const pages = [...doc.querySelectorAll('.bol-page')];
      for (let i = 0; i < pages.length; i++) {
        status('Gerando o PDF… página ' + (i + 1) + ' de ' + pages.length);
        const cv = await window.html2canvas(pages[i], {scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1100});
        if (i) pdf.addPage();
        pdf.addImage(cv.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(nome);
      status('');
    } finally { doc.classList.remove('bol-captura'); }
  };
  document.querySelectorAll('#bol-pdf').forEach((b) => b.addEventListener('click', async () => {
    const M = modelo(); if (!M) return;
    if (window.BOL_PDF_DIRETO) { try { await direto(M.arquivo); return; } catch (err) { status('Não foi possível gerar o arquivo direto; abrindo a impressão do navegador (escolha “Salvar como PDF”).'); } }
    imprimir(M.arquivo);
  }));
  document.querySelectorAll('#bol-print').forEach((b) => b.addEventListener('click', () => { const M = modelo(); if (M) imprimir(M.arquivo); }));
})();

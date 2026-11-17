(() => {
  // ================= Boletim Estratégico · Territórios que Criam · cálculos (Camadas 1 e 2) =================
  // Camada 1: cálculos declarados (bol_ficha, bol_setores) sobre os conjuntos do painel.
  // Camada 2: pontuação explícita dos nove grupos de atividades criativas (bol_setores).
  // Camada 3: biblioteca editorial fixa (conjunto boletim_biblioteca), combinada em boletim.js com os números.
  const has = (v) => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && !isFinite(v));
  const num = (v) => (has(v) ? Number(v) : null);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const mean = (a) => { const v = a.filter((x) => has(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const S = (v) => String(v).replace(/\.0$/, '');
  const split = (s) => (has(s) ? String(s).split('|').map((x) => x.trim()).filter(Boolean) : []);
  const SENAC_SEC = new Set(['G', 'I', 'H', 'N', 'S']);

  // ---------- biblioteca editorial ----------
  const libParse = (rows) => {
    const L = {grupos: new Map(), oficios: new Map(), sit: {}, dif: [], tat: [], con: {}};
    (rows || []).forEach((r) => {
      if (r.tipo === 'grupo') L.grupos.set(Number(r.g), {...r, g: Number(r.g), aderencia: Number(r.aderencia), rais: split(r.rais), firjan: split(r.firjan), fam: split(r.fam), comex: split(r.comex), palavras: split(r.palavras)});
      else if (r.tipo === 'oficio') L.oficios.set(r.chave, r);
      else if (r.tipo === 'situacao') L.sit[r.chave] = r.texto;
      else if (r.tipo === 'diferenciar') L.dif.push(r);
      else if (r.tipo === 'tatica') L.tat.push(r);
      else if (r.tipo === 'conectivo') L.con[r.chave] = r.texto;
    });
    return L;
  };

  // ---------- Camada 2 · leitura dos setores ----------
  dash.calc('bol_setores', {
    inputs: ['territorios', 'empresas_grupo', 'empresas_ano', 'intens_setor_mun', 'familias_mun', 'segmentos', 'comex_grupos', 'boletim_biblioteca'],
    title: 'Boletim: pontuação dos grupos de atividades criativas',
    description: 'Para cada território e cada um dos nove grupos do Panorama, reúne empresas (Receita Federal), emprego formal (CEMPRE, recorte FIRJAN), intensidade criativa (RAIS) e ofícios (QL), e calcula concentração, dinâmica, estrutura e aderência (0 a 1). Potencial = 0,30 concentração + 0,30 dinâmica + 0,15 estrutura + 0,25 aderência. Setores com menos de 30 vínculos RAIS não entram na comparação de intensidade.',
    fn: (territorios, empresas_grupo, empresas_ano, intens_setor_mun, familias_mun, segmentos, comex_grupos, boletim_biblioteca) => {
      const L = libParse(boletim_biblioteca);
      const grp = [...L.grupos.values()].sort((a, b) => a.g - b.g);
      const idx = (rows, key) => { const m = new Map(); rows.forEach((r) => { const c = S(r.cod); if (!m.has(c)) m.set(c, new Map()); m.get(c).set(String(key(r)), r); }); return m; };
      const EG = idx(empresas_grupo, (r) => r.g), EA = idx(empresas_ano, (r) => r.ano), IS = idx(intens_setor_mun, (r) => r.setor), FM = idx(familias_mun, (r) => r.fam);
      const SG = idx(segmentos.filter((r) => Number(r.ano) === 2024 || Number(r.ano) === 2022), (r) => r.ano + '|' + r.segmento);
      const CX = idx(comex_grupos.filter((r) => Number(r.ano) === 2025), (r) => r.grupo);
      const TR = new Map(territorios.map((r) => [S(r.cod), r]));
      const at = (m, c, k) => (m.get(c) ? m.get(c).get(String(k)) : undefined);
      const base = (c, G) => {
        const e = at(EG, c, G.g) || {};
        const y14 = at(EA, c, 2014), y25 = at(EA, c, 2025);
        const sh = (y) => (y && y.estoque > 0 ? (num(y['g' + G.g]) || 0) / y.estoque * 100 : null);
        let rv = 0, rc = 0; G.rais.forEach((s) => { const x = at(IS, c, s); if (x && has(x.rais_vinc)) { rv += Number(x.rais_vinc); rc += Number(x.rais_cri) || 0; } });
        let e24 = 0, e22 = 0, ul = 0, sig = false; G.firjan.forEach((s) => { const a = at(SG, c, '2024|' + s), b = at(SG, c, '2022|' + s); if (a) { if (has(a.emp)) e24 += Number(a.emp); else sig = true; ul += Number(a.ul) || 0; } if (b && has(b.emp)) e22 += Number(b.emp); });
        let ft = 0, fe = 0, fi = 0, fq = 0, fw = 0; G.fam.forEach((f) => { const x = at(FM, c, f); if (x) { ft += Number(x.total) || 0; fe += Number(x.especializados) || 0; fi += Number(x.incorporados) || 0; if (has(x.ql) && x.total > 0) { fq += x.ql * x.total; fw += Number(x.total); } } });
        let ex = 0, im = 0; G.comex.forEach((s) => { const x = at(CX, c, s); if (x) { ex += Number(x.export) || 0; im += Number(x.import) || 0; } });
        const t = TR.get(c) || {};
        return {ativas: num(e.ativas) || 0, part: num(e.part_pct), criadas: num(e.criadas), fechadas: num(e.fechadas), sh14: sh(y14), sh25: sh(y25), rv, rc, int: rv >= 30 ? rc / rv * 100 : null, e24: G.firjan.length ? e24 : null, e22: G.firjan.length ? e22 : null, ul, sig, ft, fe, fi, fql: fw >= 30 ? fq / fw : null, ex, im, criEmp: num(t.cri_emp)};
      };
      const sp = new Map(grp.map((G) => [G.g, base('35', G)]));
      const out = [];
      territorios.forEach((t) => {
        const c = S(t.cod);
        const B = grp.map((G) => ({G, b: base(c, G), s: sp.get(G.g)}));
        const tot = B.reduce((s, x) => s + x.b.ativas, 0);
        const rk = [...B].sort((a, b) => b.b.ativas - a.b.ativas).map((x) => x.G.g);
        const rkE = [...B].sort((a, b) => (b.b.e24 || 0) - (a.b.e24 || 0)).map((x) => x.G.g);
        // formalização média do próprio território: empregos formais criativos (recorte FIRJAN) por 100 empresas criativas
        const eTot = B.reduce((s, x) => s + (x.b.e24 || 0), 0), aTot = B.filter((x) => x.G.firjan.length).reduce((s, x) => s + x.b.ativas, 0);
        const formT = aTot > 0 ? eTot / aTot * 100 : null;
        const netT = tot > 0 ? B.reduce((s, x) => s + (x.b.criadas || 0) - (x.b.fechadas || 0), 0) / tot * 100 : null;
        const shrink = (score, w) => (has(score) ? w * score + (1 - w) * 0.45 : null);
        B.forEach((x) => {
          const {G, b, s} = x;
          const intR = has(b.int) && has(s.int) && s.int > 0 ? b.int / s.int : null;
          // QL relativo: peso do grupo dentro do emprego criativo do território, frente ao mesmo peso no Estado
          const qlEmp = has(b.e24) && b.criEmp > 0 && s.e24 > 0 && s.criEmp > 0 && b.e24 >= 10 ? (b.e24 / b.criEmp) / (s.e24 / s.criEmp) : null;
          // escores com amostra pequena são puxados para um valor neutro (0,45)
          const sConc = mean([has(intR) ? shrink(clamp(intR / 2), Math.min(1, b.rv / 200)) : null, has(qlEmp) ? shrink(clamp(qlEmp / 2), Math.min(1, b.e24 / 300)) : null]);
          const relPart = has(b.part) && s.part > 0 ? b.part / s.part : null;
          const dpp = has(b.sh14) && has(b.sh25) ? b.sh25 - b.sh14 : null;
          // evolução recente: saldo de aberturas e fechamentos em 2025, frente ao saldo do conjunto do território
          const net = b.ativas >= 20 && has(b.criadas) ? ((b.criadas || 0) - (b.fechadas || 0)) / b.ativas * 100 : null;
          const sDin = mean([has(relPart) ? clamp(relPart / 2) : null, has(dpp) ? clamp(0.5 + dpp / 8) : null, has(net) && has(netT) ? clamp(0.5 + (net - netT) / 10) : null, 1 - rk.indexOf(G.g) / 8, G.firjan.length ? 1 - rkE.indexOf(G.g) / 8 : null]);
          const form = has(b.e24) && b.ativas > 0 ? b.e24 / b.ativas * 100 : null;
          const formSp = has(s.e24) && s.ativas > 0 ? s.e24 / s.ativas * 100 : null;
          const varEmp = has(b.e22) && b.e22 >= 50 && !b.sig ? (b.e24 / b.e22 - 1) * 100 : null;
          const sEst = mean([has(form) && formT > 0 ? clamp(form / formT / 2) : null, has(varEmp) ? clamp(0.5 + varEmp / 60) : null]);
          const sAder = 0.5 * G.aderencia + 0.5 * (has(b.fql) ? shrink(clamp(b.fql / 2), Math.min(1, b.ft / 200)) : 0.4);
          const c0 = has(sConc) ? sConc : 0.4, e0 = has(sEst) ? sEst : 0.3;
          const pot = 0.30 * c0 + 0.30 * sDin + 0.15 * e0 + 0.25 * sAder;
          const fr = 1 - (0.45 * e0 + 0.25 * c0 + 0.30 * (has(dpp) ? clamp(0.5 + dpp / 8) : 0.5));
          out.push({cod: c, g: G.g, grupo: G.nome, ativas: b.ativas, part_pct: b.part, part_pct_sp: s.part, criadas_2025: b.criadas, fechadas_2025: b.fechadas,
            fatia_2014: has(b.sh14) ? +b.sh14.toFixed(1) : null, fatia_2025: has(b.sh25) ? +b.sh25.toFixed(1) : null, fatia_var_pp: has(dpp) ? +dpp.toFixed(1) : null, saldo_2025_pct: has(net) ? +net.toFixed(1) : null,
            rais_vinc: b.rv, rais_cri: b.rc, intens_pct: has(b.int) ? +b.int.toFixed(1) : null, intens_sp_pct: has(s.int) ? +s.int.toFixed(1) : null,
            emp_2024: b.e24, emp_2022: b.e22, emp_sigilo: b.sig, emp_var_pct: has(varEmp) ? +varEmp.toFixed(1) : null, ql_emp: has(qlEmp) ? +qlEmp.toFixed(2) : null,
            emp_100_empresas: has(form) ? +form.toFixed(1) : null, emp_100_empresas_sp: has(formSp) ? +formSp.toFixed(1) : null, emp_100_empresas_terr: has(formT) ? +formT.toFixed(1) : null,
            oficios_total: b.ft, oficios_esp: b.fe, oficios_inc: b.fi, oficios_ql: has(b.fql) ? +b.fql.toFixed(2) : null, export_2025: b.ex, import_2025: b.im,
            s_conc: has(sConc) ? +sConc.toFixed(2) : null, s_din: +sDin.toFixed(2), s_est: has(sEst) ? +sEst.toFixed(2) : null, s_ader: +sAder.toFixed(2),
            potencial: Math.round(pot * 100), fragilidade: Math.round(fr * 100), total_empresas: tot});
        });
        // escolha: três de maior potencial e três menos estruturados com presença real
        const mine = out.slice(-9);
        const minA = Math.max(10, tot * 0.03);
        const elig = mine.filter((r) => r.ativas >= minA).sort((a, b) => b.potencial - a.potencial);
        elig.slice(0, 3).forEach((r, i) => { r.papel = 'potencial'; r.ordem = i + 1; });
        mine.filter((r) => !r.papel && (r.ativas >= 10 || r.oficios_total >= 30) && !(r.g === 7 && r.ativas < 30))
          .sort((a, b) => b.fragilidade - a.fragilidade).slice(0, 3).forEach((r, i) => { r.papel = 'menos estruturado'; r.ordem = i + 1; });
        mine.forEach((r) => { if (!r.papel) { r.papel = ''; r.ordem = null; } });
      });
      return out;
    },
  });

  // ---------- Camada 1 · ficha do território ----------
  dash.calc('bol_ficha', {
    inputs: ['territorios', 'empresas_resumo', 'empresas_ano', 'triangulo', 'gasto_hist', 'infra', 'comex', 'idpec', 'incorp_secao', 'intens_setor_mun', 'fontes'],
    title: 'Boletim: ficha do território',
    description: 'Reúne, para cada território, os números usados no boletim: porte e dinâmica da economia criativa (CEMPRE), empresas (Receita Federal), força de trabalho criativa (estimativa), gasto com cultura (Siconfi, R$ de 2024), escolas com espaços para artes (Censo Escolar), comércio exterior (Comex Stat) e IDPEC-SP. Municípios com menos de 300 empresas criativas ou menos de 30 vínculos formais nos setores criativos recebem a região imediata como apoio para a leitura dos setores.',
    fn: (territorios, empresas_resumo, empresas_ano, triangulo, gasto_hist, infra, comex, idpec, incorp_secao, intens_setor_mun, fontes) => {
      const by = (rows, f) => { const m = new Map(); rows.forEach((r) => { if (!f || f(r)) m.set(S(r.cod), r); }); return m; };
      const ER = by(empresas_resumo), TRI = by(triangulo, (r) => String(r.base).startsWith('Emprego')), ID = by(idpec);
      const EA = new Map(); empresas_ano.forEach((r) => { const c = S(r.cod); if (!EA.has(c)) EA.set(c, new Map()); EA.get(c).set(Number(r.ano), r); });
      const GH = new Map(); gasto_hist.filter((r) => r.esfera === 'Prefeituras').forEach((r) => { const c = S(r.cod); if (!GH.has(c)) GH.set(c, new Map()); GH.get(c).set(Number(r.ano), r); });
      const IN = new Map(); infra.forEach((r) => { const c = S(r.cod); if (!IN.has(c)) IN.set(c, {}); IN.get(c)[r.item] = r; });
      const CX = new Map(); comex.forEach((r) => { const c = S(r.cod); if (!CX.has(c)) CX.set(c, {}); CX.get(c)[Number(r.ano)] = r; });
      const IC = new Map(); incorp_secao.forEach((r) => { const c = S(r.cod); if (!IC.has(c)) IC.set(c, []); IC.get(c).push(r); });
      const RV = new Map(); intens_setor_mun.forEach((r) => { if (String(r.setor) === 'TOTAL') RV.set(S(r.cod), r); });
      const carga = fontes.reduce((a, r) => (String(r.coletado_em) > a ? String(r.coletado_em) : a), '');
      const T35 = territorios.find((r) => S(r.cod) === '35') || {};
      const g35 = GH.get('35'), e35 = ER.get('35') || {};
      return territorios.map((t) => {
        const c = S(t.cod), e = ER.get(c) || {}, tri = TRI.get(c) || {}, id = ID.get(c) || {}, ea = EA.get(c) || new Map(), gh = GH.get(c), inf = IN.get(c) || {}, cx = CX.get(c) || {};
        const y14 = ea.get(2014), y25 = ea.get(2025);
        const g24 = gh && gh.get(2024), g14 = gh && gh.get(2014);
        const ic = (IC.get(c) || []).filter((x) => x.incorporados > 0).sort((a, b) => b.incorporados - a.incorporados);
        const icTot = ic.reduce((s, x) => s + x.incorporados, 0);
        const rv = RV.get(c);
        const pequeno = t.nivel === 'Município' && ((num(e.ativas) || 0) < 300 || !rv || (num(rv.rais_vinc) || 0) < 30) ? 1 : 0;
        const micro = has(e.porte_mei) && e.ativas > 0 ? (e.porte_mei + e.porte_me) / (e.porte_mei + e.porte_me + e.porte_epp + e.porte_demais) * 100 : null;
        const mei = has(e.porte_mei) && e.ativas > 0 ? e.porte_mei / (e.porte_mei + e.porte_me + e.porte_epp + e.porte_demais) * 100 : null;
        const me = has(micro) && has(mei) ? micro - mei : null;
        const r1 = (v) => (has(v) ? +Number(v).toFixed(1) : null);
        return {cod: c, nome: t.nome, nivel: t.nivel, unidade: t.unidade || null, go: t.go || null, cod_rgi: has(t.cod_rgi) ? S(t.cod_rgi) : null, cod_go: has(t.cod_go) ? S(t.cod_go) : null, cod_un: has(t.cod_un) ? S(t.cod_un) : null,
          pib_mil: num(t.pib_2023_mil), pib_cri_mil: num(id.pib_criativo_2023_mil ?? t.pib_criativo_2023_mil), pib_cri_pct: num(id.pib_criativo_part_pct ?? t.pib_criativo_part_pct), pib_cri_pct_sp: num(T35.pib_criativo_part_pct),
          ifdm_er: num(t.ifdm_emprego_renda_2023), cri_emp: num(t.cri_emp), cri_ul: num(t.cri_ul), cri_part: num(t.cri_part_emp), cri_part_sp: num(T35.cri_part_emp), rem: num(t.cri_rem_media), rem_sp: num(T35.cri_rem_media),
          empresas: num(e.ativas), empresas_part: num(e.part_criativas_pct), empresas_part_sp: num(e35.part_criativas_pct), empresas_2014: y14 ? num(y14.estoque) : null, empresas_2025: y25 ? num(y25.estoque) : null,
          empresas_var_2025: y25 ? num(y25.var_pct) : null, criadas_2025: y25 ? num(y25.criadas) : null, empresas_cresc_pct: y14 && y25 && y14.estoque > 0 ? r1((y25.estoque / y14.estoque - 1) * 100) : null,
          mei_pct: r1(mei), me_pct: r1(me), mei_micro_pct: r1(micro), mort_5a: num(e.mort_5a), mort_5a_sp: num(e35.mort_5a), coorte_5a: num(e.coorte_5a), mort_2a: num(e.mort_2a),
          especializados: num(tri.especializados), incorporados: num(tri.incorporados), apoio: num(tri.apoio), incorp_pct: num(tri.comp_incorporados),
          incorp_sec1: ic[0] ? ic[0].secao : null, incorp_sec2: ic[1] ? ic[1].secao : null, incorp_senac_pct: icTot ? r1(ic.filter((x) => SENAC_SEC.has(x.sec)).reduce((s, x) => s + x.incorporados, 0) / icTot * 100) : null,
          gasto_pc: g24 ? num(g24.cult_pc_real) : null, gasto_pc_2014: g14 ? num(g14.cult_pc_real) : null, gasto_var_10a: g24 && g14 && g14.cult_pc_real > 0 ? r1((g24.cult_pc_real / g14.cult_pc_real - 1) * 100) : null,
          gasto_pc_sp: g35 && g35.get(2024) ? num(g35.get(2024).cult_pc_real) : null, gasto_cobertura: g24 ? num(g24.cobertura_pct) : null,
          atelie_pct: inf['Ateliê de artes'] ? num(inf['Ateliê de artes'].pct) : null, musica_pct: inf['Sala de música/coral'] ? num(inf['Sala de música/coral'].pct) : null, escolas: inf['Internet'] ? num(inf['Internet'].escolas) : null,
          export_2023: cx[2023] ? num(cx[2023].export_cri) : 0, export_2025: cx[2025] ? num(cx[2025].export_cri) : 0, import_2025: cx[2025] ? num(cx[2025].import_cri) : 0,
          idpec: num(id.idpec), idpec_faixa: id.idpec_faixa || null, idpec_rank: num(id.idpec_rank), d1: num(id.d1_capacidades_humanas), d2: num(id.d2_atratividade_conectividade), d3: num(id.d3_ambiente_cultural_empreend),
          rais_vinc_criativos: rv && has(rv.rais_vinc) ? num(rv.rais_vinc) : 0, pequeno, apoio_cod: pequeno ? (has(t.cod_rgi) ? S(t.cod_rgi) : null) : null, carga};
      });
    },
  });
})();

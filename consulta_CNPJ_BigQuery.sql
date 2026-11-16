-- Empresas criativas no cadastro de CNPJ (Receita Federal, via Base dos Dados) — Estado de SP, retrato de 11/01/2026
-- Perímetro: 87 classes CNAE do Panorama Territorial da Economia Criativa Paulista (9 grupos) + 51 classes do recorte FIRJAN do painel
-- g = grupo do Panorama (1 a 9; 0 = só FIRJAN); f = 1 se a classe está no recorte FIRJAN
-- ab = ano de abertura (2013 = até 2013); sai = ano de saída (0 = ativa); t = A ativa, B baixada, O outras (inapta, suspensa, nula)
WITH e AS (
  SELECT cnpj_basico, id_municipio m, SUBSTR(cnae_fiscal_principal,1,5) c, situacao_cadastral s, data_situacao_cadastral ds, data_inicio_atividade di
  FROM `basedosdados.br_me_cnpj.estabelecimentos`
  WHERE data='2026-01-11' AND sigla_uf='SP' AND identificador_matriz_filial='1'
    AND SUBSTR(cnae_fiscal_principal,1,5) IN ('13219','13227','13235','13308','13405','13511','13529','13537','13545','13596','14126','14142','15211','16293','17214','17222','17494','18300','21106','21211','21220','21238','22293','23192','23499','25411','25993','26108','26809','27406','27902','28291','31012','31021','31039','32116','32124','32205','32990','47610','58115','58123','58131','58191','58212','58221','58239','58298','59111','59120','59138','59146','59201','60101','60217','60225','61418','61434','62015','62023','62031','62040','62091','63119','63194','63917','63992','71111','71120','71197','71201','72100','72207','73114','73122','73190','73203','74102','74200','74901','77217','77390','81303','82300','85929','90019','90027','90035','91015','91023','91031','94936')),
b AS (
  SELECT e.*, CASE WHEN c IN ('81303','71197','74102','71111','71120') THEN 1 WHEN c IN ('13537','16293','22293','13529','25411','23192','15211','32124','17222','27406','28291','31012','31021','31039','17214','23499','25993','17494','32990','32116') THEN 2 WHEN c IN ('63917','59146','59120','59111','60101','60217','74200','59138','61418','61434','63992','60225') THEN 3 WHEN c IN ('47610','58191','58123','58115','58131','58298','58221','58212','58239') THEN 4 WHEN c IN ('13405','14126','14142','13511','13596','13308','13545','13219','13235','13227') THEN 5 WHEN c IN ('77217','77390','90019','59201','82300','94936','90027','85929','32205','90035','18300') THEN 6 WHEN c IN ('91015','91031','91023') THEN 7 WHEN c IN ('73122','73114','73190','74901','72100','72207','73203') THEN 8 WHEN c IN ('62040','62015','62023','62031','26108','27902','26809','63194','62091','63119') THEN 9 ELSE 0 END g,
    IF(c IN ('14142','21106','21211','21220','21238','32116','32124','32205','58115','58123','58131','58191','58212','58221','58239','58298','59111','59120','59138','59146','59201','60101','60217','60225','62015','62023','62031','62040','62091','63119','63194','63917','71111','71120','71201','72100','72207','73114','73122','73190','73203','74102','74200','85929','90019','90027','90035','91015','91023','91031','94936'),1,0) f,
    GREATEST(EXTRACT(YEAR FROM di),2013) ab,
    CASE WHEN s='2' THEN 0 ELSE GREATEST(EXTRACT(YEAR FROM ds),2013) END sai,
    CASE WHEN s='2' THEN 'A' WHEN s='8' THEN 'B' ELSE 'O' END t
  FROM e WHERE di IS NOT NULL),
p AS (SELECT cnpj_basico, ANY_VALUE(porte) porte FROM `basedosdados.br_me_cnpj.empresas` WHERE data='2026-01-11' GROUP BY 1),
sm AS (SELECT cnpj_basico, MAX(opcao_mei) mei, MAX(IF(data_opcao_mei IS NOT NULL,1,0)) emei FROM `basedosdados.br_me_cnpj.simples` GROUP BY 1),
bp AS (
  SELECT b.*, CASE WHEN sm.mei=1 THEN 'MEI' WHEN SAFE_CAST(p.porte AS INT64)=1 THEN 'ME' WHEN SAFE_CAST(p.porte AS INT64)=3 THEN 'EPP' WHEN p.porte IS NULL THEN 'NA' ELSE 'DEMAIS' END po, IFNULL(sm.emei,0) emei
  FROM b LEFT JOIN p USING(cnpj_basico) LEFT JOIN sm USING(cnpj_basico))

-- (1) estoque ativo por município, classe CNAE e porte
SELECT m, c, po, COUNT(*) n FROM bp WHERE t='A' GROUP BY 1,2,3 ORDER BY 1,2,3;

-- (2) fluxos por município e grupo: abertura x saída (usar os mesmos CTEs)
-- SELECT m, g*10+f k, ab, sai, t, COUNT(*) n FROM b GROUP BY 1,2,3,4,5;

-- (3) aberturas por mês
-- SELECT m, g*10+f k, FORMAT_DATE('%y%m', di) ym, COUNT(*) n FROM b WHERE di>='2014-01-01' GROUP BY 1,2,3;

-- (4) todas as atividades (denominador): mesmo cálculo de (2) sem o filtro de CNAE
-- (5) Estado, por porte e coorte: SELECT g*10+f k, po, emei, ab, sai, t, COUNT(*) n FROM bp GROUP BY 1,2,3,4,5,6;
-- Observação: o download local do BigQuery corta resultados grandes; (2), (3) e (4) foram baixados compactados com STRING_AGG por município.

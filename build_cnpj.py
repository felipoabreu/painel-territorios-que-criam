# Empresas criativas (Receita Federal/CNPJ via Base dos Dados, retrato de 11/01/2026) -> conjuntos do painel
import pandas as pd, json, numpy as np, sys
sys.path.insert(0,'/home/claude/cnpj')
from grupos import G
C=json.load(open('/home/claude/cnpj/classes.json')); PAN=C['pan']; FJ=set(C['firjan'])
GN=list(G.keys())
terr=pd.DataFrame(json.load(open('/home/claude/dash/territorios.json')))
mun=terr[terr.nivel=='Município'].copy(); mun['m']=mun.cod.astype(str)
# mapa município -> territórios agregados
levels=[('cod','m')]
MAP=[]
for r in mun.itertuples():
    for c in ['cod','cod_rgint','cod_rgi','cod_go','cod_un']:
        v=getattr(r,c)
        if v is not None and not (isinstance(v,float) and np.isnan(v)): MAP.append((r.m,int(v)))
    MAP.append((r.m,35))
MAP=pd.DataFrame(MAP,columns=['m','cod']).drop_duplicates()
valid=set(terr.cod.astype(int)); MAP=MAP[MAP.cod.isin(valid)]
print('territórios',MAP.cod.nunique(), len(valid))
L=pd.read_pickle('/home/claude/cnpj/L.pkl')
F=L[L.q=='F'].copy(); F['k']=F.k.astype(int); F['g']=F.k//10; F['fj']=F.k%2
F=F.merge(MAP,on='m'); T=L[L.q=='T'].merge(MAP,on='m')
Y=list(range(2014,2026))
def flows(d,keys):
    """estoque em 31/12, criadas, baixadas e outras saídas por ano"""
    out=[]
    for y in Y:
        a=d[(d.ab<=y)&((d.sai==0)|(d.sai>y))].groupby(keys).n.sum().rename('estoque')
        c=d[d.ab==y].groupby(keys).n.sum().rename('criadas')
        b=d[(d.sai==y)&(d.t=='B')].groupby(keys).n.sum().rename('fechadas')
        o=d[(d.sai==y)&(d.t=='O')].groupby(keys).n.sum().rename('outras_saidas')
        x=pd.concat([a,c,b,o],axis=1).fillna(0).astype(int).reset_index(); x['ano']=y; out.append(x)
    return pd.concat(out,ignore_index=True)
def mort(d,keys,coorte,ate=2025):
    c=d[d.ab==coorte]; n=c.groupby(keys).n.sum().rename('n')
    f=c[(c.sai!=0)&(c.sai<=ate)].groupby(keys).n.sum().rename('f')
    b=c[(c.sai!=0)&(c.sai<=ate)&(c.t=='B')].groupby(keys).n.sum().rename('b')
    return pd.concat([n,f,b],axis=1).fillna(0)
P=F[F.g>0]; J=F[F.fj==1]
# ---------- por ano (largo): total, grupos, criadas, fechadas, mensal
fa=flows(P,['cod']); fg=flows(P,['cod','g']); fj=flows(J,['cod']); ft=flows(T,['cod'])
wide=fg.pivot_table(index=['cod','ano'],columns='g',values='estoque',fill_value=0); wide.columns=[f'g{int(c)}' for c in wide.columns]
A=fa.merge(wide.reset_index(),on=['cod','ano'],how='left').merge(fj.rename(columns={'estoque':'fj_estoque','criadas':'fj_criadas','fechadas':'fj_fechadas','outras_saidas':'fj_outras'}),on=['cod','ano'],how='left').merge(ft[['cod','ano','estoque','criadas','fechadas']].rename(columns={'estoque':'tot_estoque','criadas':'tot_criadas','fechadas':'tot_fechadas'}),on=['cod','ano'],how='left')
A=A.sort_values(['cod','ano']); A['var_pct']=(A.groupby('cod').estoque.pct_change()*100).round(1)
# geração mensal (perímetro Panorama)
M=pd.read_csv('/home/claude/cnpj/mensal.csv',dtype=str); rows=[]
for r in M.itertuples(index=False):
    k=int(r.k)
    for it in r.s.split(';'):
        ym,n=it.split(':'); rows.append((r.m,k//10,k%2,2000+int(ym[:2]),int(ym[2:]),int(n)))
M=pd.DataFrame(rows,columns=['m','g','fj','ano','mes','n']).merge(MAP,on='m')
mp=M[M.g>0].groupby(['cod','ano','mes']).n.sum().unstack(fill_value=0); mp.columns=[f'm{int(c):02d}' for c in mp.columns]
A=A.merge(mp.reset_index(),on=['cod','ano'],how='left')
for c in [x for x in A.columns if x.startswith(('m0','m1','g','fj_','tot_'))]: A[c]=A[c].fillna(0).astype(int)
assert (A[[f'm{i:02d}' for i in range(1,13)]].sum(axis=1)==A.criadas).all()
# ---------- resumo por território
R=pd.DataFrame({'cod':sorted(MAP.cod.unique())}).set_index('cod')
now=lambda d: d[d.t=='A'].groupby('cod').n.sum()
R['ativas']=now(P); R['fj_ativas']=now(J); R['tot_ativas']=now(T)
y25=A[A.ano==2025].set_index('cod'); y24=A[A.ano==2024].set_index('cod')
for c in ['estoque','criadas','fechadas','outras_saidas','fj_estoque','fj_criadas','fj_fechadas','tot_estoque','tot_criadas','tot_fechadas']: R[c+'_2025']=y25[c]
R['estoque_2024']=y24.estoque; R['tot_estoque_2024']=y24.tot_estoque; R['fj_estoque_2024']=y24.fj_estoque
R=R.fillna(0)
pct=lambda a,b: np.where(b>0,a/b*100,np.nan)
R['part_criativas_pct']=pct(R.ativas,R.tot_ativas)
R['tx_natalidade_2025']=pct(R.criadas_2025,R.estoque_2024); R['tx_fechamento_2025']=pct(R.fechadas_2025,R.estoque_2024)
R['tot_tx_natalidade_2025']=pct(R.tot_criadas_2025,R.tot_estoque_2024); R['tot_tx_fechamento_2025']=pct(R.tot_fechadas_2025,R.tot_estoque_2024)
R['saldo_2025']=R.criadas_2025-R.fechadas_2025-R.outras_saidas_2025
for nome,d in [('',P),('fj_',J),('tot_',T)]:
    for lab,co in [('2a',2023),('5a',2020)]:
        x=mort(d,['cod'],co).reindex(R.index).fillna(0)
        R[f'{nome}coorte_{lab}']=x.n; R[f'{nome}mort_{lab}']=pct(x.f,x.n); R[f'{nome}mort_{lab}_baixa']=pct(x.b,x.n)
# porte e setor (estoque ativo, retrato jan/2026)
S=pd.read_csv('/home/claude/cnpj/q2_estoque.csv',dtype={'m':str,'c':str}).merge(MAP,on='m')
S['pan']=S.c.isin(PAN); S['fj']=S.c.isin(FJ); dv=S.c.str[:2].astype(int)
S['setor']=np.where(dv.between(10,33),'ind',np.where(dv.between(45,47),'com','serv'))
for nome,d in [('',S[S.pan]),('fj_',S[S.fj])]:
    x=d.pivot_table(index='cod',columns='po',values='n',aggfunc='sum',fill_value=0)
    for p_ in ['MEI','ME','EPP','DEMAIS']: R[f'{nome}porte_{p_.lower()}']=x.get(p_,0)
    x=d.pivot_table(index='cod',columns='setor',values='n',aggfunc='sum',fill_value=0)
    for s_ in ['serv','ind','com']: R[f'{nome}setor_{s_}']=x.get(s_,0)
R=R.fillna({c:0 for c in R.columns if c.startswith(('porte','fj_porte','setor','fj_setor'))})
assert (R[['porte_mei','porte_me','porte_epp','porte_demais']].sum(axis=1)==R.ativas).all()
# ponte com o CEMPRE (unidades locais criativas 2024, 51 classes FIRJAN, sem MEI)
t=terr.set_index(terr.cod.astype(int))
R['cempre_ul_2024']=t.cri_ul.reindex(R.index); R['pop']=t.pop_2025.reindex(R.index).fillna(t.pop_censo.reindex(R.index))
R['pan_fj_ativas']=S[S.pan&S.fj].groupby('cod').n.sum().reindex(R.index).fillna(0)
R['fj_sem_mei']=R.fj_ativas-R.fj_porte_mei
R['razao_cempre_cnpj']=pct(R.cempre_ul_2024,R.fj_sem_mei)
R['ativas_10mil']=pct(R.ativas,R['pop'])*100; R['fj_ativas_10mil']=pct(R.fj_ativas,R['pop'])*100
R['mei_pct']=pct(R.porte_mei,R.ativas)
# QL de empresas criativas (participação no território ÷ participação no Estado)
R['ql_empresas']=R.part_criativas_pct/R.part_criativas_pct.loc[35]
R=R.reset_index()
# ---------- grupos
g25=fg[fg.ano==2025]; gn=P[P.t=='A'].groupby(['cod','g']).n.sum().rename('ativas').reset_index()
Gd=gn.merge(g25[['cod','g','criadas','fechadas']],on=['cod','g'],how='outer').fillna(0)
Gd['grupo']=Gd.g.map(lambda i: GN[int(i)-1]); Gd=Gd.merge(R[['cod','ativas']].rename(columns={'ativas':'tot'}),on='cod'); Gd['part_pct']=pct(Gd.ativas,Gd.tot).round(2)
st=Gd[Gd.cod==35].set_index('g').part_pct; Gd['part_sp_pct']=Gd.g.map(st); Gd=Gd.drop(columns='tot')
for c in ['g','ativas','criadas','fechadas']: Gd[c]=Gd[c].astype(int)
# ---------- mortalidade por porte (Estado)
E=L[L.q=='E'].copy(); E['k']=E.k.astype(int); E=E[E.k>=10]; E['emei']=E.m.astype(int)
E['porte']=np.where(E.emei==1,'MEI (optou pelo MEI em algum momento)',E.po.map({'ME':'Microempresa','EPP':'Pequeno porte','DEMAIS':'Demais','MEI':'MEI (optou pelo MEI em algum momento)','NA':'Demais'}))
mp_=[]
for lab,co in [('2 anos (abertas em 2023)',2023),('5 anos (abertas em 2020)',2020)]:
    x=mort(E,['porte'],co).reset_index(); x['janela']=lab; x['mort_pct']=(x.f/x.n*100).round(1); x['mort_baixa_pct']=(x.b/x.n*100).round(1); mp_.append(x)
    tt=mort(E.assign(porte='Todas'),['porte'],co).reset_index(); tt['janela']=lab; tt['mort_pct']=(tt.f/tt.n*100).round(1); tt['mort_baixa_pct']=(tt.b/tt.n*100).round(1); mp_.append(tt)
MP=pd.concat(mp_).rename(columns={'n':'abertas','f':'encerradas','b':'baixadas'})
for c in ['abertas','encerradas','baixadas']: MP[c]=MP[c].astype(int)
# ---------- saída
rd=lambda d: d.round(2)
O='/home/claude/dash/'
def dump(df,name):
    df=df.astype(object).where(pd.notna(df),None)
    json.dump(json.loads(pd.DataFrame(df).to_json(orient='records')),open(O+name+'.json','w'),ensure_ascii=False,separators=(',',':'))
    print(name,len(df),round(len(open(O+name+'.json').read())/1e6,2),'MB')
intc=[c for c in R.columns if R[c].dtype!=object and not any(s in c for s in ('pct','tx_','mort','razao','10mil','ql_'))]
R[intc]=R[intc].fillna(0).astype(int)
dump(rd(R),'empresas_resumo'); dump(Gd,'empresas_grupo'); dump(A,'empresas_ano'); dump(MP,'empresas_mortalidade_porte')
s=R[R.cod==35].iloc[0]
print(s[['ativas','estoque_2025','criadas_2025','fechadas_2025','outras_saidas_2025','fj_ativas','fj_sem_mei','cempre_ul_2024','razao_cempre_cnpj','tot_ativas','part_criativas_pct','mort_2a','mort_5a','mort_5a_baixa','tot_mort_2a','tot_mort_5a','fj_mort_5a','tx_natalidade_2025','tx_fechamento_2025','porte_mei','porte_me','porte_epp','porte_demais','setor_serv','setor_ind','setor_com','mei_pct']].to_string())
print(MP.to_string()); print(Gd[Gd.cod==35][['grupo','ativas','part_pct','criadas','fechadas']].to_string())
print(A[A.cod==35][['ano','estoque','var_pct','criadas','fechadas','outras_saidas','fj_estoque','tot_estoque']].to_string())
# ---------- perímetros e reconciliação com o Panorama (Seade/SCEIC)
s2=pd.read_csv('/home/claude/cnpj/q2_estoque.csv',dtype={'m':str,'c':str}).groupby('c').n.sum()
def setor14(c):
    for p,k in [('6010','60001'),('6021','60002'),('6022','60002'),('591','59000'),('5920','59000'),('7311','73010'),('7312','73010'),('7319','73010'),('900','90000'),('910','91000'),('58','58000'),('7410','74000'),('7420','74000'),('7490','74000'),('62','62000'),('6311','63000'),('6319','63000'),('6391','63000'),('6399','63000'),('3211','32001'),('3212','32001'),('135','13002'),('234','23091'),('310','31000')]:
        if c.startswith(p): return k
    return None
pan=s2[s2.index.isin(PAN)]; tot=pan.sum()
inFJ=pan[pan.index.isin(FJ)].sum(); in14=pan[[setor14(c) is not None for c in pan.index]].sum()
nuc=pan[[(c in FJ) and (setor14(c) is not None) for c in pan.index]].sum()
print('Pan',tot,'em FIRJAN',round(inFJ/tot*100,1),'em 14 setores',round(in14/tot*100,1),'núcleo convergente',round(nuc/tot*100,1))
cn=pd.read_csv('/home/claude/rais/cbo2002.csv',nrows=0)
fora=pan[[c not in FJ and setor14(c) is None for c in pan.index]].sort_values(ascending=False)
print(fora.head(12).to_string())
REF=[('Empresas ativas, retrato atual',1174576,int(R[R.cod==35].ativas.iloc[0]),'Panorama: “2026”; painel: matrizes ativas em 11/01/2026'),
('Total de empresas em 31/12/2025',1141991,1184611,'Estoque reconstituído pelas datas de abertura e de saída'),
('Empresas criadas em 2025',225929,237057,'Data de início de atividade em 2025'),
('Empresas fechadas em 2025',127092,129706,'Painel: baixas formais; inaptas e suspensas contadas à parte'),
('Total de empresas em 31/12/2014',559994,591063,''),('Empresas criadas em 2014',74928,78101,''),('Empresas fechadas em 2014',22499,23100,''),
('Microempresa + MEI (retrato atual)',462818+596153,533180+525764,'A soma coincide; a divisão entre os dois muda com a data da opção pelo MEI'),
('Empresa de pequeno porte (retrato atual)',74220,73268,''),('Demais portes (retrato atual)',46531,54804,''),
('Araraquara: total em 31/12/2025',5217,5397,'Município usado como conferência'),('Araraquara: criadas em 2025',1032,1079,'')]
REF=pd.DataFrame(REF,columns=['indicador','panorama','painel','nota']); REF['dif_pct']=((REF.painel/REF.panorama-1)*100).round(1)
dump(REF,'empresas_ref_panorama')
PER=pd.DataFrame([('Perímetro do Panorama (87 classes CNAE)',int(tot),100.0),('…das quais também no recorte FIRJAN do painel (46 classes)',int(inFJ),round(inFJ/tot*100,1)),('…das quais nos 14 setores de alta intensidade criativa',int(in14),round(in14/tot*100,1)),('Núcleo convergente (nos três critérios)',int(nuc),round(nuc/tot*100,1))],columns=['recorte','empresas','pct'])
dump(PER,'empresas_perimetros'); print(PER.to_string()); print(REF.to_string())

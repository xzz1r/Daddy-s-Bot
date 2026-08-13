// ¿Cuanto queda para tener el corpus entero a estandar?
//
// EXISTE PARA NO DISCUTIR UN NUMERO INVENTADO. El porcentaje de avance se venia
// estimando a ojo y cambiaba segun quien lo dijera, lo que convertia cada parte
// en una negociacion. Esto lo mide.
//
// No cuenta pools: cuenta LECTURAS. Un tramo que sale el 87 % de las veces pesa
// mucho mas que uno del 4 %, asi que el numero responde a la pregunta util —
// cuando el bot habla, que probabilidad hay de que lo que suelta este a la
// altura— y no a cuantos ficheros se han tocado.
//
// Dos criterios, los dos objetivos:
//
//   TAMANYO  frases suficientes para su trafico, con los topes acordados:
//            el tramo que mas sale 200, el intermedio 100, el raro 50.
//   FILO     al menos la mitad de las frases con vocabulario del arsenal, y
//            SOLO en los pools cuyo trabajo es hacer danyo. En los de halago
//            no se exige: ahi la crudeza no pinta nada.
//
// LO QUE ESTO NO MIDE: si la frase esta bien escrita. Un pool puede cumplir
// tamanyo y filo y seguir siendo mediocre. El numero es un suelo, no un
// certificado — dice donde falta trabajo seguro, no donde ya no hace falta.
const fs=require('fs'),path=require('path');
// El arsenal vive en un solo sitio: si se anyade una palabra alli, esto la ve.
const { tieneArsenal } = require('../src/utils/helpers');
const R=path.resolve(__dirname,'..');
const ES=/^\s*(['"`])(.{20,})\1,\s*$/;
const TRAF={false:{high:.87,mid:.09,low:.04},true:{high:.17,mid:.31,low:.52}};
const UNIF={high:31/101,mid:39/101,low:31/101};

// ── percent.js ───────────────────────────────────────────────────────────────
const L=fs.readFileSync(path.join(R,'src/commands/percent.js'),'utf8').split('\n');
const labels={};let lab=null,t=null;
for(const l of L){
  let m=l.match(/^  ([a-z]+): \{$/); if(m){lab=m[1];labels[lab]={p:{}};t=null;continue;}
  if(!lab)continue;
  m=l.match(/^    goodIsHigh: (true|false),$/); if(m){labels[lab].gh=m[1]==='true';continue;}
  if(/^    roll: rollUniform,$/.test(l)){labels[lab].u=true;continue;}
  m=l.match(/^    (high|mid|low|extreme): \[$/); if(m){t=m[1];labels[lab].p[t]=[];continue;}
  m=l.match(/^    (high|mid|low|extreme): ([A-Z_]+),$/); if(m){labels[lab].p[m[1]]='ext';t=null;continue;}
  if(/^    \],$/.test(l)){t=null;continue;}
  const f=l.match(ES); if(t&&f&&Array.isArray(labels[lab].p[t]))labels[lab].p[t].push(f[2]);
}
const fid={};let a=null;
for(const l of fs.readFileSync(path.join(R,'src/data/fidelityPhrases.js'),'utf8').split('\n')){
  const m=l.match(/^const ([A-Z_]+) = \[$/); if(m){a=m[1];fid[a]=[];continue;}
  if(/^\];$/.test(l)){a=null;continue;}
  const f=l.match(ES); if(a&&f)fid[a].push(f[2]);
}
const filas=[];
for(const [n,c] of Object.entries(labels)){
  if(c.gh===undefined)continue;
  const traf=c.u?UNIF:TRAF[String(c.gh)];
  for(const tr of ['high','mid','low']){
    let P=c.p[tr];
    if(P==='ext')P=fid[(n+'_'+tr).toUpperCase()]||[];
    if(!P||!P.length)continue;
    // el tramo brutal: high en negativos, low en positivos
    const brutal = c.gh ? tr==='low' : tr==='high';
    filas.push({cmd:'!'+n,tr,P,traf:traf[tr],brutal});
  }
}
// ── resto del bot ────────────────────────────────────────────────────────────
// Sin curvas de trafico: se les da un peso equivalente a un tramo medio.
const OTROS=['src/commands/robo.js','src/commands/aura.js','src/commands/roast.js',
 'src/commands/relevance.js','src/commands/ship.js','src/commands/iq.js','src/commands/count.js',
 'src/commands/activity.js','src/commands/wingman.js','src/commands/mog.js','src/commands/duel.js',
 'src/commands/social.js','src/commands/topsRandom.js','src/data/apuestaPhrases.js',
 'src/data/rachaPhrases.js','src/data/roboExtraPhrases.js','src/utils/casino.js','src/utils/auraCobro.js'];
for(const rel of OTROS){
  const src=fs.readFileSync(path.join(R,rel),'utf8').split('\n');
  let nom=null,cur=[];
  const cerrar=()=>{ if(nom&&cur.length)filas.push({cmd:path.basename(rel).replace('.js',''),tr:nom,P:cur,traf:0.31,brutal:true}); nom=null;cur=[]; };
  for(const l of src){
    let m=l.match(/^const ([A-Z_][A-Z0-9_]*) = \[$/)||l.match(/^\s{2}([A-Za-z_][A-Za-z0-9_]*): \[$/);
    if(m){cerrar();nom=m[1];continue;}
    if(/^\s*\][,;]?\s*$/.test(l)){cerrar();continue;}
    const f=l.match(ES); if(nom&&f)cur.push(f[2]);
  }
  cerrar();
}
// ── evaluacion ───────────────────────────────────────────────────────────────
let pesoOk=0,pesoTot=0,cumplen=0;const fallan=[];
for(const f of filas){
  const n=f.P.length;
  // Los topes que fijo el dueño, por trafico y no por nombre de tramo:
  //   el que mas sale 200 · el intermedio 100 · el raro 50
  const objetivo = f.traf>=0.50 ? 200 : f.traf>=0.25 ? 100 : 50;
  const con=f.P.filter(tieneArsenal).length;
  const ars=con/n;
  const okTam=n>=objetivo;
  const okFilo=!f.brutal||ars>=0.50;
  const ok=okTam&&okFilo;
  pesoTot+=f.traf; if(ok){pesoOk+=f.traf;cumplen++;}
  if(!ok)fallan.push({...f,n,ars,okTam,okFilo});
}
console.log('PROGRESO REAL, ponderado por cuanto se lee cada pool\n');
console.log('  '+(pesoOk/pesoTot*100).toFixed(0)+' % de lo que el grupo lee ya cumple tamanyo y filo.');
console.log('  '+cumplen+' de '+filas.length+' pools cumplen (sin ponderar).');
console.log('');
console.log('LO QUE FALTA, por impacto:');
console.log('  pool                          se lee  frases  arsenal  falla');
for(const f of fallan.sort((x,y)=>y.traf-x.traf).slice(0,16)){
  console.log('  '+(f.cmd+' '+f.tr).padEnd(30)+String(Math.round(f.traf*100)+'%').padStart(5)+
    String(f.n).padStart(8)+String(Math.round(f.ars*100)+'%').padStart(9)+'   '+
    [!f.okTam?'tamaño':null,!f.okFilo?'filo':null].filter(Boolean).join(' + '));
}
console.log('\n  ('+fallan.length+' pools por debajo del estandar en total)');

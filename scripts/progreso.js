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
//            el tramo que mas sale 100, el intermedio 50, el raro 25.
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
const ES=/^\s*(['"`])(.{20,})\1,?\s*$/;
// EL REPARTO SE LEE DEL MOTOR, NO SE COPIA.
//
// Aqui habia una copia a mano de las dos curvas, y la de los positivos se quedo
// en 17/31/52 cuando el bot ya tiraba 6/18/76. Consecuencia: este guion —que es
// el que dice DONDE hace falta escribir— pedia 50 frases para un tramo que se
// lee el 18 % de las veces y daba por bueno el que se lee el 76 %. Un numero
// inventado con pinta de medido es peor que no medir.
process.env.OWNER_NUMBER = process.env.OWNER_NUMBER || '33600000000';
const { DISTRIBUCION, TRAMO_ALTO, TRAMO_BAJO } = require('../src/commands/percent');
const TRAF = { false: DISTRIBUCION.negativo.miembro, true: DISTRIBUCION.positivo.miembro };
// !fiel e !infiel tiran uniforme 0-100, asi que su trafico es el ancho de cada
// tramo. Se calcula de las mismas fronteras para que no se quede viejo si se
// mueven.
const UNIF = {
  high: (101 - TRAMO_ALTO) / 101,
  mid: (TRAMO_ALTO - TRAMO_BAJO - 1) / 101,
  low: (TRAMO_BAJO + 1) / 101,
};

// ── percent.js ───────────────────────────────────────────────────────────────
const L=fs.readFileSync(path.join(R,'src/data/percentLabels.js'),'utf8').split('\n');
const labels={};let lab=null,t=null;
for(const l of L){
  let m=l.match(/^  ([a-z]+): \{$/); if(m){lab=m[1];labels[lab]={p:{}};t=null;continue;}
  if(!lab)continue;
  m=l.match(/^    goodIsHigh: (true|false),$/); if(m){labels[lab].gh=m[1]==='true';continue;}
  if(/^    roll: rollUniform,$/.test(l)||/^    uniforme: true,$/.test(l)){labels[lab].u=true;continue;}
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
// UN COMANDO CON TIRADA PROPIA NO SIGUE NINGUNA DE LAS DOS CURVAS.
//
// *!feminidad* lleva su `roll` dentro de percentLabels.js —el chiste del alpha,
// que al dueño le salga baja— y esa funcion pisa entera la curva del motor: al
// resto del grupo le sale high el 45 % y mid el 45 %, no el 6/18/76 de los
// positivos. Este guion lo estaba pesando con la curva general, asi que creia
// que su tramo alto se lee el 6 % cuando se lee el 45 %: mandaba el trabajo de
// contenido al tramo equivocado.
//
// No se apunta a mano la curva de cada excepcion —seria la cuarta copia del
// mismo dato—: se MIDE tirando la funcion de verdad. Cualquier tirada propia
// que se añada manyana queda medida sola.
const MUESTRAS = 60000;
function curvaMedida(roll){
  let h=0,m=0,l=0;
  for(let i=0;i<MUESTRAS;i++){
    const v=roll(false,false);            // el grupo, no el dueño
    if(v>=TRAMO_ALTO)h++; else if(v<=TRAMO_BAJO)l++; else m++;
  }
  return {high:h/MUESTRAS, mid:m/MUESTRAS, low:l/MUESTRAS};
}
// Las tiradas propias viven en el fichero de datos, no en el texto que se parsea
// arriba: se piden al modulo ya cargado.
const LABELS_VIVOS = require('../src/data/percentLabels');

const filas=[];
for(const [n,c] of Object.entries(labels)){
  if(c.gh===undefined)continue;
  const propio = LABELS_VIVOS[n] && typeof LABELS_VIVOS[n].roll === 'function' && !c.u
    ? curvaMedida(LABELS_VIVOS[n].roll) : null;
  const traf=propio||(c.u?UNIF:TRAF[String(c.gh)]);
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
 'src/data/rachaPhrases.js','src/data/roboExtraPhrases.js','src/data/roboPhrases.js',
 'src/data/roastPhrases.js','src/data/wingmanPhrases.js','src/data/cooldownPhrases.js','src/utils/casino.js','src/utils/auraCobro.js'];
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
  // Los topes que fijo el dueño, A LA MITAD del estandar anterior, y por
  // TRAFICO — no por nombre de tramo. En los positivos el tramo que se lee es
  // `low` con el 76 %; ir por el nombre le daria las frases al `high`, que solo
  // sale el 6 %.
  //   el que mas sale 100 · el intermedio 50 · el raro 25
  const objetivo = f.traf>=0.50 ? 100 : f.traf>=0.25 ? 50 : 25;
  const con=f.P.filter(tieneArsenal).length;
  const ars=con/n;
  // El objetivo es una DIANA, no un acantilado. Sin margen, un pool de 199
  // frases con el arsenal al 100 % contaba como incumplido por una sola frase, y
  // eso movio el titular del 46 % al 32 % sin que el contenido empeorara en
  // nada. Un 5 % de tolerancia distingue "le falta una" de "le faltan treinta".
  const okTam=n>=objetivo*0.95;
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

// ─── DOS COSAS QUE EL TAMANYO NO VE ──────────────────────────────────────────
//
// Un pool puede cumplir tamanyo y filo y seguir sonando a fabrica. Estas dos
// miden eso, y van aqui y no en `npm run check` a proposito: son deuda de
// CONTENIDO, se arreglan reescribiendo, y no pueden bloquear un despliegue.

// 1. CASI-CLONES. La misma frase con dos palabras cambiadas. El validador de
// duplicados exactos no los ve —son textos distintos— y con la eleccion plana
// el grupo oye el eco antes de agotar la ventana de 50.
//
// COMPARAR TODAS CONTRA TODAS SON 47 MILLONES DE PAREJAS: 27 segundos, y esto
// se ejecuta a diario. Se indexa por palabra y solo se comparan las frases que
// comparten al menos tres palabras largas, que es condicion necesaria para
// parecerse al 72 %. Mismo resultado, dos ordenes de magnitud menos de trabajo.
{
  const norm=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/\[nombre\]|%[A-Z]+|\{[a-z]+\}/g,' ').replace(/[^a-z0-9ñ ]/g,' ')
    .split(/\s+/).filter(w=>w.length>3);
  const jac=(A,B)=>{let i=0;for(const x of A)if(B.has(x))i++;
    return i/(A.size+B.size-i);};
  const UMBRAL=0.72;
  // Todas las frases del corpus, con su pool y su bolsa de palabras.
  const todas=[];
  filas.forEach((f,k)=>f.P.forEach((txt,idx)=>todas.push({k,idx,txt,S:new Set(norm(txt))})));
  const indice=new Map();
  todas.forEach((f,n)=>{ for(const w of f.S){ if(!indice.has(w))indice.set(w,[]); indice.get(w).push(n); } });
  let dentro=0,entre=0; const ej=[];
  const vistos=new Set();
  for(let n=0;n<todas.length;n++){
    const a=todas[n];
    const cuenta=new Map();
    for(const w of a.S) for(const m of indice.get(w)) if(m>n) cuenta.set(m,(cuenta.get(m)||0)+1);
    for(const [m,comunes] of cuenta){
      if(comunes<3)continue;
      const b=todas[m];
      if(jac(a.S,b.S)<UMBRAL)continue;
      const par=`${n}|${m}`; if(vistos.has(par))continue; vistos.add(par);
      if(a.k===b.k){ dentro++;
        if(ej.length<3)ej.push(`${filas[a.k].cmd} ${filas[a.k].tr}: «${a.txt.slice(0,52)}…» / «${b.txt.slice(0,52)}…»`);
      } else entre++;
    }
  }
  console.log('\nCASI-CLONES (misma frase con dos palabras cambiadas):');
  console.log('  '+dentro+' dentro de un mismo tramo · '+entre+' repetidas entre tramos distintos');
  for(const e of ej) console.log('   · '+e);
}

// 2. POLARIDAD. En un comando peyorativo, el tramo BAJO es el cumplido; en uno
// favorable, el alto. Si el tramo que hace de cumplido pega MAS que el que hace
// de paliza, quien saca un 4 % lee un insulto donde le tocaba un halago.
//
// Se compara cada comando CONSIGO MISMO y con margen. Un bot que alaba en crudo
// —"leal de cojones"— no es un fallo; lo que no puede ser es que el cumplido sea
// varias veces mas bruto que la paliza del mismo comando.
{
  const dens=P=>P.filter(tieneArsenal).length/P.length;
  const porCmd=new Map();
  for(const f of filas){
    if(!f.cmd.startsWith('!'))continue;
    if(!porCmd.has(f.cmd))porCmd.set(f.cmd,{});
    porCmd.get(f.cmd)[f.brutal?'paliza':'otro_'+f.tr]=f.P;
  }
  const invertidos=[];
  for(const [cmd,tramos] of porCmd){
    const pal=tramos.paliza; if(!pal)continue;
    const cum=tramos.otro_low||tramos.otro_high; if(!cum)continue;
    const a=dens(cum),b=dens(pal);
    if(a>b*1.5&&a-b>0.20) invertidos.push({cmd,a,b});
  }
  console.log('\nPOLARIDAD INVERTIDA (el cumplido pega mas que la paliza):');
  if(!invertidos.length) console.log('  ninguno');
  for(const i of invertidos.sort((x,y)=>(y.a-y.b)-(x.a-x.b)))
    console.log('  '+i.cmd.padEnd(16)+'cumplido '+Math.round(i.a*100)+' % de arsenal · paliza '+Math.round(i.b*100)+' %');
}

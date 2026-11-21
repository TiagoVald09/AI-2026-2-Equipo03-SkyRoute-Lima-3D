/* Pruebas automáticas ejecutables con: node tests.js (Node 18+). */
const assert=require('node:assert/strict');
const A=require('./algorithms.js'),B=require('./benchmark.js'),ML=require('./ml.js');

// Ejecutor de pruebas: si una falla, se registra y se continúa con las demás.
let passed=0,failed=0;const failures=[];
function test(name,fn){
 try{fn();passed++;console.log('OK',name)}
 catch(err){failed++;failures.push(name);console.log(`FAIL ${name}: ${err&&err.message?err.message.split('\n')[0]:err}`)}
}

// Constantes del mapa usadas por benchmark.js (12x12x3, inicio en (0,0,2)).
const SIZE={x:12,y:12,z:3},START={x:0,y:0,z:2};
const SEEDS=[1,7,99,2026,123456];

function bfs(start,goal,size,blocked){const q=[[start,0]],seen=new Set([A.key(start)]);for(let i=0;i<q.length;i++){
 const [p,d]=q[i];if(A.key(p)===A.key(goal))return d;
 for(const next of A.neighbors(p,size,blocked)){if(!seen.has(A.key(next))){seen.add(A.key(next));q.push([next,d+1])}}
}return null}

// Verifica una ruta de A* de forma independiente (sin usar A.neighbors):
// cada celda dentro del mapa, no bloqueada y a distancia 1 de la anterior; termina en la meta.
function assertValidPath(start,goal,size,blocked,path){
 assert.ok(Array.isArray(path),'la ruta debe ser un arreglo');
 let prev=start;
 for(const [i,p] of path.entries()){
  for(const c of ['x','y','z'])assert.ok(Number.isInteger(p[c]),`coordenada ${c} no entera en paso ${i}`);
  assert.ok(p.x>=0&&p.x<size.x&&p.y>=0&&p.y<size.y&&p.z>=0&&p.z<size.z,`paso ${i} fuera del mapa: ${A.key(p)}`);
  assert.ok(!blocked.has(A.key(p)),`paso ${i} atraviesa celda bloqueada ${A.key(p)}`);
  const d=Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y)+Math.abs(p.z-prev.z);
  assert.equal(d,1,`paso ${i} no es vecino de ${A.key(prev)} -> ${A.key(p)}`);
  prev=p;
 }
 assert.equal(A.key(prev),A.key(goal),'la ruta no termina en la meta');
}

// Comprueba recursivamente que no haya NaN ni Infinity en un objeto de resultados.
function assertAllFinite(obj,label){
 for(const [k,v] of Object.entries(obj)){
  if(typeof v==='number')assert.ok(Number.isFinite(v),`${label}.${k} no es finito (${v})`);
  else if(v&&typeof v==='object')assertAllFinite(v,`${label}.${k}`);
 }
}

/* ===================== Pruebas originales ===================== */
test('A* ruta mínima en 70 mapas',()=>{
 for(let i=1;i<=70;i++){const sc=B.sampleScenario(i,{obstacles:3+(i%25),targets:2});for(const g of sc.goals){const actual=A.astar({x:0,y:0,z:2},g,{x:12,y:12,z:3},sc.blocked).path;
  assert.equal(actual.length,bfs({x:0,y:0,z:2},g,{x:12,y:12,z:3},sc.blocked))}}
});
test('misma semilla genera idéntico escenario',()=>{
 const a=B.sampleScenario(42),b=B.sampleScenario(42);assert.deepEqual([...a.blocked].sort(),[...b.blocked].sort());assert.deepEqual(a.goals,b.goals)
});
test('comparación reproducible con escenarios emparejados',()=>{
 const a=B.runComparison({seed:42,runs:30}),b=B.runComparison({seed:42,runs:30});assert.deepEqual(a,b);assert.equal(a.records.length,90);
 for(let i=0;i<30;i++)assert.deepEqual(a.records.slice(i*3,i*3+3).map(r=>r.seed),Array(3).fill(42+i));
 assert.equal(a.summary.find(s=>s.strategy==='astar').successes,30)
});
test('las tres estrategias terminan sin exceder 150 movimientos',()=>{
 const r=B.runComparison({seed:50,runs:40,obstacles:29,climate:'rain',wind:2,targets:3});for(const row of r.records){assert.ok(row.steps<=150);assert.ok(row.captured<=row.total);assert.ok(row.energy>=0)}
});
test('K-means produce tres centroides y reduce distancia en el experimento default',()=>{
 const k=B.clusterExperiment({seed:42,runs:30});assert.ok(k.meanKmeans<k.meanFixed);assert.equal(k.records.length,30);
 const centers=A.kmeans([{x:0,y:0},{x:1,y:0},{x:10,y:10},{x:11,y:10}],2);assert.equal(centers.length,2)
});
test('ML: entrenamiento separado de prueba y error de test finito',()=>{
 const t=ML.train({samples:400,seed:2026});assert.equal(t.trainSize,320);assert.equal(t.testSize,80);assert.ok(t.maeTimeTest<2);assert.ok(t.maeEnergyTest<2);
 const p=ML.predict(t.model,15,1,{time:1.4,energy:1.3});assert.ok(p.time>0&&p.energy>0)
});
test('ML: repetir con la misma semilla produce mismos coeficientes',()=>{
 assert.deepEqual(ML.train({samples:400,seed:2026}),ML.train({samples:400,seed:2026}))
});

/* ===================== A*: casos extremos ===================== */
test('A* extremo: inicio igual a la meta devuelve ruta vacía',()=>{
 for(const p of [START,{x:5,y:5,z:0},{x:11,y:11,z:1}]){
  const r=A.astar(p,p,SIZE,new Set());
  assert.deepEqual(r.path,[]);assert.equal(r.expanded,1);
 }
});
test('A* extremo: meta rodeada por bloques responde null sin colgarse',()=>{
 const goal={x:6,y:6,z:1};
 const blocked=new Set(A.neighbors(goal,SIZE,new Set()).map(A.key)); // tapa los 6 vecinos
 const r=A.astar(START,goal,SIZE,blocked);
 assert.equal(r.path,null);
 // Debe explorar como máximo todas las celdas libres del mapa (12*12*3=432).
 assert.ok(r.expanded>0&&r.expanded<=SIZE.x*SIZE.y*SIZE.z-blocked.size,`expandió ${r.expanded}`);
});
test('A* extremo: meta bloqueada o fuera del mapa responde null',()=>{
 assert.equal(A.astar(START,{x:5,y:5,z:2},SIZE,new Set(['5,5,2'])).path,null);
 assert.equal(A.astar(START,{x:20,y:5,z:2},SIZE,new Set()).path,null);
 assert.equal(A.astar(START,{x:5,y:5,z:-1},SIZE,new Set()).path,null);
});
test('A* extremo: sin obstáculos la ruta mide exactamente la distancia Manhattan',()=>{
 const blocked=new Set();
 for(let x=0;x<12;x++)for(let y=0;y<12;y++)for(let z=0;z<3;z++){
  const g={x,y,z},r=A.astar(START,g,SIZE,blocked);
  assert.equal(r.path.length,A.distance(START,g),`meta ${A.key(g)}`);
  assertValidPath(START,g,SIZE,blocked,r.path);
 }
});
test('A* extremo: densidad máxima, solo queda un corredor libre',()=>{
 // Se bloquea TODO el mapa excepto un pasillo en z=2: (0..11,0) y luego (11,1..11).
 const free=new Set();
 for(let x=0;x<12;x++)free.add(`${x},0,2`);
 for(let y=1;y<12;y++)free.add(`11,${y},2`);
 const blocked=new Set();
 for(let x=0;x<12;x++)for(let y=0;y<12;y++)for(let z=0;z<3;z++){const k=`${x},${y},${z}`;if(!free.has(k))blocked.add(k)}
 const goal={x:11,y:11,z:2},r=A.astar(START,goal,SIZE,blocked);
 assert.equal(r.path.length,22);
 assertValidPath(START,goal,SIZE,blocked,r.path);
 // Con el corredor cortado en un punto, la meta pasa a ser inalcanzable.
 blocked.add('11,5,2');
 assert.equal(A.astar(START,goal,SIZE,blocked).path,null);
});
test('A* extremo: densidad máxima de sampleScenario (30 columnas, también si se piden 1000)',()=>{
 for(const s of SEEDS)for(const obstacles of [30,1000]){
  const sc=B.sampleScenario(s,{obstacles,targets:6});
  assert.ok(sc.obstacles<=30,`obstáculos=${sc.obstacles}`);
  for(const g of sc.goals){const r=A.astar(START,g,SIZE,sc.blocked);
   assert.ok(r.path,`meta ${A.key(g)} debería ser alcanzable (semilla ${s})`);
   assert.equal(r.path.length,bfs(START,g,SIZE,sc.blocked));
   assertValidPath(START,g,SIZE,sc.blocked,r.path)}
 }
});

/* ===================== A*: validez de cada ruta ===================== */
test('A* rutas válidas: sin celdas bloqueadas, dentro del mapa y paso a paso entre vecinos (100 mapas)',()=>{
 let rutas=0;
 for(let i=1;i<=100;i++){const sc=B.sampleScenario(i*37,{obstacles:i%31,targets:6});
  for(const g of sc.goals){const r=A.astar(START,g,SIZE,sc.blocked);assertValidPath(START,g,SIZE,sc.blocked,r.path);rutas++}}
 assert.ok(rutas>100,`solo se verificaron ${rutas} rutas`);
});

/* ===================== Semillas ===================== */
test('Semillas 1, 7, 99, 2026, 123456: mismo escenario al repetir la semilla',()=>{
 for(const s of SEEDS){const opts={obstacles:20,targets:4};
  const a=B.sampleScenario(s,opts),b=B.sampleScenario(s,opts);
  assert.deepEqual([...a.blocked].sort(),[...b.blocked].sort(),`semilla ${s}`);
  assert.deepEqual(a.goals,b.goals,`semilla ${s}`);
  assert.deepEqual(B.runComparison({seed:s,runs:5,obstacles:20}),B.runComparison({seed:s,runs:5,obstacles:20}),`runComparison semilla ${s}`);
 }
});
test('Semillas 1, 7, 99, 2026, 123456: semillas distintas dan escenarios distintos',()=>{
 const firmas=SEEDS.map(s=>{const sc=B.sampleScenario(s,{obstacles:20,targets:4});return JSON.stringify([[...sc.blocked].sort(),sc.goals])});
 assert.equal(new Set(firmas).size,SEEDS.length,'hay semillas distintas que generan el mismo escenario');
});
test('[BUG] Semilla 0 y semilla 1 deberían generar escenarios distintos',()=>{
 // rng() usa (seed>>>0)||1, por eso la semilla 0 se convierte en 1.
 const a=B.sampleScenario(0,{obstacles:20,targets:4}),b=B.sampleScenario(1,{obstacles:20,targets:4});
 assert.notDeepEqual(JSON.stringify([[...a.blocked].sort(),a.goals]),JSON.stringify([[...b.blocked].sort(),b.goals]),'semilla 0 y semilla 1 producen el mismo escenario');
});

/* ===================== runComparison: situaciones difíciles ===================== */
const HARD=[
 {name:'lluvia + viento 2 + 30 obstáculos + 6 objetivos',cfg:{climate:'rain',wind:2,obstacles:30,targets:6}},
 {name:'niebla + viento 5 + 25 obstáculos + 5 objetivos',cfg:{climate:'fog',wind:5,obstacles:25,targets:5}},
 {name:'lluvia + viento 10 (extremo) + 30 obstáculos + 6 objetivos',cfg:{climate:'rain',wind:10,obstacles:30,targets:6}},
 {name:'nublado + 1000 obstáculos pedidos + 6 objetivos',cfg:{climate:'cloudy',wind:1,obstacles:1000,targets:6}},
];
for(const {name,cfg} of HARD)test(`runComparison difícil: ${name}`,()=>{
 for(const seed of SEEDS){
  const r=B.runComparison({seed,runs:10,...cfg});
  const climate=B.CLIMATES[cfg.climate],cost=(1+cfg.wind*.3)*climate.energy;
  assert.equal(r.records.length,30);
  for(const row of r.records){
   assertAllFinite(row,`record(seed ${row.seed},${row.strategy})`);
   assert.ok(row.steps>=0&&row.steps<=150,`steps=${row.steps}`);
   assert.ok(row.captured>=0&&row.captured<=row.total,`captured=${row.captured} total=${row.total}`);
   assert.ok(row.total<=6);
   assert.ok(row.energy>=0,`energy=${row.energy}`);
   assert.ok(row.time>=0,`time=${row.time}`);
   assert.equal(row.success,row.captured===row.total,'success incoherente con captured/total');
   // La energía consumida debe ser pasos × costo por paso.
   assert.ok(Math.abs(row.energy-row.steps*cost)<1e-6,`energía ${row.energy} != ${row.steps}*${cost}`);
  }
  for(const s of r.summary){assertAllFinite(s,`summary.${s.strategy}`);assert.ok(s.successRate>=0&&s.successRate<=100)}
 }
});
test('[BUG] runComparison con runs no numérico no debe devolver NaN',()=>{
 const r=B.runComparison({seed:1,runs:'abc'});
 for(const s of r.summary)assertAllFinite(s,`summary.${s.strategy}`);
});

/* ===================== K-means ===================== */
const POINTS=[{x:0,y:0},{x:1,y:2},{x:3,y:1},{x:8,y:9},{x:10,y:11},{x:11,y:7}];
function assertFiniteCenters(centers){for(const c of centers){assert.ok(Number.isFinite(c.x)&&Number.isFinite(c.y),`centroide no finito ${JSON.stringify(c)}`)}}
test('K-means k=1: un único centroide en el promedio de los puntos',()=>{
 const c=A.kmeans(POINTS,1);
 assert.equal(c.length,1);assertFiniteCenters(c);
 const mx=POINTS.reduce((s,p)=>s+p.x,0)/POINTS.length,my=POINTS.reduce((s,p)=>s+p.y,0)/POINTS.length;
 assert.ok(Math.abs(c[0].x-mx)<1e-9&&Math.abs(c[0].y-my)<1e-9);
 assert.equal(c[0].count,POINTS.length);
});
test('K-means k = número de puntos: cada punto es su propio centroide',()=>{
 const c=A.kmeans(POINTS,POINTS.length);
 assert.equal(c.length,POINTS.length);assertFiniteCenters(c);
 const esperado=POINTS.map(p=>`${p.x},${p.y}`).sort(),obtenido=c.map(p=>`${p.x},${p.y}`).sort();
 assert.deepEqual(obtenido,esperado);
 for(const ce of c)assert.equal(ce.count,1);
});
test('K-means k mayor que el número de puntos se limita, y lista vacía da []',()=>{
 assert.equal(A.kmeans(POINTS,50).length,POINTS.length);
 assert.deepEqual(A.kmeans([],3),[]);
});
test('K-means con puntos repetidos: centroides finitos y ningún punto se pierde',()=>{
 const todosIguales=Array(10).fill({x:4,y:4});
 for(const k of [1,2,3]){const c=A.kmeans(todosIguales,k);assert.equal(c.length,k);assertFiniteCenters(c);
  assert.equal(c.reduce((s,ce)=>s+ce.count,0),10);for(const ce of c){assert.equal(ce.x,4);assert.equal(ce.y,4)}}
 const mezcla=[{x:1,y:1},{x:1,y:1},{x:1,y:1},{x:9,y:9},{x:9,y:9}];
 const c=A.kmeans(mezcla,2);assertFiniteCenters(c);
 assert.deepEqual(c.map(p=>`${p.x},${p.y}`).sort(),['1,1','9,9']);
 assert.equal(c.reduce((s,ce)=>s+ce.count,0),mezcla.length);
});

/* ===================== ML ===================== */
const MODEL=ML.train({samples:400,seed:2026});
test('ML: predicciones finitas y no negativas en valores límite (0, 1 y 150 pasos; viento 0-2; 4 climas)',()=>{
 for(const steps of [0,1,150])for(const wind of [0,1,2])for(const c of Object.values(B.CLIMATES)){
  const p=ML.predict(MODEL.model,steps,wind,c);
  assert.ok(Number.isFinite(p.time)&&Number.isFinite(p.energy),`no finito en steps=${steps} wind=${wind}`);
  assert.ok(p.time>=0&&p.energy>=0,`negativo en steps=${steps} wind=${wind}`);
  if(steps>=1)assert.ok(p.time>0&&p.energy>0,`no positivo en steps=${steps} wind=${wind}`);
 }
});
test('ML: más pasos implica más tiempo y más energía predichos',()=>{
 for(const wind of [0,2])for(const c of Object.values(B.CLIMATES)){
  let prev=ML.predict(MODEL.model,1,wind,c);
  for(const steps of [10,50,100,150]){const p=ML.predict(MODEL.model,steps,wind,c);
   assert.ok(p.time>prev.time&&p.energy>prev.energy,`no crece en steps=${steps}`);prev=p}
 }
});
test('ML: misma semilla → mismas predicciones; semilla distinta → modelo distinto',()=>{
 for(const seed of SEEDS){
  const a=ML.train({samples:200,seed}),b=ML.train({samples:200,seed});
  assert.deepEqual(a.model,b.model,`semilla ${seed}`);
  assert.deepEqual(ML.predict(a.model,40,2,B.CLIMATES.rain),ML.predict(b.model,40,2,B.CLIMATES.rain));
  assertAllFinite(a,`train(seed ${seed})`);
 }
 assert.notDeepEqual(ML.train({samples:200,seed:7}).model,ML.train({samples:200,seed:99}).model);
});
test('ML: predecir sin modelo lanza un error claro',()=>{
 assert.throws(()=>ML.predict(null,10),/entrenar/);
});

/* ===================== Resumen ===================== */
const total=passed+failed;
console.log(`\n${passed}/${total} aprobados.`);
if(failed){console.log(`Fallidas (${failed}): ${failures.join(' | ')}`);process.exitCode=1}

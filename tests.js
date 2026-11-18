/* Pruebas automáticas ejecutables con: node tests.js (Node 18+). */
const assert=require('node:assert/strict');
const A=require('./algorithms.js'),B=require('./benchmark.js'),ML=require('./ml.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('OK',name)}
function bfs(start,goal,size,blocked){const q=[[start,0]],seen=new Set([A.key(start)]);for(let i=0;i<q.length;i++){
 const [p,d]=q[i];if(A.key(p)===A.key(goal))return d;
 for(const next of A.neighbors(p,size,blocked)){if(!seen.has(A.key(next))){seen.add(A.key(next));q.push([next,d+1])}}
}return null}
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
console.log(`\n${checks}/${checks} grupos de pruebas aprobados.`);

/* Experimentos reproducibles independientes de la animación Three.js.
   Simplificación explícita: objetivos y obstáculos estáticos durante cada corrida.
   Comparación del planificador (no una réplica de la persecución dinámica completa). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./algorithms.js'));else root.SkyBenchmark=factory(root.SkyAlgorithms)})(typeof globalThis!=='undefined'?globalThis:this,function(A){
'use strict';
const SIZE={x:12,y:12,z:3}, START={x:0,y:0,z:2};
const CLIMATES={clear:{time:1,energy:1},cloudy:{time:1.1,energy:1.05},rain:{time:1.4,energy:1.3},fog:{time:1.25,energy:1.15}};
function rng(seed){let a=(Number(seed)>>>0)||1;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function randInt(random,n){return Math.floor(random()*n)}
function sampleScenario(seed,{obstacles=14,targets=2,wind=0,climate='clear'}={}){
 const random=rng(seed),blocked=new Set(),floor=new Set(),maxBlocks=Math.max(0,Math.min(30,Number(obstacles)||0));
 let attempts=0;
 while(floor.size<maxBlocks&&attempts++<1500){const x=randInt(random,12),y=randInt(random,12),id=`${x},${y}`;if(x<=1&&y<=1||x>=10&&y>=10||floor.has(id))continue;floor.add(id);const height=1+randInt(random,3);for(let z=0;z<height;z++)blocked.add(`${x},${y},${z}`)}
 // Una BFS calcula el componente alcanzable una vez, evitando una búsqueda A* por celda.
 const reach=new Set([A.key(START)]),queue=[START];
 for(let i=0;i<queue.length;i++)for(const p of A.neighbors(queue[i],SIZE,blocked)){
  const id=A.key(p);if(!reach.has(id)){reach.add(id);queue.push(p)}
 }
 const available=[];for(let x=0;x<12;x++)for(let y=0;y<12;y++){
  const p={x,y,z:2};if(A.distance(START,p)<9||!reach.has(A.key(p)))continue;
  available.push(p);
 }
 const positions=[];
 while(positions.length<Math.min(6,targets)&&available.length){const i=randInt(random,available.length);positions.push(available.splice(i,1)[0])}
 return {seed,blocked,goals:positions,wind,climate,obstacles:floor.size};
}
function simulation(scenario,strategy){const random=rng((scenario.seed+1)*131+({random:3,reactive:5,astar:7}[strategy]||1));
 const visited=new Map(),remaining=scenario.goals.map(p=>({...p})),pos={...START};
 let steps=0,energy=0,charge=100,expanded=0,captured=0,firstCaptureSteps=null;
 const climate=CLIMATES[scenario.climate]||CLIMATES.clear;
 const limit=150;
 visited.set(A.key(pos),1);
 while(remaining.length&&steps<limit&&charge>0){
  let destination=remaining[0];if(strategy==='astar'){
   let d=Infinity;for(const p of remaining){const path=A.astar(pos,p,SIZE,scenario.blocked);if(path.path&&path.path.length<d){d=path.path.length;destination=p}}
  }else{destination=remaining.reduce((a,b)=>A.distance(pos,a)<=A.distance(pos,b)?a:b)}
  const neighbors=A.neighbors(pos,SIZE,scenario.blocked);if(!neighbors.length)break;
  let next;
  if(strategy==='random')next=neighbors[randInt(random,neighbors.length)];
  else if(strategy==='reactive'){
   let best=Infinity,candidates=[];
   for(const p of neighbors){const score=A.distance(p,destination)+3*(visited.get(A.key(p))||0);
    if(score<best){best=score;candidates=[p]}else if(score===best)candidates.push(p)}
   next=candidates[randInt(random,candidates.length)];
  }else{const route=A.astar(pos,destination,SIZE,scenario.blocked);expanded+=route.expanded;next=route.path&&route.path[0];}
  if(!next)break;
  const cost=(1+scenario.wind*.3)*climate.energy;
  if(charge+1e-9<cost)break;
  Object.assign(pos,next);steps++;energy+=cost;charge-=cost;
  const ix=remaining.findIndex(p=>A.key(p)===A.key(pos));
  if(ix>=0){remaining.splice(ix,1);captured++;charge=Math.min(100,charge+18);if(firstCaptureSteps===null)firstCaptureSteps=steps}
  visited.set(A.key(pos),(visited.get(A.key(pos))||0)+1);
 }
 return {strategy,success:remaining.length===0,steps,energy,time:steps*.6*climate.time,captured,total:scenario.goals.length,expanded,firstCaptureSteps};
}
function average(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0}
function std(values){if(values.length<2)return 0;const mean=average(values);return Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/(values.length-1))}
function runComparison({seed=42,runs=30,obstacles=14,targets=2,wind=0,climate='clear'}={}){
 const records=[];const count=Math.max(1,Math.min(100,Math.floor(runs)));
 for(let i=0;i<count;i++){const scenario=sampleScenario((Number(seed)+i)>>>0,{obstacles,targets,wind,climate});
  for(const strategy of ['random','reactive','astar'])records.push({seed:scenario.seed,...simulation(scenario,strategy)})}
 const summary=['random','reactive','astar'].map(strategy=>{const rows=records.filter(r=>r.strategy===strategy), successes=rows.filter(r=>r.success);
  return {strategy,runs:rows.length,successes:successes.length,successRate:100*successes.length/rows.length,avgCaptured:average(rows.map(r=>r.captured)),avgSteps:average(rows.map(r=>r.steps)),avgTime:average(rows.map(r=>r.time)),avgEnergy:average(rows.map(r=>r.energy)),sdSteps:std(rows.map(r=>r.steps)),avgNodes:strategy==='astar'?average(rows.map(r=>r.expanded)):null,
   avgStepsSuccessful:successes.length?average(successes.map(r=>r.steps)):null}});
 return {settings:{seed,runs:count,obstacles,targets,wind,climate},summary,records};
}
function clusterExperiment({seed=42,runs=30,k=3}={}){
 const count=Math.max(1,Math.min(100,Math.floor(runs))),results=[];
 for(let i=0;i<count;i++){
  const random=rng(Number(seed)+i+1000);const anchors=[[2,8],[8,3],[9,9]],alerts=[];
  for(let j=0;j<45;j++){const a=anchors[j%3];alerts.push({x:Math.max(0,Math.min(11,a[0]+Math.round((random()-.5)*5))),y:Math.max(0,Math.min(11,a[1]+Math.round((random()-.5)*5)))})}
  // Sin K-means: tres posiciones predeterminadas, mismas alertas de entrada.
  const fixed=[{x:2,y:2},{x:6,y:6},{x:10,y:10}],learned=A.kmeans(alerts,k,20);
  const quality=centers=>average(alerts.map(p=>Math.min(...centers.map(c=>Math.hypot(p.x-c.x,p.y-c.y)))));
  results.push({seed:Number(seed)+i,fixed:quality(fixed),kmeans:quality(learned)})
 }
 return {runs:count,meanFixed:average(results.map(r=>r.fixed)),meanKmeans:average(results.map(r=>r.kmeans)),records:results};
}
return {rng,sampleScenario,simulation,runComparison,clusterExperiment,CLIMATES};
});

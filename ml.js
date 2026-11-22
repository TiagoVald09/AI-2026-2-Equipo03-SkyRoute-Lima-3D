/* Regresión lineal múltiple ajustada por mínimos cuadrados con datos sintéticos.
   Se separan entrenamiento (80%) y prueba (20%) por índices antes del ajuste.
   Los registros sintéticos no son vuelos reales de Lima. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./benchmark.js'));else root.SkyML=factory(root.SkyBenchmark)})(typeof globalThis!=='undefined'?globalThis:this,function(B){
'use strict';
const climatePairs=[{time:1,energy:1},{time:1.1,energy:1.05},{time:1.4,energy:1.3},{time:1.25,energy:1.15}];
// Se agrega steps*wind*(clima-1): la energía simulada es pasos*(1+0.3*viento)*clima, que contiene
// ese término de interacción viento×clima; sin él el modelo subajustaba (MAE energía test ~0.58 vs ~0.42).
function rowFeatures(steps,wind,climateFactor){return [1,steps,steps*wind,steps*(climateFactor-1),steps*wind*(climateFactor-1)]}
function solve(mat,rhs){const n=rhs.length,a=mat.map((row,i)=>row.concat(rhs[i]));for(let i=0;i<n;i++){
 let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
 if(Math.abs(a[pivot][i])<1e-12)throw Error('Datos insuficientes para ajustar regresión');
 [a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];for(let c=i;c<=n;c++)a[i][c]/=d;
 for(let r=0;r<n;r++){if(r===i)continue;const factor=a[r][i];for(let c=i;c<=n;c++)a[r][c]-=factor*a[i][c]}
 }return a.map(row=>row[n])}
function fit(records,output,feature){const dim=5,mat=Array.from({length:dim},()=>Array(dim).fill(0)),rhs=Array(dim).fill(0);
 for(const r of records){const x=rowFeatures(r.steps,r.wind,feature==='time'?r.timeFactor:r.energyFactor);for(let i=0;i<dim;i++){rhs[i]+=x[i]*r[output];for(let j=0;j<dim;j++)mat[i][j]+=x[i]*x[j]}}
 for(let i=0;i<dim;i++)mat[i][i]+=1e-8;return solve(mat,rhs)}
function dot(a,b){return a.reduce((sum,v,i)=>sum+v*b[i],0)}
function predict(model,steps,wind=0,climate={time:1,energy:1}){
 if(!model)throw Error('Primero se debe entrenar el modelo');
 return {time:Math.max(0,dot(model.time,rowFeatures(steps,wind,climate.time))),energy:Math.max(0,dot(model.energy,rowFeatures(steps,wind,climate.energy)))};
}
function mae(records,model,type){return records.reduce((sum,r)=>sum+Math.abs(predict(model,r.steps,r.wind,{time:r.timeFactor,energy:r.energyFactor})[type]-r[type]),0)/records.length}
function synthesize(n=400,seed=2026){const random=B.rng(seed),dataset=[];
 // Los pasos surgen de rutas A* en mapas sintéticos, no de una tabla ficticia fija.
 for(let i=0;i<n;i++){
  const sc=B.sampleScenario(10000+i+seed,{obstacles:5+Math.floor(random()*24),targets:1});
  const route=sc.goals[0];if(!route)continue;
  const path=requirePathLength(sc,route);if(!path)continue;
  const steps=path+Math.floor(random()*7),wind=Math.floor(random()*3),climate=climatePairs[Math.floor(random()*climatePairs.length)];
  // Generador de etiquetas: ecuaciones simuladas más perturbaciones independientes.
  const interference=(random()<.15)?1+random()*2:0;
  const time=2+steps*.6*climate.time+interference+(random()-.5)*2.2;
  const energy=steps*(1+.3*wind)*climate.energy+(random()-.5)*1.6;
  dataset.push({steps,wind,timeFactor:climate.time,energyFactor:climate.energy,time,energy});
 }return dataset;
}
function requirePathLength(sc,goal){const A=typeof module==='object'&&module.exports?require('./algorithms.js'):globalThis.SkyAlgorithms;const r=A.astar({x:0,y:0,z:2},goal,{x:12,y:12,z:3},sc.blocked);return r.path?r.path.length:0}
function train({samples=400,seed=2026}={}){const records=synthesize(samples,seed);
 // División temporal por índice, no se usa test para ajustar.
 const split=Math.floor(records.length*.8),training=records.slice(0,split),test=records.slice(split);
 const model={time:fit(training,'time','time'),energy:fit(training,'energy','energy')};
 return {model,trainSize:training.length,testSize:test.length,maeTimeTrain:mae(training,model,'time'),maeTimeTest:mae(test,model,'time'),maeEnergyTest:mae(test,model,'energy'),dataSource:'Datos sintéticos de rutas A*; no vuelos reales',split:'Primer 80% entrenamiento, último 20% prueba',seed};
}
return {train,synthesize,fit,predict,mae,rowFeatures};
});

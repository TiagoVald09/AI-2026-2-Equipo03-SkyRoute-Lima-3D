/* Experimentos de ML (Said). Uso:  node evidencias/said-ml/experimentos_ml.js <etiqueta>
   Genera evidencias/said-ml/regresion_<etiqueta>.csv con el error MAE de la regresión
   lineal en 10 semillas (400 muestras, 80/20), y kmeans_variando_k.csv con K-means vs 3 bases fijas. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const ML=require(path.join(root,'ml.js')),B=require(path.join(root,'benchmark.js')),A=require(path.join(root,'algorithms.js'));
const label=process.argv[2]||'actual',out=name=>path.join(__dirname,name);
const mean=v=>v.reduce((a,b)=>a+b,0)/v.length;
// 1) Regresión: MAE de tiempo y energía en train y test por semilla.
const seeds=[1,7,42,99,123,2026,2027,31415,777,99999],rows=['semilla,mae_tiempo_test,mae_energia_train,mae_energia_test'];
const tt=[],et=[];
for(const seed of seeds){const t=ML.train({samples:400,seed}),tr=ML.synthesize(400,seed).slice(0,320);
 rows.push([seed,t.maeTimeTest.toFixed(4),ML.mae(tr,t.model,'energy').toFixed(4),t.maeEnergyTest.toFixed(4)].join(','));tt.push(t.maeTimeTest);et.push(t.maeEnergyTest)}
rows.push(['promedio',mean(tt).toFixed(4),'',mean(et).toFixed(4)].join(','));
fs.writeFileSync(out(`regresion_${label}.csv`),rows.join('\n')+'\n');
console.log(`[${label}] MAE tiempo test promedio=${mean(tt).toFixed(4)}  MAE energía test promedio=${mean(et).toFixed(4)}`);
// 2) K-means vs bases fijas variando k (30 semillas por k). Calidad = distancia media alerta→centro más cercano.
if(label==='despues'){const kr=['k,media_bases_fijas,media_kmeans,mejora_pct'];
 for(const k of [1,2,3,4,5,6]){const r=B.clusterExperiment({seed:42,runs:30,k});
  kr.push([k,r.meanFixed.toFixed(4),r.meanKmeans.toFixed(4),(100*(1-r.meanKmeans/r.meanFixed)).toFixed(1)].join(','))}
 fs.writeFileSync(out('kmeans_variando_k.csv'),kr.join('\n')+'\n');console.log(kr.join('\n'))}

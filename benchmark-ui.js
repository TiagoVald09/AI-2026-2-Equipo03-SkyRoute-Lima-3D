/* Interfaz de experimentos reproducibles y métricas de aprendizaje. */
(()=>{'use strict';
const $=id=>document.getElementById(id),B=window.SkyBenchmark,ML=window.SkyML;
if(!B||!ML)return;
const strategies={random:'Base · aleatorio',reactive:'Reactivo · memoria',astar:'A* · búsqueda'};
const fmt=x=>Number(x).toFixed(2);
let last=null;
function reportML(){const training=window.SkyTrainedModel||ML.train();window.SkyTrainedModel=training;
 $('mlResults').innerHTML=`<div>${training.trainSize} entrenamiento / ${training.testSize} prueba</div><div>MAE de tiempo: ${fmt(training.maeTimeTest)} s</div><div>MAE de energía: ${fmt(training.maeEnergyTest)} puntos</div><small>Semilla ${training.seed} · regresión múltiple por mínimos cuadrados</small>`;
}
function run(){const seed=Math.max(1,Math.min(999999,Math.floor(Number($('expSeed').value)||42))),runs=Math.max(5,Math.min(60,Math.floor(Number($('expRuns').value)||30)));
 $('expSeed').value=String(seed);$('expRuns').value=String(runs);
 const obstacles=Number($('obstacles').value),targets=Number($('suspectCount').value),climate=$('climate').value;
 $('experimentStatus').textContent='Calculando escenarios...';
 try{const result=B.runComparison({seed,runs,obstacles,targets,climate,wind:0});const clustering=B.clusterExperiment({seed,runs});last=result;
 const body=$('experimentBody');body.textContent='';
 const maxSuccess=Math.max(...result.summary.map(r=>r.successRate));
 for(const r of result.summary){const tr=document.createElement('tr');if(r.successRate===maxSuccess)tr.className='best-experiment';
  for(const value of [strategies[r.strategy],`${r.successes}/${r.runs} (${fmt(r.successRate)} %)`,fmt(r.avgCaptured),fmt(r.avgSteps),fmt(r.avgTime),fmt(r.avgEnergy),r.avgNodes===null?'—':fmt(r.avgNodes)]){
   const td=document.createElement('td');td.textContent=value;tr.appendChild(td)
  }body.appendChild(tr)}
 $('clusterResults').innerHTML=`<div>Sin K-means: ${fmt(clustering.meanFixed)} celdas</div><div>Con K-means: ${fmt(clustering.meanKmeans)} celdas</div><small>Promedios de ${runs} escenarios con las mismas alertas</small>`;
 $('experimentStatus').textContent=`${runs} escenarios · semillas ${seed}–${seed+runs-1} · ${obstacles} obstáculos · ${targets} objetivos · clima ${climate} · viento fijo 0. Cada estrategia recibió las mismas posiciones iniciales.`;
 $('downloadExperiments').disabled=false;
 }catch(e){$('experimentStatus').textContent='No se pudo completar la comparación: '+e.message;console.error(e)}
}
function exportCSV(){if(!last)return;const cols=['seed','strategy','success','steps','time','energy','captured','total','expanded'];
 const rows=[cols.join(','),...last.records.map(r=>cols.map(k=>String(r[k])).join(','))];
 const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=url;anchor.download=`skyroute_comparacion_${last.settings.seed}_${last.settings.runs}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
$('runExperiments').addEventListener('click',run);$('downloadExperiments').addEventListener('click',exportCSV);
try{reportML()}catch(e){$('mlResults').textContent='Error de entrenamiento: '+e.message;console.error(e)}
run();
})();

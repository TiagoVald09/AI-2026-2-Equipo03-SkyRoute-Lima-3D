/* SkyRoute: simulación educativa; el eje lógico y corresponde a la profundidad visual. */
(() => {
'use strict';
const A=window.SkyAlgorithms, B=window.SkyBenchmark, ML=window.SkyML, $=id=>document.getElementById(id);
// El modelo se entrena con registros sintéticos al iniciar la página.
const trained=ML.train({samples:400,seed:2026});window.SkyTrainedModel=trained;
const sound=window.SkyAudio||{unlock:async()=>false,setClimate(){},effect(){},setVolume(){},setMuted(){}};let audioMuted=false;
if(!window.THREE){$('sceneError').hidden=false;return}
// El techo de vuelo es el nivel 2: los edificios de tres niveles deben rodearse.
const size={x:12,y:12,z:3}, start={x:0,y:0,z:2}, cell=2, speedValues=[0.5,1,2,4];
const CAPTURE_BONUS=18,MAX_OPPORTUNITY_STEPS=3,RESERVE_MARGIN=8,MAX_STEP_ENERGY=1.6*1.3;
const names={astar:'A* · Búsqueda óptima',reactive:'Reactivo · Con memoria',random:'Base · Movimiento aleatorio',manual:'Base · Control manual'};
const suspectNames={estrategico:'Estratégico · A*',reactivo:'Reactivo · Distancia',aleatorio:'Aleatorio'};
const suspectHelp={estrategico:'Evalúa rutas, salidas y celdas visitadas para escapar.',reactivo:'Se aleja del dron según la distancia Manhattan.',aleatorio:'Elige al azar una celda horizontal libre.'};
const climates={clear:{label:'Despejado',icon:'☀',time:1,energy:1,color:0x142635,near:38,far:75,light:1.7,help:'Condiciones normales de vuelo y consumo.'},cloudy:{label:'Nublado',icon:'☁',time:1.1,energy:1.05,color:0x475562,near:30,far:65,light:1.1,help:'Tiempo por paso +10 % · consumo por paso +5 %.'},rain:{label:'Lluvia',icon:'☂',time:1.4,energy:1.3,color:0x344958,near:24,far:58,light:.85,help:'Tiempo por paso +40 % · consumo por paso +30 %.'},fog:{label:'Neblina',icon:'≋',time:1.25,energy:1.15,color:0x849198,near:18,far:54,light:.8,help:'Tiempo por paso +25 % · consumo por paso +15 %.'}};
const districts={miraflores:{name:'Miraflores',landmark:'Parque Kennedy',park:[5,5],tint:0x496d78,kind:'coast',anchors:[[4,6],[8,3],[9,9]]},sanisidro:{name:'San Isidro',landmark:'Bosque El Olivar',park:[6,5],tint:0x647969,kind:'forest',anchors:[[3,8],[8,4],[9,9]]},lima:{name:'Cercado de Lima',landmark:'Plaza Mayor',park:[6,6],tint:0x8b7965,kind:'plaza',anchors:[[3,7],[7,4],[10,9]]}};
const help={astar:'Calcula la ruta de menor costo conocida en el grafo 3D.',reactive:'Recuerda celdas visitadas y favorece avances hacia el destino.',random:'Elige al azar entre los movimientos válidos.',manual:'Usa las flechas para moverte y Q / E para cambiar de altura.'};
const state={running:false,paused:false,position:{...start},goal:{x:11,y:11,z:2},buildings:new Set(),traffic:[],visited:new Map(),path:[],steps:0,energy:0,elapsed:0,expanded:0,wind:0,weatherClock:0,trafficClock:0,demandClock:0,stepClock:0,prediction:null,errors:[],results:[],demands:[],centers:[],agent:'astar',missionOpen:false};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x142635);scene.fog=new THREE.Fog(0x142635,30,65);
const camera=new THREE.PerspectiveCamera(40,1,.1,150);let azimuth=-.75,elevation=.67,zoom=38;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace; $('scene').appendChild(renderer.domElement);
const ambient=new THREE.HemisphereLight(0xb9ecf3,0x253444,2.1);scene.add(ambient);const sunlight=new THREE.DirectionalLight(0xffffff,1.7);sunlight.position.set(-10,25,10);scene.add(sunlight);
const city=new THREE.Group(), moving=new THREE.Group(), overlays=new THREE.Group(), routeLayer=new THREE.Group(), weatherLayer=new THREE.Group();scene.add(city,moving,overlays,routeLayer,weatherLayer);
let rainDrops=[],cloudGroups=[];
let drone=null,suspectMeshes=[],rotors=[],trafficMeshes=[],visualTime=0;
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,...extra});
const mats={ground:material(0x1a3540),road:material(0x263f49),building:material(0x466574),top:material(0x76a2a6),drone:material(0x65f0e7,{emissive:0x176e6b,emissiveIntensity:.65}),dark:material(0x132936),traffic:material(0xff7a83,{emissive:0x7b2531,emissiveIntensity:.6}),goal:material(0xc5f477,{emissive:0x598b20,emissiveIntensity:.6}),demand:material(0xffba64,{emissive:0x74451b,emissiveIntensity:.4}),station:material(0x91b4ff,{emissive:0x284b9b,emissiveIntensity:.65}),hoodie:material(0x344858),hood:material(0x263340),pants:material(0x172330),face:material(0xd49e78),mask:material(0x121920),eyes:material(0xe9f4ee,{emissive:0x49544c,emissiveIntensity:.2}),accent:material(0xf1aa59)};
function mesh(geo,mat,x,y,z,parent=city){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m}
function coords(p){return {x:(p.x-(size.x-1)/2)*cell,y:1+p.z*1.5,z:(p.y-(size.y-1)/2)*cell}}
function clear(group){while(group.children.length){const item=group.children.pop();item.parent=null;item.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.userData.ownMaterial)o.material.dispose()})}}
// El clima elegido es independiente del viento variable del control «Clima dinámico».
function currentClimate(){return climates[$('climate').value]||climates.clear}
function applyClimate(){
 const c=currentClimate();sound.setClimate($('climate').value);clear(weatherLayer);rainDrops=[];cloudGroups=[];scene.background=new THREE.Color(c.color);scene.fog=new THREE.Fog(c.color,c.near,c.far);sunlight.intensity=c.light;ambient.intensity=c.light+.4;$('climateHelp').textContent=c.help;
 if($('climate').value!=='clear'){
  const cloudMat=new THREE.MeshStandardMaterial({color:$('climate').value==='rain'?0x6b7983:0xa2aeb4,transparent:true,opacity:.78,roughness:1});let lastCloud;
  for(let i=0;i<7;i++){const cloud=new THREE.Group();cloud.position.set(-11+(i%4)*7,8.5+(i%2)*1.2,-9+Math.floor(i/4)*17);weatherLayer.add(cloud);cloudGroups.push(cloud);for(let j=0;j<3;j++){lastCloud=mesh(new THREE.SphereGeometry(1.1+(j%2)*.35,10,8),cloudMat,(j-1)*1.2,0,0,cloud);lastCloud.scale.set(1,.38,.65)}}
  if(lastCloud)lastCloud.userData.ownMaterial=true;
 }
 if($('climate').value==='rain'){
  const rainMat=new THREE.MeshBasicMaterial({color:0xa9d7e7,transparent:true,opacity:.7});
  for(let i=0;i<80;i++){const drop=mesh(new THREE.CylinderGeometry(.018,.018,.8,4),rainMat,-11+Math.random()*22,Math.random()*12,-11+Math.random()*22,weatherLayer);rainDrops.push(drop)}
  rainDrops[rainDrops.length-1].userData.ownMaterial=true;
 }
}
// Movimiento ambiental continuo: las nubes se desplazan aunque la misión esté pausada.
function animateWeather(dt){cloudGroups.forEach((cloud,i)=>{cloud.position.x+=dt*(.28+state.wind*.10)*(.85+(i%3)*.15);if(cloud.position.x>18)cloud.position.x=-18});for(const drop of rainDrops){drop.position.y-=dt*10;if(drop.position.y<.2)drop.position.y=12}}
function resize(){const box=$('scene').getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix()}
function cameraUpdate(){camera.position.set(zoom*Math.cos(elevation)*Math.sin(azimuth),zoom*Math.sin(elevation),zoom*Math.cos(elevation)*Math.cos(azimuth));camera.lookAt(0,0,0)}
let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;azimuth-=(e.clientX-drag.x)*.008;elevation=Math.max(.25,Math.min(1.3,elevation+(e.clientY-drag.y)*.008));drag={x:e.clientX,y:e.clientY};cameraUpdate()});renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(22,Math.min(55,zoom+e.deltaY*.02));cameraUpdate()},{passive:false});window.addEventListener('resize',resize);resize();cameraUpdate();
function randomInt(n){return Math.floor(Math.random()*n)}
function blocked(){return new Set([...state.buildings,...state.traffic.map(A.key)])}
// El sospechoso camina por el suelo: cualquier edificio bloquea toda su planta,
// incluso si el dron puede pasar por encima del techo en el nivel de intercepción.
function suspectBlocked(){const occupied=blocked();for(const id of state.buildings){const [x,y,z]=id.split(',').map(Number);if(z===0)occupied.add(A.key({x,y,z:2}))}return occupied}
function isReserved(x,y){const park=districts[$('district').value].park;return (x<2&&y<2)||(x>9&&y>9)||(Math.abs(x-park[0])<=1&&Math.abs(y-park[1])<=1)}
function makeWorld(){const district=districts[$('district').value];mats.building.color.setHex(district.tint);state.buildings.clear();state.traffic=[];clear(city);mesh(new THREE.BoxGeometry(25,.25,25),mats.ground,0,-.25,0);for(let i=0;i<12;i++){const x=(i-5.5)*cell;mesh(new THREE.BoxGeometry(.035,.01,24),mats.road,x,0,0);mesh(new THREE.BoxGeometry(24,.01,.035),mats.road,0,0,x)}
 drawLandmark(district);drawStation();
 const count=Number($('obstacles').value);let placed=0,attempts=0;while(placed<count&&attempts++<1000){const x=randomInt(12),y=randomInt(12),height=1+randomInt(3);if(isReserved(x,y)||state.buildings.has(A.key({x,y,z:0})))continue;for(let z=0;z<height;z++)state.buildings.add(A.key({x,y,z}));const p=coords({x,y,z:0}),h=height*1.5+.2;mesh(new THREE.BoxGeometry(1.35,h,1.35),mats.building,p.x,h/2,p.z);mesh(new THREE.BoxGeometry(1.4,.08,1.4),mats.top,p.x,h+.04,p.z);for(let side=-1;side<=1;side+=2)for(let row=0;row<height;row++)mesh(new THREE.BoxGeometry(.17,.28,.025),mats.top,p.x+side*.3,.6+row*1.3,p.z+.69);placed++}
 for(let i=0;i<Math.min(6,Math.floor(count/5));i++){let p;do{p={x:randomInt(12),y:randomInt(12),z:1+randomInt(size.z-1)}}while(isReserved(p.x,p.y)||state.buildings.has(A.key(p))||state.traffic.some(q=>A.key(q)===A.key(p)));state.traffic.push(p)}
 state.demands=Array.from({length:30},(_,i)=>{const anchors=district.anchors,a=anchors[i%3];return {x:Math.max(0,Math.min(11,a[0]+randomInt(5)-2)),y:Math.max(0,Math.min(11,a[1]+randomInt(5)-2))}});updateClusters();drawOverlays()}
// Una única estación fija por mapa: la base inicial en la esquina de la cuadrícula.
// Plataforma única con un símbolo de carga y una baliza azul visible desde lejos.
function drawStation(){const p=coords(start);mesh(new THREE.CylinderGeometry(1.05,1.1,.2,24),mats.dark,p.x,.12,p.z);mesh(new THREE.CylinderGeometry(.87,.87,.12,24),mats.station,p.x,.25,p.z);mesh(new THREE.BoxGeometry(.25,.08,.9),mats.dark,p.x,.33,p.z);mesh(new THREE.BoxGeometry(.9,.08,.25),mats.dark,p.x,.33,p.z);mesh(new THREE.CylinderGeometry(.08,.08,3,8),mats.station,p.x,1.7,p.z);mesh(new THREE.OctahedronGeometry(.3),mats.station,p.x,3.3,p.z)}
// Hitos estilizados: no reproducen la geometría real ni permiten navegación geográfica.
function drawLandmark(d){
 const p=coords({x:d.park[0],y:d.park[1],z:0});
 const green=material(d.kind==='plaza'?0x8a987c:0x416e58), foliage=material(0x508466), trunk=material(0x65554a);
 // Los materiales propios se liberan al cambiar de distrito.
 function local(g,m,x,y,z){const o=mesh(g,m,x,y,z);o.userData.ownMaterial=true;return o}
 local(new THREE.BoxGeometry(5.7,.1,5.7),green,p.x,.04,p.z);
 if(d.kind==='plaza'){
  local(new THREE.CylinderGeometry(.55,.8,.5,8),material(0xc4a976),p.x,.35,p.z);
  local(new THREE.CylinderGeometry(.12,.2,1.9,8),material(0xb99a68),p.x,1.5,p.z);
  local(new THREE.SphereGeometry(.25,10,8),material(0xd4be8e),p.x,2.6,p.z);
 }else{
  const n=d.kind==='forest'?12:6;
  for(let i=0;i<n;i++){const angle=i*2.4, radius=1+(i%3)*.65,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;const tr=mesh(new THREE.CylinderGeometry(.09,.12,.7,6),trunk,x,.42,z);const leaf=mesh(new THREE.SphereGeometry(d.kind==='forest'?.55:.42,8,6),foliage,x,1,z);if(i===n-1){tr.userData.ownMaterial=true;leaf.userData.ownMaterial=true}}
 }
 if(d.kind==='coast'){local(new THREE.BoxGeometry(3,.08,24),material(0x2c6575),-13.4,.01,0);local(new THREE.BoxGeometry(.3,.13,24),material(0xc8c19d),-11.9,.08,0)}
}
function updateClusters(){state.centers=$('clusters').checked?A.kmeans(state.demands,3):[]}
function chooseGoal(excluded=new Set(),random=Math.random){const free=[],occupied=suspectBlocked();for(let x=0;x<12;x++)for(let y=0;y<12;y++){const p={x,y,z:2};if(!occupied.has(A.key(p))&&!excluded.has(A.key(p))&&A.distance(start,p)>=10)free.push(p)}if(!free.length)return null;if(state.centers.length){const target=state.centers.reduce((a,b)=>a.count>=b.count?a:b);free.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));return free[Math.floor(random()*Math.min(12,free.length))]}return free[Math.floor(random()*free.length)]}
function liveSuspects(){return state.suspects.filter(s=>s.active)}
// El dron prioriza el objetivo alcanzable más cercano; vuelve a evaluar al cambiar el mapa.
function selectTarget(){const live=liveSuspects();if(!live.length)return;let best=null,bestDistance=Infinity;for(const target of live){let dist=A.distance(state.position,target.position);if(state.agent==='astar'){const route=A.astar(state.position,target.position,size,blocked());if(!route.path)continue;dist=route.path.length}if(dist<bestDistance){bestDistance=dist;best=target}}state.goal={...(best||live[0]).position}}
function drawOverlays(){clear(overlays);for(const c of state.centers){const p=coords({x:c.x,y:c.y,z:0});const ring=new THREE.Mesh(new THREE.RingGeometry(.65,1,32),new THREE.MeshBasicMaterial({color:0xffba64,transparent:true,opacity:.55,side:THREE.DoubleSide}));ring.userData.ownMaterial=true;ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.03,p.z);overlays.add(ring);mesh(new THREE.CylinderGeometry(.04,.04,.6,6),mats.demand,p.x,.35,p.z,overlays);mesh(new THREE.OctahedronGeometry(.22),mats.demand,p.x,.7,p.z,overlays)}}
// Personaje ficticio de estilo videojuego: capucha, antifaz, brazos y piernas.
function createSuspect(){
 const figure=new THREE.Group();figure.scale.set(1.2,1.2,1.2);figure.userData.limbs=[];
 mesh(new THREE.CylinderGeometry(.32,.28,.72,8),mats.hoodie,0,1.05,0,figure);
 mesh(new THREE.BoxGeometry(.36,.16,.11),mats.accent,0,.88,.29,figure);
 mesh(new THREE.SphereGeometry(.34,12,10),mats.hood,0,1.63,0,figure);
 mesh(new THREE.BoxGeometry(.43,.30,.10),mats.face,0,1.59,.28,figure);
 mesh(new THREE.BoxGeometry(.44,.11,.045),mats.mask,0,1.64,.35,figure);
 for(const x of [-.11,.11])mesh(new THREE.SphereGeometry(.035,8,6),mats.eyes,x,1.65,.38,figure);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.37,1.3,0);figure.add(arm);mesh(new THREE.CylinderGeometry(.10,.11,.55,7),mats.hoodie,0,-.25,0,arm);mesh(new THREE.SphereGeometry(.09,8,6),mats.face,0,-.55,0,arm);figure.userData.limbs.push(arm);
 const leg=new THREE.Group();leg.position.set(side*.16,.72,0);figure.add(leg);mesh(new THREE.CylinderGeometry(.11,.10,.53,7),mats.pants,0,-.24,0,leg);mesh(new THREE.BoxGeometry(.23,.12,.32),mats.dark,0,-.54,.06,leg);figure.userData.limbs.push(leg)}
 // Marcador elevado: identifica al objetivo sin sustituir su figura humana.
 mesh(new THREE.CylinderGeometry(.025,.025,.45,6),mats.goal,0,2.12,0,figure);mesh(new THREE.OctahedronGeometry(.22),mats.goal,0,2.43,0,figure);
 return figure;
}
// El tráfico aéreo se representa mediante una pequeña aeronave roja con alas y cola.
function createTraffic(){const plane=new THREE.Group();mesh(new THREE.BoxGeometry(.25,.22,1.15),mats.traffic,0,0,0,plane);mesh(new THREE.BoxGeometry(1.15,.08,.3),mats.traffic,0,0,0,plane);mesh(new THREE.BoxGeometry(.55,.08,.18),mats.traffic,0,.05,-.44,plane);mesh(new THREE.BoxGeometry(.07,.25,.25),mats.traffic,0,.15,-.45,plane);mesh(new THREE.SphereGeometry(.12,8,6),mats.eyes,0,.12,.25,plane);return plane}
// Los objetos 3D se conservan entre fotogramas para evitar reconstrucciones continuas.
function setupMoving(){
 clear(moving);clear(routeLayer);rotors=[];trafficMeshes=[];suspectMeshes=[];drone=new THREE.Group();moving.add(drone);
 mesh(new THREE.BoxGeometry(1,.3,.65),mats.drone,0,0,0,drone);
 for(const x of [-.7,.7])for(const z of [-.55,.55]){mesh(new THREE.CylinderGeometry(.25,.25,.08,12),mats.dark,x,.12,z,drone);const rotor=mesh(new THREE.BoxGeometry(.7,.06,.06),mats.drone,x,.2,z,drone);rotors.push(rotor)}
 const p=coords(state.position);drone.position.set(p.x,p.y+.2,p.z);
 for(const entry of state.suspects){const figure=createSuspect();moving.add(figure);const target=coords(entry.position);figure.position.set(target.x,.1,target.z);suspectMeshes.push(figure)}
 for(const t of state.traffic){const v=coords(t),plane=createTraffic();plane.position.set(v.x,v.y,v.z);moving.add(plane);trafficMeshes.push(plane)}
}
function drawRoute(){clear(routeLayer);if(!state.path.length)return;const pts=[state.position,...state.path].map(q=>{const v=coords(q);return new THREE.Vector3(v.x,v.y+.15,v.z)});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x69e7df,transparent:true,opacity:.7}));line.userData.ownMaterial=true;routeLayer.add(line)}
function animateScene(dt){
 if(!drone)return;const active=state.running&&!state.paused,scale=speedValues[Number($('speed').value)-1];if(active)visualTime+=dt*scale;
 const p=coords(state.position),target=new THREE.Vector3(p.x,state.phase==='charging'?.48:p.y+.2+(active?Math.sin(visualTime*4)*.08:0),p.z),alpha=1-Math.exp(-dt*(active?8*scale:7));
 if(!state.paused)drone.position.lerp(target,alpha);if(active&&state.phase!=='charging'){for(const rotor of rotors)rotor.rotation.y+=dt*scale*24;drone.rotation.z=THREE.MathUtils.lerp(drone.rotation.z,THREE.MathUtils.clamp((target.x-drone.position.x)*-.12,-.18,.18),alpha)}else drone.rotation.z=THREE.MathUtils.lerp(drone.rotation.z,0,alpha);
 state.suspects.forEach((entry,i)=>{const figure=suspectMeshes[i];if(!figure)return;figure.visible=entry.active;if(state.paused||!entry.active)return;
  const q=coords(entry.position),dx=q.x-figure.position.x,dz=q.z-figure.position.z,movingNow=active&&Math.hypot(dx,dz)>.05;
  if(movingNow){const angle=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(angle-figure.rotation.y),Math.cos(angle-figure.rotation.y));figure.rotation.y+=difference*(1-Math.exp(-dt*10*scale))}
  const swing=movingNow?Math.sin(visualTime*12+i)*.55:0;figure.userData.limbs.forEach((limb,index)=>{limb.rotation.x=(index===0||index===3?1:-1)*swing});
  figure.position.lerp(new THREE.Vector3(q.x,.1+(movingNow?Math.abs(swing)*.08:0),q.z),1-Math.exp(-dt*7*scale));
 });
 state.traffic.forEach((t,i)=>{const plane=trafficMeshes[i];if(state.paused||!plane)return;const v=coords(t),dx=v.x-plane.position.x,dz=v.z-plane.position.z;if(active&&Math.hypot(dx,dz)>.05)plane.rotation.y=Math.atan2(dx,dz);plane.position.lerp(new THREE.Vector3(v.x,v.y,v.z),1-Math.exp(-dt*4*scale))})
}
function updateUI(status){if(status)$('statusText').textContent=status;$('steps').textContent=String(state.steps).padStart(2,'0');const battery=Math.max(0,state.charge);$('battery').textContent=Math.round(battery);$('batteryBar').style.width=battery+'%';$('rewardInfo').textContent=state.bonusUntil>state.elapsed?'Intercepción: +'+state.lastBonus.toFixed(1)+' %':' +18 % por intercepción · máx. 100 %';$('eta').textContent=state.prediction?state.prediction.time.toFixed(1):'—';$('energyPrediction').textContent=state.prediction?'energía estimada: '+state.prediction.energy.toFixed(1)+'%':'energía estimada: —';$('agentLabel').textContent=names[state.agent];const remaining=liveSuspects().length;$('suspectProgress').textContent=`${state.suspects.length-remaining} / ${state.suspects.length} interceptados`;$('encounterAlert').hidden=!(state.running&&state.interferenceUntil>state.elapsed);$('encounterAlert').textContent='⚡ Interferencia de equipo · velocidad del dron reducida 50 %';$('missionPhase').textContent=state.phase==='returning'?'regreso automático a base':state.phase==='charging'?'recargando en base':state.phase==='intercept'?'intercepción cercana · batería baja':state.running?`${state.suspects.length-remaining}/${state.suspects.length} interceptados`:'esperando misión';$('runBadge').textContent=state.running?(state.paused?'● PAUSADO':'● EN VUELO'):'● EN ESPERA';const climate=currentClimate();$('weatherBadge').textContent=climate.icon+' '+climate.label.toUpperCase()+' · VIENTO '+state.wind;$('pause').textContent=state.paused?'▶  Reanudar':'Ⅱ  Pausar'}
function renderResults(){const body=$('resultsBody');body.textContent='';if(!state.results.length){body.innerHTML='<tr class="empty-row"><td colspan="11">Aún no hay misiones registradas. Inicia una simulación para ver los resultados.</td></tr>';return}for(const r of state.results){const tr=document.createElement('tr');for(const value of [r.district+' · '+r.incident,r.suspectPolicy,r.agent,r.climate,r.status,`${r.captured} / ${r.total}`,`${r.steps} / ${r.time.toFixed(1)} s`,`${r.energy.toFixed(1)}% / ${r.steps} u.`,`${r.recovered.toFixed(1)} %`,r.nodes,r.error]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}body.appendChild(tr)}}
function finish(status){if(!state.missionOpen)return;state.running=false;state.missionOpen=false;let error='—';if(status==='Interceptados'&&state.firstCaptureTime!==null){const e=Math.abs(state.prediction.time-state.firstCaptureTime);state.errors.push(e);error=(state.errors.reduce((a,b)=>a+b,0)/state.errors.length).toFixed(1)+' s'}state.results.unshift({district:districts[state.district].name,incident:state.incident,climate:state.climateHistory.join(' → '),suspectPolicy:suspectNames[state.suspectPolicy],agent:names[state.agent],status,captured:state.suspects.length-liveSuspects().length,total:state.suspects.length,steps:state.steps,time:state.elapsed,energy:state.energy,recovered:state.recovered,nodes:state.agent==='astar'?state.expanded:'—',error});renderResults();updateUI(status==='Interceptados'?'Todos interceptados · central avisada':status)}
function newMission(preserve=false,rerollGoals=false){
 if(state.missionOpen)finish('Interrumpida');
 const count=Math.max(1,Math.min(6,Math.floor(Number($('suspectCount').value)||1)));$('suspectCount').value=String(count);
 Object.assign(state,{running:false,paused:false,position:{...start},goal:{x:11,y:11,z:2},visited:new Map(),path:[],steps:0,energy:0,recovered:0,lastBonus:0,bonusUntil:0,charge:100,phase:'pursuit',chargeClock:0,suspectPolicy:$('suspectPolicy').value,suspects:[],firstCaptureTime:null,climateHistory:[],interferenceUntil:0,encounterCooldown:new Map(),manualCooldown:0,elapsed:0,expanded:0,wind:0,weatherClock:0,trafficClock:0,demandClock:0,stepClock:0,prediction:null,agent:$('agent').value,district:$('district').value,incident:$('incident').value,missionOpen:false});
 if(preserve&&state.initialTraffic&&state.initialSuspects&&state.initialSuspects.length===count){
  state.traffic=state.initialTraffic.map(p=>({...p}));
  if(state.initialDemands)state.demands=state.initialDemands.map(p=>({...p}));
  updateClusters();
  if(rerollGoals){
   // Mantiene edificios, tráfico y alertas; varía únicamente el uso de K-means.
   const random=B.rng(state.worldSeed),used=new Set(),initial=[];
   for(let i=0;i<count;i++){const p=chooseGoal(used,random);if(!p)break;used.add(A.key(p));initial.push({...p})}
   state.initialSuspects=initial;
  }
 }else{
  makeWorld();state.initialTraffic=state.traffic.map(p=>({...p}));
  state.initialDemands=state.demands.map(p=>({...p}));state.worldSeed=Math.floor(Math.random()*999999)+1;
  const used=new Set(),initial=[],random=B.rng(state.worldSeed);
  for(let i=0;i<count;i++){const p=chooseGoal(used,random);if(!p)break;used.add(A.key(p));initial.push({...p})}
  state.initialSuspects=initial;
 }
 state.suspects=state.initialSuspects.map((p,i)=>({id:i,position:{...p},active:true,clock:i*targetInterval()/count,visited:new Map([[A.key(p),1]])}));
 selectTarget();drawOverlays();setupMoving();const d=districts[state.district];$('mapTitle').textContent=d.name+' · '+d.landmark;$('districtHelp').textContent='Inspirado en '+d.landmark+' · base fija: Puesto '+d.name+' (ubicación ficticia).';updateUI('Listo para despegar')
}
function phaseStatus(){return state.phase==='returning'?'Batería baja · regresando a base':state.phase==='charging'?'Recargando en base':state.phase==='intercept'?'Batería baja · intercepción cercana':'Siguiendo sospechosos'}
function begin(){sound.unlock().then(ok=>{$('audioStatus').textContent=ok?'Música, efectos y ambiente disponibles.':'Audio no disponible en este navegador.'});if(!state.missionOpen&&state.prediction)newMission(true);if(state.missionOpen){state.paused=false;state.running=true;updateUI(phaseStatus());return}state.agent=$('agent').value;state.missionOpen=true;state.running=true;state.paused=false;state.climateHistory=[currentClimate().label];const climate=currentClimate(),route=A.astar(state.position,state.goal,size,blocked());const estimatedSteps=route.path?route.path.length:A.distance(state.position,state.goal);state.prediction=ML.predict(trained.model,estimatedSteps,state.wind,{time:climate.time,energy:climate.energy});state.visited.set(A.key(state.position),1);updateUI('Siguiendo sospechosos')}
// PERCIBIR: se consulta el mapa conocido, el tráfico y la memoria del agente.
function decide(){const occupied=blocked(),destination=state.phase==='returning'?start:state.goal, options=A.neighbors(state.position,size,occupied);if(!options.length)return null;
 // El regreso a la estación utiliza A* de seguridad, incluso en el modo manual.
 if(state.agent==='astar'||state.phase==='returning'||state.phase==='intercept'){const result=A.astar(state.position,destination,size,occupied);if(state.agent==='astar')state.expanded+=result.expanded;state.path=result.path||[];return state.path.shift()||null}
 state.path=[];if(state.agent==='random')return options[randomInt(options.length)];if(state.agent==='reactive'){options.sort((a,b)=>{const score=p=>A.distance(p,destination)+(state.visited.get(A.key(p))||0)*3;return score(a)-score(b)||Math.random()-.5});return options[0]}return null}
// ACTUAR: movimiento discreto; la animación interpola las posiciones entre pasos.
function move(next){if(!next)return;const valid=A.neighbors(state.position,size,blocked()).some(p=>A.key(p)===A.key(next));if(!valid)return;const cost=(1+state.wind*.3)*currentClimate().energy;
 // No se permite recorrer una arista si no queda energía para completarla.
 if(state.charge+1e-9<cost){finish('Sin batería');return}
 state.position={...next};state.steps++;sound.effect('move');drawRoute();state.visited.set(A.key(next),(state.visited.get(A.key(next))||0)+1);state.energy+=cost;state.charge=Math.max(0,state.charge-cost);
 // Se acredita la bonificación al llegar, antes de comprobar si la batería llegó a cero.
 if(state.phase==='pursuit'||state.phase==='intercept'){captureAtDrone();if(!state.missionOpen)return}
 if(state.charge<=1e-9){finish('Sin batería');return}
 if(state.phase==='returning'&&A.key(next)===A.key(start)){state.phase='charging';sound.effect('chargeStart');state.chargeClock=0;state.path=[];drawRoute();updateUI('Recargando en base');return}
 if(state.phase==='pursuit'||state.phase==='intercept')selectTarget();updateUI()}
// La intercepción es simbólica: se registra a todos los objetivos presentes en la celda.
function captureAtDrone(){let captured=0;for(const suspect of state.suspects){if(suspect.active&&A.key(suspect.position)===A.key(state.position)){suspect.active=false;captured++}}if(!captured)return 0;sound.effect('capture');
 const gained=Math.min(100-state.charge,captured*CAPTURE_BONUS);state.charge+=gained;state.recovered+=gained;state.lastBonus=gained;state.bonusUntil=state.elapsed+5;
 if(state.firstCaptureTime===null)state.firstCaptureTime=state.elapsed;if(state.phase==='intercept')state.phase='pursuit';
 if(!liveSuspects().length){finish('Interceptados');return captured}state.path=[];drawRoute();updateUI('Intercepción registrada · energía recuperada');return captured}
// Si dos coinciden, crean interferencia ficticia que ralentiza al dron durante 4 s.
// Cada pareja tiene 12 s de recuperación, evitando activaciones continuas.
function checkEncounters(){const active=liveSuspects();for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i],b=active[j],pair=`${a.id}:${b.id}`;if(A.key(a.position)!==A.key(b.position))continue;const last=state.encounterCooldown.get(pair);if(last!==undefined&&state.elapsed-last<12)continue;state.encounterCooldown.set(pair,state.elapsed);sound.effect('encounter');state.interferenceUntil=Math.max(state.interferenceUntil,state.elapsed+4);updateUI('Interferencia de equipo activada')}}
// Cada sospechoso percibe, decide y actúa de manera independiente en el mapa simulado.
function moveSuspect(suspect){const next=A.evade(suspect.position,state.position,size,suspectBlocked(),start,state.suspectPolicy,suspect.visited,Math.random,blocked());if(!next)return;suspect.position={...next};const k=A.key(next);suspect.visited.set(k,(suspect.visited.get(k)||0)+1);if((state.phase==='pursuit'||state.phase==='intercept')&&k===A.key(state.position))captureAtDrone();if(state.missionOpen){checkEncounters();selectTarget()}}
// Ritmos de persecución: el dron avanza cada 0,6 s y el objetivo entre 0,85 y 1,15 s simulados.
function targetInterval(){return {'Robo reportado':.95,'Posible extorsión':1.15,'Posible secuestro':.85}[state.incident]}
// Evalúa como máximo tres pasos hasta un sospechoso y una ruta posterior a la base.
// La ida usa el coste actual; el regreso usa el peor clima y viento, más un margen.
function nearbyOpportunity(){const occupied=blocked();let best=null;for(const suspect of liveSuspects()){
 const toTarget=A.astar(state.position,suspect.position,size,occupied);if(!toTarget.path||toTarget.path.length===0||toTarget.path.length>MAX_OPPORTUNITY_STEPS)continue;
 const toBase=A.astar(suspect.position,start,size,occupied);if(!toBase.path)continue;
 const pursuitCost=toTarget.path.length*(1+state.wind*.3)*currentClimate().energy,after=Math.min(100,state.charge-pursuitCost+CAPTURE_BONUS);
 if(state.charge+1e-9<pursuitCost||after<toBase.path.length*MAX_STEP_ENERGY+RESERVE_MARGIN)continue;
 if(!best||toTarget.path.length<best.distance)best={suspect,distance:toTarget.path.length};
 }return best}
// Con poca energía, prioriza una intercepción cercana solo mientras siga siendo viable.
function checkBattery(){if(state.phase!=='pursuit'&&state.phase!=='intercept')return;const home=A.astar(state.position,start,size,blocked());if(!home.path)return;const reserve=home.path.length*MAX_STEP_ENERGY+RESERVE_MARGIN;
 if(state.phase==='pursuit'&&state.charge>reserve)return;const opportunity=nearbyOpportunity();if(opportunity){state.goal={...opportunity.suspect.position};if(state.phase!=='intercept'){state.phase='intercept';state.path=[];drawRoute();updateUI('Batería baja · intercepción cercana')}return}
 state.phase='returning';state.path=[];drawRoute();updateUI('Batería baja · regresando a base')}
function trafficStep(){const occ=blocked();state.traffic=state.traffic.map(t=>{occ.delete(A.key(t));const opts=A.neighbors(t,size,occ).filter(p=>A.key(p)!==A.key(state.position)&&!state.suspects.some(s=>s.active&&A.key(p)===A.key(s.position))&&A.key(p)!==A.key(start));const p=opts.length&&Math.random()<.7?opts[randomInt(opts.length)]:t;occ.add(A.key(p));return p})}
function tick(dt){if(!state.running||state.paused)return;const scale=speedValues[Number($('speed').value)-1],d=dt*scale;state.elapsed+=d;state.trafficClock+=d;state.weatherClock+=d;state.demandClock+=d;state.manualCooldown=Math.max(0,state.manualCooldown-d);
 if(state.weatherClock>=6){state.weatherClock=0;state.wind=$('weather').checked?randomInt(3):0}
 if(state.trafficClock>=2){state.trafficClock=0;trafficStep();if(state.phase==='pursuit')selectTarget()}
 for(const suspect of state.suspects){if(!suspect.active)continue;suspect.clock+=d;if(suspect.clock>=targetInterval()){suspect.clock-=targetInterval();moveSuspect(suspect);if(!state.missionOpen)return}}
 if(state.demandClock>=12){state.demandClock=0;for(const p of state.demands){p.x=Math.max(0,Math.min(11,p.x+randomInt(3)-1));p.y=Math.max(0,Math.min(11,p.y+randomInt(3)-1))}updateClusters();drawOverlays()}
 if(state.phase==='charging'){state.chargeClock+=d;state.charge=Math.min(100,state.charge+d*20);if(state.charge>=100){sound.effect('chargeDone');state.phase='pursuit';state.visited=new Map();updateUI('Carga completa · retomando seguimiento')}}
 else {checkBattery();state.stepClock+=d;const stepInterval=.6*currentClimate().time*(state.interferenceUntil>state.elapsed?2:1);if(state.stepClock>=stepInterval){state.stepClock=0;if(state.agent!=='manual'||state.phase==='returning'||state.phase==='intercept'){const next=decide();if(next)move(next);else if(state.phase==='returning'&&A.key(state.position)===A.key(start)){state.phase='charging';sound.effect('chargeStart');updateUI('Recargando en base')}else finish('Sin ruta')}}}
 if(state.elapsed>=180&&state.missionOpen)finish('Tiempo agotado');if(state.missionOpen&&state.interferenceUntil<=state.elapsed&&$('statusText').textContent==='Interferencia de equipo activada')updateUI(phaseStatus());updateUI()}
for(const [id,channel] of [['musicVolume','music'],['effectsVolume','effects'],['ambienceVolume','ambience']]){$(id).addEventListener('input',()=>{const value=Number($(id).value);$(id+'Value').textContent=value+' %';sound.setVolume(channel,value/100)})}
$('audioToggle').addEventListener('click',()=>{audioMuted=!audioMuted;sound.setMuted(audioMuted);$('audioToggle').textContent=audioMuted?'🔇 Activar sonido':'🔊 Silenciar';$('audioToggle').setAttribute('aria-pressed',String(audioMuted));if(!audioMuted)sound.unlock().then(ok=>{$('audioStatus').textContent=ok?'Música, efectos y ambiente disponibles.':'Audio no disponible en este navegador.'})});
$('start').addEventListener('click',begin);$('pause').addEventListener('click',()=>{if(state.running){state.paused=!state.paused;updateUI(state.paused?'Misión pausada':phaseStatus())}});$('reset').addEventListener('click',()=>newMission());$('district').addEventListener('change',()=>newMission());$('incident').addEventListener('change',()=>newMission(true));$('suspectCount').addEventListener('change',()=>newMission());$('suspectPolicy').addEventListener('change',()=>{newMission(true);$('suspectHelp').textContent=suspectHelp[$('suspectPolicy').value]});$('agent').addEventListener('change',()=>{newMission(true);$('agentHelp').textContent=help[$('agent').value]});$('obstacles').addEventListener('input',()=>{$('obstaclesValue').textContent=$('obstacles').value});$('obstacles').addEventListener('change',()=>newMission());$('speed').addEventListener('input',()=>{$('speedValue').textContent=speedValues[Number($('speed').value)-1].toFixed(1)+'×'});$('climate').addEventListener('change',()=>{if(state.missionOpen){const label=currentClimate().label;if(state.climateHistory[state.climateHistory.length-1]!==label)state.climateHistory.push(label)}applyClimate();updateUI()});$('weather').addEventListener('change',()=>{if(!$('weather').checked)state.wind=0;updateUI()});$('clusters').addEventListener('change',()=>{newMission(true,true)});$('clearResults').addEventListener('click',()=>{state.results=[];state.errors=[];renderResults()});
window.addEventListener('keydown',e=>{if(!state.running||state.paused||state.agent!=='manual'||state.phase!=='pursuit'||/INPUT|SELECT|BUTTON/.test(document.activeElement.tagName))return;const vectors={ArrowUp:[0,-1,0],ArrowDown:[0,1,0],ArrowLeft:[-1,0,0],ArrowRight:[1,0,0],q:[0,0,-1],e:[0,0,1]};const v=vectors[e.key]||vectors[e.key.toLowerCase()];if(v){e.preventDefault();if(state.manualCooldown>0)return;const before=state.steps;move({x:state.position.x+v[0],y:state.position.y+v[1],z:state.position.z+v[2]});if(state.steps>before)state.manualCooldown=.6*currentClimate().time*(state.interferenceUntil>state.elapsed?2:1)}});
applyClimate();newMission();let last=performance.now();function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;tick(dt);animateScene(dt);animateWeather(dt);renderer.render(scene,camera);requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();

/* Funciones puras: se comparten entre el navegador y las pruebas. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SkyAlgorithms=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key=p=>`${p.x},${p.y},${p.z}`;
  const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z);
  // Seis acciones posibles en el grafo 3D; no se permiten diagonales.
  function neighbors(p,size,blocked){return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(([x,y,z])=>({x:p.x+x,y:p.y+y,z:p.z+z})).filter(q=>q.x>=0&&q.x<size.x&&q.y>=0&&q.y<size.y&&q.z>=0&&q.z<size.z&&!blocked.has(key(q)))}
  // A*: Manhattan es admisible y consistente porque cada arista cuesta 1.
  // La optimalidad corresponde al mapa observado en esta búsqueda, no al futuro estocástico.
  function astar(start,goal,size,blocked){const open=[{p:start,g:0,f:distance(start,goal)}],best=new Map([[key(start),0]]),parent=new Map(),closed=new Set();let expanded=0;while(open.length){open.sort((a,b)=>a.f-b.f||a.g-b.g);const current=open.shift(),id=key(current.p);if(closed.has(id))continue;closed.add(id);expanded++;if(id===key(goal)){const path=[];let k=id;while(k!==key(start)){path.push(k.split(',').map(Number));k=parent.get(k)}return {path:path.reverse().map(([x,y,z])=>({x,y,z})),expanded}}for(const n of neighbors(current.p,size,blocked)){const nk=key(n),g=current.g+1;if(g<(best.get(nk)??Infinity)){best.set(nk,g);parent.set(nk,id);open.push({p:n,g,f:g+distance(n,goal)})}}}return {path:null,expanded}}
  // El sospechoso percibe al dron y el mapa simulado; solo se desplaza horizontalmente.
  // "estrategico" usa A* para estimar cuántos pasos necesita el dron para alcanzar
  // cada posible celda y favorece además salidas disponibles y poca repetición.
  function evade(suspect,drone,size,blocked,base,policy,visited=new Map(),random=Math.random,droneBlocked=blocked){
    const choices=neighbors(suspect,size,blocked).filter(p=>p.z===suspect.z&&key(p)!==key(base));
    if(!choices.length)return null;
    if(policy==='aleatorio')return choices[Math.floor(random()*choices.length)];
    const safe=choices.filter(p=>key(p)!==key(drone));
    const candidates=safe.length?safe:choices;
    let best=null,bestScore=-Infinity;
    for(const p of candidates){
      let score=distance(p,drone);
      if(policy==='estrategico'){
        const route=astar(drone,p,size,droneBlocked);
        const escapeSteps=route.path?route.path.length:size.x*size.y*size.z;
        const exits=neighbors(p,size,blocked).filter(q=>q.z===p.z&&key(q)!==key(base)&&key(q)!==key(drone)).length;
        score=escapeSteps+exits*.45-(visited.get(key(p))||0)*.6;
      }
      score+=random()*.001;
      if(score>bestScore){bestScore=score;best=p}
    }
    return best;
  }
  // K-means: asignación y actualización de centroides en el plano urbano.
  function kmeans(points,k=3,iterations=10){if(!points.length)return [];k=Math.min(k,points.length);let centers=Array.from({length:k},(_,i)=>({...points[Math.floor(i*points.length/k)]}));for(let t=0;t<iterations;t++){const groups=centers.map(()=>[]);for(const p of points){let best=0;for(let i=1;i<k;i++)if((p.x-centers[i].x)**2+(p.y-centers[i].y)**2<(p.x-centers[best].x)**2+(p.y-centers[best].y)**2)best=i;groups[best].push(p)}centers=centers.map((c,i)=>groups[i].length?{x:groups[i].reduce((s,p)=>s+p.x,0)/groups[i].length,y:groups[i].reduce((s,p)=>s+p.y,0)/groups[i].length,count:groups[i].length}:{...c,count:0})}return centers}
  // La regresión entrenada y su validación están en ml.js.
  return {key,distance,neighbors,astar,evade,kmeans};
});

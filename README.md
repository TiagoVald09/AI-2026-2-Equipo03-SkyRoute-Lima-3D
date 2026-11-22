# SkyRoute Lima 3D — Equipo 03 | Agentes Inteligentes, USIL (2026-2)

**[Demo pública](https://tiagovald09.github.io/AI-2026-2-Equipo03-SkyRoute-Lima-3D/)** · **[Repositorio](https://github.com/TiagoVald09/AI-2026-2-Equipo03-SkyRoute-Lima-3D)**

**Problema.** Los operadores de respuesta a incidentes urbanos necesitan evaluar rutas que reduzcan tiempo y energía frente a obstáculos. SkyRoute permite comparar estrategias de navegación de un dron virtual. Los mapas, alertas, objetivos y vuelos son simulados; no corresponden a operaciones ni datos policiales reales.

**Técnicas.** Bloque 1: base aleatoria (también control manual en 3D), agente reactivo con memoria de visitas y A* con heurística Manhattan. Bloque 2: K-means para agrupar alertas y regresión lineal múltiple entrenada por mínimos cuadrados para estimar tiempo y energía.

## Resultados reproducibles

30 escenarios emparejados (semillas 42–71), 14 obstáculos, 2 objetivos estáticos, clima despejado y viento 0. Se prioriza el éxito y, en caso de empate, menos pasos y energía. Los promedios incluyen las corridas fallidas.

| Técnica | Éxitos | Pasos prom. | Tiempo prom. | Energía prom. |
|---|---:|---:|---:|---:|
| Base aleatoria | 1/30 (3,3 %) | 102,97 | 61,78 s | 102,97 |
| Reactivo | 30/30 | 20,00 | 12,00 s | 20,00 |
| **A*** | **30/30** | **19,27** | **11,56 s** | **19,27** |

**K-means (k=3):** 3,46 → 2,14 celdas (distancia media de alerta al centro más cercano; 30 escenarios, 45 alertas por escenario, tres centros en ambos métodos). **Regresión:** 400 registros sintéticos, 320 entrenamiento/80 prueba. Semilla 2026: MAE de tiempo 0,75 s y de energía 0,47 puntos. En 10 semillas, la interacción viento×clima redujo el MAE medio de energía de 0,5818 a 0,4189 (tiempo: 0,7677 s). Evidencias en `evidencias/`.

El laboratorio usa objetivos estáticos; no reproduce todas las dinámicas del simulador 3D. Prueba funcional adicional: A* interceptó 6/6 objetivos con lluvia y 30 obstáculos (148 pasos, 172,1 s). No es una comparación controlada ni evidencia de precisión en vuelos reales.

## Ejecución y validación

Abrir la demo con Internet y WebGL; iniciar misión o ejecutar el laboratorio y exportar CSV. Localmente, abrir `index.html` con un navegador moderno (Three.js y Tailwind por CDN). Con Node.js, ejecutar `node tests.js`: **30/30 pruebas aprobadas** en la versión con las correcciones de semillas y corridas. Código: `script.js` (simulador), `algorithms.js` (A*, K-means), `benchmark.js` (comparación), `ml.js` (regresión), `benchmark-ui.js` (resultados).

**IA generativa.** ChatGPT apoyó la implementación, integración, revisión, depuración y documentación del simulador, laboratorio y regresión; Claude Code apoyó la ampliación de pruebas de Jesús. Said utilizó un asistente de IA para revisar los algoritmos, identificar la interacción faltante y generar el script experimental. Los cambios y métricas se verificaron mediante ejecuciones y pruebas. El equipo debe declarar cualquier uso adicional de IA y explicar su código durante la defensa.

**Integrantes y contribuciones:** Santiago Valdivia Verano (2220841): integración, publicación, documentación y corrección del benchmark con apoyo de IA; Fabian Cristobal Nery (2210640): ajuste de tamaño y distribución de interfaz (`style.css`); Raul Jesus Camargo Vidarte (2310976): ampliación a 30 pruebas y reporte de errores (PR #1); Said Taravay (2310269): mejora del modelo de regresión y experimentos K-means (PR #2). **Docente:** Dr. José Alfredo Herrera Quispe.

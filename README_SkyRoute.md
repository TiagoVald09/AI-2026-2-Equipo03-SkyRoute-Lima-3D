# SkyRoute Lima 3D — Equipo 03 | Agentes Inteligentes, USIL (2026-2)

**Demo pública:** https://tiagovald09.github.io/AI-2026-2-Equipo03-SkyRoute-Lima-3D/  
**Repositorio:** https://github.com/TiagoVald09/AI-2026-2-Equipo03-SkyRoute-Lima-3D

**Problema.** Comparar métodos de navegación de un dron virtual para responder a incidentes en una ciudad con edificios, obstáculos, tráfico, objetivos móviles y batería limitada. Los mapas y las alertas son **simulados**, no corresponden a operaciones ni datos policiales reales.

**Métodos del curso.** **Bloque 1:** modo base aleatorio (además de control manual en la vista 3D), agente reactivo con memoria de visitas y búsqueda **A\*** sobre un mapa conocido, con heurística Manhattan. **Bloque 2:** **K-means** para agrupar alertas y **regresión lineal múltiple entrenada** por mínimos cuadrados para estimar tiempo y energía de vuelo con datos sintéticos.

## Comparación reproducible

Laboratorio de navegación discreta: **30 escenarios emparejados**, semillas **42–71**, **2 objetivos estáticos**, **14 obstáculos**, clima despejado y viento fijo 0. Cada estrategia recibe las mismas condiciones iniciales. Este laboratorio **no reproduce** todos los eventos dinámicos de la persecución 3D.

| Estrategia | Éxitos | Pasos promedio¹ | Tiempo promedio¹ |
|---|---:|---:|---:|
| Base aleatoria | 1/30 (3,3 %) | 102,97 | 61,78 s |
| Reactivo con memoria | 30/30 (100 %) | 20,00 | 12,00 s |
| **A\*** | **30/30 (100 %)** | **19,27** | **11,56 s** |

¹ Promedios de todas las corridas, incluidas las fallidas. Se prioriza tasa de éxito y, ante empate, menos pasos y energía. **K-means:** distancia media alerta-centro 3,46 celdas sin agrupamiento frente a **2,14** con K-means (30 escenarios). **Regresión:** 400 vuelos sintéticos, 320 para entrenamiento y 80 para prueba (semilla 2026); **MAE de prueba de 0,76 s** en tiempo y **0,60 puntos** de energía. Estas cifras no proceden de vuelos reales.

**Prueba adicional en la web publicada:** persecución A\* con **6/6 interceptados**, 30 obstáculos y lluvia, en 148 pasos y 172,1 s; es una prueba funcional interactiva, **no** una corrida emparejada del laboratorio. Las cifras de energía consumida y recuperada son acumuladas e incluyen bonificaciones y recargas, distintas de la batería restante.

## Cómo ejecutar y comprobar

Abrir la **demo pública** en un navegador moderno con WebGL e Internet (Three.js y Tailwind mediante CDN). Iniciar una misión o utilizar **Laboratorio de algoritmos → Ejecutar comparación** y **Exportar CSV**. También puede abrirse `index.html` localmente. Ejecutar `node tests.js` para las pruebas automáticas. Código principal: `script.js` (escena y agentes), `algorithms.js` (A\*, K-means), `benchmark.js` (experimentos), `ml.js` (entrenamiento y métricas), `benchmark-ui.js` (tabla); CSV en `evidencias/`.

**Uso de IA generativa.** Se utilizó **ChatGPT** como apoyo para desarrollar, revisar, depurar y documentar componentes del simulador, del laboratorio reproducible, del modelo de regresión y de sus pruebas. Los integrantes deben verificar el funcionamiento y poder explicar el código. Agregar aquí otras herramientas de IA utilizadas, si corresponde.

**Equipo 03:** Santiago Valdivia Verano (2220841), Fabian Cristobal Nery (2210640), Raul Jesus Camargo Vidarte (2310976) y Said Taravay (2310269). **Pendiente antes de entregar:** documentar la contribución *real* de cada integrante y verificar sus commits en GitHub.  
**Docente:** Dr. José Alfredo Herrera Quispe.

# SkyRoute Lima 3D · Equipo 03 · Agentes Inteligentes (USIL, 2026-2)

**Problema.** Comparar estrategias de navegación de un dron virtual de respuesta a incidentes con edificios, tráfico y batería limitada. Es una **simulación educativa** con distritos y alertas estilizados; no utiliza datos policiales ni navegación real de Lima.

**Bloque 1:** base aleatoria (también control manual en la escena), **Reactivo** (distancia Manhattan + memoria de visitas) y **A\*** (ruta mínima de pasos con heurística Manhattan en el mapa observado). **Bloque 2:** **K-means** (agrupa alertas y calcula tres centros) y **regresión lineal múltiple entrenada** por mínimos cuadrados para estimar tiempo y energía de vuelo. Los datos de entrenamiento son sintéticos.

## Comparación medida en la web

30 corridas emparejadas, semillas **42–71**, dos objetivos, 14 obstáculos, despejado y viento fijo 0. El laboratorio compara búsqueda sobre **objetivos estáticos**; la escena 3D incorpora movimiento y eventos dinámicos, por lo que no se deben equiparar ambos experimentos.

| Agente | Éxitos | Pasos promedio¹ | Tiempo promedio¹ |
|---|---:|---:|---:|
| Base aleatoria | 1/30 (3,3 %) | 102,97 | 61,78 s |
| Reactivo | 30/30 (100 %) | 20,00 | 12,00 s |
| A* | 30/30 (100 %) | **19,27** | **11,56 s** |

¹ Media de todas las corridas, incluidas las fallidas. Prioridad: éxito; si hay empate, pasos y energía. **K-means**: distancia alerta–centro con tres centros fijos, 3,46 celdas; con K-means, **2,14** (30 escenarios emparejados). **Regresión**: 400 vuelos sintéticos, 320 entrenamiento/80 prueba, semilla 2026; MAE de prueba **0,76 s** (tiempo) y **0,60 puntos** (energía). No son estadísticas de Lima.

## Ejecución y verificación

Abrir `index.html` en navegador con Internet y WebGL (Three.js y Tailwind vía CDN). En **Laboratorio de algoritmos**, ejecutar las corridas y descargar el CSV. `algorithms.js`: A*/K-means; `script.js`: simulación visual; `benchmark.js`: escenarios comparables; `ml.js`: entrenamiento/evaluación; `benchmark-ui.js`: resultados. `evidencias/` conserva los datos y resultados reproducibles. Probar con **`node tests.js`** (7 grupos). Publicar en GitHub Pages desde el repositorio `AI-2026-2-Equipo03-SkyRoute-Lima-3D` con commits de los cuatro integrantes; comprobar el enlace público.

**IA generativa:** ChatGPT ayudó a revisar y desarrollar comparaciones, regresión, pruebas y documentación de esta versión. El equipo debe agregar otras herramientas que haya utilizado y entender el código para la sustentación.

**Equipo:** Santiago Valdivia Verano (2220841); Fabian Cristobal Nery (2210640); Raul Jesus Camargo Vidarte (2310976); Said Taravay (2310269). **Antes de entregar: completar los roles reales de cada uno**. **Docente:** Dr. José Alfredo Herrera Quispe.

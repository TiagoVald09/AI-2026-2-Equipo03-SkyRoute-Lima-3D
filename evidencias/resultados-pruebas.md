# Resultados de pruebas — SkyRoute Lima 3D

| Dato | Valor |
|---|---|
| Fecha | 2026-11-21 19:40 |
| Rama | `jesus-pruebas` |
| Versión de Node | v24.14.1 |
| Comando | `node tests.js` |
| Resultado global | **28/30 aprobados** (2 fallos que corresponden a bugs reales, ver abajo). Código de salida: `1` |
| Archivo de pruebas | `tests.js` (no se modificó ningún módulo del proyecto) |

## Cambio en el ejecutor de pruebas

La función `test()` antes ejecutaba `fn()` sin capturar errores: la primera prueba fallida detenía todo el archivo y el resumen siempre decía `N/N`. Ahora:

- Cada prueba se ejecuta dentro de `try/catch`.
- Si falla, se imprime `FAIL nombre: mensaje` y se continúa con la siguiente.
- Al final se imprime `X/Y aprobados.` y la lista de pruebas fallidas.
- Si alguna falló, se asigna `process.exitCode = 1` (útil para CI o scripts).

## Tabla de pruebas

### Pruebas originales (se mantuvieron sin cambios)

| # | Prueba | Qué verifica | Resultado |
|---|---|---|---|
| 1 | A* ruta mínima en 70 mapas | La longitud de la ruta de A* es igual a la de una BFS (camino más corto real) en 70 escenarios. | OK |
| 2 | Misma semilla genera idéntico escenario | `sampleScenario(42)` dos veces da los mismos obstáculos y objetivos. | OK |
| 3 | Comparación reproducible con escenarios emparejados | `runComparison` con la misma semilla da resultados idénticos; las 3 estrategias usan el mismo escenario; A* gana las 30 corridas. | OK |
| 4 | Las tres estrategias terminan sin exceder 150 movimientos | Con lluvia, viento 2 y 29 obstáculos: pasos ≤ 150, capturados ≤ total, energía ≥ 0. | OK |
| 5 | K-means reduce distancia en el experimento default | K-means obtiene menor distancia media que 3 bases fijas; `kmeans(...,2)` devuelve 2 centroides. | OK |
| 6 | ML: entrenamiento separado de prueba | División 320/80, MAE de prueba < 2 y predicción positiva. | OK |
| 7 | ML: misma semilla, mismos coeficientes | Entrenar dos veces con semilla 2026 produce el mismo resultado. | OK |

### Pruebas nuevas

| # | Prueba | Qué verifica | Resultado |
|---|---|---|---|
| 8 | A* extremo: inicio igual a la meta | Devuelve ruta vacía `[]` y expande 1 nodo. | OK |
| 9 | A* extremo: meta rodeada por bloques | Devuelve `path: null`, termina y no expande más celdas que las que existen. | OK |
| 10 | A* extremo: meta bloqueada o fuera del mapa | Devuelve `null` en vez de una ruta inventada. | OK |
| 11 | A* extremo: sin obstáculos | Para las 432 celdas, la ruta mide exactamente la distancia Manhattan y es válida. | OK |
| 12 | A* extremo: densidad máxima (corredor) | Todo bloqueado salvo un pasillo en L: encuentra la única ruta (22 pasos); si se corta el pasillo, responde `null`. | OK |
| 13 | A* extremo: densidad máxima de `sampleScenario` | Con 30 obstáculos (y pidiendo 1000, que se limita a 30) y 5 semillas: rutas óptimas y válidas. | OK |
| 14 | A* rutas válidas (100 mapas) | Cada paso está dentro del mapa, no pisa celdas bloqueadas, avanza 1 celda y la ruta termina en la meta. | OK |
| 15 | Semillas: repetir semilla | Semillas 1, 7, 99, 2026, 123456: mismo escenario y mismo `runComparison` al repetir. | OK |
| 16 | Semillas: semillas distintas | Las 5 semillas generan 5 escenarios distintos. | OK |
| 17 | **[BUG]** Semilla 0 vs semilla 1 | Semilla 0 y semilla 1 deberían dar escenarios distintos. | **FAIL** (bug 1) |
| 18 | runComparison difícil: lluvia + viento 2 + 30 obstáculos + 6 objetivos | Límites: pasos ≤ 150, 0 ≤ capturados ≤ total ≤ 6, energía ≥ 0, tiempo ≥ 0, sin NaN/Infinity, `success` coherente, energía = pasos × costo. | OK |
| 19 | runComparison difícil: niebla + viento 5 + 25 obstáculos + 5 objetivos | Mismos límites. | OK |
| 20 | runComparison difícil: lluvia + viento 10 + 30 obstáculos + 6 objetivos | Mismos límites con viento extremo. | OK |
| 21 | runComparison difícil: nublado + 1000 obstáculos pedidos + 6 objetivos | Mismos límites; el número de obstáculos se limita. | OK |
| 22 | **[BUG]** runComparison con `runs` no numérico | El resumen no debería contener `NaN`. | **FAIL** (bug 2) |
| 23 | K-means k=1 | Un centroide finito, ubicado en el promedio de todos los puntos. | OK |
| 24 | K-means k = número de puntos | Cada punto queda como su propio centroide (count = 1). | OK |
| 25 | K-means k > puntos y lista vacía | k se limita al número de puntos; `[]` devuelve `[]`. | OK |
| 26 | K-means con puntos repetidos | Centroides finitos, ninguno se pierde (la suma de `count` = número de puntos). | OK |
| 27 | ML: valores límite | 0, 1 y 150 pasos; viento 0–2; 4 climas: predicciones finitas, ≥ 0, y > 0 desde 1 paso. | OK |
| 28 | ML: monotonía | Más pasos implica más tiempo y más energía predichos. | OK |
| 29 | ML: semillas | Misma semilla, mismo modelo y misma predicción (5 semillas); semillas distintas, modelo distinto. | OK |
| 30 | ML: predecir sin modelo | `predict(null, …)` lanza un error claro. | OK |

## Salida de la consola

```
OK A* ruta mínima en 70 mapas
OK misma semilla genera idéntico escenario
OK comparación reproducible con escenarios emparejados
OK las tres estrategias terminan sin exceder 150 movimientos
OK K-means produce tres centroides y reduce distancia en el experimento default
OK ML: entrenamiento separado de prueba y error de test finito
OK ML: repetir con la misma semilla produce mismos coeficientes
OK A* extremo: inicio igual a la meta devuelve ruta vacía
OK A* extremo: meta rodeada por bloques responde null sin colgarse
OK A* extremo: meta bloqueada o fuera del mapa responde null
OK A* extremo: sin obstáculos la ruta mide exactamente la distancia Manhattan
OK A* extremo: densidad máxima, solo queda un corredor libre
OK A* extremo: densidad máxima de sampleScenario (30 columnas, también si se piden 1000)
OK A* rutas válidas: sin celdas bloqueadas, dentro del mapa y paso a paso entre vecinos (100 mapas)
OK Semillas 1, 7, 99, 2026, 123456: mismo escenario al repetir la semilla
OK Semillas 1, 7, 99, 2026, 123456: semillas distintas dan escenarios distintos
FAIL [BUG] Semilla 0 y semilla 1 deberían generar escenarios distintos: semilla 0 y semilla 1 producen el mismo escenario
OK runComparison difícil: lluvia + viento 2 + 30 obstáculos + 6 objetivos
OK runComparison difícil: niebla + viento 5 + 25 obstáculos + 5 objetivos
OK runComparison difícil: lluvia + viento 10 (extremo) + 30 obstáculos + 6 objetivos
OK runComparison difícil: nublado + 1000 obstáculos pedidos + 6 objetivos
FAIL [BUG] runComparison con runs no numérico no debe devolver NaN: summary.random.successRate no es finito (NaN)
OK K-means k=1: un único centroide en el promedio de los puntos
OK K-means k = número de puntos: cada punto es su propio centroide
OK K-means k mayor que el número de puntos se limita, y lista vacía da []
OK K-means con puntos repetidos: centroides finitos y ningún punto se pierde
OK ML: predicciones finitas y no negativas en valores límite (0, 1 y 150 pasos; viento 0-2; 4 climas)
OK ML: más pasos implica más tiempo y más energía predichos
OK ML: misma semilla → mismas predicciones; semilla distinta → modelo distinto
OK ML: predecir sin modelo lanza un error claro

28/30 aprobados.
Fallidas (2): [BUG] Semilla 0 y semilla 1 deberían generar escenarios distintos | [BUG] runComparison con runs no numérico no debe devolver NaN
```

## Bugs encontrados (no corregidos; se reportan al responsable)

### Bug 1 — La semilla 0 produce el mismo escenario que la semilla 1
- **Archivo:** `benchmark.js`, función `rng(seed)`.
- **Causa:** `let a=(Number(seed)>>>0)||1;` — cuando la semilla es 0, `0||1` da 1, así que ambas semillas generan la misma secuencia aleatoria. Pasa lo mismo con cualquier semilla que, tras `>>>0`, dé 0 (por ejemplo 4294967296).
- **Reproducción:** `B.sampleScenario(0)` y `B.sampleScenario(1)` tienen los mismos obstáculos y objetivos.
- **Impacto:** bajo. La interfaz (`benchmark-ui.js`) obliga a que la semilla sea ≥ 1, así que el usuario no lo ve desde la web; sí afecta a quien llame a la función directamente (scripts, pruebas, `ml.js`).
- **Prueba que lo detecta:** #17.

### Bug 2 — `runComparison` devuelve `NaN` si `runs` no es numérico
- **Archivo:** `benchmark.js`, función `runComparison`.
- **Causa:** `Math.max(1,Math.min(100,Math.floor(runs)))` con `runs='abc'` da `NaN` (no se aplica el mínimo de 1), el bucle no se ejecuta, no hay registros y `successRate = 100*0/0 = NaN`.
- **Reproducción:** `B.runComparison({seed:1,runs:'abc'}).summary[0].successRate` → `NaN`.
- **Impacto:** bajo. La interfaz sanea `runs` antes de llamar a la función (`Number(...)||30`), así que solo ocurre al usar la API directamente.
- **Prueba que lo detecta:** #22.

### Observaciones (no se consideran bugs)
- `A.astar` no comprueba si la celda de **inicio** está bloqueada: si se le pasa un inicio dentro de un obstáculo, igual devuelve una ruta. En el proyecto el dron nunca empieza dentro de un obstáculo, por eso solo se deja anotado.
- `ML.predict` con 0 pasos da energía 0, porque el intercepto del modelo es negativo (−0.14) y la función lo recorta con `Math.max(0, …)`. Es razonable (0 pasos ⇒ 0 energía); por eso la prueba exige `> 0` solo desde 1 paso.
- `A.kmeans` con puntos repetidos y k > 1 puede devolver centroides duplicados con `count: 0`. Son finitos y no se pierde ningún punto, así que se considera aceptable.

## Uso de IA

Usé **Claude Code** (asistente de IA de Anthropic) para generar y revisar las pruebas de este archivo: leer el código de los módulos, proponer casos extremos, escribir la nueva versión de `test()` y redactar este informe. Yo revisé el código de las pruebas, ejecuté `node tests.js`, verifiqué los resultados y confirmé los dos bugs reproduciéndolos. No se modificó ningún archivo de otros compañeros (`algorithms.js`, `benchmark.js`, `ml.js`, `script.js`, `index.html`, `style.css`, README).

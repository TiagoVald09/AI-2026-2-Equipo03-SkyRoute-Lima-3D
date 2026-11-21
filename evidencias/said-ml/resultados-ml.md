# Resultados de ML y experimentos — Said (rama `said-ml`)

Comando para reproducir: `node evidencias/said-ml/experimentos_ml.js antes|despues` y `node tests.js`.

## Corrección concreta: regresión lineal de energía (`ml.js`)

**Problema.** Las etiquetas de energía se generan como `pasos * (1 + 0.3*viento) * clima + ruido`.
Esa fórmula contiene un término de interacción `pasos*viento*(clima-1)` que el modelo no tenía
(características: `[1, pasos, pasos*viento, pasos*(clima-1)]`), así que el ajuste quedaba por encima del piso de ruido.
El ruido uniforme de ±0.8 en la energía implica un MAE mínimo teórico de aproximadamente 0.40.

**Cambio.** Se agregó la característica `pasos*viento*(clima-1)` (4 → 5 coeficientes) en `rowFeatures` y `dim=5` en `fit`.

| Métrica (promedio de 10 semillas, 400 muestras, 80/20) | Antes | Después |
|---|---|---|
| MAE energía en prueba | 0.5818 | **0.4189** (−28 %) |
| MAE tiempo en prueba | 0.7672 | 0.7677 (sin cambio, no se tocó su lógica) |

Datos por semilla: `regresion_antes.csv` y `regresion_despues.csv`.
No hay sobreajuste: el MAE de energía en entrenamiento (~0.39) y en prueba (~0.42) son parecidos.
El MAE de tiempo (~0.77) sigue por encima de su piso porque las "interferencias" (15 % de los casos, +1 a +3) no dependen de ninguna característica y son ruido irreducible para este modelo.

## K-means vs 3 bases fijas, variando k (`kmeans_variando_k.csv`)

30 semillas por k, 45 alertas por corrida en 3 zonas. Métrica: distancia media de cada alerta a su centro más cercano (menor es mejor).

| k | Bases fijas (3) | K-means | Mejora |
|---|---|---|---|
| 1 | 3.4626 | 4.2391 | −22.4 % |
| 2 | 3.4626 | 2.8661 | 17.2 % |
| 3 | 3.4626 | 2.1406 | 38.2 % |
| 4 | 3.4626 | 1.6476 | 52.4 % |
| 5 | 3.4626 | 1.5456 | 55.4 % |
| 6 | 3.4626 | 1.3171 | 62.0 % |

Lectura: con k=3 (el valor del proyecto) K-means reduce 38 % la distancia. Con k=1 pierde porque la comparación es contra 3 bases fijas
(menos centros que la base); la distancia siempre baja al aumentar k, por eso esta métrica por sí sola no sirve para elegir k.

## Pruebas

`node tests.js`: **28/30 aprobados**, igual que antes del cambio. Las 2 fallas son los bugs de `benchmark.js` que ya reportó Jesús
(semilla 0 = semilla 1; `runs` no numérico devuelve NaN) y no se tocaron en este PR.
Las pruebas de ML (separación train/test, MAE < 2, misma semilla → mismos coeficientes, valores límite) siguen aprobando con el modelo de 5 coeficientes.

## Uso de IA

Se usó un asistente de IA como apoyo para revisar `ml.js`, `algorithms.js` y `benchmark.js`, detectar la característica faltante y escribir el script de experimentos.
Los resultados se verificaron ejecutando `experimentos_ml.js` y `tests.js` antes y después del cambio.

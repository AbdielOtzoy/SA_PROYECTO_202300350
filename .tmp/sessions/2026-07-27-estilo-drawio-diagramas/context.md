# Task Context: Restilo estético draw.io para diagramas de casos de uso

Session ID: 2026-07-27-estilo-drawio-diagramas
Created: 2026-07-27
Status: completed

## Current Request
Mejorar el estilo de los diagramas SVG en `docs/casos-de-uso/referencias/` (stickman extraños,
que parezcan generados por draw.io). CAMBIO SOLO ESTÉTICO: respetar actores, casos de uso,
relaciones (include/extend/generalización/asociaciones) y etiquetas tal como están definidos.

## Context Files (Standards to Follow)
- /Users/abdielo/.config/opencode/context/core/visual-development.md
- /Users/abdielo/.config/opencode/context/core/standards/documentation.md

## Reference Files (Source Material)
- docs/casos-de-uso/referencias/casos-de-uso/*.dot (5 diagramas)
- docs/casos-de-uso/referencias/casos-de-uso-locales/*.dot (11 diagramas)
- SVGs generados junto a cada .dot (mismo nombre)
- docs/casos-de-uso/modelo-casos-de-uso.md (referencia los SVG)

## Decisión de diseño (aprobada por el usuario)
- Paleta: **blanco y negro clásico draw.io** (elipses blancas borde negro, boundary
  rectangular blanco borde negro, líneas/texto negros).
- Actores: figura vectorial stickman estilo draw.io (cabeza círculo, cuerpo, brazos
  horizontales, piernas en V invertida), no arte ASCII.
- Include/extend: línea punteada con flecha abierta (arrowhead=open).
- Generalización (01-alto-nivel): arrowhead=empty (triángulo UML) — ya estaba.

## Técnica (verificada)
- Graphviz 14 propaga `class="actor"` del nodo al `<g class="node actor">` en SVG.
- Actores: `label="\n\n\n\nNombre"` (4 líneas vacías reservan espacio para la figura,
  no generan `<text>`). Se agrega `class="actor"` sin renombrar ids.
- Script `referencias/generar_svg.py`: corre `dot -Tsvg` por cada .dot y post-procesa
  el SVG inyectando el stickman vectorial en los grupos `class="node actor"`,
  anclado al centro-x y baseline-y del primer `<text>` del grupo.
- Defaults de edge: `color="#000000", arrowhead=open` (dir=none suprime flechas en
  asociaciones; generalización ya declara `empty`).

## Constraints
- NO cambiar semántica: mismos nodos, mismas relaciones, mismos textos.
- SVGs deben quedar autocontenidos (sin assets externos).
- graphviz (`dot`) y python3 disponibles en el sistema.

## Exit Criteria
- [ ] Script generar_svg.py funciona y regenera los 16 SVG
- [ ] Ningún SVG contiene el arte ASCII (○, ╲│╱, ╱ ╲)
- [ ] Verificación visual en navegador de al menos 3 SVG (uno local, 01-alto-nivel, uno con actor secundario)
- [ ] Estilo draw.io: elipses blancas borde negro, boundary rectangular, stickman vectorial, flechas abiertas en include/extend

# Ruta 9 — reconstrucción funcional de referencia

Esta carpeta contiene una **reconstrucción funcional sin build** basada en:

1. El prompt técnico de la transferencia.
2. El menú público actualmente visible en `menu-ruta9.marinolpxlp.chatgpt.site`.
3. La referencia AR subida en esta conversación (`assets/ar-reference.jpg`).

## Qué incluye

- Diseño mobile-first.
- Pantalla de inicio.
- Experiencia de menú con perspectiva 3D moderada.
- Movimiento por cursor/tacto.
- Interruptor de movimiento y restablecer vista.
- Búsqueda por código, nombre, ingrediente/categoría.
- Categorías actuales publicadas en el sitio: Todo, Burgers, Snacks, Papas, Burger Factory y Extras.
- Modal de detalle de producto.
- Demo AR conceptual con cámara opcional y un modelo CSS de aproximación para B1.
- Respeto de `prefers-reduced-motion`.
- Datos separados en `data.js` para facilitar edición.

## Datos usados

Los 57 productos publicados que aparecen en la web actual se cargaron en `data.js`: 25 Burgers, 6 Snacks, 15 Papas, 1 Burger Factory y 10 Extras.

Las categorías "Quesos", "Verduras", "Carnes" y "Salsas" aparecen en el prompt original como parte de la estructura deseada, pero el sitio público actual no expone productos independientes en esas categorías. Por eso **no se inventaron** opciones para llenarlas.

## Lo que sigue faltando para producción

- Código fuente original React/Vite del proyecto que estaba en la otra cuenta, si existe.
- Logo oficial como asset (la reconstrucción usa un tratamiento tipográfico provisional, no afirma ser el logo oficial).
- Fotografías reales por producto.
- Modelos 3D reales por producto y medidas verificadas.
- Autenticación/roles del administrador independiente.
- Backend (por ejemplo Supabase) para edición de carta, promociones y puntos.
- Deploy definitivo y QR.

## Cómo probar localmente

Puedes abrir `index.html` directamente, aunque la cámara AR suele requerir un contexto seguro. Para probar la cámara, usa HTTPS o un servidor local.

Con Node instalado:

```bash
npx http-server .
```

## Nota de fidelidad

La página pública actual declara que los tamaños AR son aproximados y dependen del modelo 3D configurado. Esta demo mantiene esa misma advertencia y no presenta el modelo CSS como un plato real.

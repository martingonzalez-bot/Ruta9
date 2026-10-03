# Ruta 9 — publicación pública y edición compartida

## Qué queda público
- `/` → menú Ruta 9 sin login.
- `/admin/` → interfaz administrativa pública, sin inicio de sesión.

## Importante sobre la llave
`admin/config.js` está vacío a propósito. No pongas una contraseña real en un repositorio público: cualquiera podría verla en el navegador. La llave de esta demo solo sirve para ocultar/mostrar la interfaz en ese navegador.

Para un admin real con cambios persistentes y permisos, la llave debe validarse en el backend. Ese backend no está contenido en los archivos originales disponibles aquí.

## Publicarlo de verdad
1. Sube este proyecto a un repositorio público de GitHub.
2. Añade a la otra persona como collaborator si debe editar el código. Los collaborators con write pueden hacer push de cambios.
3. GitHub Pages publicará el sitio mediante `.github/workflows/pages.yml`.
4. La URL será del estilo `https://TU-USUARIO.github.io/NOMBRE-REPO/` y el admin `.../admin/`.

La URL exacta no puede fijarse hasta conocer el usuario/nombre del repositorio y publicar el repositorio.

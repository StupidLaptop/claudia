# Juego de Memoria Familiar

Juego web simple para practicar reconocimiento de personas con fotos y nombres.

## Funciones

- Preguntas aleatorias con 3 opciones.
- Boton de audio por opcion (voz del navegador, idioma espanol).
- Confeti + sonido agradable al acertar.
- Feedback suave cuando se falla.
- Sistema de puntuacion, aciertos y niveles.
- Configuracion por YAML para que puedas cambiar nombres y fotos facilmente.

## Ejecutar

Desde esta carpeta:

```bash
python3 -m http.server 8000
```

Luego abre:

[http://localhost:8000](http://localhost:8000)

## Personalizar con fotos reales

1. Copia fotos a `assets/people/` (por ejemplo `.jpg`, `.png`, `.webp`).
2. Edita `data/people.yml` con cada persona:

```yml
people:
  - id: abuela_carmen
    name: "Abuela Carmen"
    image: "./assets/people/abuela-carmen.jpg"

  - id: tio_jose
    name: "Tio Jose"
    image: "./assets/people/tio-jose.png"

  - id: lucia
    name: "Lucia"
    image: "./assets/people/lucia.webp"
```

Notas:
- Deben existir al menos 3 personas.
- `id` puede ser cualquier texto sin espacios (recomendado).
- `name` es lo que se muestra y se lee en voz alta.

## Accesibilidad

- El boton `🔊` pronuncia cada opcion en espanol (`es-ES`).
- Si quieres una voz distinta, puedes cambiarla en `app.js` dentro de `speakText`.


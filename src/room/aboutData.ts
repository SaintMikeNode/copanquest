// "How it was made", the left page of the credits book in the bedroom (CreditsBook.tsx).
// Keep it short and true to the README (Layout, Terrain, Credits sections).
import type { L10n } from "../i18n";

export const ABOUT: { title: L10n; items: L10n[]; links?: boolean }[] = [
  {
    title: { es: "Quién", en: "Who" },
    // "código abierto" (GitHub), "nerdypunkdev" and "Todos en la Web" are links inside the text
    // (CreditsBook INLINE_LINKS: keep those words when editing it); the contact email goes below.
    links: true,
    items: [
      {
        es: "Un proyecto de código abierto por nerdypunkdev, como parte de Todos en la Web, programado con la ayuda de Claude, un asistente de IA.",
        en: "An open-source project by nerdypunkdev, part of Todos en la Web, programmed with the help of Claude, an AI assistant.",
      },
      {
        es: "Creado con fines recreativos y de divulgación científica, como un experimento para explorar cómo los datos abiertos pueden convertirse en una experiencia de juego.",
        en: "Made for fun and for science outreach, as an experiment in turning open data into a game experience.",
      },
    ],
  },
  {
    title: { es: "Un juego en el navegador", en: "A game in your browser" },
    items: [
      {
        es: "CopánQuest corre en el navegador de una computadora o un teléfono, sin instalar nada (también se puede instalar como app).",
        en: "CopánQuest runs in the browser on a computer or a phone, with nothing to install (it can also be installed as an app).",
      },
    ],
  },
  {
    title: { es: "Los datos", en: "The data" },
    items: [
      {
        es: "Relieve: el terreno es el del valle real, del modelo de elevación Copernicus GLO-30 (un punto cada 30 m).",
        en: "Terrain: the ground is the real valley, from the Copernicus GLO-30 elevation model (one point every 30 m).",
      },
      {
        es: "Mapa: la posición y el contorno de cada edificio vienen de OpenStreetMap, pasados a metros desde la Estela C.",
        en: "Map: every building's position and outline come from OpenStreetMap, converted to meters from Stela C.",
      },
      {
        es: "Satélite: con imágenes de satélite (Esri World Imagery Wayback, temporada seca de 2024) se revisó el mapa y se midió lo que faltaba o estaba mal, como el Juego de Pelota.",
        en: "Satellite: satellite imagery (Esri World Imagery Wayback, 2024 dry season) was used to check the map and measure what was missing or wrong, such as the Ball Court.",
      },
      {
        es: "Planos y maqueta: el plano del sitio y la maqueta del parque ayudaron a comprobar dónde va cada montículo.",
        en: "Plans and model: the site plan and the park's scale model helped confirm where each mound goes.",
      },
      {
        es: "Fotos: de las fotos de la réplica de Rosalila en el Museo de Escultura salieron sus proporciones. Otras fotos, dibujos y reconstrucciones solo se consultaron como referencia.",
        en: "Photos: Rosalila's proportions were measured from photos of its replica in the Sculpture Museum. Other photos, drawings and reconstructions were only used as reference.",
      },
      {
        es: "Medidas: se usan las publicadas; donde no las hay, las alturas son estimaciones y así quedan marcadas.",
        en: "Sizes: published measurements where they exist; where they don't, heights are estimates and marked as such.",
      },
      {
        es: "Historia: cada dato que cuenta el juego tiene su fuente, en la página de al lado.",
        en: "History: every fact in the game has a source, listed on the facing page.",
      },
    ],
  },
  {
    title: { es: "Cómo se construyó", en: "How it was built" },
    items: [
      {
        es: "Hecho con React y three.js (React Three Fiber) para el 3D, Rapier para la física y ecctrl para el personaje.",
        en: "Built with React and three.js (React Three Fiber) for the 3D, Rapier for physics and ecctrl for the character.",
      },
      {
        es: "El mundo está hecho de bloques de 0,5 m con texturas pixel dibujadas por código. Este cuarto es una escena aparte, en estilo PS2.",
        en: "The world is made of 0.5 m blocks with pixel textures drawn in code. This bedroom is a separate scene, in a PS2 style.",
      },
      {
        es: "Música y efectos de Ovani Sound; el disco del tocadiscos es una grabación de 1914 de dominio público.",
        en: "Music and sound effects by Ovani Sound; the record on the turntable is a public-domain recording from 1914.",
      },
    ],
  },
];

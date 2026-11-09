import type { Key, L10n } from "../i18n";

export interface CreditItem {
  title: string;
  url: string;
  credit?: string | L10n;
  license?: string | L10n;
}

export const CREDITS: { heading: Key; items: CreditItem[] }[] = [
  {
    heading: "credits.layout",
    items: [
      {
        title: "Copán site plan (CPN SITE PLAN 01)",
        url: "https://commons.wikimedia.org/wiki/File:CPN_SITE_PLAN_01_en.jpg",
        credit: "Arjuno3, after talk2winik (Wikimedia Commons; also on World History Encyclopedia)",
        license: "CC BY-SA 3.0",
      },
      {
        title: "OpenStreetMap",
        url: "https://www.openstreetmap.org/copyright",
        credit: "© OpenStreetMap contributors",
        license: "ODbL 1.0",
      },
      {
        title: "Maya day signs (tzolk'in) — menu and loading background",
        url: "https://commons.wikimedia.org/wiki/File:MAYA-g-log-cal-D20-Ajaw.svg",
        credit: {
          es: "Bluebalam (19 signos; Ok: original de CJLL Wright, vector de ExtendedPartition), Wikimedia Commons. Adaptados a pixel art.",
          en: "Bluebalam (19 signs; Ok: original by CJLL Wright, vector by ExtendedPartition), Wikimedia Commons. Adapted to pixel art.",
        },
        license: "CC BY-SA 4.0 (Ok: CC BY 2.5)",
      },
      {
        title: "Pixelify Sans (font)",
        url: "https://github.com/eifetx/Pixelify-Sans",
        credit: "The Pixelify Sans Project Authors",
        license: "SIL OFL 1.1",
      },
    ],
  },
  {
    heading: "credits.terrain",
    items: [
      {
        title: "Copernicus DEM GLO-30",
        url: "https://registry.opendata.aws/copernicus-dem/",
        credit:
          "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved",
      },
    ],
  },
  {
    heading: "credits.historic",
    items: [
      {
        title: "A. P. Maudslay, Biologia Centrali-Americana: Archaeology (1889–1902)",
        url: "https://biodiversitylibrary.org/item/106393",
        credit: { es: "Biodiversity Heritage Library", en: "Biodiversity Heritage Library" },
        license: "Dominio público / Public domain",
      },
    ],
  },
  {
    heading: "credits.facts",
    items: [
      { title: "Wikipedia — Copán", url: "https://es.wikipedia.org/wiki/Cop%C3%A1n_(sitio_arqueol%C3%B3gico)", license: "CC BY-SA 4.0" },
      { title: "Penn Museum, Expedition — Hieroglyphic Stairway; The Copan Corte", url: "https://www.penn.museum/sites/expedition/the-copan-corte/" },
      { title: "Uncovered History — The Stelae of Copán", url: "https://uncoveredhistory.com/honduras/copan/the-stelae-of-copan/" },
      { title: "Copán Altar Q & Kings (A. Hutnick)", url: "https://ahutnick.github.io/copanaltarqkings/" },
      { title: "Sugiyama et al. (2018), PLOS ONE", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6135383" },
      { title: "Asociación Copán — Rosalila", url: "https://asociacioncopan.org/rosalila-rescue/" },
      { title: "Asociación Copán — The Importance of Rosalila", url: "https://www.asociacioncopan.org/the-importance-of-rosalila/" },
      { title: "Mesoweb — Copán tour", url: "https://www.mesoweb.com/copan/tour/08.html" },
      { title: "Aoyama (1999), obsidiana de Ixtepeque en Copán — Mesoweb", url: "https://www.mesoweb.com/Simposio/pdf/12/Aoyama.1999.pdf" },
      { title: "Alfaro Moisa (2011), cerámica polícroma Copador en El Salvador", url: "https://antharky.ucalgary.ca/caadb/sites/antharky.ucalgary.ca.caadb/files/_Moisa_2011_Cer__mica_pol__croma_Copador_en_El_Salvador__An__lisis_de_los_contextos_de_Tazumal__San_Andr__s_y_Joya_de_Cer__n.pdf" },
      { title: "Neotropical Primates (2020): Cebus imitator en Honduras", url: "https://primate.socgen.ucla.edu/index.php/multivitaminic/article/view/79" },
      { title: "Webster & Freter (1990), Latin American Antiquity", url: "https://www.cambridge.org/core/journals/latin-american-antiquity/article/settlement-history-and-the-classic-collapse-at-copan-a-redefined-chronological-perspective/064579A73D12BC3BA7FDB6EE7763A827" },
    ],
  },
  {
    heading: "credits.reference",
    items: [
      { title: "UNAH (2016), actualización del mapa de Copán", url: "https://www.camjol.info/index.php/CE/article/view/5729" },
      { title: "mayaruins.com — Copán map", url: "https://mayaruins.com/copan/copan_map.html" },
      { title: "Mused — Copán 3D", url: "https://mused.com/copan/about" },
      { title: "Dennis R. Holloway — Copán reconstructions", url: "https://www.dennisrhollowayarchitect.com/Copan.html" },
      { title: "Tatiana Proskouriakoff, An Album of Maya Architecture", url: "https://archive.org/search?query=album+of+maya+architecture" },
      { title: "Getty — Hieroglyphic Stairway at Copán", url: "https://www.getty.edu/projects/maya-initiative/hieroglyphic-stairway-at-copan/" },
      { title: "Rosalila Temple (World History Encyclopedia)", url: "https://www.worldhistory.org/image/4066/rosalila-temple-copan/" },
      { title: "Wikimedia Commons — Rosalila replica photos (CPN Rosalila 01, Rosalila Temple, Honduras-0385B)", url: "https://commons.wikimedia.org/wiki/File:CPN_Rosalila_01.jpg" },
    ],
  },
  {
    heading: "credits.audio",
    items: [
      {
        title: "Casual Music Pack Vol. 1 — Tiki Party, Field Day",
        url: "https://ovanisound.com",
        credit: "Ovani Sound",
        license: { es: "Licencia libre de regalías de Ovani Sound", en: "Ovani Sound royalty-free license" },
      },
      {
        title: "Cozy Casual Sound FX Pack Vol. 2",
        url: "https://ovanisound.com",
        credit: "Ovani Sound",
        license: { es: "Licencia libre de regalías de Ovani Sound", en: "Ovani Sound royalty-free license" },
      },
    ],
  },
  {
    heading: "credits.software",
    items: [
      { title: "three.js", url: "https://threejs.org", license: "MIT" },
      { title: "React Three Fiber, drei, react-three-rapier, ecctrl (pmndrs)", url: "https://github.com/pmndrs", license: "MIT" },
      { title: "Rapier (Dimforge)", url: "https://rapier.rs", license: "Apache-2.0" },
      { title: "React", url: "https://react.dev", license: "MIT" },
      { title: "zustand", url: "https://github.com/pmndrs/zustand", license: "MIT" },
      { title: "PixelBlast (React Bits, David Haz)", url: "https://reactbits.dev/backgrounds/pixel-blast", license: "MIT + Commons Clause" },
    ],
  },
];

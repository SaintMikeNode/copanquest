import type { Key, L10n } from "../i18n";

export interface CreditItem {
  title: string;
  url: string;
  credit?: string | L10n;
  license?: string;
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
      { title: "Mesoweb — Copán tour", url: "https://www.mesoweb.com/copan/tour/08.html" },
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
    ],
  },
];

// People of Copán you can talk to, ambient townspeople, and the jaguars.
// Every fact in the dialogue is sourced (see README "Fact checking"); characters and names
// are fictional. The guide is a present-day Ch'orti' Maya — the Ch'orti' live in the Copán
// region today; the villagers show how Classic-period families lived (Joya de Cerén model).
import type { L10n } from "../i18n";

export interface Outfit {
  skin: string;
  hair: string;
  /** Shirt / huipil / cape color. */
  top: string;
  /** Woven band or embroidery color. */
  accent: string;
  /** Skirt (women) or loincloth/shorts (men). */
  bottom: string;
  female?: boolean;
  head?: "headband" | "turban" | "cap" | "none";
  basket?: boolean;
  modern?: boolean;
}

export interface Talker {
  id: string;
  name: L10n;
  home: [number, number];
  /** Wander radius (m). 0 = stays put. */
  wander: number;
  outfit: Outfit;
  lines: L10n[];
}

const SKIN = ["#8d5a3b", "#7a4b30", "#9a6542", "#6e432b"];

export const TALKERS: Talker[] = [
  {
    id: "guide",
    name: { es: "Don Mateo, guía ch'orti'", en: "Don Mateo, Ch'orti' guide" },
    home: [-139, 78],
    wander: 2,
    outfit: { skin: SKIN[0], hair: "#1d1410", top: "#e9e2cf", accent: "#2f6b4f", bottom: "#5a6f8a", head: "cap", modern: true },
    lines: [
      {
        es: "¡Bienvenida, bienvenido a Copán! Soy guía y soy maya ch'orti'. Los ch'orti' vivimos en esta región desde hace muchísimo tiempo.",
        en: "Welcome to Copán! I'm a guide and I'm Ch'orti' Maya. The Ch'orti' have lived in this region for a very, very long time.",
      },
      {
        es: "Aquí gobernó una dinastía de 16 reyes, desde el año 426 hasta después del 800. Sigue el camino de tierra hacia la Gran Plaza.",
        en: "A dynasty of 16 kings ruled here, from the year 426 until after 800. Follow the dirt trail to the Great Plaza.",
      },
      {
        es: "Junto al camino hay una aldea como las de antes, para que veas cómo vivían las familias mayas. ¡Habla con la gente!",
        en: "Next to the trail there's a village like the old ones, so you can see how Maya families lived. Talk to the people!",
      },
      {
        es: "Busca las 10 cuentas de jade escondidas. Algunas están muy alto… ¡usa las escaleras de madera para subir!",
        en: "Look for the 10 hidden jade beads. Some are way up high… use the wooden ladders to climb!",
      },
    ],
  },
  {
    id: "weaver",
    name: { es: "Abuela Ix Chel, tejedora", en: "Grandma Ix Chel, weaver" },
    home: [-115, 113],
    wander: 1.5,
    outfit: { skin: SKIN[1], hair: "#3a332e", top: "#f2ede0", accent: "#c0392b", bottom: "#2a5ca8", female: true, head: "turban" },
    lines: [
      {
        es: "Tejo en un telar de cintura: un extremo va amarrado a un poste y el otro a mi cintura.",
        en: "I weave on a backstrap loom: one end is tied to a post and the other to my waist.",
      },
      {
        es: "Hilamos algodón y lo teñimos con plantas. Con el añil y una arcilla especial se hace el famoso azul maya.",
        en: "We spin cotton and dye it with plants. Indigo mixed with a special clay makes the famous Maya blue.",
      },
    ],
  },
  {
    id: "farmer",
    name: { es: "Balam, agricultor", en: "Balam, farmer" },
    home: [-131, 150],
    wander: 4,
    outfit: { skin: SKIN[2], hair: "#1d1410", top: "#f2ede0", accent: "#d69a1c", bottom: "#f2ede0", head: "headband" },
    lines: [
      {
        es: "Esta es mi milpa. Sembramos maíz, frijol y ayote juntos: las tres plantas se ayudan entre sí.",
        en: "This is my milpa. We plant maize, beans and squash together: the three plants help each other.",
      },
      {
        es: "Para los mayas el maíz es sagrado. El Popol Vuh cuenta que los primeros humanos fueron hechos de masa de maíz.",
        en: "For the Maya, maize is sacred. The Popol Vuh says the first people were made from maize dough.",
      },
      {
        es: "Del agave sacamos fibra para hacer cuerdas, redes y bolsas.",
        en: "From the agave we get fiber to make ropes, nets and bags.",
      },
    ],
  },
  {
    id: "merchant",
    name: { es: "Kan, mercader de cacao", en: "Kan, cacao merchant" },
    home: [-124, 86],
    wander: 1,
    outfit: { skin: SKIN[0], hair: "#1d1410", top: "#c46a3a", accent: "#f2c42c", bottom: "#f2ede0", head: "headband" },
    lines: [
      {
        es: "¡Cacao, cacao! Con estos granos se prepara una bebida espumosa y amarga, muy apreciada por los nobles.",
        en: "Cacao, cacao! These beans make a frothy, bitter drink that nobles loved.",
      },
      {
        es: "Los granos de cacao eran tan valiosos que, con el tiempo, se usaron como moneda.",
        en: "Cacao beans were so valuable that, over time, people used them as money.",
      },
      {
        es: "En el mercado también se cambiaban jade, obsidiana, sal, plumas y cerámica.",
        en: "At the market people also traded jade, obsidian, salt, feathers and pottery.",
      },
    ],
  },
  {
    id: "scribe",
    name: { es: "Ah Kin, escriba", en: "Ah Kin, scribe" },
    home: [-20, 222],
    wander: 1.5,
    outfit: { skin: SKIN[3], hair: "#1d1410", top: "#f2ede0", accent: "#1f62d0", bottom: "#f2ede0", head: "turban" },
    lines: [
      {
        es: "Soy escriba. Pinto con pinceles en libros de corteza de árbol, doblados como un acordeón: los códices.",
        en: "I'm a scribe. I paint with brushes on books made of tree bark, folded like an accordion: the codices.",
      },
      {
        es: "Contamos con puntos, barras y una concha: un punto vale 1, una barra vale 5 y la concha es el cero.",
        en: "We count with dots, bars and a shell: a dot is 1, a bar is 5 and the shell is zero.",
      },
      {
        es: "¡Los mayas ya usaban el cero hace más de 1,500 años!",
        en: "The Maya were already using zero more than 1,500 years ago!",
      },
    ],
  },
  {
    id: "ballplayer",
    name: { es: "Hun, jugador de pelota", en: "Hun, ballplayer" },
    home: [22, 150],
    wander: 3,
    outfit: { skin: SKIN[2], hair: "#1d1410", top: "#8a5a3a", accent: "#c0392b", bottom: "#f2ede0", head: "headband" },
    lines: [
      {
        es: "En el juego de pelota no se usan las manos ni los pies: le pegamos a la pelota con la cadera.",
        en: "In the ballgame you can't use your hands or feet: we hit the ball with our hips.",
      },
      {
        es: "La pelota es de hule, pesada y saltarina. El hule sale de la savia de un árbol.",
        en: "The ball is made of rubber, heavy and bouncy. Rubber comes from the sap of a tree.",
      },
      {
        es: "En los muros inclinados de esta cancha hay cabezas de guacamaya talladas en piedra.",
        en: "On the sloped walls of this court there are macaw heads carved in stone.",
      },
    ],
  },
  {
    id: "sculptor",
    name: { es: "Yax, escultor", en: "Yax, sculptor" },
    home: [36, 72],
    wander: 2,
    outfit: { skin: SKIN[1], hair: "#1d1410", top: "#f2ede0", accent: "#7a8b6a", bottom: "#d8cfb8", head: "headband" },
    lines: [
      {
        es: "Estoy tallando una estela. La piedra de Copán es toba volcánica: blanda al sacarla de la cantera y más dura con el tiempo.",
        en: "I'm carving a stela. Copán's stone is volcanic tuff: soft when it comes out of the quarry, harder with time.",
      },
      {
        es: "No usamos metal: tallamos con herramientas de piedra más dura, como el pedernal.",
        en: "We don't use metal: we carve with tools made of harder stone, like flint.",
      },
      {
        es: "Por eso las estelas de Copán tienen relieves tan profundos, ¡casi parecen estatuas!",
        en: "That's why Copán's stelae have such deep relief — they almost look like statues!",
      },
    ],
  },
  {
    id: "kid",
    name: { es: "Nikte', niña de la aldea", en: "Nikte', village girl" },
    home: [-90, 142],
    wander: 4,
    outfit: { skin: SKIN[0], hair: "#1d1410", top: "#f2ede0", accent: "#e86aa4", bottom: "#c0392b", female: true, head: "none" },
    lines: [
      {
        es: "¡Hola! Ayudo a mi mamá a moler maíz en la piedra de moler, el metate.",
        en: "Hi! I help my mom grind maize on the grinding stone, the metate.",
      },
      {
        es: "Tenemos chompipes y perritos. Los mayas criaban pavos y perros.",
        en: "We have turkeys and puppies. The Maya raised turkeys and dogs.",
      },
      {
        es: "¿Ves la casita redonda? Es el temazcal, un baño de vapor para limpiarse y curarse.",
        en: "See the little round house? It's the temazcal, a steam bath for getting clean and healing.",
      },
    ],
  },
];

export const JAGUAR_LINES: L10n[] = [
  {
    es: "El jaguar (b'alam en maya) es el felino más grande de América.",
    en: "The jaguar (b'alam in Maya) is the largest cat in the Americas.",
  },
  {
    es: "Para los mayas era un animal sagrado y poderoso. Los reyes usaban pieles de jaguar.",
    en: "For the Maya it was a sacred, powerful animal. Kings wore jaguar skins.",
  },
  {
    es: "Hoy los jaguares están en peligro. En Honduras todavía viven en bosques como los de La Mosquitia.",
    en: "Today jaguars are endangered. In Honduras they still live in forests like those of La Mosquitia.",
  },
];

export const JAGUAR_NAME: L10n = { es: "Jaguar (b'alam)", en: "Jaguar (b'alam)" };

/** Jaguars roam inside these areas [minX, minZ, maxX, maxZ] (edges of the woods). */
export const JAGUAR_RANGES: [number, number, number, number][] = [
  [-140, -65, -95, -35],
  [90, 340, 135, 385],
  [150, 40, 195, 120],
];

/** Townspeople walking the trails (index into PATHS, offset along it 0..1, side offset). */
export const WALKERS: { path: number; t: number; side: number; speed: number; outfit: Outfit }[] = [
  { path: 0, t: 0.1, side: 0.7, speed: 1.0, outfit: { skin: SKIN[1], hair: "#1d1410", top: "#f2ede0", accent: "#c0392b", bottom: "#2a5ca8", female: true, head: "turban", basket: true } },
  { path: 0, t: 0.55, side: -0.7, speed: 1.15, outfit: { skin: SKIN[2], hair: "#1d1410", top: "#f2ede0", accent: "#1f62d0", bottom: "#f2ede0", head: "headband" } },
  { path: 1, t: 0.3, side: 0.6, speed: 0.9, outfit: { skin: SKIN[0], hair: "#1d1410", top: "#d69a1c", accent: "#f2ede0", bottom: "#f2ede0", head: "headband", basket: true } },
  { path: 2, t: 0.2, side: -0.6, speed: 1.1, outfit: { skin: SKIN[3], hair: "#3a332e", top: "#f2ede0", accent: "#2f6b4f", bottom: "#7a2a6a", female: true, head: "none" } },
  { path: 2, t: 0.7, side: 0.6, speed: 1.0, outfit: { skin: SKIN[1], hair: "#1d1410", top: "#c46a3a", accent: "#f2c42c", bottom: "#f2ede0", head: "turban", basket: true } },
  { path: 3, t: 0.4, side: 0.7, speed: 0.95, outfit: { skin: SKIN[2], hair: "#1d1410", top: "#f2ede0", accent: "#c0392b", bottom: "#c0392b", female: true, head: "turban" } },
  { path: 4, t: 0.5, side: -0.5, speed: 0.9, outfit: { skin: SKIN[0], hair: "#1d1410", top: "#2a5ca8", accent: "#f2ede0", bottom: "#f2ede0", head: "headband" } },
  { path: 5, t: 0.3, side: 0.5, speed: 1.05, outfit: { skin: SKIN[3], hair: "#1d1410", top: "#f2ede0", accent: "#d69a1c", bottom: "#5a3a22", female: true, head: "none", basket: true } },
];

/** Name and lines for anything talkable (villager or jaguar). */
export function talkInfo(id: string): { name: L10n; lines: L10n[]; verb: "talk" | "observe" } | null {
  if (id.startsWith("jaguar")) return { name: JAGUAR_NAME, lines: JAGUAR_LINES, verb: "observe" };
  const t = TALKERS.find((q) => q.id === id);
  return t ? { name: t.name, lines: t.lines, verb: "talk" } : null;
}

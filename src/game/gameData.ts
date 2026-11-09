// Quests, collectible items, dig sites, artifacts, glyph puzzles and photo subjects.
// Facts are sourced (see README "Fact checking"); game layout (where things are) is invented.
import type { L10n } from "../i18n";

// ---------------------------------------------------------------- items & pickups

export type Item = "cacao" | "anil" | "maize" | "flint" | "glyph";

export const ITEM_NAMES: Record<Item, L10n> = {
  cacao: { es: "mazorca de cacao", en: "cacao pod" },
  anil: { es: "planta de añil", en: "indigo plant" },
  maize: { es: "mazorca de maíz", en: "ear of maize" },
  flint: { es: "pedernal", en: "flint" },
  glyph: { es: "fragmento de glifo", en: "glyph fragment" },
};

/** Things lying around the world. y is found by raycast at runtime. */
export const PICKUPS: { id: string; item: Item; at: [number, number] }[] = [
  // Cacao pods under the fruit trees by the houses
  ...([[-64.5, 127], [-67.5, 129.5], [-62.5, 135], [-65.5, 137.5], [-68.5, 145], [-71.5, 147.5]] as [number, number][]).map(
    (at, i) => ({ id: `cacao-${i}`, item: "cacao" as const, at }),
  ),
  // Indigo shrubs along the field edges
  ...([[-102, 168], [-96, 169.5], [-74, 169], [-64, 160], [-108, 194]] as [number, number][]).map((at, i) => ({
    id: `anil-${i}`,
    item: "anil" as const,
    at,
  })),
  // Ripe ears in the milpa
  ...([[-144, 135], [-140, 142], [-137, 150], [-143, 158], [-139, 166], [-135, 175], [-141, 183], [-136, 189]] as [number, number][]).map(
    (at, i) => ({ id: `maize-${i}`, item: "maize" as const, at }),
  ),
  // Flint nodules near the sculptor's workshop
  ...([[45, 77], [29, 64], [48, 90]] as [number, number][]).map((at, i) => ({ id: `flint-${i}`, item: "flint" as const, at })),
  // Glyph fragments scattered around the ruins
  ...([[-60, 10], [40, 38], [-30, 150], [72, 176], [100, 262], [-20, 300]] as [number, number][]).map((at, i) => ({
    id: `glyph-${i}`,
    item: "glyph" as const,
    at,
  })),
];

// ---------------------------------------------------------------- quests

export interface Quest {
  id: string;
  giver: string;
  title: L10n;
  goal: L10n;
  /** Returns [have, need]. */
  progress: (s: QuestCheck) => [number, number];
  offer: L10n[];
  /** Said when the player comes back before finishing. */
  remind: L10n;
  done: L10n[];
  /** Items handed over when finishing. */
  consume?: [Item, number];
}

export interface QuestCheck {
  items: Record<string, number>;
  photos: string[];
  solvedGlyphs: number;
  ballScore: number;
  turkeys: number;
  artifacts: number;
}

export const QUESTS: Quest[] = [
  {
    id: "photographer",
    giver: "guide",
    title: { es: "Fotógrafo de la selva", en: "Jungle photographer" },
    goal: { es: "Fotografía 3 animales distintos", en: "Photograph 3 different animals" },
    progress: (s) => [s.photos.filter((p) => ANIMAL_IDS.includes(p)).length, 3],
    offer: [
      {
        es: "¡Toma! Esta cámara es para ti. Abre la cámara con el botón 📷 y apunta a lo que quieras guardar en tu álbum.",
        en: "Here! This camera is for you. Open it with the 📷 button and aim at whatever you want to keep in your album.",
      },
      {
        es: "Tráeme fotos de 3 animales distintos: guacamayas, guatusas, chompipes… ¡y si te atreves, un jaguar!",
        en: "Bring me photos of 3 different animals: macaws, agoutis, turkeys… and if you dare, a jaguar!",
      },
    ],
    remind: { es: "¿Ya tienes fotos de 3 animales? Mira tu diario 📖.", en: "Got photos of 3 animals yet? Check your journal 📖." },
    done: [
      {
        es: "¡Qué fotos! La guacamaya roja es el ave nacional de Honduras. Ahora habla con la gente de la aldea: todos necesitan ayuda.",
        en: "Great photos! The scarlet macaw is Honduras' national bird. Now talk to the village people: everyone needs help.",
      },
    ],
  },
  {
    id: "anil",
    giver: "weaver",
    title: { es: "Azul maya", en: "Maya blue" },
    goal: { es: "Junta 5 plantas de añil", en: "Gather 5 indigo plants" },
    progress: (s) => [s.items.anil ?? 0, 5],
    consume: ["anil", 5],
    offer: [
      {
        es: "Quiero teñir hilo de azul, pero se me acabó el añil. Crece en arbustos a la orilla de los campos de maíz.",
        en: "I want to dye thread blue, but I ran out of indigo. It grows in shrubs at the edge of the maize fields.",
      },
      { es: "¿Me traes 5 plantas de añil?", en: "Can you bring me 5 indigo plants?" },
    ],
    remind: { es: "El añil crece junto a los campos de maíz. Necesito 5.", en: "Indigo grows by the maize fields. I need 5." },
    done: [
      {
        es: "¡Gracias! Del añil sale el color índigo. Mezclado con una arcilla especial, los mayas hicieron el azul maya, un color que no se borra.",
        en: "Thank you! Indigo gives a deep blue dye. Mixed with a special clay, the Maya made Maya blue, a color that doesn't fade.",
      },
    ],
  },
  {
    id: "cacao",
    giver: "merchant",
    title: { es: "Mazorcas de cacao", en: "Cacao pods" },
    goal: { es: "Recoge 6 mazorcas de cacao", en: "Pick 6 cacao pods" },
    progress: (s) => [s.items.cacao ?? 0, 6],
    consume: ["cacao", 6],
    offer: [
      {
        es: "Mis clientes quieren bebida de cacao y no tengo granos. Las mazorcas caen bajo los árboles junto a las casas.",
        en: "My customers want cacao drink and I'm out of beans. The pods fall under the trees by the houses.",
      },
      { es: "¿Me traes 6 mazorcas?", en: "Can you bring me 6 pods?" },
    ],
    remind: { es: "Busca bajo los árboles cerca de las casas. Necesito 6.", en: "Look under the trees near the houses. I need 6." },
    done: [
      {
        es: "¡Perfecto! Dentro de cada mazorca hay granos que se secan, se tuestan y se muelen para hacer la bebida de cacao.",
        en: "Perfect! Inside each pod are beans that are dried, roasted and ground to make the cacao drink.",
      },
    ],
  },
  {
    id: "maize",
    giver: "farmer",
    title: { es: "La cosecha", en: "The harvest" },
    goal: { es: "Cosecha 8 mazorcas de maíz", en: "Harvest 8 ears of maize" },
    progress: (s) => [s.items.maize ?? 0, 8],
    consume: ["maize", 8],
    offer: [
      { es: "¡El maíz está listo! Ayúdame a cosechar 8 mazorcas en la milpa grande, al oeste.", en: "The maize is ready! Help me harvest 8 ears in the big milpa to the west." },
    ],
    remind: { es: "Las mazorcas están en la milpa grande. Necesito 8.", en: "The ears are in the big milpa. I need 8." },
    done: [
      {
        es: "¡Gracias! Con el maíz se hacen tamales y atol. El maíz era la base de la comida maya.",
        en: "Thanks! Maize makes tamales and atole. Maize was the base of the Maya diet.",
      },
    ],
  },
  {
    id: "glyphs",
    giver: "scribe",
    title: { es: "Glifos perdidos", en: "Lost glyphs" },
    goal: { es: "Encuentra y lee 6 fragmentos de glifos", en: "Find and read 6 glyph fragments" },
    progress: (s) => [s.solvedGlyphs, 6],
    offer: [
      {
        es: "Se rompió una tabla con números y se perdieron 6 fragmentos entre las ruinas. Tráemelos y te enseño a leerlos.",
        en: "A tablet with numbers broke and 6 fragments got lost among the ruins. Bring them and I'll teach you to read them.",
      },
    ],
    remind: { es: "Cuando tengas fragmentos, háblame y los leemos juntos.", en: "When you have fragments, talk to me and we'll read them together." },
    done: [
      {
        es: "¡Ya sabes leer números mayas! Con ellos los escribas anotaban fechas, como las que tienen las estelas de la Gran Plaza.",
        en: "You can read Maya numbers now! Scribes used them to write dates, like the ones on the Great Plaza stelae.",
      },
    ],
  },
  {
    id: "ball",
    giver: "ballplayer",
    title: { es: "¡A jugar pelota!", en: "Let's play ball!" },
    goal: { es: "Pega la pelota en 3 cabezas de guacamaya", en: "Hit 3 macaw-head markers with the ball" },
    progress: (s) => [Math.min(s.ballScore, 3), 3],
    offer: [
      {
        es: "Ve a la cancha. Acércate a la pelota y usa GOLPEAR para pegarle con la cadera. ¡Dale a las cabezas de guacamaya de los muros inclinados!",
        en: "Go to the court. Get close to the ball and press HIT to bump it with your hip. Aim for the macaw heads on the sloped walls!",
      },
    ],
    remind: { es: "Pega la pelota en 3 cabezas de guacamaya.", en: "Hit 3 macaw heads with the ball." },
    done: [
      {
        es: "¡Eres un gran jugador! En Copán el juego de pelota también era una ceremonia importante.",
        en: "You're a great player! In Copán the ballgame was also an important ceremony.",
      },
    ],
  },
  {
    id: "flint",
    giver: "sculptor",
    title: { es: "Herramientas de piedra", en: "Stone tools" },
    goal: { es: "Trae 3 pedernales", en: "Bring 3 pieces of flint" },
    progress: (s) => [s.items.flint ?? 0, 3],
    consume: ["flint", 3],
    offer: [
      { es: "Se me gastaron los cinceles. Hay pedernal tirado cerca del taller. ¿Me traes 3?", en: "My chisels wore out. There's flint lying near the workshop. Can you bring me 3?" },
    ],
    remind: { es: "Busca pedernal cerca del taller. Necesito 3.", en: "Look for flint near the workshop. I need 3." },
    done: [
      {
        es: "¡Excelente! El pedernal se rompe en filos muy duros. Con él se tallaba la toba volcánica de las estelas.",
        en: "Excellent! Flint breaks into very hard edges. It was used to carve the volcanic tuff of the stelae.",
      },
    ],
  },
  {
    id: "turkeys",
    giver: "kid",
    title: { es: "Chompipes perdidos", en: "Lost turkeys" },
    goal: { es: "Encuentra los 4 chompipes", en: "Find the 4 turkeys" },
    progress: (s) => [s.turkeys, 4],
    offer: [
      { es: "¡Se escaparon mis 4 chompipes! Si los tocas, regresan corriendo a casa. ¿Me ayudas?", en: "My 4 turkeys ran away! If you touch them, they'll run back home. Will you help me?" },
    ],
    remind: { es: "Faltan chompipes. Andan por la aldea y los campos.", en: "Some turkeys are still missing. They're around the village and fields." },
    done: [
      {
        es: "¡Gracias! Los mayas criaban pavos por su carne y sus plumas. Aquí en Honduras les decimos chompipes.",
        en: "Thank you! The Maya raised turkeys for meat and feathers. Here in Honduras we call them chompipes.",
      },
    ],
  },
  {
    id: "dig",
    giver: "guide",
    title: { es: "Arqueología", en: "Archaeology" },
    goal: { es: "Excava 3 sitios marcados con estacas", en: "Dig 3 sites marked with stakes" },
    progress: (s) => [Math.min(s.artifacts, 3), 3],
    offer: [
      {
        es: "Los arqueólogos marcan con estacas y cuerdas donde van a excavar. Busca esos cuadros y excava con cuidado.",
        en: "Archaeologists mark the places they'll dig with stakes and string. Find those squares and dig carefully.",
      },
    ],
    remind: { es: "Busca los cuadros con estacas y cuerdas.", en: "Look for the squares with stakes and string." },
    done: [
      {
        es: "¡Bien hecho! Cada objeto cuenta algo de la vida diaria. Tus hallazgos están en el museo de tu diario.",
        en: "Well done! Every object tells us about daily life. Your finds are in the museum in your journal.",
      },
    ],
  },
];

// ---------------------------------------------------------------- digging

export const DIG_SITES: { id: string; at: [number, number] }[] = [
  { id: "dig-0", at: [-48, 140] },
  { id: "dig-1", at: [54, 102] },
  { id: "dig-2", at: [-14, 196] },
  { id: "dig-3", at: [140, 62] },
  { id: "dig-4", at: [-90, 168] },
];

export const ARTIFACTS: { id: string; name: L10n; fact: L10n; color: string }[] = [
  {
    id: "copador",
    name: { es: "Tiesto de cerámica Copador", en: "Copador pottery shard" },
    fact: {
      es: "La cerámica Copador, pintada en rojo y negro sobre fondo naranja, se hacía en la región de Copán.",
      en: "Copador pottery, painted red and black on an orange background, was made in the Copán region.",
    },
    color: "#d9854e",
  },
  {
    id: "obsidian",
    name: { es: "Navaja de obsidiana", en: "Obsidian blade" },
    fact: {
      es: "La obsidiana es vidrio volcánico muy filoso. La de Copán venía de Ixtepeque, en Guatemala.",
      en: "Obsidian is a very sharp volcanic glass. Copán's came from Ixtepeque, in Guatemala.",
    },
    color: "#2a2a3a",
  },
  {
    id: "shell",
    name: { es: "Cuenta de concha", en: "Shell bead" },
    fact: {
      es: "Las conchas llegaban del mar por comercio y se usaban para collares y adornos.",
      en: "Shells came from the sea through trade and were used for necklaces and ornaments.",
    },
    color: "#f2e6d0",
  },
  {
    id: "whorl",
    name: { es: "Malacate", en: "Spindle whorl" },
    fact: {
      es: "Un malacate es un disquito que hace girar el huso para hilar algodón.",
      en: "A spindle whorl is a small disk that spins the spindle to make cotton thread.",
    },
    color: "#a6502c",
  },
  {
    id: "celt",
    name: { es: "Hacha de piedra verde", en: "Greenstone axe" },
    fact: {
      es: "Sin herramientas de metal, los mayas usaban hachas de piedra pulida para cortar y trabajar la madera.",
      en: "Without metal tools, the Maya used polished stone axes to cut and work wood.",
    },
    color: "#4f8a74",
  },
];

// ---------------------------------------------------------------- glyph puzzles (Maya numbers)

/** Each fragment shows a Maya number (dots = 1, bars = 5, shell = 0). */
export const GLYPH_NUMBERS: Record<string, number> = {
  "glyph-0": 0,
  "glyph-1": 7,
  "glyph-2": 12,
  "glyph-3": 5,
  "glyph-4": 19,
  "glyph-5": 13,
};

// ---------------------------------------------------------------- photo subjects

export type SubjectKind = "animal" | "monument" | "person";

export const ANIMALS: { id: string; name: L10n; fact: L10n }[] = [
  {
    id: "macaw",
    name: { es: "Guacamaya roja", en: "Scarlet macaw" },
    fact: {
      es: "Es el ave nacional de Honduras. Para los mayas de Copán estaba ligada al sol.",
      en: "It's the national bird of Honduras. For the Maya of Copán it was linked to the sun.",
    },
  },
  {
    id: "jaguar",
    name: { es: "Jaguar", en: "Jaguar" },
    fact: { es: "El felino más grande de América; los mayas lo llamaban b'alam.", en: "The largest cat in the Americas; the Maya called it b'alam." },
  },
  {
    id: "agouti",
    name: { es: "Guatusa", en: "Agouti" },
    fact: {
      es: "Este roedor entierra semillas para comerlas después; las que olvida se convierten en árboles nuevos.",
      en: "This rodent buries seeds to eat later; the ones it forgets grow into new trees.",
    },
  },
  {
    id: "capuchin",
    name: { es: "Mono cara blanca", en: "White-faced capuchin" },
    fact: {
      es: "Es uno de los tres monos que viven en Honduras, junto al mono araña y el mono aullador. Vive en grupos y come frutas e insectos.",
      en: "It's one of the three monkeys that live in Honduras, along with the spider monkey and the howler monkey. It lives in groups and eats fruit and insects.",
    },
  },
  {
    id: "turkey",
    name: { es: "Chompipe", en: "Turkey" },
    fact: { es: "Los mayas criaban pavos. En Honduras les decimos chompipes.", en: "The Maya raised turkeys. In Honduras we call them chompipes." },
  },
];

export const ANIMAL_IDS = ANIMALS.map((a) => a.id);

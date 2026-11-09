// Points of interest: walking within `radius` meters shows an info card.
// Spanish first. Every fact here comes from the source listed in `source`; dates are
// rounded to the year because published Gregorian dates differ by a few days depending on
// the calendar correlation used.
import type { L10n } from "../i18n";
import { ACROPOLIS_TOP } from "../world/siteData";

export interface Poi {
  id: string;
  /** [x, z] in local meters (see world/siteData.ts). */
  position: [number, number];
  /** Ground height at the POI. */
  y?: number;
  radius: number;
  /** Height of the floating marker above the ground. */
  markerHeight: number;
  title: L10n;
  date?: L10n;
  body: L10n;
  source?: string;
}

const KING18 = "Waxaklajuun Ub'aah K'awiil";

export const POIS: Poi[] = [
  {
    id: "stela-c",
    position: [0, 0],
    radius: 5,
    markerHeight: 5,
    title: { es: "Estela C", en: "Stela C" },
    date: { es: "Año 711 d. C.", en: "AD 711" },
    body: {
      es: `Es la primera de las siete estelas que el rey ${KING18} (conocido como 18 Conejo) colocó en la Gran Plaza. ¡Tiene dos caras! Del lado este se ve al rey joven y del lado oeste, al rey anciano con barba. Su altar tiene forma de tortuga.`,
      en: `This is the first of the seven stelae that King ${KING18} (known as 18 Rabbit) placed in the Great Plaza. It has two faces! The east side shows the king as a young man and the west side shows him old and bearded. Its altar is shaped like a turtle.`,
    },
    source: "Uncovered History, “The Stelae of Copán”; Wikipedia",
  },
  {
    id: "stela-f",
    position: [24, 18.4],
    radius: 4.5,
    markerHeight: 5,
    title: { es: "Estela F", en: "Stela F" },
    date: { es: "Año 721 d. C.", en: "AD 721" },
    body: {
      es: "Aquí el rey 18 Conejo aparece vestido como jugador de pelota y guerrero. Fue pensada como pareja de la Estela 4, que está al otro lado de la plaza.",
      en: "Here King 18 Rabbit is dressed as a ballplayer and a warrior. It was planned as a pair with Stela 4, on the other side of the plaza.",
    },
    source: "Uncovered History; mayaruins.com",
  },
  {
    id: "stela-4",
    position: [-16.5, 32.2],
    radius: 4.5,
    markerHeight: 5,
    title: { es: "Estela 4", en: "Stela 4" },
    date: { es: "Año 726 d. C.", en: "AD 726" },
    body: {
      es: "El rey aparece como jugador de pelota. Su altar parece una pelota amarrada con una cuerda: quizá los mayas colgaban las pelotas de hule para que no perdieran su forma redonda. La estela se rompió en pedazos y trabajadores de la Institución Carnegie la volvieron a armar.",
      en: "The king is shown as a ballplayer. Its altar looks like a ball tied with rope: the Maya may have hung their rubber balls up to keep them round. The stela broke into pieces and Carnegie Institution workers put it back together.",
    },
    source: "mayaruins.com (Stela 4)",
  },
  {
    id: "stela-h",
    position: [29.7, 45.7],
    radius: 4.5,
    markerHeight: 5,
    title: { es: "Estela H", en: "Stela H" },
    date: { es: "Año 730 d. C.", en: "AD 730" },
    body: {
      es: "El rey está vestido como el Dios del Maíz, con un tocado de mazorcas, bailando la danza de la Creación. Por su falda de cuentas de jade, antes se pensaba que mostraba a una mujer. Hoy los expertos creen que es el mismo rey vestido como el Dios del Maíz.",
      en: "The king is dressed as the Maize God, with a corn headdress, dancing the dance of Creation. Because of its jade-bead skirt, people once thought it showed a woman. Today experts think it is the same king dressed as the Maize God.",
    },
    source: "mayaruins.com (Stela H); Mesoweb Copán tour",
  },
  {
    id: "stela-a",
    position: [-16.6, 48.4],
    radius: 4.5,
    markerHeight: 5,
    title: { es: "Estela A", en: "Stela A" },
    date: { es: "Año 731 d. C.", en: "AD 731" },
    body: {
      es: "Sus jeroglíficos nombran a Copán junto a Tikal, Palenque y Calakmul: los cuatro grandes reinos mayas, cada uno ligado a una dirección del mundo. Es una de las pocas estelas donde la cara del rey se conserva completa. Mira hacia la Estela H, al otro lado de la plaza.",
      en: "Its hieroglyphs name Copán together with Tikal, Palenque and Calakmul: the four great Maya kingdoms, each linked to a direction of the world. It is one of the few stelae where the king's face is still complete. It faces Stela H across the plaza.",
    },
    source: "ahutnick.github.io/copanaltarqkings (Stela A); Wikipedia",
  },
  {
    id: "stela-b",
    position: [-9.4, 16.4],
    radius: 4.5,
    markerHeight: 5,
    title: { es: "Estela B", en: "Stela B" },
    date: { es: "Año 731 d. C.", en: "AD 731" },
    body: {
      es: "Muestra al rey 18 Conejo con un gran tocado. En 1924 un autor dijo que las esquinas de arriba eran trompas de elefante, ¡pero los mayas nunca vieron elefantes! Los arqueólogos explicaron que son picos de guacamaya, parte de la Montaña de la Guacamaya.",
      en: "It shows King 18 Rabbit with a big headdress. In 1924 a writer claimed the top corners were elephant trunks, but the Maya never saw elephants! Archaeologists explained that they are macaw beaks, part of Macaw Mountain.",
    },
    source: "Uncovered History; Spinden (1916), Nature",
  },
  {
    id: "stela-d",
    position: [-0.9, -25.1],
    radius: 4.5,
    markerHeight: 5.5,
    title: { es: "Estela D", en: "Stela D" },
    date: { es: "Año 736 d. C.", en: "AD 736" },
    body: {
      es: "Es la última estela de 18 Conejo en la plaza. Atrás tiene jeroglíficos de «cuerpo entero»: ¡cada signo es un personajito o un animal! Su altar muestra una serpiente viva de un lado y una serpiente esquelética del otro.",
      en: "This is 18 Rabbit's last stela in the plaza. On the back it has “full-figure” hieroglyphs: each sign is a little person or animal! Its altar shows a living serpent on one side and a skeletal serpent on the other.",
    },
    source: "Uncovered History, “The Stelae of Copán”",
  },
  {
    id: "ballcourt",
    position: [22, 169],
    radius: 14,
    markerHeight: 9,
    title: { es: "Juego de Pelota A-III", en: "Ball Court A-III" },
    date: { es: "Año 738 d. C.", en: "AD 738" },
    body: {
      es: "Aquí se jugaba la pelota maya con una pelota de hule. El rey 18 Conejo lo inauguró en el año 738. Lo decoran 16 guacamayas de piedra. Entre los mayas, solo el juego de pelota de Chichén Itzá es más grande. Pocos meses después, el rey fue capturado por el rey de Quiriguá.",
      en: "The Maya ballgame was played here with a rubber ball. King 18 Rabbit opened it in 738. It is decorated with 16 stone macaws. Among Maya ball courts, only the one at Chichén Itzá is bigger. A few months later the king was captured by the king of Quiriguá.",
    },
    source: "mayaruins.com (Ball Court); Wikipedia",
  },
  {
    id: "hieroglyphic-stairway",
    position: [57, 204.5],
    radius: 9,
    markerHeight: 6,
    title: { es: "Escalinata Jeroglífica", en: "Hieroglyphic Stairway" },
    date: { es: "Terminada en el año 755 d. C.", en: "Finished in AD 755" },
    body: {
      es: "Tiene 62 escalones y unos 2,200 jeroglíficos: ¡es el texto maya más largo que se conoce! Cuenta la historia de los reyes de Copán. La terminó el rey K'ahk' Yipyaj Chan K'awiil. Cuando los arqueólogos la encontraron, solo los 15 escalones de abajo estaban en su lugar, por eso hoy muchos bloques están en desorden. Al pie está la Estela M, del año 756.",
      en: "It has 62 steps and about 2,200 hieroglyphs: the longest Maya text known! It tells the story of Copán's kings. King K'ahk' Yipyaj Chan K'awiil finished it. When archaeologists found it, only the bottom 15 steps were still in place, so today many blocks are out of order. Stela M, from 756, stands at its foot.",
    },
    source: "Penn Museum, Expedition; mayaruins.com; Wikipedia",
  },
  {
    id: "temple11",
    position: [5, 236],
    radius: 9,
    markerHeight: 5,
    title: { es: "Templo 11", en: "Temple 11" },
    date: { es: "Año 773 d. C.", en: "AD 773" },
    body: {
      es: "Es el templo del rey Yax Pasaj Chan Yopaat, el rey número 16 de Copán. Tenía puertas en sus cuatro lados y, en las esquinas, figuras gigantes de cargadores del cielo que sostenían el techo. Al pie de esta escalinata está la Estela N.",
      en: "This is the temple of King Yax Pasaj Chan Yopaat, Copán's 16th king. It had doors on all four sides and, at the corners, giant sky-bearer figures holding up the roof. Stela N stands at the foot of this stairway.",
    },
    source: "mayaruins.com (Temple 11); Wikipedia",
  },
  {
    id: "altar-q",
    position: [45, 330],
    y: ACROPOLIS_TOP,
    radius: 5,
    markerHeight: 3,
    title: { es: "Altar Q", en: "Altar Q" },
    date: { es: "Año 776 d. C.", en: "AD 776" },
    body: {
      es: "Este altar cuadrado muestra a los 16 reyes de Copán, cuatro en cada lado. El fundador, K'inich Yax K'uk' Mo', le entrega el bastón de mando a Yax Pasaj Chan Yopaat, el rey número 16. Frente al altar, los arqueólogos encontraron una ofrenda con restos de 16 felinos: jaguares, pumas y otros. Hoy el original se guarda en el Museo de Escultura de Copán.",
      en: "This square altar shows Copán's 16 kings, four on each side. The founder, K'inich Yax K'uk' Mo', hands the staff of rule to Yax Pasaj Chan Yopaat, the 16th king. In front of the altar, archaeologists found an offering with the remains of 16 big cats: jaguars, pumas and others. Today the original is kept in the Copán Sculpture Museum.",
    },
    source: "mayaruins.com (Altar Q); Sugiyama et al. 2018, PLOS ONE; Wikipedia",
  },
  {
    id: "temple16",
    position: [72, 330],
    y: ACROPOLIS_TOP + 20,
    radius: 8,
    markerHeight: 7,
    title: { es: "Templo 16 y Rosalila", en: "Temple 16 and Rosalila" },
    date: { es: "Año 776 d. C.", en: "AD 776" },
    body: {
      es: "Es el templo más alto de la Acrópolis: unos 20 metros sobre el Patio Occidental. Por dentro esconde al menos seis templos más antiguos, uno encima del otro. Uno de ellos es Rosalila, del año 571, que los mayas enterraron con mucho cuidado, y por eso conserva sus colores. Lo descubrió en 1989 el arqueólogo hondureño Ricardo Agurcia Fasquelle.",
      en: "This is the tallest temple of the Acropolis: about 20 meters above the West Court. Inside it hides at least six older temples, one on top of another. One of them is Rosalila, from 571, which the Maya buried with great care, so it still has its colors. Honduran archaeologist Ricardo Agurcia Fasquelle discovered it in 1989.",
    },
    source: "ahutnick.github.io (Structure 16); Asociación Copán",
  },
  {
    id: "rosalila",
    position: [61, 330],
    y: ACROPOLIS_TOP,
    radius: 5,
    markerHeight: 4,
    title: { es: "Rosalila", en: "Rosalila" },
    date: { es: "Año 571 d. C.", en: "AD 571" },
    body: {
      es: "¡Estás frente a Rosalila! Este templo de tres pisos mide casi 13 metros. Los mayas no lo destruyeron: lo cubrieron con cuidado con estuco blanco antes de construir el Templo 16 encima, y por eso conserva sus colores. En la vida real los túneles son mucho más angostos; aquí los hicimos grandes para que lo veas completo. Una réplica pintada está en el Museo de Escultura de Copán.",
      en: "You're standing in front of Rosalila! This three-story temple is almost 13 meters tall. The Maya didn't destroy it: they carefully covered it in white stucco before building Temple 16 on top, which is why it keeps its colors. The real tunnels are much narrower; here we made them big so you can see it whole. A painted replica is in the Copán Sculpture Museum.",
    },
    source: "Asociación Copán (Rosalila); Wikipedia",
  },
  {
    id: "rosalila-tunnel",
    position: [94, 321],
    y: ACROPOLIS_TOP,
    radius: 4,
    markerHeight: 4,
    title: { es: "Túnel a Rosalila", en: "Tunnel to Rosalila" },
    body: {
      es: "Los arqueólogos excavaron túneles dentro de la Acrópolis para estudiar los edificios antiguos que quedaron enterrados. Entra con cuidado: ¡adentro está oscuro!",
      en: "Archaeologists dug tunnels inside the Acropolis to study the old buildings buried underneath. Go in carefully: it's dark inside!",
    },
    source: "Asociación Copán; Penn Museum",
  },
  {
    id: "temple22",
    position: [106, 250],
    y: ACROPOLIS_TOP,
    radius: 8,
    markerHeight: 4,
    title: { es: "Templo 22", en: "Temple 22" },
    date: { es: "Año 715 d. C.", en: "AD 715" },
    body: {
      es: "El rey 18 Conejo lo construyó para celebrar sus primeros 20 años (un k'atun) como rey. El templo representa una montaña sagrada. De aquí vienen las famosas cabezas esculpidas del Dios del Maíz.",
      en: "King 18 Rabbit built it to celebrate his first 20 years (one k'atun) as king. The temple represents a sacred mountain. The famous carved heads of the Maize God come from here.",
    },
    source: "Wikipedia (Copán)",
  },
  {
    id: "jaguars",
    position: [92, 285],
    y: ACROPOLIS_TOP,
    radius: 7,
    markerHeight: 4,
    title: { es: "Patio de los Jaguares", en: "Court of the Jaguars" },
    body: {
      es: "Al pie de la escalinata oeste de este patio hay dos jaguares de piedra de tamaño real. Sus manchas son agujeros redondos que quizá tenían discos de obsidiana. En lo alto de la escalinata hay una gran cara del Dios Sol.",
      en: "At the foot of this court's west stairway there are two life-size stone jaguars. Their spots are round holes that may once have held obsidian disks. At the top of the stairway is a big face of the Sun God.",
    },
    source: "mayaruins.com (Jaguar Stairway)",
  },
  {
    id: "el-corte",
    position: [137, 300],
    y: ACROPOLIS_TOP,
    radius: 9,
    markerHeight: 4,
    title: { es: "El Corte", en: "El Corte (the river cut)" },
    body: {
      es: "Hoy, en el borde este de la Acrópolis se ve un corte enorme. El río Copán fue comiéndose la Acrópolis y dejó al descubierto pisos y edificios antiguos, como las capas de un pastel. El arqueólogo Sylvanus Morley lo llamó «el corte arqueológico más grande del mundo». En los años 1930 se desvió el río para protegerla.",
      en: "Today you can see a huge cut along the east edge of the Acropolis. The Copán River ate into the Acropolis and exposed old floors and buildings, like the layers of a cake. Archaeologist Sylvanus Morley called it “the largest archaeological cross-section in the world.” In the 1930s the river was diverted to protect it.",
    },
    source: "Penn Museum, “The Copan Corte”; Wikipedia",
  },
  {
    id: "las-sepulturas",
    position: [190, 13],
    radius: 10,
    markerHeight: 4,
    title: { es: "Camino a Las Sepulturas", en: "Road to Las Sepulturas" },
    body: {
      es: "Este sacbé (camino blanco) lleva a Las Sepulturas, unos 800 metros al este. Allí vivían familias nobles y escribas. Hacia el año 800 tenía unos 50 edificios alrededor de 7 patios. ¡Pronto podrás visitarlo!",
      en: "This sacbe (white road) leads to Las Sepulturas, about 800 meters east. Noble families and scribes lived there. Around 800 AD it had about 50 buildings around 7 courtyards. You'll be able to visit it soon!",
    },
    source: "Wikipedia (Copán); OpenStreetMap",
  },
];

export const POI_BY_ID: Record<string, Poi> = Object.fromEntries(POIS.map((p) => [p.id, p]));

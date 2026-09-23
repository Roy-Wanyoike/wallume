/**
 * Wallume catalog — expands 36 engine families into 330+ uniquely named,
 * hand-tuned wallpapers. Each variant picks its own palette rotation,
 * motion defaults and deterministic seed so every card in the gallery
 * has a distinct personality.
 */
import type { InteractionKind, Palette, WallpaperCategory, WallpaperDef } from "./types";
import { BASE_WALLPAPERS } from "./engines";
import { INTERACTIVE_ENGINES } from "./engines2";
import { withRipple, withBurst, fnv1a } from "./helpers";

type FamilySource = {
  draw: WallpaperDef["draw"];
  palettes: Palette[];
  icon: string;
  category: WallpaperCategory;
  heroTime: number;
  names: string[];
  taglines: string[];
  interact: { kind: InteractionKind; label: string };
  decorate?: "ripple" | "burst" | "none";
  tags?: string[];
};

/* ---------------- curated name banks (first = hero name) -------------- */

const BASE_FAMILY: Record<string, { names: string[]; taglines: string[] }> = {
  "aurora-veil": {
    names: ["Aurora Veil", "Polar Whisper", "Emerald Curtain", "Sky Ribbons", "Solar Wind", "Northern Lace", "Ion Glow", "Magnetic Haze"],
    taglines: [
      "Slow aurora sheets breathing over the pole",
      "A whisper of green light on a quiet night",
      "Curtains of ion glow, swaying in the cold",
      "Solar wind made visible above the treeline",
    ],
  },
  starfall: {
    names: ["Starfall", "Meteor Rain", "Comet Wishes", "Stellar Drift", "Night Shower", "Falling Light", "Celestial Dust", "Wishing Sky"],
    taglines: [
      "Constellations twinkling and the occasional wish",
      "A quiet meteor shower for late-night dreamers",
      "Every streak is a wish someone forgot to make",
      "Stellar dust drifting through a violet dark",
    ],
  },
  "tidal-waves": {
    names: ["Tidal Waves", "Moon Tide", "Deep Swell", "Ocean Pulse", "Coral Current", "Siren Shores", "Sea Breath", "Azure Rhythm"],
    taglines: [
      "Endless ocean layers rolling to the horizon",
      "The moon pulls, the sea answers, forever",
      "A deep swell breathing against the shore",
      "Salt air, warm light, rolling water",
    ],
  },
  "alpine-dusk": {
    names: ["Alpine Dusk", "Summit Glow", "Pine Shadow", "Valley Mist", "Frozen Twilight", "Highland Air", "Ridge Silence", "Echo Peak"],
    taglines: [
      "Layered peaks breathing under a glowing dusk",
      "The last light says goodnight to the summit",
      "Pines stand dark against a bruised-gold sky",
      "Mist pooling slow in a silent valley",
    ],
  },
  "particle-bloom": {
    names: ["Particle Bloom", "Pollen Halo", "Dust Garden", "Light Swarm", "Glitter Field", "Nectar Glow", "Spark Nursery", "Halo Dance"],
    taglines: [
      "A living constellation linking drift into patterns",
      "Golden pollen floating through evening light",
      "Dust motes gardening themselves into flowers",
      "A swarm of light rehearsing its own choreography",
    ],
  },
  "liquid-dreams": {
    names: ["Liquid Dreams", "Velvet Flow", "Melted Silk", "Dream Current", "Soft Vortex", "Cloud Melt", "Sleep Tide", "Slow Ocean"],
    taglines: [
      "Slow-motion liquid color you can almost feel",
      "Velvet currents folding into each other",
      "Silk melted into a warm, drifting pool",
      "The color of the moment right before sleep",
    ],
  },
  "neon-horizon": {
    names: ["Neon Horizon", "Midnight Arcade", "Chrome Sunset", "Retro Highway", "Laser Boulevard", "Synth Skyline", "Grid Runner", "Vapor Coast"],
    taglines: [
      "Retro-future grid running into a striped sun",
      "An arcade glowing at the edge of midnight",
      "Chrome-plated sunset on an endless highway",
      "Follow the laser strip to the vapor coast",
    ],
  },
  "firefly-grove": {
    names: ["Firefly Grove", "Lantern Field", "Ember Meadow", "Glimmer Woods", "Dusk Sparks", "Wisp Hollow", "Twinkle Camp", "Amber Grove"],
    taglines: [
      "Warm sparks drifting through the summer dark",
      "A field of tiny lanterns nobody has to light",
      "Ember-colored sparks over quiet grass",
      "The woods are blinking back tonight",
    ],
  },
  "petal-drift": {
    names: ["Petal Drift", "Sakura Fall", "Blossom Wind", "Petal Rain", "Spring Whisper", "Orchard Breeze", "Petal Lake", "Blooming Air"],
    taglines: [
      "Soft petals swaying down a pastel breeze",
      "Sakura season, suspended mid-fall",
      "A warm wind carries the orchard to you",
      "Petals landing softly on still water",
    ],
  },
  "solaris-mandala": {
    names: ["Solaris Mandala", "Sun Sigil", "Prayer Wheel", "Halo Engine", "Sunflower Core", "Sol Spire", "Gilded Orbit", "Zenith Flower"],
    taglines: [
      "A hypnotic geometric relic forever turning",
      "A sun sigil spinning in patient circles",
      "Turn the wheel, warm the room",
      "An engine made entirely of light",
    ],
  },
  "rain-glass": {
    names: ["Rain Glass", "Window Rain", "Droplet Street", "Storm Pane", "Cold Morning", "Teardrop City", "Rainy Taxi", "Monsoon Window"],
    taglines: [
      "Raindrops sliding down a window over city lights",
      "Watch the storm from the warm side of the glass",
      "Droplets tracing the streetlights below",
      "A cold morning, a warm window, slow rain",
    ],
  },
  "orbit-bloom": {
    names: ["Orbit Bloom", "Planet Waltz", "Little Saturn", "Gravity Garden", "Moon Parade", "Stellar Carousel", "Cosmic Clockwork", "Silent System"],
    taglines: [
      "Glowing worlds tracing quiet ellipses around a star",
      "A slow waltz between small warm planets",
      "One tiny Saturn, keeping perfect time",
      "Gravity gardening a miniature solar system",
    ],
  },
};

const pal = (name: string, colors: string[]): Palette => ({ name, colors });

const NEW_FAMILIES: FamilySource[] = [
  {
    draw: INTERACTIVE_ENGINES.aquarium,
    icon: "🐠",
    category: "Ocean",
    heroTime: 2.1,
    palettes: [
      pal("Coral Reef", ["#04222b", "#0a3d4a", "#ff7e6b", "#ffd166", "#2ec4b6"]),
      pal("Deep Lagoon", ["#031a24", "#073042", "#5eead4", "#ffb347", "#ff6b9d"]),
      pal("Tropical Noon", ["#06556b", "#0a7f9e", "#ffe08a", "#ff8f6b", "#a7f3d0"]),
      pal("Abyss Night", ["#020d14", "#05202e", "#38bdf8", "#a78bfa", "#fde68a"]),
    ],
    names: ["Coral Drift", "Midnight Shoal", "Silver Frenzy", "Kelp Cathedral", "Sunlit Lagoon", "Reef Ripples", "Fish Whisper", "Blue Lagoon", "Glass Aquarium", "Coral Dance"],
    taglines: [
      "Touch the water — every fish scatters",
      "A midnight shoal flashing silver as it turns",
      "Small fish, big opinions, lots of hiding",
      "Sunbeams falling through a slow cathedral of kelp",
      "A lagoon warmed through by late sun",
      "Ripples and reef fish going about their day",
      "Tap the glass — see who darts first",
      "Calm water, curious fish, soft coral light",
    ],
    interact: { kind: "flee", label: "Touch — fish scatter" },
    tags: ["fish", "aquarium", "sea"],
  },
  {
    draw: INTERACTIVE_ENGINES.jellyRealm,
    icon: "🪼",
    category: "Ocean",
    heroTime: 2.8,
    palettes: [
      pal("Moonlit Deep", ["#050d1f", "#0a1830", "#a5b4fc", "#67e8f9", "#f0abfc"]),
      pal("Rose Abyss", ["#120716", "#241028", "#f9a8d4", "#c4b5fd", "#5eead4"]),
      pal("Toxic Glow", ["#04140c", "#0a2a18", "#4ade80", "#fde047", "#22d3ee"]),
      pal("Violet Trench", ["#0a0618", "#170f30", "#b78cff", "#f472b6", "#7dd3fc"]),
    ],
    names: ["Moon Jellies", "Deep Bloom", "Glow Umbrellas", "Abyss Ballet", "Bell Symphony", "Jelly Lanterns", "Tentacle Tides", "Silent Drifters", "Luminous Bells", "Bioluminescence"],
    taglines: [
      "Luminous bells pulsing through deep water",
      "A slow bloom of jellyfish rising from the deep",
      "Umbrellas of glow, drifting where they please",
      "A ballet choreographed entirely by the current",
      "Every bell rings light instead of sound",
      "Jelly lanterns strung through the midnight sea",
      "Push them gently — they drift right back",
      "Life that glows because the dark asked nicely",
    ],
    interact: { kind: "repel", label: "Touch — gentle repel" },
    tags: ["jellyfish", "deep sea", "glow"],
  },
  {
    draw: INTERACTIVE_ENGINES.fireworks,
    icon: "🎆",
    category: "Urban",
    heroTime: 2.4,
    palettes: [
      pal("Harbor Fest", ["#0a0a1a", "#141428", "#ffd166", "#ff5e7e", "#4cc9f0"]),
      pal("Golden Boom", ["#12080a", "#26101a", "#ffb347", "#ff4d6d", "#ffe3b3"]),
      pal("Emerald Sparks", ["#061210", "#0c241c", "#4ade80", "#fbbf24", "#f87171"]),
      pal("Violet Finale", ["#0d0716", "#1c1030", "#c084fc", "#f472b6", "#fde68a"]),
    ],
    names: ["Festival Night", "Sky Blossoms", "Golden Rockets", "Fire Flower", "Boom Garden", "Star Shells", "Powder Night", "Celebration Glow", "Pyro Dreams", "Spark Season"],
    taglines: [
      "Tap the sky — launch your own fireworks",
      "Blossoms of light opening over the city",
      "Golden shells bursting into slow rain",
      "One flower, made of fire, every few seconds",
      "A garden that grows only after dark",
      "Star shells blooming above the rooftops",
      "The whole sky is celebrating something",
      "Front-row seats to a never-ending finale",
    ],
    interact: { kind: "spawn", label: "Tap — launch fireworks" },
    tags: ["fireworks", "night", "city"],
  },
  {
    draw: INTERACTIVE_ENGINES.inkBloom,
    icon: "🖋️",
    category: "Abstract",
    heroTime: 1.9,
    palettes: [
      pal("Washi Cream", ["#f7f1e5", "#efe3cd", "#1f2430", "#7c3f2c", "#3a5a40"]),
      pal("Blush Paper", ["#faf0ea", "#f3ddda", "#8a2f3c", "#2d3142", "#b56576"]),
      pal("Indigo Wash", ["#eef1f6", "#d9e2ef", "#1e2a4a", "#8d3b3b", "#445c78"]),
      pal("Sage Garden", ["#f2f5ec", "#e0e8d4", "#33472f", "#a14a2e", "#5c6f4a"]),
    ],
    names: ["Ink Bloom", "Sumi Reverie", "Paper Ocean", "Silk Diffusion", "Black Petals", "Calligraphy Cloud", "Smoke Tide", "Sepia Drift", "Slow Ink", "Bleeding Rose"],
    taglines: [
      "Tap the paper — drop fresh ink",
      "Sumi ink remembering how to become a flower",
      "An ocean poured from a bottle of ink",
      "Silk diffusing through wet-warm paper",
      "Petals cut from midnight, pressed to paper",
      "A cloud that writes itself in cursive",
      "Tide of smoke, pinned to the page",
      "Watch one thought slowly spread",
    ],
    interact: { kind: "spawn", label: "Tap — new ink bloom" },
    tags: ["ink", "paper", "minimal"],
  },
  {
    draw: INTERACTIVE_ENGINES.nebulaStorm,
    icon: "🌌",
    category: "Space",
    heroTime: 2.2,
    palettes: [
      pal("Orion Veil", ["#050510", "#0d0b22", "#8b5cf6", "#f472b6", "#38bdf8"]),
      pal("Crimson Rift", ["#100508", "#220b12", "#fb7185", "#fbbf24", "#a78bfa"]),
      pal("Emerald Expanse", ["#040d0a", "#0a1f18", "#34d399", "#5eead4", "#fde68a"]),
      pal("Cold Core", ["#04070f", "#0a1220", "#7dd3fc", "#c4b5fd", "#f9a8d4"]),
    ],
    names: ["Nebula Storm", "Birth of Stars", "Cosmic Ink", "Pillars of Dust", "Stellar Wind", "Galaxy Heart", "Violet Vastness", "Interstellar Fog", "Supernova Garden", "Andromeda Veil"],
    taglines: [
      "Your cursor bends the gravity of a thousand stars",
      "Where stars are born and quietly explode",
      "The universe spilling its ink across the dark",
      "Dust pillars glowing at their edges",
      "A wind that only blows between suns",
      "The beating heart of a slow galaxy",
      "Vastness, tinted violet, mildly showing off",
      "Fog measured in light-years",
    ],
    interact: { kind: "attract", label: "Cursor — gravity pull" },
    tags: ["space", "nebula", "stars"],
  },
  {
    draw: INTERACTIVE_ENGINES.plasmaOrbs,
    icon: "💫",
    category: "Abstract",
    heroTime: 1.6,
    palettes: [
      pal("Ember Glow", ["#0c0708", "#1c0f10", "#ff5e5e", "#ffb347", "#ffe3b3"]),
      pal("Aurora Pods", ["#050f0d", "#0a1f1a", "#2dd4bf", "#a3e635", "#f472b6"]),
      pal("Rose Static", ["#12070d", "#24101c", "#fb7185", "#c084fc", "#fde68a"]),
      pal("Ion Storm", ["#06080f", "#0e1424", "#818cf8", "#22d3ee", "#e879f9"]),
    ],
    names: ["Plasma Orbs", "Energy Swarm", "Ion Lanterns", "Ghost Lights", "Wisp Magnets", "Static Bloom", "Lightning Pods", "Neon Nucleus", "Aura Spheres", "Charge Dance"],
    taglines: [
      "Living light that follows your fingertip",
      "A swarm of energy looking for somewhere to be",
      "Ion lanterns bobbing on an invisible tide",
      "Ghost lights leading you the wrong way, gently",
      "Wisps with a magnetic crush on your cursor",
      "Static electricity, in its flower era",
      "Pods of lightning, resting between storms",
      "A nucleus with very good stage lighting",
    ],
    interact: { kind: "attract", label: "Touch — orbs follow" },
    tags: ["orbs", "plasma", "glow"],
  },
  {
    draw: INTERACTIVE_ENGINES.codeRain,
    icon: "💻",
    category: "Retro",
    heroTime: 2.0,
    palettes: [
      pal("Terminal Green", ["#020803", "#04140a", "#22c55e", "#86efac", "#fde047"]),
      pal("Neon Script", ["#0a0410", "#150a1e", "#e879f9", "#22d3ee", "#a3e635"]),
      pal("Amber Console", ["#0c0703", "#1a1006", "#fbbf24", "#fb923c", "#fef3c7"]),
      pal("Cyber Rose", ["#0d040a", "#1a0816", "#f472b6", "#c084fc", "#5eead4"]),
    ],
    names: ["Code Rain", "Digital Fall", "Terminal Night", "Glyph Storm", "Matrix Garden", "Byte Rainfall", "Cyber Drizzle", "Data Waterfall", "Neon Script", "Hacker Dawn"],
    taglines: [
      "Tap — send a shockwave through the stream",
      "Digits falling forever, never landing",
      "A terminal dreaming with the lights off",
      "Glyphs rehearsing their storm choreography",
      "A garden that grows in columns of light",
      "Bytes of rain on a digital window",
      "Cyber drizzle for late-night terminals",
      "The waterfall at the end of the internet",
    ],
    interact: { kind: "repel", label: "Tap — shockwave" },
    tags: ["code", "matrix", "hacker"],
  },
  {
    draw: INTERACTIVE_ENGINES.meadowWhimsy,
    icon: "🦋",
    category: "Nature",
    heroTime: 1.8,
    palettes: [
      pal("Golden Hour", ["#2a1509", "#4a2810", "#ffd166", "#ff9e64", "#d9f099"]),
      pal("Rose Meadow", ["#241019", "#3d1c2a", "#ff8fab", "#ffe3a3", "#b5e48c"]),
      pal("Violet Dusk", ["#170d24", "#2b1a3d", "#c86dd7", "#ffd1ff", "#9ee493"]),
      pal("Peach Orchard", ["#301c12", "#54301e", "#ffb38a", "#ffe5a3", "#a7c957"]),
    ],
    names: ["Meadow Whimsy", "Butterfly Chase", "Wing Season", "Pollen Path", "Flutter Field", "Summer Wings", "Monarch Wind", "Clover Dance", "Golden Meadow", "Wings at Dusk"],
    taglines: [
      "Touch the grass — butterflies take flight",
      "Chase butterflies without moving from your chair",
      "It is officially wing season somewhere",
      "Follow the pollen path past the tall grass",
      "A field that flutters when you get close",
      "Summer, distilled into a few beating wings",
      "Monarchs riding an invisible warm wind",
      "Clover, dusk light, and wings everywhere",
    ],
    interact: { kind: "flee", label: "Touch — butterflies flee" },
    tags: ["butterfly", "meadow", "summer"],
  },
  {
    draw: INTERACTIVE_ENGINES.duskDunes,
    icon: "🏜️",
    category: "Nature",
    heroTime: 1.4,
    palettes: [
      pal("Amber Sahara", ["#2a1207", "#6b2f10", "#ffb347", "#ff8f5e", "#5c3317"]),
      pal("Rose Desert", ["#26101a", "#57203a", "#ff9e8a", "#ffd9a0", "#3f1e2e"]),
      pal("Violet Nightfall", ["#170d24", "#33204d", "#e08bd0", "#ffb48a", "#2b1a3d"]),
      pal("Olive Oasis", ["#1c1608", "#3d3410", "#e8c46b", "#d97e4a", "#2f2a12"]),
    ],
    names: ["Dusk Dunes", "Sahara Glow", "Windsand", "Desert Silence", "Amber Desert", "Nomad Sky", "Sandscape", "Mirage Light", "Dune Shadows", "Golden Sahara"],
    taglines: [
      "Sweep the sky — whip the sand into gusts",
      "The Sahara, lit by its favorite hour",
      "Sand that moves when your finger does",
      "Silence, wide enough to wallpaper a desert",
      "Amber light pouring over slow ridges",
      "A sky wide enough for every nomad story",
      "Landscape drawn entirely in moving sand",
      "A mirage you can actually keep",
    ],
    interact: { kind: "gust", label: "Sweep — sand gusts" },
    tags: ["desert", "dunes", "sunset"],
  },
  {
    draw: INTERACTIVE_ENGINES.crystalCave,
    icon: "💎",
    category: "Geometric",
    heroTime: 1.2,
    palettes: [
      pal("Amethyst Hollow", ["#0b0614", "#180d28", "#a78bfa", "#e0aaff", "#5eead4"]),
      pal("Emerald Vault", ["#04120c", "#0a2418", "#34d399", "#a7f3d0", "#fbbf24"]),
      pal("Rose Quartz", ["#140a0e", "#281220", "#f9a8d4", "#fbcfe8", "#93c5fd"]),
      pal("Citrine Deep", ["#120c04", "#281d08", "#fbbf24", "#fde68a", "#fb923c"]),
    ],
    names: ["Crystal Cave", "Gem Vault", "Frozen Prism", "Shard Sanctuary", "Mineral Glow", "Geode Night", "Quartz Castle", "Amethyst Hollow", "Facet Dream", "Crystal Whisper"],
    taglines: [
      "Tap — send a shimmer through the gems",
      "A vault of slow-breathing gemstones",
      "Light frozen mid-prism, still glowing",
      "Where shards go to feel important",
      "Minerals showing off their best angles",
      "Crack a geode open — this is inside",
      "Quartz architecture, no builder required",
      "A hollow full of patient amethyst",
    ],
    interact: { kind: "shimmer", label: "Tap — shimmer wave" },
    tags: ["crystal", "gems", "cave"],
  },
  {
    draw: INTERACTIVE_ENGINES.stormCells,
    icon: "⛈️",
    category: "Nature",
    heroTime: 2.6,
    palettes: [
      pal("Midnight Storm", ["#05070d", "#0d1420", "#7dd3fc", "#a5b4fc", "#fde68a"]),
      pal("Violet Tempest", ["#0a0616", "#160d2b", "#b78cff", "#f472b6", "#e879f9"]),
      pal("Emerald Rain", ["#04100c", "#0a2018", "#2dd4bf", "#a3e635", "#fde047"]),
      pal("Ember Squall", ["#100806", "#221009", "#fb923c", "#f87171", "#fcd34d"]),
    ],
    names: ["Storm Cells", "Thunder Ballet", "Voltage Sky", "Rain Symphony", "Tempest Glow", "Lightning Garden", "Electric Dusk", "Storm Chaser", "Bolt Bloom", "Monsoon Voltage"],
    taglines: [
      "Tap the clouds — call down a strike",
      "Thunder rehearsing its slow ballet",
      "A sky wired with beautiful voltage",
      "Rain playing percussion on everything",
      "The glow a tempest leaves behind",
      "Lightning, blooming where you ask",
      "Dusk, but electric about it",
      "Chase the storm without getting wet",
    ],
    interact: { kind: "strike", label: "Tap — call lightning" },
    tags: ["storm", "lightning", "rain"],
  },
  {
    draw: INTERACTIVE_ENGINES.bubbleRise,
    icon: "🎈",
    category: "Dreamy",
    heroTime: 1.7,
    palettes: [
      pal("Aqua Fizz", ["#04222e", "#0a4356", "#67e8f9", "#fde68a", "#f9a8d4"]),
      pal("Rose Soda", ["#1c0a14", "#33172a", "#f9a8d4", "#c4b5fd", "#fef08a"]),
      pal("Sea Glass", ["#062018", "#0d3a2c", "#5eead4", "#a7f3d0", "#fef3c7"]),
      pal("Violet Float", ["#0d0718", "#1a1030", "#c4b5fd", "#f0abfc", "#7dd3fc"]),
    ],
    names: ["Bubble Rise", "Soap Sky", "Fizz Lift", "Iridescent Drift", "Soda Sea", "Pop & Fizz", "Champagne Bubbles", "Floating Glass", "Aqua Fizz", "Upward Rain"],
    taglines: [
      "Tap — pop them mid-air",
      "A sky made of soap and slow motion",
      "Fizz with somewhere better to be",
      "Iridescence, drifting at its own pace",
      "A sea carbonated by a kind sun",
      "Pop one — six more rise to replace it",
      "Celebration, bottled and set loose",
      "Glass bubbles that forgot to fall",
    ],
    interact: { kind: "repel", label: "Tap — pop bubbles" },
    tags: ["bubbles", "soap", "fizz"],
  },
  {
    draw: INTERACTIVE_ENGINES.lavaLamp,
    icon: "🕯️",
    category: "Dreamy",
    heroTime: 2.3,
    palettes: [
      pal("Sunset Magma", ["#1a0a08", "#331410", "#ff6b4a", "#ffb347", "#ffe3b3"]),
      pal("Toxic Lava", ["#0c1206", "#1c240a", "#a3e635", "#fde047", "#ff8f5e"]),
      pal("Rose Wax", ["#170a10", "#2e1420", "#fb7185", "#f0abfc", "#fde68a"]),
      pal("Ocean Melt", ["#06121a", "#0d2430", "#5eead4", "#67e8f9", "#fbbf24"]),
    ],
    names: ["Lava Lamp", "Magma Lounge", "Slow Melt", "Lava Groove", "Retro Glow", "Blob Disco", "Warm Current", "Amber Drift", "Goo Light", "Molten Mood"],
    taglines: [
      "Touch the glass — the blobs love the warmth",
      "A lounge lit entirely by molten mood",
      "Slow melt, good vibes, zero rush",
      "Blobs bobbing in warm currents",
      "Retro glow for late-night thinking",
      "A disco where nobody is in a hurry",
      "Warm currents folding into each other",
      "Amber light, drifting lazily upward",
      "Goo with excellent stage presence",
      "The mood, literally molten",
    ],
    interact: { kind: "attract", label: "Touch — heat draws the blobs" },
    tags: ["lava", "magma", "goo", "retro", "glow"],
  },
  {
    draw: INTERACTIVE_ENGINES.lanternDrift,
    icon: "🏮",
    category: "Urban",
    heroTime: 2.5,
    palettes: [
      pal("Festival Night", ["#0d0714", "#1d0f24", "#ffb347", "#ff8f5e", "#ffe3b3"]),
      pal("Rose Lanterns", ["#140a12", "#281420", "#f9a8d4", "#fbbf24", "#f472b6"]),
      pal("Amber Harbor", ["#0e0a06", "#1f1509", "#fbbf24", "#fb923c", "#fef3c7"]),
      pal("Jade Sky", ["#071009", "#122015", "#a7f3d0", "#fde68a", "#fbbf24"]),
    ],
    names: ["Lantern Drift", "Sky Festival", "Wish Lights", "Night Market", "Floating Glow", "Paper Moons", "Rising Hopes", "Festival Sky", "Warm Ascension", "Glow Release"],
    taglines: [
      "Tap the night — release a new lantern",
      "Every lantern carries somebody's wish",
      "A festival that never runs out of sky",
      "Paper moons rising over the rooftops",
      "The night market, seen from above",
      "Glow gathering height and courage",
      "Hopes, rising steadily, lighting softly",
      "Send one up — watch it join the others",
    ],
    interact: { kind: "spawn", label: "Tap — release a lantern" },
    tags: ["lantern", "festival", "sky", "wish", "night"],
  },
  {
    draw: INTERACTIVE_ENGINES.warpSpeed,
    icon: "🚀",
    category: "Space",
    heroTime: 1.9,
    palettes: [
      pal("Deep Void", ["#030510", "#070d1f", "#7dd3fc", "#c4b5fd", "#fde68a"]),
      pal("Emerald Run", ["#030c08", "#071a12", "#6ee7b7", "#a3e635", "#fef08a"]),
      pal("Rose Drift", ["#0d040c", "#1a0818", "#f9a8d4", "#f472b6", "#e0aaff"]),
      pal("Solar Sprint", ["#0c0803", "#1a1206", "#fde047", "#fb923c", "#fef3c7"]),
    ],
    names: ["Warp Speed", "Hyperspace", "Light Jump", "Star Stretch", "Nova Lane", "Wormhole", "Relativity", "Photon Rush", "Deep Range", "Stellar Dash"],
    taglines: [
      "Tap — jump to warp, stretch the stars",
      "Steer with your cursor through the stream",
      "Every star becomes a line if you go fast enough",
      "The long way home, at maximum velocity",
      "A lane straight through the nova field",
      "Fold space — take the scenic route",
      "Relativity looks great on a phone screen",
      "Photons rushing past, politely",
    ],
    interact: { kind: "warp", label: "Tap — jump to warp" },
    tags: ["warp", "space", "stars", "speed", "hyperspace"],
  },
  {
    draw: INTERACTIVE_ENGINES.kaleidoscope,
    icon: "🔮",
    category: "Geometric",
    heroTime: 2.2,
    palettes: [
      pal("Stained Glass", ["#0d0714", "#1c0f24", "#e879f9", "#fbbf24", "#5eead4"]),
      pal("Rose Window", ["#140a10", "#261220", "#f472b6", "#c4b5fd", "#fde68a"]),
      pal("Emerald Cathedral", ["#04100a", "#0a2016", "#34d399", "#a7f3d0", "#fbbf24"]),
      pal("Copper Wheel", ["#100a05", "#221608", "#fb923c", "#fde047", "#f87171"]),
    ],
    names: ["Kaleidoscope", "Prism Dance", "Mirror Bloom", "Fractal Petals", "Rotation", "Symmetry Lab", "Stained Light", "Gem Wheel", "Pattern Play", "Harmonic Glow"],
    taglines: [
      "Tap — a bloom ripples through the mirrors",
      "Circle the center and the pattern follows",
      "Petals cut from stained glass, forever turning",
      "Fractals practicing their petals",
      "Rotation is the whole personality",
      "Symmetry, but make it playful",
      "Light through a wheel of gems",
      "A wheel that never repeats exactly",
    ],
    interact: { kind: "bloom", label: "Tap — bloom pulse" },
    tags: ["kaleidoscope", "geometric", "symmetry", "mandala"],
  },
  {
    draw: INTERACTIVE_ENGINES.bioTide,
    icon: "🐚",
    category: "Ocean",
    heroTime: 2.4,
    palettes: [
      pal("Abyss Bloom", ["#020610", "#04101f", "#5eead4", "#2dd4bf", "#a7f3d0"]),
      pal("Coral Sea", ["#050a0d", "#0a1a1e", "#2dd4bf", "#fbbf24", "#f472b6"]),
      pal("Emerald Tide", ["#02100b", "#062018", "#34d399", "#a7f3d0", "#fde68a"]),
      pal("Violet Deep", ["#070411", "#120a24", "#c4b5fd", "#f0abfc", "#5eead4"]),
    ],
    names: ["Bioluminescent Tide", "Plankton Sea", "Glow Shore", "Sea Sparkle", "Midnight Lagoon", "Neon Surf", "Tide of Light", "Abyss Garden", "Luminous Deep", "Coral Nightlight"],
    taglines: [
      "Touch the water — the sea lights up",
      "Drag your finger and paint with plankton",
      "Every stroke leaves a trail of living light",
      "The midnight shore answers your hand",
      "Tiny lights drifting where you wander",
      "Tap — the lagoon blooms",
      "A sea of stars you can stir",
      "Glow gathering where you touch",
    ],
    interact: { kind: "glow", label: "Touch — bioluminescent glow" },
    tags: ["bioluminescent", "plankton", "ocean", "glow", "sea", "tide"],
  },
  {
    draw: INTERACTIVE_ENGINES.glassMarbles,
    icon: "🎱",
    category: "Geometric",
    heroTime: 1.6,
    palettes: [
      pal("Showcase", ["#0b0910", "#161222", "#e879f9", "#fbbf24", "#5eead4"]),
      pal("Amber Attic", ["#0f0a06", "#1f150a", "#f59e0b", "#fbbf24", "#f87171"]),
      pal("Rose Curio", ["#120a0e", "#221018", "#fb7185", "#f9a8d4", "#fde68a"]),
      pal("Jade Case", ["#071009", "#0f1f14", "#34d399", "#a7f3d0", "#fef3c7"]),
    ],
    names: ["Glass Marbles", "Marble Museum", "Rolling Gems", "Sphere Pool", "Crystal Curios", "Marble Run", "Glass Garden", "Orb Collection", "Sphere Dance", "Curio Shelf"],
    taglines: [
      "Hold your finger down — the marbles come to you",
      "Tap — scatter the collection",
      "A pocket museum of glass and light",
      "Magnets made of light, marbles made of glass",
      "Roll them, gather them, let them go",
      "Every sphere catches a different sky",
      "The curio shelf that plays back",
      "Glass orbs with a mind for your cursor",
    ],
    interact: { kind: "magnet", label: "Hold — marbles gather" },
    tags: ["marbles", "glass", "physics", "magnet", "spheres"],
  },
  {
    draw: INTERACTIVE_ENGINES.silkFlow,
    icon: "🎗️",
    category: "Abstract",
    heroTime: 2.0,
    palettes: [
      pal("Rose Silk", ["#140810", "#26101c", "#fb7185", "#f9a8d4", "#fde68a"]),
      pal("Golden Drape", ["#120d06", "#241a08", "#fbbf24", "#f59e0b", "#fef3c7"]),
      pal("Jade Weave", ["#071009", "#102014", "#6ee7b7", "#34d399", "#fef9c3"]),
      pal("Plum Satin", ["#100814", "#1e0f26", "#e879f9", "#c4b5fd", "#fda4af"]),
    ],
    names: ["Silk Flow", "Satin Waves", "Ribbon Dance", "Velvet Stream", "Wind Weave", "Drape", "Liquid Satin", "Fabric of Night", "Sari Silk", "Cloth of Gold"],
    taglines: [
      "Move through it — the silk drapes toward your cursor",
      "Fabric that answers the wind of your hand",
      "Ribbons of light, cut on the bias",
      "The gentlest fabric in the collection",
      "Weave your way through the night",
      "Satin that flows where you point",
      "Cloth soft enough to touch through glass",
      "Ninety-centimetre silk, simulated",
    ],
    interact: { kind: "attract", label: "Cursor — silk drapes to you" },
    tags: ["silk", "fabric", "ribbons", "flow", "soft"],
  },
  {
    draw: INTERACTIVE_ENGINES.emberForge,
    icon: "🔥",
    category: "Urban",
    heroTime: 1.8,
    palettes: [
      pal("Iron Anvil", ["#0c0705", "#1a0f08", "#fb923c", "#f59e0b", "#fde047"]),
      pal("Copper Kiln", ["#0d0604", "#1c0d06", "#f87171", "#fb923c", "#fbbf24"]),
      pal("Violet Furnace", ["#0a0509", "#180d16", "#f0abfc", "#fb923c", "#fde047"]),
      pal("Rose Forge", ["#0e0606", "#1d0b09", "#fda4af", "#fb7185", "#fde047"]),
    ],
    names: ["Ember Forge", "Blacksmith Night", "Spark Kiln", "Furnace Glow", "Cinder Rise", "Anvil Sparks", "Molten Heart", "Coal Walk", "Forge Heart", "Ember Storm"],
    taglines: [
      "Tap — strike the anvil, sparks fly",
      "Curl your cursor near and embers lean in",
      "The forge never sleeps, and neither do the sparks",
      "A blacksmith's night, distilled to light",
      "Cinders rising from the coal bed",
      "Strike where you will — the fire answers",
      "Heat you can almost feel through the glass",
      "The night shift at the iron works",
    ],
    interact: { kind: "strike", label: "Tap — hammer strike" },
    tags: ["ember", "fire", "forge", "sparks", "coal"],
  },
  {
    draw: INTERACTIVE_ENGINES.balloonFiesta,
    icon: "🎈",
    category: "Dreamy",
    heroTime: 2.1,
    palettes: [
      pal("Alpine Dawn", ["#241633", "#4a2a4e", "#f9a8d4", "#fbbf24", "#f87171"]),
      pal("Desert Sunrise", ["#2a1420", "#54202c", "#fda4af", "#fb923c", "#fde68a"]),
      pal("Meadow Festival", ["#15241c", "#274433", "#fbbf24", "#f472b6", "#a3e635"]),
      pal("Sunset Carnival", ["#251026", "#4d1b3d", "#f0abfc", "#fb7185", "#fcd34d"]),
    ],
    names: ["Balloon Fiesta", "Dawn Ascension", "Cappadocia Morning", "Voyage Aloft", "Pastel Skies", "Drift Away", "Cloud Harbor", "Up and Away", "Airship Waltz", "Gentle Rising"],
    taglines: [
      "Sweep — the wind answers · Tap — release a balloon",
      "Hot air and quiet hope, drifting up together",
      "Dawn over the valley, baskets swaying",
      "Every basket carries a small adventure",
      "Pastel envelopes against a waking sky",
      "Wherever the breeze decides, they follow",
      "A slow carnival above the hills",
      "Rise gently, wander far, land softly",
    ],
    interact: { kind: "gust", label: "Sweep — wind · Tap — release a balloon" },
    tags: ["balloon", "sky", "float", "wind", "festival"],
  },
  {
    draw: INTERACTIVE_ENGINES.meteorShower,
    icon: "☄️",
    category: "Space",
    heroTime: 1.2,
    palettes: [
      pal("Perseid Night", ["#060613", "#141a30", "#f8fafc", "#fbbf24", "#f472b6"]),
      pal("Ember Trail", ["#0a0508", "#1d0f14", "#fca5a5", "#fb923c", "#fef3c7"]),
      pal("Violet Void", ["#07040f", "#160d26", "#e9d5ff", "#f0abfc", "#fde68a"]),
      pal("Aurora Meteor", ["#04100d", "#0c2018", "#a7f3d0", "#fde68a", "#f9a8d4"]),
    ],
    names: ["Meteor Shower", "Perseid Night", "Bolide", "Comet Tail", "Streak Season", "Skyfall", "Falling Stars", "Celestial Rush", "Nova Trail", "Wish Hunter"],
    taglines: [
      "Tap — call a meteor out of the dark",
      "Streaks bending subtly toward your cursor",
      "The night sky, showing off again",
      "Every trail burns bright and brief",
      "Make a wish, then make another",
      "Gravity listens to your fingertip here",
      "A celestial rush hour, beautifully timed",
      "Sparks off the head of a falling star",
    ],
    interact: { kind: "strike", label: "Tap — call down a meteor" },
    tags: ["meteor", "shooting star", "space", "streak", "night sky"],
  },
  {
    draw: INTERACTIVE_ENGINES.koiPond,
    icon: "🐟",
    category: "Ocean",
    heroTime: 2.6,
    palettes: [
      pal("Jade Garden", ["#0b1a14", "#16302a", "#f87171", "#fbbf24", "#e7e5e4"]),
      pal("Sunset Pond", ["#20101a", "#3a1e2b", "#fb7185", "#fcd34d", "#fef9c3"]),
      pal("Moonlit Water", ["#0a0f18", "#15243a", "#7dd3fc", "#e0f2fe", "#fbbf24"]),
      pal("Sakura Surface", ["#1d1118", "#33202c", "#f9a8d4", "#fda4af", "#fde68a"]),
    ],
    names: ["Koi Pond", "Zen Garden", "Lotus Waters", "Still Water", "Nishikigoi", "Lily Shadows", "Moonlit Pond", "Splash Reflex", "Fish Whisper", "Water Garden"],
    taglines: [
      "Touch the water — koi dart away",
      "Rings spread, fish scatter, calm returns",
      "A top-down meditation that flinches",
      "Lily pads bob while the koi wander",
      "Living jewelry circling beneath the surface",
      "Panic fades, the pond breathes again",
      "Brush the surface and watch them bolt",
      "Liquid jade with flashes of gold",
    ],
    interact: { kind: "flee", label: "Touch — koi dart away" },
    tags: ["koi", "pond", "fish", "zen", "lily"],
  },
  {
    draw: INTERACTIVE_ENGINES.vinylLounge,
    icon: "💿",
    category: "Retro",
    heroTime: 1.5,
    palettes: [
      pal("Mahogany Club", ["#150c08", "#2a170e", "#fbbf24", "#fb923c", "#f5d0a9"]),
      pal("Neon Jukebox", ["#12060f", "#260d1e", "#f0abfc", "#fb7185", "#fde047"]),
      pal("Smoke and Brass", ["#0e0d0b", "#221f18", "#d6d3d1", "#fbbf24", "#a8a29e"]),
      pal("Rosewood Spin", ["#170a10", "#2e1420", "#fda4af", "#f472b6", "#fecdd3"]),
    ],
    names: ["Vinyl Lounge", "Midnight Jukebox", "Groove Theory", "Thirty-Three RPM", "Spin Cycle", "Needle Drop", "Dust and Grooves", "Hi-Fi Dream", "Analog Heart", "B-Side"],
    taglines: [
      "Sweep — scratch the vinyl · Tap — needle drop",
      "Warm wax spinning in lamplight",
      "Grooves you can almost hear",
      "The tonearm sways, the record turns",
      "Dust motes waltz above the label",
      "Every drop of the needle sends rings",
      "Analog warmth for a digital night",
      "Side B of your favorite memory",
    ],
    interact: { kind: "swirl", label: "Sweep — scratch · Tap — needle drop" },
    tags: ["vinyl", "record", "retro", "music", "jukebox"],
  },
];

/* --------------------------- interaction meta ------------------------ */

const BASE_INTERACT: Record<string, { kind: InteractionKind; label: string }> = {
  "aurora-veil": { kind: "parallax", label: "Cursor — parallax drift" },
  starfall: { kind: "spawn", label: "Tap — star burst" },
  "tidal-waves": { kind: "ripple", label: "Tap — water rings" },
  "alpine-dusk": { kind: "parallax", label: "Cursor — parallax drift" },
  "particle-bloom": { kind: "spawn", label: "Tap — sparkle burst" },
  "liquid-dreams": { kind: "ripple", label: "Tap — light rings" },
  "neon-horizon": { kind: "parallax", label: "Cursor — parallax drift" },
  "firefly-grove": { kind: "parallax", label: "Cursor — parallax drift" },
  "petal-drift": { kind: "parallax", label: "Cursor — parallax drift" },
  "solaris-mandala": { kind: "parallax", label: "Cursor — parallax drift" },
  "rain-glass": { kind: "parallax", label: "Cursor — parallax drift" },
  "orbit-bloom": { kind: "parallax", label: "Cursor — parallax drift" },
};

const VARIANTS_PER_BASE = 8;
const VARIANTS_PER_NEW = 10;

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCatalog(): WallpaperDef[] {
  const out: WallpaperDef[] = [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();

  const add = (def: WallpaperDef) => {
    let id = def.id;
    let n = 2;
    while (usedIds.has(id)) id = `${def.id}-${n++}`;
    usedIds.add(id);
    let name = def.name;
    if (usedNames.has(name)) name = `${name} ${n > 2 ? n - 1 : "II"}`;
    usedNames.add(name);
    out.push({ ...def, id, name });
  };

  // foundational engines — 8 named variants each (variant 0 = the hero,
  // which keeps the original id so existing likes/downloads carry over)
  for (const base of BASE_WALLPAPERS) {
    const bank = BASE_FAMILY[base.id];
    const decorate =
      base.id === "tidal-waves" || base.id === "liquid-dreams"
        ? "ripple"
        : base.id === "starfall" || base.id === "particle-bloom"
          ? "burst"
          : undefined;
    const draw =
      decorate === "ripple" ? withRipple(base.draw) : decorate === "burst" ? withBurst(base.draw) : base.draw;

    for (let i = 0; i < VARIANTS_PER_BASE; i++) {
      const r = i % base.palettes.length;
      const rotated = i === 0 ? base.palettes : [...base.palettes.slice(r), ...base.palettes.slice(0, r)];
      const isHero = i === 0;
      add({
        id: isHero ? base.id : slug(bank.names[i]),
        name: bank.names[i],
        tagline: isHero ? base.tagline : bank.taglines[(i - 1) % bank.taglines.length],
        category: base.category,
        icon: base.icon,
        heroTime: base.heroTime + i * 0.17,
        palettes: rotated,
        draw,
        interact: BASE_INTERACT[base.id],
        defaults: isHero
          ? undefined
          : {
              speed: 0.82 + ((i * 7) % 5) * 0.13,
              density: 0.78 + ((i * 3) % 6) * 0.11,
              glow: 0.82 + ((i * 5) % 4) * 0.14,
              seed: (fnv1a(bank.names[i]) % 9000) + 40,
            },
      });
    }
  }

  // interactive v2 families — 10 named variants each
  for (const fam of NEW_FAMILIES) {
    const decorated =
      fam.decorate === "ripple" ? withRipple(fam.draw) : fam.decorate === "burst" ? withBurst(fam.draw) : fam.draw;
    for (let i = 0; i < VARIANTS_PER_NEW; i++) {
      const r = i % fam.palettes.length;
      const rotated = i === 0 ? fam.palettes : [...fam.palettes.slice(r), ...fam.palettes.slice(0, r)];
      add({
        id: slug(fam.names[i]),
        name: fam.names[i],
        tagline: fam.taglines[i % fam.taglines.length],
        category: fam.category,
        icon: fam.icon,
        heroTime: fam.heroTime + i * 0.13,
        palettes: rotated,
        draw: decorated,
        interact: fam.interact,
        defaults: {
          paletteIndex: 0,
          speed: 0.85 + ((i * 7) % 5) * 0.12,
          density: 0.8 + ((i * 3) % 6) * 0.1,
          glow: 0.85 + ((i * 5) % 4) * 0.12,
          seed: (fnv1a(fam.names[i]) % 9000) + 40,
        },
        tags: [...(fam.tags ?? []), "new"],
      });
    }
  }

  return out;
}

export const WALLPAPERS: WallpaperDef[] = buildCatalog();

/** ordered list of categories present in the catalog */
export const CATEGORIES: WallpaperCategory[] = [
  "Nature",
  "Ocean",
  "Space",
  "Abstract",
  "Urban",
  "Dreamy",
  "Retro",
  "Geometric",
].filter((c) => WALLPAPERS.some((w) => w.category === c));

export function getWallpaper(id: string): WallpaperDef {
  return WALLPAPERS.find((wp) => wp.id === id) ?? WALLPAPERS[0];
}

/**
 * Time-of-day scene picker — "For right now".
 * Deterministic per hour: everyone who presses the button at 21:00 on the
 * same day gets the same evening pick, and it changes gently through the
 * day. Pure function so it can be tested without a browser.
 */

export type TimeBucket = {
  key: "dawn" | "day" | "dusk" | "night";
  label: string;
  /** scene ids curated for this light — must exist in the catalog */
  ids: string[];
};

export const TIME_BUCKETS: TimeBucket[] = [
  {
    key: "dawn",
    label: "Morning",
    ids: [
      "cappadocia-morning",
      "sakura-fall",
      "sunlit-lagoon",
      "alpine-dusk",
      "meadow-whimsy",
      "balloon-fiesta",
      "spring-whisper",
      "bonsai-bloom",
      "kyoto-morning",
      "golden-meadow",
    ],
  },
  {
    key: "day",
    label: "Daytime",
    ids: [
      "tidal-waves",
      "coral-drift",
      "koi-pond",
      "tropical-noon",
      "butterfly-chase",
      "glass-aquarium",
      "bubble-rise",
      "stained-glass",
      "sand-garden",
      "fish-whisper",
    ],
  },
  {
    key: "dusk",
    label: "Golden hour",
    ids: [
      "alpine-dusk",
      "ember-forge",
      "solaris-mandala",
      "birds-of-dusk",
      "chrome-sunset",
      "vapor-coast",
      "candle-sanctuary",
      "dusk-dunes",
      "lantern-field",
      "furnace-glow",
    ],
  },
  {
    key: "night",
    label: "Late night",
    ids: [
      "aurora-veil",
      "starfall",
      "moon-jellies",
      "galaxy-spinner",
      "whale-song",
      "neon-horizon",
      "orbit-bloom",
      "firefly-grove",
      "midnight-arcade",
      "bioluminescence",
    ],
  },
];

/** Hour of day (0-23) → bucket. */
export function bucketForHour(hour: number): TimeBucket {
  if (hour >= 5 && hour < 10) return TIME_BUCKETS[0];
  if (hour >= 10 && hour < 16) return TIME_BUCKETS[1];
  if (hour >= 16 && hour < 20) return TIME_BUCKETS[2];
  return TIME_BUCKETS[3];
}

/**
 * Pick the scene for "now": bucket by hour, then rotate through the
 * curated list by day-of-year so it changes daily but stays stable
 * within the hour. Falls back safely if a curated id ever leaves the
 * catalog.
 */
export function pickForNowId(hour: number, validIds: Set<string>): { id: string; bucket: TimeBucket } {
  const bucket = bucketForHour(hour);
  const days = Math.floor(Date.now() / 86_400_000);
  const pool = bucket.ids.filter((id) => validIds.has(id));
  if (pool.length === 0) return { id: "", bucket };
  const id = pool[(days + hour) % pool.length];
  return { id, bucket };
}

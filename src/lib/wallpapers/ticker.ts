/**
 * Single shared requestAnimationFrame loop driving every animated canvas.
 * Each task declares its own fps budget; the loop skips frames for
 * cheaper tasks (e.g. gallery thumbnails) and can pause them entirely
 * when they scroll out of view.
 *
 * Memory safety: software-rasterized canvases are the app's biggest
 * memory consumer. Low-priority tasks (gallery thumbnails) share a
 * global draw-slot budget via stride sharing, so a page full of thumbs
 * can never rasterize more than MAX_LOW_DRAWS frames per tick — this
 * keeps compositor/raster memory bounded even during remount storms
 * (filter changes mount 24 fresh canvases at once).
 */

type Task = {
  draw: (t: number) => void;
  interval: number; // ms between frames
  last: number;
  visible: boolean;
  paused: boolean;
  low: boolean; // low-priority tasks share a raster budget
  skip: number; // stride phase counter
};

/** max low-priority (thumbnail) frames rasterized per rAF tick */
const MAX_LOW_DRAWS_PER_TICK = 14;

const tasks = new Set<Task>();
let rafId: number | null = null;

function loop() {
  const now = performance.now();
  const t = now / 1000;

  // how many low-priority tasks want to draw this tick?
  let lowEligible = 0;
  tasks.forEach((task) => {
    if (task.low && task.visible && !task.paused && now - task.last >= task.interval) lowEligible++;
  });
  const stride = lowEligible > MAX_LOW_DRAWS_PER_TICK ? Math.ceil(lowEligible / MAX_LOW_DRAWS_PER_TICK) : 1;

  tasks.forEach((task) => {
    if (!task.visible || task.paused) return;
    if (now - task.last < task.interval) return;
    if (task.low && stride > 1) {
      // stride sharing: each eligible task draws on every stride-th
      // opportunity, spreading the raster budget fairly across thumbs
      task.skip = (task.skip + 1) % stride;
      if (task.skip !== 0) return;
    }
    task.last = now;
    try {
      task.draw(t);
    } catch {
      /* never let one broken canvas kill the loop */
    }
  });
  rafId = requestAnimationFrame(loop);
}

function ensureLoop() {
  if (rafId === null) rafId = requestAnimationFrame(loop);
}

/** Register a draw callback. Returns a handle to update/kill it. */
export function addTickerTask(
  draw: (t: number) => void,
  fps = 60,
  opts?: { low?: boolean },
) {
  const task: Task = {
    draw,
    interval: 1000 / Math.max(1, fps),
    last: 0,
    visible: true,
    paused: false,
    low: opts?.low ?? false,
    skip: 0,
  };
  tasks.add(task);
  ensureLoop();
  return {
    setVisible(v: boolean) {
      task.visible = v;
    },
    setPaused(p: boolean) {
      task.paused = p;
    },
    destroy() {
      tasks.delete(task);
    },
  };
}

/** Global pause (e.g. when a modal covers everything). */
export function setAllPaused(paused: boolean) {
  tasks.forEach((t) => {
    t.paused = paused;
  });
}

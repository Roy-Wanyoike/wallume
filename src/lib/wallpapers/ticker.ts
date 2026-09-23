/**
 * Single shared requestAnimationFrame loop driving every animated canvas.
 * Each task declares its own fps budget; the loop skips frames for
 * cheaper tasks (e.g. gallery thumbnails) and can pause them entirely
 * when they scroll out of view.
 */

type Task = {
  draw: (t: number) => void;
  interval: number; // ms between frames
  last: number;
  visible: boolean;
  paused: boolean;
};

const tasks = new Set<Task>();
let rafId: number | null = null;

function loop() {
  const now = performance.now();
  const t = now / 1000;
  tasks.forEach((task) => {
    if (!task.visible || task.paused) return;
    if (now - task.last >= task.interval) {
      task.last = now;
      try {
        task.draw(t);
      } catch {
        /* never let one broken canvas kill the loop */
      }
    }
  });
  rafId = requestAnimationFrame(loop);
}

function ensureLoop() {
  if (rafId === null) rafId = requestAnimationFrame(loop);
}

/** Register a draw callback. Returns a handle to update/kill it. */
export function addTickerTask(draw: (t: number) => void, fps = 60) {
  const task: Task = {
    draw,
    interval: 1000 / Math.max(1, fps),
    last: 0,
    visible: true,
    paused: false,
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

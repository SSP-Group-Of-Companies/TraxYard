/**
 * Global refresh bus (single clock for the whole app)
 * - One interval, many subscribers.
 * - Visibility-aware: pauses when tab hidden, resumes and fires once on return.
 * - Cadence configurable once from any consumer (last caller wins).
 */

type Listener = () => void;

class RefreshBus {
  private listeners = new Set<Listener>();
  private cadence = 60_000; // default 1 min
  private timer: number | null = null;
  private started = false;
  // Reference-counted pause gate so multiple modals/components can
  // independently pause global refresh without stepping on each other.
  private pauseCount = 0;

  /** Subscribe to ticks. Returns an unsubscribe fn. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    this.ensureRunning();
    return () => {
      this.listeners.delete(fn);
      this.maybeStop();
    };
  }

  /** Set cadence in ms (applies immediately). */
  setCadence(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this.cadence = ms;
    if (this.started) this.restart();
  }

  /** Force a tick now (e.g., after user action). */
  poke() {
    this.emit();
  }

  // -------- internal ----------
  private ensureRunning() {
    if (this.started || this.listeners.size === 0) return;
    this.started = true;

    const tick = () => {
      if (document.visibilityState === "visible") this.emit();
    };

    this.timer = window.setInterval(tick, this.cadence);
    document.addEventListener("visibilitychange", this.onVis);
  }

  private maybeStop() {
    if (!this.started || this.listeners.size > 0) return;
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
    this.started = false;
    document.removeEventListener("visibilitychange", this.onVis);
  }

  private restart() {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (document.visibilityState === "visible") this.emit();
    }, this.cadence);
  }

  private onVis = () => {
    if (document.visibilityState === "visible") {
      // fire once immediately when user returns
      this.emit();
    }
  };

  private emit() {
    // If globally paused (e.g., a modal is open), skip emitting.
    if (this.pauseCount > 0) return;

    for (const fn of Array.from(this.listeners)) {
      try {
        fn();
      } catch {
        /* no-op to isolate failures */
      }
    }
  }

  /** Pause global refresh ticks (reference-counted). */
  pause() {
    this.pauseCount++;
  }

  /** Resume global refresh ticks (reference-counted). */
  resume() {
    this.pauseCount = Math.max(0, this.pauseCount - 1);
  }

  /** Returns true when refresh is currently paused. */
  isPaused() {
    return this.pauseCount > 0;
  }
}

export const refreshBus = new RefreshBus();

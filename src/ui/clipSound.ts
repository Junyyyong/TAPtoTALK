/** Gesture-unlocked, non-looping audio for delayed result videos. */
export class ClipSound {
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private pending = new Map<string, Promise<AudioBuffer>>();
  private revision = 0;

  unlock(): void {
    try {
      const Constructor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      this.context ??= new Constructor();
      if (this.context.state !== "running") void this.context.resume().catch(() => {});
    } catch { /* HTML audio remains available as a fallback. */ }
  }

  prepare(url: string): void {
    if (this.context) void this.load(url).catch(() => {});
  }

  private load(url: string): Promise<AudioBuffer> {
    let request = this.pending.get(url);
    if (!request) {
      request = fetch(url).then(response => {
        if (!response.ok) throw new Error("Sound unavailable");
        return response.arrayBuffer();
      }).then(bytes => this.context!.decodeAudioData(bytes)).catch(error => {
        this.pending.delete(url); throw error;
      });
      this.pending.set(url, request);
    }
    return request;
  }

  async play(url: string, position: () => number): Promise<void> {
    this.stop();
    const revision = this.revision;
    const context = this.context;
    if (!context || context.state !== "running") throw new Error("Sound needs a tap");
    const buffer = await this.load(url);
    if (revision !== this.revision) return;
    if (context.state !== "running") throw new Error("Sound suspended");
    const offset = Math.max(0, position());
    if (offset >= buffer.duration) return;
    const source = context.createBufferSource();
    source.buffer = buffer; source.connect(context.destination);
    this.source = source;
    source.onended = () => { source.disconnect(); if (this.source === source) this.source = undefined; };
    source.start(0, offset);
  }

  stop(): void {
    this.revision++;
    const source = this.source; this.source = undefined;
    if (source) { try { source.stop(); } catch { /* already ended */ } source.disconnect(); }
  }
}

import { parseNoteName, midiToName } from './notes.js';

/**
 * Owns the Web Audio graph and note on/off/sustain logic. Keeps its own
 * references to the key meshes so it can drive the press animation and
 * color directly, so callers just call noteOn/noteOff/setPedal.
 */
export class PianoAudio {
  constructor(keys, { onStatus = () => {}, onNote = () => {} } = {}) {
    this.keys = keys;
    this.onStatus = onStatus;
    this.onNote = onNote;

    this.ctx = null;
    this.master = null;
    this.pedal = false;

    this.voices = {};       // midi -> { out, nodes }
    this.down = new Set();  // midi currently physically held
    this.sustained = new Set();
    this.samples = [];      // { midi, buffer }
  }

  /** Lazily creates (or resumes) the AudioContext — must happen after a user gesture. */
  audio() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ---- Samples: fetch + decodeAudioData -----------------------------------

  /** Decode one sample. `name` must contain a note like "C4" or "F#3". */
  async addSample(name, arrayBuffer) {
    const midi = parseNoteName(name);
    if (midi === null) return false;
    const buffer = await this.audio().decodeAudioData(arrayBuffer);
    this.samples.push({ midi, buffer });
    return true;
  }

  /** Load a set of sample files from a folder you host, e.g. your own server. */
  async loadSamplesFromUrls(baseUrl, names) {
    let loaded = 0;
    for (const name of names) {
      try {
        const res = await fetch(baseUrl + name);
        if (res.ok && (await this.addSample(name, await res.arrayBuffer()))) loaded++;
      } catch {
        /* skip unreadable files */
      }
    }
    this.onStatus(`${loaded} samples loaded`);
    return loaded;
  }

  /** Load samples from a FileList, e.g. an <input type="file"> change event. */
  async loadSamplesFromFiles(fileList) {
    let loaded = 0;
    for (const file of fileList) {
      try {
        if (await this.addSample(file.name, await file.arrayBuffer())) loaded++;
      } catch {
        /* skip unreadable files */
      }
    }
    this.onStatus(
      loaded ? `${loaded} samples loaded (pitch-shifted between them)` : 'No usable files. Name them like C4.mp3 or F#3.wav'
    );
    return loaded;
  }

  // ---- Voices: nearest sample re-pitched, or synth fallback ---------------

  startVoice(midi, velocity) {
    const ctx = this.audio();
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(this.master);

    if (this.samples.length) {
      const nearest = this.samples.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
      const src = ctx.createBufferSource();
      src.buffer = nearest.buffer;
      src.playbackRate.value = Math.pow(2, (midi - nearest.midi) / 12);
      out.gain.setValueAtTime(velocity, t);
      src.connect(out);
      src.start(t);
      return { out, nodes: [src] };
    }

    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.35 * velocity, t + 0.005);
    out.gain.exponentialRampToValueAtTime(0.12 * velocity, t + 0.6);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    osc1.connect(out);
    osc2.connect(osc2Gain);
    osc2Gain.connect(out);
    osc1.start(t);
    osc2.start(t);

    return { out, nodes: [osc1, osc2] };
  }

  stopVoice(midi, release = 0.35) {
    const voice = this.voices[midi];
    if (!voice) return;
    const t = this.ctx.currentTime;
    voice.out.gain.cancelScheduledValues(t);
    voice.out.gain.setValueAtTime(Math.max(voice.out.gain.value, 0.0001), t);
    voice.out.gain.exponentialRampToValueAtTime(0.0001, t + release);
    voice.nodes.forEach((n) => n.stop(t + release + 0.05));
    delete this.voices[midi];
  }

  // ---- Public note on/off/sustain API --------------------------------------

  noteOn(midi, velocity = 0.8) {
    const key = this.keys[midi];
    if (!key) return;

    this.down.add(midi);
    this.sustained.delete(midi);
    if (this.voices[midi]) this.stopVoice(midi, 0.05); // re-strike
    this.voices[midi] = this.startVoice(midi, velocity);

    key.target = 0.07;
    key.mat.color.copy(key.pressColor);
    this.onNote(midiToName(midi));
  }

  noteOff(midi) {
    const key = this.keys[midi];
    if (!key) return;

    this.down.delete(midi);
    key.target = 0;
    key.mat.color.copy(key.baseColor);

    if (this.pedal) this.sustained.add(midi);
    else this.stopVoice(midi);
  }

  setPedal(on) {
    if (this.pedal === on) return;
    this.pedal = on;
    this.onStatus(on ? 'Sustain pedal down' : '');
    if (!on) {
      this.sustained.forEach((midi) => {
        if (!this.down.has(midi)) this.stopVoice(midi, 0.5);
      });
      this.sustained.clear();
    }
  }
}

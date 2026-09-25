# piano-3d

A full-size 88-key 3D piano in the browser, built with Three.js and vanilla ES modules (no TypeScript).

## Setup

```bash
npm install
npm run dev
```

This starts Vite's dev server and opens the piano in your browser.

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Project layout

```
index.html            Entry HTML, loads src/main.js as a module
src/
  main.js              Wires everything together and runs the render loop
  style.css            HUD styling
  piano/
    notes.js           Note names, MIDI helpers, layout constants
    scene.js           Scene, camera, renderer, lights, manual orbit controls
    keyGeometry.js      Rounded-key geometry (ExtrudeGeometry + bevel)
    keyboard.js         Builds the 88 keys + wooden case
    labels.js           Note-name canvas-texture labels on white keys
    audio.js            Web Audio engine: synth fallback, sample playback, sustain
    midi.js             Web MIDI hardware keyboard support
    input.js            Pointer (click/drag/glissando) + computer-keyboard input
    ui.js               Wires the HUD buttons to the audio engine
public/
  samples/              Put your own note-named audio files here (see below)
```

## Playing it

- Click or drag across keys to play them (drag = glissando).
- Computer keyboard: `A`–`L` for the white keys, `W`–`P` for the black keys, both starting at middle C.
- Spacebar is the sustain pedal.
- Drag the background to orbit the camera, scroll to zoom.
- **Labels** button toggles note names on the white keys.
- **MIDI** button connects a hardware MIDI keyboard (Chrome/Edge only).

## Using real piano samples

By default the piano uses a small built-in synth. To use real samples instead:

1. Drop audio files into `public/samples/`, named with their note, e.g. `C4.mp3`, `F#3.wav`, `Bb5.mp3`. A sample every 3–5 semitones is plenty; the engine pitch-shifts to fill the gaps.
2. In `src/main.js`, uncomment the `loadSamplesFromUrls` line and list your file names.
3. Or, at runtime, click **Load samples** in the HUD and pick files from your computer — no code change needed.

import { initMIDI } from './midi.js';

/** Wires the HUD's note/status text and its three buttons to a PianoAudio instance. */
export function setupUI(pianoAudio, labels) {
  const noteEl = document.getElementById('note');
  const statusEl = document.getElementById('status');

  pianoAudio.onNote = (name) => { noteEl.textContent = name; };
  pianoAudio.onStatus = (text) => { statusEl.textContent = text; };

  document.getElementById('lbl').addEventListener('click', (e) => {
    const show = !labels[0]?.visible;
    labels.forEach((plane) => { plane.visible = show; });
    e.currentTarget.blur();
  });

  document.getElementById('files').addEventListener('change', (e) => {
    pianoAudio.loadSamplesFromFiles(e.target.files);
  });

  document.getElementById('midiBtn').addEventListener('click', (e) => {
    initMIDI(pianoAudio, pianoAudio.onStatus);
    e.currentTarget.blur();
  });
}

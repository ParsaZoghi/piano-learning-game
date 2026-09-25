/**
 * Connects a hardware MIDI keyboard via Web MIDI, forwarding note on/off,
 * velocity, and CC64 (sustain pedal) to a PianoAudio instance.
 * Only Chrome and Edge support Web MIDI as of this writing.
 */
export async function initMIDI(pianoAudio, onStatus = () => {}) {
  if (!navigator.requestMIDIAccess) {
    onStatus('Web MIDI is not supported in this browser (try Chrome or Edge).');
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess();

    const hook = () => {
      access.inputs.forEach((input) => {
        input.onmidimessage = (e) => {
          const [status, data1, data2] = e.data;
          const command = status & 0xf0;
          if (command === 0x90 && data2 > 0) pianoAudio.noteOn(data1, data2 / 127);
          else if (command === 0x80 || (command === 0x90 && data2 === 0)) pianoAudio.noteOff(data1);
          else if (command === 0xb0 && data1 === 64) pianoAudio.setPedal(data2 >= 64);
        };
      });
      onStatus(
        access.inputs.size ? 'MIDI: ' + [...access.inputs.values()].map((i) => i.name).join(', ') : 'MIDI ready, no device found'
      );
    };

    hook();
    access.onstatechange = hook;
  } catch (err) {
    onStatus('MIDI unavailable: ' + err.message);
  }
}

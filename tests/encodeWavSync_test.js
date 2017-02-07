import test from 'ava';
import encodeWavSync from '../js/encodeWavSync';

function getUTFBytes(view, offset, length) {
  let string = "";

  for (let i=0; i<length; i++) {
    string += String.fromCharCode(view.getUint8(offset + i));
  }

  return string;
}

test('encodeWavSync', t => {
  // Encode a very short silent 2-channel wav
  const batches = [
    [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])],
    [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])],
    [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])],
    [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])]
  ];

  const encoded = encodeWavSync(batches, 44100);
  const view = new DataView(encoded);

  const expectedSize = 44 + (// Header
    2 * // 2 channels
    4 * // samples per channel
    4 * // number of batches
    2   // 16-bit audio
  );

  t.is(encoded.byteLength, expectedSize);

  // Test some pieces of the header
  t.is(getUTFBytes(view, 0, 4), 'RIFF');
  t.is(getUTFBytes(view, 8, 4), 'WAVE');
  t.is(getUTFBytes(view, 12, 4), 'fmt ');
});

test('encodeWavSync - empty file', t => {
  const encoded = encodeWavSync([], 44100);

  // Just the size of the header
  t.is(encoded.byteLength, 44);
})

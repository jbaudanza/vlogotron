import { sumBy, uniqBy } from "lodash";

// Based off of:
//  http://typedarray.org/from-microphone-to-wav-with-getusermedia-and-web-audio/
//  http://soundfile.sapp.org/doc/WaveFormat/

/*
  sampleBatches is an array of arrays of Float32Arrays. The outer array references
  a batch of recorded samples across multiple channels. The inner array elements
  each represent one channel. For example:

  [
    // batch 1
    [Float32Array, Float32Array], // channels 1 and 2

    // batch 2
    [Float32Array, Float32Array], // channels 1 and 2

    // ..etc..
  ]
*/
export default function encodeWavSync(sampleBatches, sampleRate) {
  // If for some reason this value ever changes, we also need to change
  // the method we use to write PCM samples into the dataview. For example,
  // 8-bit audio would need to use DataView.setInt8
  const bytesPerSample = 2;

  const bitsPerSample = bytesPerSample * 8;

  let numberOfSamplesPerChannel;
  let numberOfChannels;

  if (sampleBatches.length > 0) {
    // Assume each channel has the name number of samples
    numberOfSamplesPerChannel = sumBy(sampleBatches, batch => batch[0].length);
    numberOfChannels = sampleBatches[0].length;
  } else {
    numberOfSamplesPerChannel = 0;
    numberOfChannels = 0;
  }

  // create the buffer and view to create the .WAV file
  const dataSize =
    numberOfSamplesPerChannel * numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper for writing strings into the dataview
  function writeUTFBytes(offset, string) {
    const lng = string.length;
    for (let i = 0; i < lng; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  //
  // RIFF chunk descriptor
  //
  // ChunkID
  writeUTFBytes(0, "RIFF");
  // ChunkSize
  view.setUint32(4, buffer.byteLength - 8, true);
  // Format
  writeUTFBytes(8, "WAVE");

  //
  // FMT sub-chunk
  //
  // Subchunk1ID
  writeUTFBytes(12, "fmt ");
  // Subchunk1Size
  view.setUint32(16, 16, true);
  // AudioFormat
  view.setUint16(20, 1, true); // 1 = PCM
  // NumChannels
  view.setUint16(22, numberOfChannels, true);
  // SampleRate
  view.setUint32(24, sampleRate, true);
  // ByteRate
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  // BlockAlign
  view.setUint16(32, numberOfChannels * bytesPerSample, true);
  // BitsPerSample
  view.setUint16(34, bitsPerSample, true);

  //
  // data sub-chunk
  //
  // Subchunk2ID
  writeUTFBytes(36, "data");
  // Subchunk2Size
  view.setUint32(40, dataSize, true);

  // write the interleaved PCM samples
  let byteOffset = 44;
  const volume = 1;
  const pcmMax = (1 << bitsPerSample) / 2 - 1;

  sampleBatches.forEach(batch => {
    if (batch.length !== numberOfChannels)
      throw "Mismatched channel count. Expected " + numberOfChannels;

    if (uniqBy(batch, array => array.length).length !== 1)
      throw "Expected each channel to have the same number of sample";

    const numberOfSamples = batch[0].length;

    for (let i = 0; i < numberOfSamples; i++) {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        view.setInt16(byteOffset, batch[ch][i] * (pcmMax * volume), true);
        byteOffset += bytesPerSample;
      }
    }
  });

  return buffer;
}

const maryHadALittleLamb = [
  [ 'A', 0, 1 ],  // Ma-
  [ 'G', 1, 1 ],  // ry
  [ 'F', 2, 1 ],  // had
  [ 'G', 3, 1 ],  // a

  [ 'A', 4, 1 ],  // lit-
  [ 'A', 5, 1 ],  // tle
  [ 'A', 6, 2 ],  // lamb

  [ 'G', 8, 1 ],  // lit-
  [ 'G', 9, 1 ],  // tle
  [ 'G', 10, 2 ], // lamb

  [ 'A', 12, 1 ], // lit-
  [ 'C', 13, 1 ], // tle       TODO: This should be one octave up
  [ 'C', 14, 2 ], // lamb

  [ 'A', 16, 1 ], // Ma-
  [ 'G', 17, 1 ], // ry
  [ 'F', 18, 1 ], // had
  [ 'G', 19, 1 ], // a

  [ 'A', 20, 1 ], // lit-
  [ 'A', 21, 1 ], // tle
  [ 'A', 22, 1 ], // lamb
  [ 'A', 23, 1 ], // its

  [ 'G', 24, 1 ], // fleece
  [ 'G', 25, 1 ], // was
  [ 'A', 26, 1 ], // white
  [ 'G', 27, 1 ], // as

  [ 'F', 28, 2 ]  // snow
];

// time-signature is 3/4
const happyBirthday = [
                   // -silent
  ['D', 3,   0.5],  // hap-
  ['D', 3.5, 0.5],  // py

  ['E', 4, 1],      // birth
  ['D', 5, 1],      // day
  ['G', 6, 1],      // to

  ['F', 7,     2],  // you
  ['D', 9,   0.5],  // hap-
  ['D', 9.5, 0.5],  // py

  ['E', 10, 1],     // birth
  ['D', 11, 1],     // day
  ['A', 12, 1],     // to

  ['G', 13,     2], // you
  ['D', 15,   0.5], // hap-
  ['D', 15.5, 0.5], // py

  ['D', 16, 1],     // birth     // TODO: This should be an octave higher
  ['B', 17, 1],     // day
  ['G', 18, 1],     // dear

  ['F', 19,     1], // blah
  ['E', 20,     1], // blah
  ['C', 21,   0.5], // hap-  // TODO: This should be an octave higher
  ['C', 21.5, 0.5], // py

  ['B', 22, 1],      // birth
  ['G', 23, 1],      // day
  ['A', 24, 1],      // to

  ['G', 25, 1]        // you
];

export const song = happyBirthday;

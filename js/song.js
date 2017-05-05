import { concat, filter, findIndex, max } from "lodash";

// Consider encoding this like:
/*
{
  signature: [4,4],
  start: {
    measure: 0,
    beat: 0
  }
  notes: [
    [ 'A4', 0, 0, 4 ] // note, measure, beat, note type
  ]
}
*/

const maryHadALittleLamb = [
  ["A4", 0, 1], // Ma-
  ["G4", 1, 1], // ry
  ["F4", 2, 1], // had
  ["G4", 3, 1], // a

  ["A4", 4, 1], // lit-
  ["A4", 5, 1], // tle
  ["A4", 6, 2], // lamb

  ["G4", 8, 1], // lit-
  ["G4", 9, 1], // tle
  ["G4", 10, 2], // lamb

  ["A4", 12, 1], // lit-
  ["C5", 13, 1], // tle
  ["C5", 14, 2], // lamb

  ["A4", 16, 1], // Ma-
  ["G4", 17, 1], // ry
  ["F4", 18, 1], // had
  ["G4", 19, 1], // a

  ["A4", 20, 1], // lit-
  ["A4", 21, 1], // tle
  ["A4", 22, 1], // lamb
  ["A4", 23, 1], // its

  ["G4", 24, 1], // fleece
  ["G4", 25, 1], // was
  ["A4", 26, 1], // white
  ["G4", 27, 1], // as

  ["F4", 28, 2] // snow
];

// time-signature is 3/4
const happyBirthday = [
  // -silent
  ["D4", 3, 0.5], // hap-
  ["D4", 3.5, 0.5], // py

  ["E4", 4, 1], // birth
  ["D4", 5, 1], // day
  ["G4", 6, 1], // to

  ["F#4", 7, 2], // you
  ["D4", 9, 0.5], // hap-
  ["D4", 9.5, 0.5], // py

  ["E4", 10, 1], // birth
  ["D4", 11, 1], // day
  ["A4", 12, 1], // to

  ["G4", 13, 2], // you
  ["D4", 15, 0.5], // hap-
  ["D4", 15.5, 0.5], // py

  ["D5", 16, 1], // birth
  ["B4", 17, 1], // day
  ["G4", 18, 1], // dear

  ["F#4", 19, 1], // blah
  ["E4", 20, 1], // blah
  ["C5", 21, 0.5], // hap-
  ["C5", 21.5, 0.5], // py

  ["B4", 22, 1], // birth
  ["G4", 23, 1], // day
  ["A4", 24, 1], // to

  ["G4", 25, 1] // you
];

const chopsticks = [
  ["G4", 0, 0.24],
  ["G4", 0.25, 0.24],
  ["G4", 0.5, 0.24],
  ["G4", 0.75, 0.24],
  ["G4", 1, 0.24],
  ["G4", 1.25, 0.24],
  ["G4", 1.5, 0.24],
  ["G4", 1.75, 0.24],
  ["G4", 2, 0.24],
  ["G4", 2.25, 0.24],
  ["G4", 2.5, 0.24],
  ["G4", 2.75, 0.24],
  ["B4", 3, 0.24],
  ["B4", 3.25, 0.24],
  ["B4", 3.5, 0.24],
  ["B4", 3.75, 0.24],
  ["A4", 4, 0.24],
  ["B4", 4.25, 0.24],
  ["C5", 4.5, 0.74],
  ["C5", 4.75, 0.74],
  ["C5", 5, 0.74],
  ["C5", 5.25, 0.74],
  ["B4", 5.5, 0.24],
  ["A4", 5.75, 0.24],
  ["G4", 6, 0.24],
  ["G4", 6.25, 0.24],
  ["G4", 6.5, 0.24],
  ["G4", 6.75, 0.24],
  ["G4", 7, 0.24],
  ["G4", 7.25, 0.24],
  ["G4", 7.5, 0.24],
  ["G4", 7.75, 0.24],
  ["G4", 8, 0.24],
  ["G4", 8.25, 0.24],
  ["G4", 8.5, 0.24],
  ["G4", 8.75, 0.24],
  ["B4", 9, 0.24],
  ["B4", 9.25, 0.24],
  ["B4", 9.5, 0.24],
  ["B4", 9.75, 0.24],
  ["A4", 10, 0.24],
  ["B4", 10.25, 0.24],
  ["C5", 10.5, 0.74],
  ["E4", 11.75, 0.24],
  ["D5", 12, 0.49],
  ["C5", 12.5, 0.24],
  ["B4", 12.75, 0.49],
  ["A4", 13.25, 0.24],
  ["G4", 13.5, 0.24],
  ["G4", 14, 0.24],
  ["G4", 14.25, 0.24],
  ["A4", 14.5, 0.24],
  ["G4", 14.75, 0.24],
  ["F4", 15, 0.24],
  ["F4", 15.5, 0.24],
  ["F4", 15.75, 0.24],
  ["G4", 16, 0.24],
  ["F4", 16.25, 0.24],
  ["E4", 16.5, 0.24],
  ["E4", 17, 0.24],
  ["E4", 17.25, 0.24],
  ["E4", 17.75, 0.24],
  ["D5", 18, 0.49],
  ["C5", 18.5, 0.24],
  ["B4", 18.75, 0.49],
  ["A4", 19.25, 0.24],
  ["G4", 19.5, 0.24],
  ["G4", 20, 0.24],
  ["G4", 20.25, 0.24],
  ["A4", 20.5, 0.24],
  ["G4", 20.75, 0.24],
  ["F4", 21, 0.24],
  ["F4", 21.5, 0.24],
  ["F4", 21.75, 0.24],
  ["G4", 22, 0.24],
  ["F4", 22.25, 0.24],
  ["E4", 22.5, 0.24],
  ["E4", 22.75, 0.24],
  ["E4", 23, 0.24],
  ["E4", 23.25, 0.24],
  ["G4", 24, 0.24],
  ["G4", 24.25, 0.24],
  ["G4", 24.5, 0.24],
  ["G4", 24.75, 0.24],
  ["G4", 25, 0.24],
  ["G4", 25.25, 0.24],
  ["G4", 25.5, 0.24],
  ["G4", 25.75, 0.24],
  ["G4", 26, 0.24],
  ["G4", 26.25, 0.24],
  ["G4", 26.5, 0.24],
  ["G4", 26.75, 0.24],
  ["B4", 27, 0.24],
  ["B4", 27.25, 0.24],
  ["B4", 27.5, 0.24],
  ["B4", 27.75, 0.24],
  ["A4", 28, 0.24],
  ["B4", 28.25, 0.24],
  ["C5", 28.5, 0.74],
  ["C5", 28.75, 0.74],
  ["C5", 29, 0.74],
  ["C5", 29.25, 0.74],
  ["B4", 29.5, 0.24],
  ["A4", 29.75, 0.24],
  ["G4", 30, 0.24],
  ["G4", 30.25, 0.24],
  ["G4", 30.5, 0.24],
  ["G4", 30.75, 0.24],
  ["G4", 31, 0.24],
  ["G4", 31.25, 0.24],
  ["G4", 31.5, 0.24],
  ["G4", 31.75, 0.24],
  ["G4", 32, 0.24],
  ["G4", 32.25, 0.24],
  ["G4", 32.5, 0.24],
  ["G4", 32.75, 0.24],
  ["B4", 33, 0.24],
  ["B4", 33.25, 0.24],
  ["B4", 33.5, 0.24],
  ["B4", 33.75, 0.24],
  ["A4", 34, 0.24],
  ["B4", 34.25, 0.24],
  ["C5", 34.5, 0.74],
  ["E4", 35.75, 0.24],
  ["D5", 36, 0.49],
  ["C5", 36.5, 0.24],
  ["B4", 36.75, 0.49],
  ["A4", 37.25, 0.24],
  ["G4", 37.5, 0.24],
  ["G4", 38, 0.24],
  ["G4", 38.25, 0.24],
  ["A4", 38.5, 0.24],
  ["G4", 38.75, 0.24],
  ["F4", 39, 0.24],
  ["F4", 39.5, 0.24],
  ["F4", 39.75, 0.24],
  ["G4", 40, 0.24],
  ["F4", 40.25, 0.24],
  ["E4", 40.5, 0.24],
  ["E4", 41, 0.24],
  ["E4", 41.25, 0.24],
  ["E4", 41.75, 0.24],
  ["D5", 42, 0.49],
  ["C5", 42.5, 0.24],
  ["B4", 42.75, 0.49],
  ["A4", 43.25, 0.24],
  ["G4", 43.5, 0.24],
  ["G4", 44, 0.24],
  ["G4", 44.25, 0.24],
  ["A4", 44.5, 0.24],
  ["G4", 44.75, 0.24],
  ["F4", 45, 0.24],
  ["F4", 45.5, 0.24],
  ["F4", 45.75, 0.24],
  ["G4", 46, 0.24],
  ["F4", 46.25, 0.24],
  ["E4", 46.5, 0.24],
  ["E4", 47, 0.24],
  ["E4", 47.25, 0.24],
  ["G4", 48, 0.24],
  ["G4", 48.25, 0.24],
  ["G4", 48.5, 0.24],
  ["G4", 48.75, 0.24],
  ["G4", 49, 0.24],
  ["G4", 49.25, 0.24],
  ["G4", 49.5, 0.24],
  ["G4", 49.75, 0.24],
  ["G4", 50, 0.24],
  ["G4", 50.25, 0.24],
  ["G4", 50.5, 0.24],
  ["G4", 50.75, 0.24],
  ["B4", 51, 0.24],
  ["B4", 51.25, 0.24],
  ["B4", 51.5, 0.24],
  ["B4", 51.75, 0.24],
  ["A4", 52, 0.24],
  ["B4", 52.25, 0.24],
  ["C5", 52.5, 0.74],
  ["C5", 52.75, 0.74],
  ["C5", 53, 0.74],
  ["C5", 53.25, 0.74],
  ["B4", 53.5, 0.24],
  ["A4", 53.75, 0.24],
  ["G4", 54, 0.24],
  ["G4", 54.25, 0.24],
  ["G4", 54.5, 0.24],
  ["G4", 54.75, 0.24],
  ["G4", 55, 0.24],
  ["G4", 55.25, 0.24],
  ["G4", 55.5, 0.24],
  ["G4", 55.75, 0.24],
  ["G4", 56, 0.24],
  ["G4", 56.25, 0.24],
  ["G4", 56.5, 0.24],
  ["G4", 56.75, 0.24],
  ["B4", 57, 0.24],
  ["B4", 57.25, 0.24],
  ["B4", 57.5, 0.24],
  ["B4", 57.75, 0.24],
  ["A4", 58, 0.24],
  ["B4", 58.25, 0.24],
  ["C5", 58.5, 0.74],
  ["G4", 60, 0.24],
  ["G4", 60.25, 0.24],
  ["G4", 60.5, 0.24],
  ["G4", 60.75, 0.24],
  ["G4", 61, 0.24],
  ["G4", 61.25, 0.24],
  ["G4", 61.5, 0.24],
  ["G4", 61.75, 0.24],
  ["G4", 62, 0.24],
  ["G4", 62.25, 0.24],
  ["G4", 62.5, 0.24],
  ["G4", 62.75, 0.24],
  ["B4", 63, 0.24],
  ["B4", 63.25, 0.24],
  ["B4", 63.5, 0.24],
  ["B4", 63.75, 0.24],
  ["A4", 64, 0.24],
  ["B4", 64.25, 0.24],
  ["C5", 64.5, 0.74],
  ["C5", 64.75, 0.74],
  ["C5", 65, 0.74],
  ["C5", 65.25, 0.74],
  ["B4", 65.5, 0.24],
  ["A4", 65.75, 0.24],
  ["G4", 66, 0.24],
  ["G4", 66.25, 0.24],
  ["G4", 66.5, 0.24],
  ["G4", 66.75, 0.24],
  ["G4", 67, 0.24],
  ["G4", 67.25, 0.24],
  ["G4", 67.5, 0.24],
  ["G4", 67.75, 0.24],
  ["G4", 68, 0.24],
  ["G4", 68.25, 0.24],
  ["G4", 68.5, 0.24],
  ["G4", 68.75, 0.24],
  ["B4", 69, 0.24],
  ["B4", 69.25, 0.24],
  ["B4", 69.5, 0.24],
  ["B4", 69.75, 0.24],
  ["A4", 70, 0.24],
  ["B4", 70.25, 0.24],
  ["C5", 70.5, 0.74],
  ["C5", 70.75, 0.74],
  ["C5", 71, 0.74],
  ["C5", 71.25, 0.74],
  ["C5", 71.5, 0.74],
  ["C5", 71.75, 0.74],
  ["G4", 72, 0.24],
  ["G4", 72.25, 0.24],
  ["G4", 72.5, 0.24],
  ["G4", 72.75, 0.24],
  ["G4", 73, 0.24],
  ["G4", 73.25, 0.24],
  ["G4", 73.5, 0.24],
  ["G4", 73.75, 0.24],
  ["G4", 74, 0.24],
  ["G4", 74.25, 0.24],
  ["G4", 74.5, 0.24],
  ["G4", 74.75, 0.24],
  ["B4", 75, 0.24],
  ["B4", 75.25, 0.24],
  ["B4", 75.5, 0.24],
  ["B4", 75.75, 0.24],
  ["A4", 76, 0.24],
  ["B4", 76.25, 0.24],
  ["C5", 76.5, 0.74],
  ["C5", 76.75, 0.74],
  ["C5", 77, 0.74],
  ["C5", 77.25, 0.74],
  ["B4", 77.5, 0.24],
  ["A4", 77.75, 0.24],
  ["G4", 78, 0.24],
  ["G4", 78.25, 0.24],
  ["G4", 78.5, 0.24],
  ["G4", 78.75, 0.24],
  ["G4", 79, 0.24],
  ["G4", 79.25, 0.24],
  ["G4", 79.5, 0.24],
  ["G4", 79.75, 0.24],
  ["G4", 80, 0.24],
  ["G4", 80.25, 0.24],
  ["G4", 80.5, 0.24],
  ["G4", 80.75, 0.24],
  ["B4", 81, 0.24],
  ["B4", 81.25, 0.24],
  ["B4", 81.5, 0.24],
  ["B4", 81.75, 0.24],
  ["A4", 82, 0.24],
  ["B4", 82.25, 0.24],
  ["C5", 82.5, 0.74],
  ["C5", 82.75, 0.74],
  ["C5", 83, 0.74],
  ["C5", 83.25, 0.74],
  ["E4", 83.75, 0.24],
  ["D5", 84, 0.49],
  ["C5", 84.5, 0.24],
  ["B4", 84.75, 0.49],
  ["A4", 85.25, 0.24],
  ["G4", 85.5, 0.24],
  ["G4", 86, 0.24],
  ["G4", 86.25, 0.24],
  ["A4", 86.5, 0.24],
  ["G4", 86.75, 0.24],
  ["F4", 87, 0.24],
  ["F4", 87.5, 0.24],
  ["F4", 87.75, 0.24],
  ["G4", 88, 0.24],
  ["F4", 88.25, 0.24],
  ["E4", 88.5, 0.24],
  ["E4", 89, 0.24],
  ["E4", 89.25, 0.24],
  ["E4", 89.75, 0.24],
  ["D5", 90, 0.49],
  ["C5", 90.5, 0.24],
  ["B4", 90.75, 0.49],
  ["A4", 91.25, 0.24],
  ["G4", 91.5, 0.24],
  ["G4", 92, 0.24],
  ["G4", 92.25, 0.24],
  ["A4", 92.5, 0.24],
  ["G4", 92.75, 0.24],
  ["F4", 93, 0.24],
  ["F4", 93.5, 0.24],
  ["F4", 93.75, 0.24],
  ["G4", 94, 0.24],
  ["F4", 94.25, 0.24],
  ["E4", 94.5, 0.24],
  ["E4", 95, 0.24],
  ["E4", 95.25, 0.24],
  ["E4", 95.5, 0.24],
  ["E4", 95.75, 0.24],
  ["D5", 96, 0.49],
  ["C5", 96.5, 0.24],
  ["B4", 96.75, 0.49],
  ["A4", 97.25, 0.24],
  ["G4", 97.5, 0.24],
  ["G4", 98, 0.24],
  ["G4", 98.25, 0.24],
  ["A4", 98.5, 0.24],
  ["G4", 98.75, 0.24],
  ["F4", 99, 0.24],
  ["F4", 99.5, 0.24],
  ["F4", 99.75, 0.24],
  ["G4", 100, 0.24],
  ["F4", 100.25, 0.24],
  ["E4", 100.5, 0.24],
  ["E4", 101, 0.24],
  ["E4", 101.25, 0.24],
  ["E4", 101.75, 0.24],
  ["D5", 102, 0.49],
  ["C5", 102.5, 0.24],
  ["B4", 102.75, 0.49],
  ["A4", 103.25, 0.24],
  ["G4", 103.5, 0.24],
  ["G4", 104, 0.24],
  ["G4", 104.25, 0.24],
  ["A4", 104.5, 0.24],
  ["G4", 104.75, 0.24],
  ["F4", 105, 0.24],
  ["F4", 105.5, 0.24],
  ["F4", 105.75, 0.24],
  ["G4", 106, 0.24],
  ["F4", 106.25, 0.24],
  ["E4", 106.5, 0.24],
  ["E4", 107, 0.24],
  ["E4", 107.25, 0.24],
  ["G4", 108, 0.24],
  ["G4", 108.25, 0.24],
  ["G4", 108.5, 0.24],
  ["G4", 108.75, 0.24],
  ["G4", 109, 0.24],
  ["G4", 109.25, 0.24],
  ["G4", 109.5, 0.24],
  ["G4", 109.75, 0.24],
  ["G4", 110, 0.24],
  ["G4", 110.25, 0.24],
  ["G4", 110.5, 0.24],
  ["G4", 110.75, 0.24],
  ["B4", 111, 0.24],
  ["B4", 111.25, 0.24],
  ["B4", 111.5, 0.24],
  ["B4", 111.75, 0.24],
  ["A4", 112, 0.24],
  ["B4", 112.25, 0.24],
  ["C5", 112.5, 0.74],
  ["C5", 112.75, 0.74],
  ["C5", 113, 0.74],
  ["C5", 113.25, 0.74],
  ["B4", 113.5, 0.24],
  ["A4", 113.75, 0.24],
  ["G4", 114, 0.24],
  ["G4", 114.25, 0.24],
  ["G4", 114.5, 0.24],
  ["G4", 114.75, 0.24],
  ["G4", 115, 0.24],
  ["G4", 115.25, 0.24],
  ["G4", 115.5, 0.24],
  ["G4", 115.75, 0.24],
  ["G4", 116, 0.24],
  ["G4", 116.25, 0.24],
  ["G4", 116.5, 0.24],
  ["G4", 116.75, 0.24],
  ["B4", 117, 0.24],
  ["B4", 117.25, 0.24],
  ["B4", 117.5, 0.24],
  ["B4", 117.75, 0.24],
  ["A4", 118, 0.24],
  ["B4", 118.25, 0.24],
  ["C5", 118.5, 0.74],
  ["C5", 118.75, 0.74],
  ["C5", 119, 0.74],
  ["C5", 119.25, 0.74],
  ["C5", 119.5, 0.74],
  ["C5", 119.75, 0.74],
  ["G4", 120, 0.24],
  ["G4", 120.25, 0.24],
  ["G4", 120.5, 0.24],
  ["G4", 120.75, 0.24],
  ["G4", 121, 0.24],
  ["G4", 121.25, 0.24],
  ["G4", 121.5, 0.24],
  ["G4", 121.75, 0.24],
  ["G4", 122, 0.24],
  ["G4", 122.25, 0.24],
  ["G4", 122.5, 0.24],
  ["G4", 122.75, 0.24],
  ["B4", 123, 0.24],
  ["B4", 123.25, 0.24],
  ["B4", 123.5, 0.24],
  ["B4", 123.75, 0.24],
  ["A4", 124, 0.24],
  ["B4", 124.25, 0.24],
  ["C5", 124.5, 0.74],
  ["C5", 124.75, 0.74],
  ["C5", 125, 0.74],
  ["C5", 125.25, 0.74],
  ["B4", 125.5, 0.24],
  ["A4", 125.75, 0.24],
  ["G4", 126, 0.24],
  ["G4", 126.25, 0.24],
  ["G4", 126.5, 0.24],
  ["G4", 126.75, 0.24],
  ["G4", 127, 0.24],
  ["G4", 127.25, 0.24],
  ["G4", 127.5, 0.24],
  ["G4", 127.75, 0.24],
  ["G4", 128, 0.24],
  ["G4", 128.25, 0.24],
  ["G4", 128.5, 0.24],
  ["G4", 128.75, 0.24],
  ["B4", 129, 0.24],
  ["B4", 129.25, 0.24],
  ["B4", 129.5, 0.24],
  ["B4", 129.75, 0.24],
  ["A4", 130, 0.24],
  ["B4", 130.25, 0.24],
  ["C5", 130.5, 0.74],
  ["C5", 130.75, 0.74],
  ["C5", 131, 0.74],
  ["C5", 131.25, 0.74],
  ["E4", 131.75, 0.24],
  ["D5", 132, 0.49],
  ["C5", 132.5, 0.24],
  ["B4", 132.75, 0.49],
  ["A4", 133.25, 0.24],
  ["G4", 133.5, 0.24],
  ["G4", 134, 0.24],
  ["G4", 134.25, 0.24],
  ["A4", 134.5, 0.24],
  ["G4", 134.75, 0.24],
  ["F4", 135, 0.24],
  ["F4", 135.5, 0.24],
  ["F4", 135.75, 0.24],
  ["G4", 136, 0.24],
  ["F4", 136.25, 0.24],
  ["E4", 136.5, 0.24],
  ["E4", 137, 0.24],
  ["E4", 137.25, 0.24],
  ["E4", 137.75, 0.24],
  ["D5", 138, 0.49],
  ["C5", 138.5, 0.24],
  ["B4", 138.75, 0.49],
  ["A4", 139.25, 0.24],
  ["G4", 139.5, 0.24],
  ["G4", 140, 0.24],
  ["G4", 140.25, 0.24],
  ["A4", 140.5, 0.24],
  ["G4", 140.75, 0.24],
  ["F4", 141, 0.24],
  ["F4", 141.5, 0.24],
  ["F4", 141.75, 0.24],
  ["G4", 142, 0.24],
  ["F4", 142.25, 0.24],
  ["E4", 142.5, 0.24],
  ["E4", 143, 0.24],
  ["E4", 143.25, 0.24],
  ["G4", 144, 0.24],
  ["G4", 144.25, 0.24],
  ["G4", 144.5, 0.24],
  ["G4", 144.75, 0.24],
  ["G4", 145, 0.24],
  ["G4", 145.25, 0.24],
  ["G4", 145.5, 0.24],
  ["G4", 145.75, 0.24],
  ["G4", 146, 0.24],
  ["G4", 146.25, 0.24],
  ["G4", 146.5, 0.24],
  ["G4", 146.75, 0.24],
  ["B4", 147, 0.24],
  ["B4", 147.25, 0.24],
  ["B4", 147.5, 0.24],
  ["B4", 147.75, 0.24],
  ["A4", 148, 0.24],
  ["B4", 148.25, 0.24],
  ["C5", 148.5, 0.74],
  ["C5", 148.75, 0.74],
  ["C5", 149, 0.74],
  ["C5", 149.25, 0.74],
  ["B4", 149.5, 0.24],
  ["A4", 149.75, 0.24],
  ["G4", 150, 0.24],
  ["G4", 150.25, 0.24],
  ["G4", 150.5, 0.24],
  ["G4", 150.75, 0.24],
  ["G4", 151, 0.24],
  ["G4", 151.25, 0.24],
  ["G4", 151.5, 0.24],
  ["G4", 151.75, 0.24],
  ["G4", 152, 0.24],
  ["G4", 152.25, 0.24],
  ["G4", 152.5, 0.24],
  ["G4", 152.75, 0.24],
  ["B4", 153, 0.24],
  ["B4", 153.25, 0.24],
  ["B4", 153.5, 0.24],
  ["B4", 153.75, 0.24],
  ["A4", 154, 0.24],
  ["B4", 154.25, 0.24],
  ["C5", 154.5, 0.74],
  ["C5", 154.75, 0.74],
  ["C5", 155, 0.74],
  ["C5", 155.25, 0.74],
  ["C5", 155.5, 0.74],
  ["C5", 155.75, 0.74],
  ["G4", 156, 0.24],
  ["G4", 156.25, 0.24],
  ["G4", 156.5, 0.24],
  ["G4", 156.75, 0.24],
  ["G4", 157, 0.24],
  ["G4", 157.25, 0.24],
  ["G4", 157.5, 0.24],
  ["G4", 157.75, 0.24],
  ["G4", 158, 0.24],
  ["G4", 158.25, 0.24],
  ["G4", 158.5, 0.24],
  ["G4", 158.75, 0.24],
  ["B4", 159, 0.24],
  ["B4", 159.25, 0.24],
  ["B4", 159.5, 0.24],
  ["B4", 159.75, 0.24],
  ["A4", 160, 0.24],
  ["B4", 160.25, 0.24],
  ["C5", 160.5, 0.74],
  ["C5", 160.75, 0.74],
  ["C5", 161, 0.74],
  ["C5", 161.25, 0.74],
  ["B4", 161.5, 0.24],
  ["A4", 161.75, 0.24],
  ["G4", 162, 0.24],
  ["G4", 162.25, 0.24],
  ["G4", 162.5, 0.24],
  ["G4", 162.75, 0.24],
  ["G4", 163, 0.24],
  ["G4", 163.25, 0.24],
  ["G4", 163.5, 0.24],
  ["G4", 163.75, 0.24],
  ["G4", 164, 0.24],
  ["G4", 164.25, 0.24],
  ["G4", 164.5, 0.24],
  ["G4", 164.75, 0.24],
  ["B4", 165, 0.24],
  ["B4", 165.25, 0.24],
  ["B4", 165.5, 0.24],
  ["B4", 165.75, 0.24],
  ["A4", 166, 0.24],
  ["B4", 166.25, 0.24],
  ["C5", 166.5, 0.74],
  ["C5", 166.75, 0.74],
  ["C5", 167, 0.74],
  ["C5", 167.25, 0.74]
];

export const songs = {
  "mary-had-a-little-lamb": {
    title: "Mary had a Little Lamb",
    notes: maryHadALittleLamb,
    bpm: 120
  },
  "happy-birthday": {
    title: "Happy Birthday",
    notes: happyBirthday,
    bpm: 120
  },
  chopsticks: {
    title: "Chopsticks",
    notes: chopsticks,
    bpm: 120
  }
};

export function timestampToBeats(timestamp, bpm) {
  return timestamp / 60.0 * bpm;
}

export function beatsToTimestamp(beats, bpm) {
  return beats / bpm * 60;
}

export function songLengthInBeats(notes) {
  return max(notes.map(note => note[1] + note[2])) || 0;
}

export function songLengthInSeconds(notes, bpm) {
  return beatsToTimestamp(songLengthInBeats(notes), bpm);
}

/* @flow */

export const cellHeight = 15;
export const beatWidth = 120;

export function beatToWidth(beat: number): number {
  return beat * beatWidth;
}

export function widthToBeat(width: number): number {
  return width / beatWidth;
}

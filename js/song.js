/* @flow */

import { concat, filter, findIndex, max } from "lodash";
import { labelToMidiNote } from "./midi";

export type ScheduledNote = [number, number, number, number];
export type ScheduledNoteList = Array<ScheduledNote>;
export type Song = {
  title: string,
  notes: ScheduledNoteList,
  bpm: number,
  premium: boolean
};
export type SongId = string;
export type SongMap = { [SongId]: Song };

export const songs: SongMap = {
  "mary-had-a-little-lamb": require("./songs/mary-had-a-little-lamb"),
  chopsticks: require("./songs/chopsticks"),
  "happy-birthday": require("./songs/happy-birthday"),
  "turkey-in-the-straw": require("./songs/turkey-in-the-straw"),
  "the-entertainer": require("./songs/the-entertainer"),
  "john-jacob": require("./songs/john-jacob"),
  bride: require("./songs/bride"),
  civitas: require("./songs/civitas")
};

export function timestampToBeats(timestamp: number, bpm: number): number {
  return timestamp / 60.0 * bpm;
}

export function beatsToTimestamp(beats: number, bpm: number): number {
  return beats / bpm * 60;
}

export function songLengthInBeats(notes: ScheduledNoteList): number {
  return max(notes.map(note => note[1] + note[2])) || 0;
}

export function songLengthInSeconds(
  notes: ScheduledNoteList,
  bpm: number
): number {
  return beatsToTimestamp(songLengthInBeats(notes), bpm);
}

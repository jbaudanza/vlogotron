/* @flow */

import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";

import PropTypes from "prop-types";
import React from "react";

import styled from "styled-components";

import { range, flatten, bindAll, identity, isEqual, max } from "lodash";
import { midiNoteToLabel, labelToMidiNote } from "./midi";

import TouchableArea from "./TouchableArea";
import Canvas from "./Canvas";

import { songLengthInBeats } from "./song";
import { findWrappingClass } from "./domutils";

import colors from "./colors";

import type { ScheduledNoteList } from "./song";
import type { TouchGestureBegin } from "./TouchableArea";

// $FlowFixMe - scss not supported
import "./PianoRoll.scss";

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

// D#5 ... C3
const midiRange = range(75, 47, -1);

import {
  cellHeight,
  beatWidth,
  beatToWidth,
  widthToBeat
} from "./PianoRollGeometry";

function gridDrawFunction(ctx, props, width, height) {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = colors.darkTwo;
  ctx.lineWidth = 1;

  for (let i = 0; i < props.totalNotes; i++) {
    ctx.beginPath();
    const y = i * cellHeight + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const totalCells = props.totalBeats * props.cellsPerBeat;
  const cellWidth = beatWidth / props.cellsPerBeat;

  for (let i = 0; i < totalCells; i++) {
    ctx.beginPath();
    // TODO: needs to take cellsPerBeat into account
    const x = i * cellWidth + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  const selection = props.selection;

  if (selection != null) {
    // TODO: This second if is for flow, and kind of silly. see if you can
    // clean this up
    if (selection != null) {
      ctx.beginPath();
      ctx.rect(
        selection.start.beat * beatWidth + 0.5,
        (midiRange[0] - selection.start.note) * cellHeight + 0.5,
        (selection.end.beat - selection.start.beat) * beatWidth,
        (selection.start.note - selection.end.note) * cellHeight
      );
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function stylesForNote(note) {
  const row = midiRange[0] - note[0];

  return {
    top: row * cellHeight,
    width: beatToWidth(note[2]),
    left: beatToWidth(note[1])
  };
}

function isEmptyCell(el: ?Element) {
  return el instanceof HTMLCanvasElement;
}

function isNoteCell(el: ?Element) {
  return el != null && el.classList.contains("note");
}

function drawLinesOnCanvas(ctx, totalBeats, width, height) {
  function drawLine(x, heightMultipler) {
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.moveTo(x + 0.5, height * heightMultipler);
    ctx.lineTo(x + 0.5, height);
    ctx.strokeStyle = colors.darkBlueGrey;
    ctx.stroke();
  }

  const markersPerBeat = 4;
  const markerSpacing = beatWidth / markersPerBeat;

  for (let beat = 0; beat < totalBeats; beat++) {
    const x = beatToWidth(beat);
    drawLine(x, 0.25);

    for (let i = 1; i < markersPerBeat; i++) {
      drawLine(x + i * markerSpacing, 0.75);
    }
  }
}

type TimelineProps = {
  totalBeats: number,
  playbackStartPosition: ?number,
  onChangePlaybackStartPosition: (value: ?number) => void
};

class Timeline extends React.Component<TimelineProps> {
  bindCanvas: (el: ?HTMLCanvasElement) => void;
  subscription: Subscription;

  bindCanvas(canvasEl: ?HTMLCanvasElement) {
    if (canvasEl) {
      this.setupEventHandler(canvasEl);
    } else {
      this.subscription.unsubscribe();
    }
  }

  setupEventHandler(canvasEl) {
    function mapEventToPixel(event) {
      const rect = canvasEl.getBoundingClientRect();
      return event.clientX - rect.left;
    }

    function mapPixelToStartPosition(x) {
      if (x >= 0) {
        return widthToBeat(x);
      } else {
        return null;
      }
    }

    function startsOnPointer(obj) {
      return findWrappingClass(obj.startEl, "start-position-pointer") != null;
    }

    // TODO: implement this with touch events
    const mouseDown$ = Observable.fromEvent(canvasEl.parentNode, "mousedown");
    const dragStreams$ = mouseDown$.map(event => {
      const stream$ = Observable.of(mapEventToPixel(event))
        .concat(documentMouseMove$.map(mapEventToPixel))
        .takeUntil(documentMouseUp$);

      return {
        startEl: event.target,
        stream: stream$
      };
    });

    function isTrivialChange(list) {
      if (list.length < 2) return true;

      return list.length < 10 && Math.abs(list[0] - list[list.length - 1]) < 10;
    }

    const clears$ = dragStreams$
      .filter(startsOnPointer)
      .switchMap(obj => obj.stream.toArray())
      .filter(isTrivialChange)
      .mapTo(null);

    const changes$ = dragStreams$
      .map(obj => obj.stream)
      .mergeAll()
      .map(mapPixelToStartPosition);

    this.subscription = Observable.merge(clears$, changes$).subscribe(value =>
      this.props.onChangePlaybackStartPosition(value)
    );
  }

  render() {
    let pointer;

    const svgWidth = 19;

    if (this.props.playbackStartPosition != null) {
      const pointerStyle = {
        position: "absolute",
        left: beatToWidth(this.props.playbackStartPosition) - svgWidth / 2,
        top: 0
      };
      pointer = (
        <svg
          className="start-position-pointer"
          version="1.1"
          width={svgWidth}
          height="25px"
          style={pointerStyle}
        >

          <use xlinkHref="#svg-tracker" />
        </svg>
      );
    }

    return (
      <div
        className="timeline"
        style={{ width: beatToWidth(this.props.totalBeats) }}
      >
        <Canvas
          width={this.props.totalBeats * 30 * 4}
          innerRef={this.bindCanvas.bind(this)}
          height={25}
          drawFunction={drawLinesOnCanvas}
          input={this.props.totalBeats}
        />
        {range(0, this.props.totalBeats).map(i => (
          <div className="time-marker" key={i} data-beat={i}>
            {i}
          </div>
        ))}
        {pointer}
      </div>
    );
  }
}

const NoteWrapper = styled(TouchableArea)`
  position: relative;
  background-color: ${colors.darkThree};
  height: ${midiRange.length * cellHeight}px;
  width: ${props => beatToWidth(props.totalBeats)}px;
  cursor: ${props => (props.isSelecting ? "cell" : "pointer")};
`;

type Props = {
  cellsPerBeat: number,
  notes: ScheduledNoteList,
  playing: Object, // TODO: I dont think we're using this now
  onChangePlaybackStartPosition: (value: ?number) => void,
  playbackPosition$$: Observable<Object>,
  playbackStartPosition: ?number,
  isSelecting: boolean
};

type State = {
  isPlaying: boolean,
  selection: ?GridSelection
};

type CellLocation = {
  row: number,
  column: number
};

type NoteLocation = {
  beat: number,
  note: number
};

type GridGestureEvent = {
  location: NoteLocation,
  element: Element
};

type GridGesture = {
  first: GridGestureEvent,
  rest$: Observable<GridGestureEvent>
};

function cellLocationToBeatAndNote(
  location: CellLocation,
  cellsPerBeat
): NoteLocation {
  return {
    note: midiRange[0] - location.row,
    beat: location.column / cellsPerBeat
  };
}

export type GridSelection = {
  start: NoteLocation,
  end: NoteLocation
};

export default class PianoRoll extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = { isPlaying: false, selection: null };
    bindAll(
      this,
      "bindPlayhead",
      "bindPlaybackPosition",
      "bindTouchableArea",
      "bindScroller"
    );
  }

  innerSubscribe: Subscription;
  outerSubscribe: Subscription;
  edits$: Observable<Object>;
  playbackPositionSpan: ?HTMLSpanElement;
  scrollerEl: ?HTMLElement;
  playbackPositionSpan: ?HTMLElement;
  playheadEl: ?HTMLElement;

  bindScroller(el: ?HTMLElement) {
    this.scrollerEl = el;
  }

  bindPlaybackPosition(el: ?HTMLElement) {
    this.playbackPositionSpan = el;
  }

  bindPlayhead(el: ?HTMLElement) {
    this.playheadEl = el;
  }

  mapCoordsToGridLocation(
    canvasEl: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ): CellLocation {
    const clientRect = canvasEl.getBoundingClientRect();

    const x = clientX - clientRect.left;
    const y = clientY - clientRect.top;

    return {
      column: Math.floor(x / (beatWidth / this.props.cellsPerBeat)),
      row: Math.floor(y / cellHeight)
    };
  }

  mapGestureToNoteLocation(
    element: ?Element,
    clientX: number,
    clientY: number
  ): ?NoteLocation {
    if (element instanceof HTMLCanvasElement) {
      const clientRect = element.getBoundingClientRect();

      const x = clientX - clientRect.left;
      const y = clientY - clientRect.top;

      return cellLocationToBeatAndNote(
        {
          column: Math.floor(x / (beatWidth / this.props.cellsPerBeat)),
          row: Math.floor(y / cellHeight)
        },
        this.props.cellsPerBeat
      );
    }

    if (isNoteCell(element) && element instanceof HTMLElement) {
      return {
        beat: parseFloat(element.dataset.beat),
        note: parseInt(element.dataset.note)
      };
    }

    return null;
  }

  mapGridGestureEvent(
    element: ?Element,
    clientX: number,
    clientY: number
  ): ?GridGestureEvent {
    if (element == null) return null;

    const location = this.mapGestureToNoteLocation(element, clientX, clientY);

    if (location) return { location, element };

    return null;
  }

  makeGridGestureStream(
    gestures$: Observable<TouchGestureBegin>
  ): Observable<GridGesture> {
    return gestures$
      .map(gesture => {
        const first = this.mapGridGestureEvent(
          gesture.firstEl,
          gesture.clientX,
          gesture.clientY
        );

        if (first) {
          return {
            first: first,
            rest$: gesture.movements$
              .map(event => {
                return this.mapGridGestureEvent(
                  event.element,
                  event.clientX,
                  event.clientY
                );
              })
              .nonNull()
          };
        } else {
          return null;
        }
      })
      .nonNull();
  }

  bindTouchableArea(component: ?TouchableArea) {
    if (component) {
      const [
        touchesForSelections$,
        touchesForEdits$
      ] = this.makeGridGestureStream(component.touches$$).partition(
        event => this.props.isSelecting
      );

      touchesForSelections$
        .flatMap(gesture => {
          return gesture.rest$.map(event => ({
            start: gesture.first.location,
            end: event.location
          }));
        })
        .subscribe(selection => this.setState({ selection }));

      this.edits$ = touchesForEdits$.flatMap(gesture => {
        const moves$ = gesture.rest$
          .filter(event => isEmptyCell(event.element))
          .map(event => event.location)
          .distinctUntilChanged(isEqual)
          .scan(
            (last, to) => ({
              action: "move",
              to: to,
              from: last.to
            }),
            { to: gesture.first.location }
          );

        if (isEmptyCell(gesture.first.element)) {
          const create$ = Observable.of({
            action: "create",
            ...gesture.first.location,
            duration: 1.0 / this.props.cellsPerBeat
          });
          return Observable.merge(create$, moves$);
        } else if (isNoteCell(gesture.first.element)) {
          const deletes$ = gesture.rest$.isEmpty().filter(identity).mapTo({
            action: "delete",
            ...gesture.first.location
          });

          return Observable.merge(moves$, deletes$);
        } else {
          return Observable.never();
        }
      });
    }
  }

  updatePlaybackPosition(position: number) {
    const left = beatToWidth(position);

    // Move playhead
    if (this.playheadEl) {
      this.playheadEl.style.left = left + "px";
      this.playheadEl.style.display = "block";
    }

    // Make sure the playhead is in view of the scroller
    if (this.scrollerEl) {
      if (
        left > this.scrollerEl.scrollLeft + this.scrollerEl.clientWidth ||
        left < this.scrollerEl.scrollLeft
      ) {
        this.scrollerEl.scrollLeft = left;
      }
    }

    this.updatePositionText(position);
  }

  updatePositionText(position: number) {
    const text = position.toFixed(1);
    if (this.playbackPositionSpan) {
      this.playbackPositionSpan.textContent = text;
    }
  }

  stopPlayback() {
    this.updatePositionText(0.0);

    if (this.scrollerEl) this.scrollerEl.scrollLeft = 0;

    if (this.playheadEl) this.playheadEl.style.display = "none";

    this.setState({ isPlaying: false });

    if (this.innerSubscribe) {
      this.innerSubscribe.unsubscribe();
      delete this.innerSubscribe;
    }
  }

  componentWillMount() {
    this
      .outerSubscribe = this.props.playbackPosition$$.subscribe(
      playbackPosition$ => {
        this.setState({ isPlaying: true });

        this.innerSubscribe = playbackPosition$.subscribe({
          next: this.updatePlaybackPosition.bind(this),
          error: console.error,
          complete: this.stopPlayback.bind(this)
        });
      }
    );
  }

  componentDidMount() {
    this.stopPlayback();
  }

  componentWillUnmount() {
    if (this.outerSubscribe) {
      this.outerSubscribe.unsubscribe();
      delete this.outerSubscribe;
    }

    if (this.innerSubscribe) {
      this.innerSubscribe.unsubscribe();
      delete this.innerSubscribe;
    }
  }

  render() {
    const songLength = songLengthInBeats(this.props.notes);
    const totalBeats = Math.floor(songLength + 8);

    const gridInput = {
      cellsPerBeat: this.props.cellsPerBeat,
      totalBeats: totalBeats,
      totalNotes: midiRange.length,
      selection: this.state.selection
    };

    return (
      <div className="piano-roll">
        <div className="row-labels">
          <div className="song-duration">
            <span ref={this.bindPlaybackPosition} /> / {songLength.toFixed(1)}
          </div>
          {midiRange.map(midiNote => (
            <div className="note-label" key={midiNote}>
              {midiNoteToLabel(midiNote)}
            </div>
          ))}
        </div>
        <div className="horizontal-scroller" ref={this.bindScroller}>
          <Timeline
            totalBeats={totalBeats}
            playbackStartPosition={this.props.playbackStartPosition}
            onChangePlaybackStartPosition={
              this.props.onChangePlaybackStartPosition
            }
          />

          <NoteWrapper
            innerRef={this.bindTouchableArea}
            totalBeats={totalBeats}
            isSelecting={this.props.isSelecting}
          >
            <Canvas
              input={gridInput}
              className="touchable"
              drawFunction={gridDrawFunction}
              height={gridInput.totalNotes * cellHeight}
              width={beatToWidth(totalBeats)}
            />

            <div>
              {this.props.notes.map((note, i) => (
                <div
                  className="note touchable"
                  key={i}
                  data-note={note[0]}
                  data-beat={note[1]}
                  style={stylesForNote(note)}
                />
              ))}
            </div>
            <div className="playhead" ref={this.bindPlayhead} />
          </NoteWrapper>
        </div>
      </div>
    );
  }
}

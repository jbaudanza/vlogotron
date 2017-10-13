/* @flow */

import { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";

import PropTypes from "prop-types";
import React from "react";

import styled from "styled-components";

import { range, flatten, bindAll, identity, isEqual, max } from "lodash";
import { midiNoteToLabel, labelToMidiNote } from "./midi";

import PianoRollGrid from "./PianoRollGrid";
import TouchableArea from "./TouchableArea";

import { songLengthInBeats } from "./song";
import { findWrappingClass } from "./domutils";

import colors from "./colors";

import type { ScheduledNoteList } from "./song";

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

function stylesForNote(note) {
  const row = midiRange[0] - note[0];

  return {
    top: row * cellHeight,
    width: beatToWidth(note[2]),
    left: beatToWidth(note[1])
  };
}

function mapElementToBeat(el: HTMLElement) {
  if (isEmptyCell(el)) {
    const rowEl = el.parentNode;

    if (rowEl instanceof HTMLElement) {
      return {
        beat: parseFloat(el.dataset.beat),
        note: parseInt(rowEl.dataset.note)
      };
    }
  }

  if (isNoteCell(el)) {
    return {
      beat: parseFloat(el.dataset.beat),
      note: parseInt(el.dataset.note)
    };
  }
}

function isEmptyCell(el: ?Element) {
  return el != null && el.classList.contains("cell");
}

function isNoteCell(el: ?Element) {
  return el != null && el.classList.contains("note");
}

type GridProps = {
  cellsPerBeat: number,
  totalBeats: number,
  selection?: GridSelection
};

class Grid extends React.PureComponent<GridProps> {
  render() {
    return (
      <div>
        {midiRange.map(midiNote => (
          <div
            key={midiNote}
            className={`row cell-width-${this.props.cellsPerBeat}`}
            data-note={midiNote}
          >
            {range(
              0,
              this.props.totalBeats * this.props.cellsPerBeat
            ).map(i => (
              <div
                className="cell touchable"
                key={i}
                data-beat={i / this.props.cellsPerBeat}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
}

function drawLinesOnCanvas(canvasEl, totalBeats) {
  const ctx = canvasEl.getContext("2d");

  function drawLine(x, height) {
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.moveTo(x + 0.5, canvasEl.height * height);
    ctx.lineTo(x + 0.5, canvasEl.height);
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
  constructor() {
    super();
    this.bindCanvas = this.bindCanvas.bind(this);
  }

  bindCanvas: (el: ?HTMLCanvasElement) => void;
  canvasEl: ?HTMLCanvasElement;
  subscription: Subscription;

  bindCanvas(canvasEl: ?HTMLCanvasElement) {
    if (canvasEl) {
      drawLinesOnCanvas(canvasEl, this.props.totalBeats);
      this.setupEventHandler(canvasEl);
      this.canvasEl = canvasEl;
    } else {
      this.subscription.unsubscribe();
      delete this.canvasEl;
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.totalBeats !== prevProps.totalBeats && this.canvasEl) {
      drawLinesOnCanvas(this.canvasEl, this.props.totalBeats);
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
        <canvas
          ref={this.bindCanvas}
          width={this.props.totalBeats * 30 * 4}
          height={25}
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
  isPlaying: boolean
};

type CellLocation = {
  row: number,
  column: number
};

export type GridSelection = {
  start: CellLocation,
  end: CellLocation
};

export default class PianoRoll extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = { isPlaying: false };
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

  bindTouchableArea(component: ?TouchableArea) {
    if (component) {
      this.edits$ = component.touches$$.flatMap(event => {
        const firstEl = event.firstEl;
        if (!(firstEl instanceof HTMLElement)) return Observable.never();

        const firstBeat = mapElementToBeat(firstEl);
        if (firstBeat == null) return Observable.never();

        const moves$ = event.movements$
          .filter(isEmptyCell)
          .map(element => {
            if (element instanceof HTMLElement) {
              return mapElementToBeat(element);
            } else {
              return null;
            }
          })
          .nonNull()
          .distinctUntilChanged(isEqual)
          .scan(
            (last, to) => ({
              action: "move",
              to: to,
              from: last.to
            }),
            { to: firstBeat }
          );

        if (isEmptyCell(firstEl)) {
          const create$ = Observable.of({
            action: "create",
            ...firstBeat,
            duration: 1.0 / this.props.cellsPerBeat
          });
          return Observable.merge(create$, moves$);
        } else if (isNoteCell(firstEl)) {
          const deletes$ = event.movements$
            .isEmpty()
            .filter(identity)
            .mapTo({ action: "delete", ...mapElementToBeat(firstEl) });

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

    const selection: GridSelection = {
      start: {
        row: 1,
        column: 1
      },
      end: {
        row: 10,
        column: 5
      }
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
            <PianoRollGrid
              cellsPerBeat={this.props.cellsPerBeat}
              totalBeats={totalBeats}
              totalNotes={midiRange.length}
              selection={selection}
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

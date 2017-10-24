/* @flow */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import type { Subscription } from "rxjs/Subscription";

import PropTypes from "prop-types";
import React from "react";

import styled from "styled-components";

import { range, flatten, bindAll, identity, isEqual, max } from "lodash";
import { midiNoteToLabel, labelToMidiNote } from "./midi";

import TouchableArea from "./TouchableArea";
import PopupMenu from "./PopupMenu";
import Canvas from "./Canvas";

import { songLengthInBeats } from "./song";
import { findWrappingClass } from "./domutils";
import type { Rect } from "./domutils";

import colors from "./colors";

import type { ScheduledNoteList, ScheduledNote } from "./song";
import type { TouchGestureBegin } from "./TouchableArea";
import type { SongEdit } from "./localWorkspace";
import type {
  NoteLocation,
  NoteSelection,
  AuditionedNotes,
  SelectionState
} from "./noteSelectionController";

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

function makeSelectionRect(selection: NoteSelection): Rect {
  return {
    left: selection.start.beat * beatWidth,
    top: (midiRange[0] - selection.start.note) * cellHeight,
    width: (selection.end.beat - selection.start.beat) * beatWidth,
    height: (selection.start.note - selection.end.note) * cellHeight
  };
}

function translateRect(left: number, top: number, rect: Rect): Rect {
  return {
    left: rect.left + left,
    top: rect.top + top,
    width: rect.width,
    height: rect.height
  };
}

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

  if (props.selection != null) {
    const rect = makeSelectionRect(props.selection);
    ctx.beginPath();
    ctx.rect(rect.left + 0.5, rect.top + 0.5, rect.width, rect.height);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function positionForNote(location: NoteLocation) {
  const row = midiRange[0] - location.note;

  return {
    top: row * cellHeight,
    left: beatToWidth(location.beat)
  };
}

function translateNotePosition(
  location: NoteLocation,
  originalOrigin: NoteLocation,
  newOrigin: NoteLocation
) {
  return {
    beat: location.beat + (newOrigin.beat - originalOrigin.beat),
    note: location.note + (newOrigin.note - originalOrigin.note)
  };
}

function stylesForNoteWithOrigin(
  note: ScheduledNote,
  originalOrigin: NoteLocation,
  newOrigin: NoteLocation
) {
  const pos = positionForNote(
    translateNotePosition(
      { note: note[0], beat: note[1] },
      originalOrigin,
      newOrigin
    )
  );
  return {
    ...pos,
    width: beatToWidth(note[2])
  };
}

function stylesForNote(note: ScheduledNote) {
  const pos = positionForNote({ note: note[0], beat: note[1] });
  return {
    ...pos,
    width: beatToWidth(note[2])
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

function AuditionedNotesView(props) {
  return (
    <div>
      {props.notes.map((note, i) => (
        <Note
          className="note"
          key={i}
          style={stylesForNoteWithOrigin(
            note,
            props.origin,
            props.mouseOverOrigin
          )}
        />
      ))}
    </div>
  );
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
  playbackPosition$$: Observable<Object>,
  playbackStartPosition: ?number,
  selectionState: SelectionState,
  selection: ?NoteSelection,
  auditioningNotes: ?AuditionedNotes,
  onChangePlaybackStartPosition: (value: ?number) => void,
  onChangeSelection: NoteSelection => void,
  onFinishSelection: () => void,
  onClearSelection: () => void,
  onCopySelection: () => void,
  onStopSelection: () => void,
  onPasteSelection: NoteLocation => void
};

type State = {
  isPlaying: boolean,
  gridClientRect: ?ClientRect,
  mouseOverOrigin: ?NoteLocation
};

type CellLocation = {
  row: number,
  column: number
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

import { isNoteInSelection } from "./noteSelectionController";

const Note = styled.div`
  position: absolute;
  box-sizing: border-box;
  height: ${cellHeight}px;
  width: 15px;
  background-color: ${props => (props.selected ? "red" : colors.aquaGlue)};
  border: 1px solid ${colors.darkThree};
`;

export default class PianoRoll extends React.Component<Props, State> {
  constructor() {
    super();
    this.state = {
      isPlaying: false,
      gridClientRect: null,
      mouseOverOrigin: null
    };
    bindAll(
      this,
      "bindPlayhead",
      "bindPlaybackPosition",
      "bindTouchableArea",
      "bindScroller",
      "onMouseMove",
      "onClick"
    );
    this.editSubject$ = new Subject();
  }

  innerSubscribe: Subscription;
  outerSubscribe: Subscription;
  edits$: Observable<SongEdit>;
  editSubject$: Subject<SongEdit>;
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

  subscribeToSelection(selection$: Observable<NoteSelection>) {
    selection$.subscribe({
      next: selection => this.props.onChangeSelection(selection),
      complete: () => this.props.onFinishSelection()
    });
  }

  bindGrid(canvasEl: ?HTMLCanvasElement) {
    if (canvasEl) {
      this.setState({
        gridClientRect: canvasEl.getBoundingClientRect()
      });
    } else {
      this.setState({
        gridClientRect: null
      });
    }
  }

  bindTouchableArea(component: ?TouchableArea) {
    if (component) {
      const [
        touchesForSelections$,
        touchesForEdits$
      ] = this.makeGridGestureStream(component.touches$$).partition(
        event => this.props.selectionState === "selecting"
      );

      touchesForSelections$
        .map(gesture => {
          return gesture.rest$.map(event => ({
            start: gesture.first.location,
            end: event.location
          }));
        })
        .subscribe(this.subscribeToSelection.bind(this));

      const edits$ = touchesForEdits$.flatMap(gesture => {
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
            {
              action: "move", // ignored
              from: gesture.first.location, // ignored
              to: gesture.first.location // only attribute that matters
            }
          );

        if (isEmptyCell(gesture.first.element)) {
          const create$ = Observable.of({
            action: "create",
            notes: [
              {
                ...gesture.first.location,
                duration: 1.0 / this.props.cellsPerBeat
              }
            ]
          });
          return Observable.merge(create$, moves$);
        } else if (isNoteCell(gesture.first.element)) {
          const deletes$ = gesture.rest$.isEmpty().filter(identity).mapTo({
            action: "delete",
            notes: [gesture.first.location]
          });

          return Observable.merge(moves$, deletes$);
        } else {
          return Observable.never();
        }
      });

      this.edits$ = Observable.merge(edits$, this.editSubject$);
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

  onClick(event: MouseEvent) {
    if (
      this.props.selectionState === "auditioning" && this.state.mouseOverOrigin
    ) {
      this.props.onPasteSelection(this.state.mouseOverOrigin);
      this.setState({ mouseOverOrigin: null });
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.props.selectionState === "auditioning") {
      if (event.target instanceof Element) {
        const origin = this.mapGestureToNoteLocation(
          event.target,
          event.clientX,
          event.clientY
        );
        this.setState({ mouseOverOrigin: origin });
      }
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
      selection: this.props.selection
    };

    const popupMenuOptions = [
      ["#svg-pencil-2", "Copy", { onClick: this.props.onCopySelection }],

      ["#svg-pencil-2", "Clear", { onClick: this.props.onClearSelection }],

      ["#svg-pencil-2", "Nevermind", { onClick: this.props.onStopSelection }]
    ];

    const origin = {
      beat: 0,
      note: midiRange[0]
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
            isSelecting={this.props.selectionState === "selecting"}
            enabled={
              this.props.selectionState === "normal" ||
                this.props.selectionState === "selecting"
            }
            onClick={this.onClick}
          >
            <Canvas
              input={gridInput}
              className="touchable"
              innerRef={this.bindGrid.bind(this)}
              onMouseMove={this.onMouseMove}
              drawFunction={gridDrawFunction}
              height={gridInput.totalNotes * cellHeight}
              width={beatToWidth(totalBeats)}
            />

            {this.props.selectionState === "menu-prompt" &&
              this.props.selection &&
              this.state.gridClientRect
              ? <PopupMenu
                  options={popupMenuOptions}
                  targetRect={translateRect(
                    this.state.gridClientRect.left,
                    this.state.gridClientRect.top,
                    makeSelectionRect(this.props.selection)
                  )}
                />
              : null}
            <div>
              {this.props.notes.map((note, i) => (
                <Note
                  className="touchable note"
                  key={i}
                  data-note={note[0]}
                  data-beat={note[1]}
                  selected={
                    this.props.selection &&
                      isNoteInSelection(note, this.props.selection)
                  }
                  style={stylesForNote(note)}
                />
              ))}
            </div>

            {this.props.auditioningNotes && this.state.mouseOverOrigin
              ? <AuditionedNotesView
                  {...this.props.auditioningNotes}
                  mouseOverOrigin={this.state.mouseOverOrigin}
                />
              : null}

            <div className="playhead" ref={this.bindPlayhead} />
          </NoteWrapper>
        </div>
      </div>
    );
  }
}

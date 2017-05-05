import React from "react";
import classNames from "classnames";

import { range, flatten, bindAll, identity, isEqual, max } from "lodash";

import { Observable } from "rxjs/Observable";

import TouchableArea from "./TouchableArea";
import NoteLabel from "./NoteLabel";

import { songLengthInBeats } from "./song";
import { findWrappingClass } from "./domutils";

import "./PianoRoll.scss";

const documentMouseMove$ = Observable.fromEvent(document, "mousemove");
const documentMouseUp$ = Observable.fromEvent(document, "mouseup");

const keys = [
  ["C", true],
  ["D", true],
  ["E", false],
  ["F", true],
  ["G", true],
  ["A", true],
  ["B", false]
].reverse();

// TODO: This could probably be derived
// prettier-ignore
const rowMap = {
  "C": 11,
  "C#": 10,
  "D": 9,
  "D#": 8,
  "E": 7,
  "F": 6,
  "F#": 5,
  "G": 4,
  "G#": 3,
  "A": 2,
  "A#": 1,
  "B": 0
};

function Row(props) {
  const cellsPerBeat = props.cellsPerBeat;

  const className = classNames(`row cell-width-${cellsPerBeat}`, {
    white: props.color === "white",
    black: props.color === "black"
  });

  return (
    <div className={className} data-note={props.note}>
      {range(0, props.totalBeats * cellsPerBeat).map(i => (
        <div className="cell touchable" key={i} data-beat={i / cellsPerBeat} />
      ))}
    </div>
  );
}

function noteToString(props) {
  let str = props.note;
  if (props.sharp) {
    str += "#";
  }
  if (props.octave) {
    str += props.octave;
  }
  return str;
}

const cellHeight = 15;
const cellWidth = 30;

function beatToWidth(beat) {
  return beat * cellWidth * 4;
}

function widthToBeat(width) {
  return width / (cellWidth * 4);
}

function stylesForNote(note) {
  const match = note[0].match(/([A-Z]#?)(\d)/);
  if (match) {
    const row = rowMap[match[1]] + (5 - match[2]) * 12;

    return {
      top: (row - 8) * cellHeight,
      width: beatToWidth(note[2]),
      left: beatToWidth(note[1])
    };
  } else {
    return {};
  }
}

function mapElementToBeat(el) {
  if (isEmptyCell(el)) {
    return {
      beat: parseFloat(el.dataset.beat),
      note: el.parentNode.dataset.note
    };
  }

  if (isNoteCell(el)) {
    return {
      beat: parseFloat(el.dataset.beat),
      note: el.dataset.note
    };
  }
}

function isEmptyCell(el) {
  return el && el.classList.contains("cell");
}

function isNoteCell(el) {
  return el && el.classList.contains("note");
}

function mapKeys(octave, keys, fn) {
  return flatten(keys.map(([note, sharp], i) => fn(note, sharp, octave, i)));
}

function mapAllKeys(iter) {
  function fn(note, sharp, octave) {
    const white = iter({ note, octave, sharp: false });

    if (sharp) {
      const black = iter({ note, octave, sharp: true });
      return [black, white];
    } else {
      return [white];
    }
  }

  return flatten([
    flatten(mapKeys(5, keys.slice(-2), fn)),
    flatten(mapKeys(4, keys, fn))
  ]);
}

class Grid extends React.PureComponent {
  render() {
    return (
      <div>
        {mapAllKeys(props => (
          <Row
            color={props.sharp ? "black" : "white"}
            cellsPerBeat={this.props.cellsPerBeat}
            totalBeats={this.props.totalBeats}
            key={noteToString(props)}
            note={noteToString(props)}
          />
        ))}
      </div>
    );
  }
}

function drawLinesOnCanvas(canvasEl, totalBeats) {
  const ctx = canvasEl.getContext("2d");

  const cellWidth = 30;

  function drawLine(x, height) {
    ctx.beginPath();
    ctx.moveTo(x, canvasEl.height * height);
    ctx.lineTo(x, canvasEl.height);
    ctx.strokeStyle = "#363d69"; // $color-dark-blue-grey
    ctx.stroke();
  }

  for (let beat = 0; beat < totalBeats; beat++) {
    const x = beat * cellWidth * 4;
    drawLine(x, 0.25);

    for (let i = 1; i < 4; i++) {
      drawLine(x + i * cellWidth, 0.75);
    }
  }
}

class Timeline extends React.Component {
  constructor() {
    super();
    this.bindCanvas = this.bindCanvas.bind(this);
  }

  bindCanvas(canvasEl) {
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
      return findWrappingClass(obj.startEl, "start-position-pointer");
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

    if (Number.isFinite(this.props.playbackStartPosition)) {
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

Timeline.propTypes = {
  totalBeats: React.PropTypes.number.isRequired,
  onChangePlaybackStartPosition: React.PropTypes.func.isRequired,
  playbackStartPosition: React.PropTypes.number
};

export default class PianoRoll extends React.Component {
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

  bindScroller(el) {
    this.scrollerEl = el;
  }

  bindPlaybackPosition(el) {
    this.playbackPositionSpan = el;
  }

  bindPlayhead(el) {
    this.playheadEl = el;
  }

  bindTouchableArea(component) {
    if (component) {
      this.edits$ = component.touches$$.flatMap(event => {
        const firstBeat = mapElementToBeat(event.firstEl);
        const moves$ = event.movements$
          .filter(isEmptyCell)
          .distinctUntilChanged(isEqual)
          .scan(
            (last, el) => ({
              action: "move",
              to: mapElementToBeat(el),
              from: last.to
            }),
            { to: firstBeat }
          );

        if (isEmptyCell(event.firstEl)) {
          const create$ = Observable.of({
            action: "create",
            ...firstBeat,
            duration: 1.0 / this.props.cellsPerBeat
          });
          return Observable.merge(create$, moves$);
        } else if (isNoteCell(event.firstEl)) {
          const deletes$ = event.movements$
            .isEmpty()
            .filter(identity)
            .mapTo({ action: "delete", ...mapElementToBeat(event.firstEl) });

          return Observable.merge(moves$, deletes$);
        } else {
          return Observable.never();
        }
      });
    }
  }

  updatePlaybackPosition(position) {
    // Move playhead
    const left = cellWidth * 4 * position;
    this.playheadEl.style.left = left + "px";
    this.playheadEl.style.display = "block";

    // Make sure the playhead is in view of the scroller
    if (
      this.scrollerEl &&
      (left > this.scrollerEl.scrollLeft + this.scrollerEl.clientWidth ||
        left < this.scrollerEl.scrollLeft)
    ) {
      this.scrollerEl.scrollLeft = left;
    }

    // Update span text
    this.playbackPositionSpan.textContent = position.toFixed(2);
  }

  stopPlayback() {
    this.playbackPositionSpan.textContent = (0.0).toFixed(2);
    this.scrollerEl.scrollLeft = 0;
    this.playheadEl.style.display = "none";
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

    return (
      <div className="piano-roll">
        <div className="row-labels">
          <div className="song-duration">
            <span ref={this.bindPlaybackPosition} /> / {songLength.toFixed(2)}
          </div>
          {mapAllKeys(props => (
            <NoteLabel
              className={
                this.props.playing[noteToString(props)] ? "playing" : null
              }
              note={noteToString(props)}
              key={noteToString(props)}
            />
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

          <TouchableArea
            className="note-wrapper"
            ref={this.bindTouchableArea}
            style={{ width: beatToWidth(totalBeats) }}
          >
            <Grid
              cellsPerBeat={this.props.cellsPerBeat}
              totalBeats={totalBeats}
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
            <div className="playhead" ref={this.bindPlayhead} />;
          </TouchableArea>
        </div>
      </div>
    );
  }
}

PianoRoll.propTypes = {
  notes: React.PropTypes.array.isRequired,
  cellsPerBeat: React.PropTypes.number.isRequired,
  playing: React.PropTypes.object.isRequired,
  onChangePlaybackStartPosition: React.PropTypes.func.isRequired,
  playbackPosition$$: React.PropTypes.object.isRequired,
  playbackStartPosition: React.PropTypes.number
};

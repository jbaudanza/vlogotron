import React from 'react';
import classNames from 'classnames';

import TouchableArea from './TouchableArea';
import NoteLabel from './NoteLabel';

import {range, flatten, bindAll, identity, isEqual, max} from 'lodash';

import {Observable} from 'rxjs/Observable';


const keys = [
  ['C', true],
  ['D', true],
  ['E', false],
  ['F', true],
  ['G', true],
  ['A', true],
  ['B', false]
].reverse();

// TODO: This could probably be derived
const rowMap = {
  'C':  11,
  'C#': 10,
  'D':  9,
  'D#': 8,
  'E':  7,
  'F':  6,
  'F#': 5,
  'G':  4,
  'G#': 3,
  'A':  2,
  'A#': 1,
  'B':  0
};


function Row(props) {
  const cellsPerBeat = props.cellsPerBeat;

  const className = classNames(`row cell-width-${cellsPerBeat}`, {
    white: (props.color === 'white'),
    black: (props.color === 'black')
  });

  return (
    <div className={className} data-note={props.note}>
      {
        range(0, props.totalBeats*cellsPerBeat).map(i => (
          <div className='cell touchable' key={i} data-beat={i/cellsPerBeat} />
        ))
      }
    </div>
  );
}

function noteToString(props) {
  let str = props.note;
  if (props.sharp) {
    str += '#';
  }
  if (props.octave) {
    str += props.octave;
  }
  return str;
}

const cellHeight = 15;
const cellWidth = 30;

function stylesForNote(note) {
  const match = note[0].match(/([A-Z]#?)(\d)/);
  if (match) {
    const row = rowMap[match[1]] + (5 - match[2]) * 12;

    return {
      top: (row - 8) * cellHeight,
      width: note[2] * cellWidth * 4,
      left: note[1] * cellWidth * 4
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
  return el && el.classList.contains('cell')
}

function isNoteCell(el) {
  return el && el.classList.contains('note')
}


function mapKeys(octave, keys, fn) {
  return flatten(
    keys.map(([note, sharp], i) => fn(note, sharp, octave, i)
  ));
}

function mapAllKeys(iter) {

  function fn(note, sharp, octave) {
    const white = iter({note, octave, sharp: false})

    if (sharp) {
      const black = iter({note, octave, sharp: true});
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

function RowSet(cellsPerBeat, totalBeats, octave, keys) {
  const rowProps = {
      cellsPerBeat: cellsPerBeat, octave: octave, totalBeats: totalBeats
  };

  return mapKeys(octave, keys, (note, sharp, octave) => {
    const white = (
      <Row
        color="white"
        {...rowProps}
        key={note + octave}
        note={note + octave} />
    );

    if (sharp) {
      const black = (
        <Row
          color='black'
          {...rowProps}
          key={note + '#' + octave}
          note={note + '#' + octave} />
      );

      return [black, white];
    } else {
      return [white];
    }
  });
}


class Grid extends React.PureComponent {
  render() {
    return (
      <div>
      {
        mapAllKeys((props) => (
          <Row
              color={props.sharp ? 'black': 'white'}
              cellsPerBeat={this.props.cellsPerBeat}
              totalBeats={this.props.totalBeats}
              key={noteToString(props)}
              note={noteToString(props)} />
        ))
      }
      </div>
    );
  }
}

function songLength(song) {
  return max(song.map(note => note[1] + note[2])) || 0;
}

export default class PianoRoll extends React.PureComponent {
  constructor() {
    super();
    bindAll(this, 'bindPlayhead', 'bindTouchableArea');
  }

  bindTouchableArea(component) {
    this.edits$ = component
      .touches$$
      .flatMap((event) => {
        const firstBeat = mapElementToBeat(event.firstEl);
        const moves$ = event.movements$
            .filter(isEmptyCell)
            .distinctUntilChanged(isEqual)
            .scan(
              (last, el) => ({
                action: 'move',
                to: mapElementToBeat(el),
                from: last.to
              }),
              {to: firstBeat}
            );

        if (isEmptyCell(event.firstEl)) {
          const create$ = Observable.of(
            Object.assign({action: 'create'},
                firstBeat, {duration: 1.0/this.props.cellsPerBeat}
            )
          );

          return Observable.merge(create$, moves$);
        } else if (isNoteCell(event.firstEl)) {
          const deletes$ = event.movements$
              .isEmpty()
              .filter(identity)
              .mapTo(Object.assign(
                {action: 'delete'},
                mapElementToBeat(event.firstEl))
              );

          return Observable.merge(moves$, deletes$);
        } else {
          return Observable.never();
        }
      });
  }

  bindPlayhead(el) {
    if (el) {
      this.subscription = this.props.playbackPosition$.subscribe((position) => {
        el.style.left = (cellWidth * 4 * position) + 'px';
        el.style.display = 'block';
      });
    } else {
      if (this.subscription) {
        this.subscription.unsubscribe();
        delete this.subscription;
      }
    }
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  render() {
    const totalBeats = Math.floor(songLength(this.props.notes) + 8);

    return (
      <div className='piano-roll'>
        <div className='row-labels'>
        {
          mapAllKeys((props) => (
            <NoteLabel note={noteToString(props)} key={noteToString(props)} />
          ))
        }
        </div>
        <div className='horizontal-scroller'>
          <div className='timeline'>
            {range(0, totalBeats).map(i => (
              <div className='time-marker' key={i}>
                {i}
              </div>
            ))}
          </div>
          <TouchableArea className='note-wrapper' ref={this.bindTouchableArea}>
            <Grid cellsPerBeat={this.props.cellsPerBeat} totalBeats={totalBeats} />
            <div>
            {
              this.props.notes.map((note, i) => (
                <div className='note touchable'
                    key={i}
                    data-note={note[0]}
                    data-beat={note[1]}
                    style={stylesForNote(note)} />
              ))
            }
            </div>
            {
              this.props.playbackPosition$ ? (<div className='playhead' ref={this.bindPlayhead} />) : null
            }
          </TouchableArea>
        </div>
      </div>
    );
  }
}

PianoRoll.propTypes = {
  notes:             React.PropTypes.array.isRequired,
  cellsPerBeat:      React.PropTypes.number.isRequired,
  playbackPosition$: React.PropTypes.object
}

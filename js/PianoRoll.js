import React from 'react';
import classNames from 'classnames';

import TouchableArea from './TouchableArea';

import {range, flatten, bindAll} from 'lodash';


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


const TOTAL_BEATS=30;

function Row(props) {
  const className = classNames('row', {
    white: (props.color === 'white'),
    black: (props.color === 'black')
  });

  const perBeat = 4;
  return (
    <div className={className} data-note={props.note}>
    {
      range(0, TOTAL_BEATS*perBeat).map(i => (
        <div className='cell touchable' key={i} data-beat={i/perBeat} />
      ))
    }
    </div>
  );
}

const cellHeight = 15;
const cellWidth = 30;

function stylesForNote(note) {
  const match = note[0].match(/([A-Z]#?)(\d)/);
  if (match) {
    const row = rowMap[match[1]] + (5 - match[2]) * 12;

    return {
      top: row * cellHeight,
      width: note[2] * cellWidth * 4,
      left: note[1] * cellWidth * 4
    };
  } else {
    return {};
  }
}

function mapElementToBeat(el) {
  return {
    beat: el.dataset.beat,
    note: el.parentNode.dataset.note
  };
}


export default class PianoRoll extends React.Component {
  constructor() {
    super();
    bindAll(this, 'bindPlayhead', 'bindTouchableArea');
  }

  bindTouchableArea(component) {
    this.edits$ = component
      .touches$$
      .flatMap(function(touches$) {
        return touches$.map(mapElementToBeat).first();
      });
  }

  bindPlayhead(el) {
    this.subscription = this.props.playbackPosition$.subscribe((position) => {
      if (position == null) {
        el.style.display = 'none';
      } else {
        el.style.left = (cellWidth * 4 * position) + 'px';
        el.style.display = 'block';
      }
    });
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  render() {
    return (
      <div className='piano-roll'>
        <div className='timeline'>
          {range(0, TOTAL_BEATS).map(i => (
            <div className='time-marker' key={i}>
              {i}
            </div>
          ))}
        </div>
        <TouchableArea className='note-wrapper' ref={this.bindTouchableArea}>
          <div>
            {
              flatten(
                range(5, 2, -1).map(octave => (
                  flatten(
                    keys.map(([note, sharp], i) => {
                      const white = (
                        <Row
                          color="white"
                          key={note + octave}
                          octave={octave}
                          note={note + octave} />
                      );

                      if (sharp) {
                        const black = (
                          <Row
                            color='black'
                            octave={octave}
                            key={note + '#' + octave}
                            note={note + '#' + octave}  />
                        );

                        return [black, white];
                      } else {
                        return [white];
                      }
                    })
                  ))
                )
              )
            }
          </div>
          <div>
          {
            this.props.notes.map((note, i) => (
              <div className='note' key={i} style={stylesForNote(note)} />
            ))
          }
          </div>
          <div className='playhead' ref={this.bindPlayhead} />
        </TouchableArea>
      </div>
    );
  }
}

PianoRoll.propTypes = {
  playbackPosition$: React.PropTypes.object.isRequired
}

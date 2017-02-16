import React from 'react';
import classNames from 'classnames';

import {range, flatten} from 'lodash';

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
  const className = classNames('row', {
    white: (props.color === 'white'),
    black: (props.color === 'black')
  });

  return (
    <div className={className}>
    {
      range(0, 100).map(i => (
        <div className='cell' key={i} />
      ))
    }
    </div>
  );
}

const cellHeight = 15;
const cellWidth = 30;

function stylesForNote(note) {
  const row = rowMap[note[0]];
  return {
    top: row * cellHeight,
    width: note[2] * cellWidth * 4,
    left: note[1] * cellWidth * 4
  };
}

export default class PianoRoll extends React.Component {
  constructor() {
    super();
    this.bindPlayhead = this.bindPlayhead.bind(this);
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
          {range(0, 25).map(i => (
            <div className='time-marker' key={i}>
              {i}
            </div>
          ))}
        </div>
        <div className='note-wrapper'>
          <div>
            {
              flatten(
                keys.map(([note, sharp], i) => {
                  const white = (
                    <Row
                      color="white"
                      key={note}
                      note={note} />
                  );

                  if (sharp) {
                    const black = (
                      <Row
                        color='black'
                        key={note + '#'}
                        note={note + '#'}  />
                    );

                    return [black, white];
                  } else {
                    return [white];
                  }
                })
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
        </div>
      </div>
    );
  }
}

PianoRoll.propTypes = {
  playbackPosition$: React.PropTypes.object.isRequired
}

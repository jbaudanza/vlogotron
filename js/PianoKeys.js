import React from 'react';
import classNames from 'classnames';
import TouchableArea from './TouchableArea';

import {flatten} from 'lodash';

const keys = [
  ['C', true],
  ['D', true],
  ['E', false],
  ['F', true],
  ['G', true],
  ['A', true],
  ['B', false]
];

function PianoKey(props) {
  return (
    <li
      className={classNames(props.color + '-key', 'touchable', {playing: props.playing})}
      data-note={props.note}
      style={props.style} />
  );
}

export default class PianoKeys extends React.Component {
  render() {
    return (
      <TouchableArea onTouchStart={this.props.onTouchStart}>
        <ul className='piano-keys'>
          {
            flatten(
              keys.map(([note, sharp], i) => {
                const keys = [
                  <PianoKey
                    color="white"
                    playing={this.props.playing[note]}
                    key={note}
                    note={note} />
                ];

                if (sharp) {
                  const style = {
                    left: i * (100.0 / 7) + 10 + '%'
                  }
                  return keys.concat(
                    <PianoKey
                      color='black'
                      playing={this.props.playing[note + '#']}
                      key={note + '#'}
                      note={note + '#'} 
                      style={style} />
                  );
                } else {
                  return keys;
                }
              })
            )
          }
        </ul>
      </TouchableArea>
    )
  }
}


PianoKeys.propTypes = {
  playing:      React.PropTypes.object.isRequired,
  onTouchStart: React.PropTypes.func.isRequired
}

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
    let positionAttr;
    let orderedKeys;
    let blackOffset;

    if (this.props.orientation === 'vertical') {
      positionAttr = 'top';
      orderedKeys = keys.slice().reverse();
      blackOffset = -5;
    }  else {
      positionAttr = 'left';
      orderedKeys = keys;
      blackOffset = +8;
    }

    return (
      <TouchableArea onTouchStart={this.props.onTouchStart}>
        <ul className={`piano-keys ${this.props.orientation}-orientation`}>
          {
            flatten(
              orderedKeys.map(([note, sharp], i) => {
                const keys = [
                  <PianoKey
                    color="white"
                    playing={this.props.playing[note]}
                    key={note}
                    note={note} />
                ];

                if (sharp) {
                  const style = {
                    [positionAttr]: (i * (100.0 / 7) + blackOffset) + '%'
                  };
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
  orientation:  React.PropTypes.oneOf(['horizontal', 'vertical']).isRequired,
  onTouchStart: React.PropTypes.func.isRequired
}

PianoKeys.defaultProps = {
  orientation: 'horizontal'
};

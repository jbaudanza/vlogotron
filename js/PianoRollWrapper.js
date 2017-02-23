import React from 'react';

import {Observable} from 'rxjs/Observable';

import {findIndex, filter, concat} from 'lodash';

import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Slider from 'antd/lib/slider';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';

const ButtonGroup = Button.Group;
const Option = Select.Option;

import 'antd/lib/button/style/css';
import 'antd/lib/select/style/css';
import 'antd/lib/slider/style/css';
import 'antd/lib/icon/style/css';
import 'antd/lib/input-number/style/css';
import 'antd/lib/input/style/css';

import PianoRoll from './PianoRoll';

// header actions
// - save
// - change title
// - change bpm
// - play/pause
// - change time signature
//
// signature: 
//    beats-per-bar / beat-unit
//    grid-selector: note-type
//  beat-unit: quarter-node, eighth-note, etc..


function reduceEditsToSong(song, edit) {
  function matcher(edit, note) {
    return note[0] === edit.note && note[1] === edit.beat;
  }

  switch(edit.action) {
    case 'create':
      return concat(song, [[edit.note, edit.beat, edit.duration]]);
    case 'delete':
      return filter(song, (note) => !matcher(edit, note));
    case 'move':
      const index = findIndex(song, matcher.bind(null, edit.from));
      if (index !== -1) {
        const oldDuration = song[index][2];
        return concat(
          filter(song, (v, i) => i !== index), // remove old note
          [[edit.to.note, edit.to.beat, oldDuration]] // add new note
        );
      } else {
        return song;
      }
    default:
      return song;
  }
}


export default class PianoRollWrapper extends React.Component {
  constructor() {
    super();
    this.bindPianoRoll = this.bindPianoRoll.bind(this);
    this.state = {
      currentSong: [],
      cellsPerBeat: 4
    };
  }

  bindPianoRoll(component) {
    component.edits$
      .scan(reduceEditsToSong, [])
      .subscribe((v) => this.setState({currentSong: v}));
  }

  render() {
    return (
      <div>
        <div>
          <Button icon="play-circle">play</Button>
          <InputNumber prefix={<Icon type='clock-circle-o' />} defaultValue={120} />
          <Select
              value={String(this.state.cellsPerBeat)}
              onSelect={(v) => this.setState({cellsPerBeat: parseInt(v)})}>
            <Option value='1'>Whole notes</Option>
            <Option value='2'>Half notes</Option>
            <Option value='4'>Quarter notes</Option>
            <Option value='8'>Eighth notes</Option>
            <Option value='16'>Sixteenth notes</Option>
          </Select>

          <Button disabled icon="save">Save</Button>
        </div>

        <PianoRoll
              notes={this.state.currentSong}
              playbackPosition$={Observable.never()}
              cellsPerBeat={this.state.cellsPerBeat}
              ref={this.bindPianoRoll} />
      </div>
    );
  }
}
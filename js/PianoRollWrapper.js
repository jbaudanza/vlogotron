import React from 'react';

import {Observable} from 'rxjs/Observable';

import {findIndex, remove} from 'lodash';

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
    component.edits$.subscribe((editCommand) => {
      function matcher(cmd, note) {
        return note[0] === cmd.note && note[1] === cmd.beat; 
      }

      if (editCommand.action === 'create') {
        console.log(editCommand)
        this.state.currentSong.push([editCommand.note, editCommand.beat, editCommand.duration]);  
      }

      if (editCommand.action === 'delete') {
        remove(this.state.currentSong, matcher.bind(null, editCommand));
      }

      if (editCommand.action === 'move') {        
        const index = findIndex(this.state.currentSong, matcher.bind(null, editCommand.from));
        if (index !== -1) {
          const oldDuration = this.state.currentSong[index][2];
          this.state.currentSong.splice(index, 1, 
            [editCommand.to.note, editCommand.to.beat, oldDuration]
          );
        }
      }

      this.forceUpdate();
    });
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
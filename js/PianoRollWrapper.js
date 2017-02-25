import React from 'react';

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
    this.state = {
      cellsPerBeat: 4
    };
  }

  bindPianoRoll(component) {
    if (component) {
      this.edits$ = component.edits$;
    } else {
      delete this.edits$;
    }
  }

  render() {
    let playIcon;
    let playText;
    if (this.props.playbackPosition$) {
      playIcon = 'pause-circle';
      playText = 'pause';
    } else {
      playIcon = 'play-circle';
      playText = 'play';
    }

    return (
      <div>
        <div>
          <Button
              onClick={this.props.onClickPlay}
              disabled={this.props.notes.length === 0}
              icon={playIcon}>
            {playText}
          </Button>
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
              notes={this.props.notes}
              playbackPosition$={this.props.playbackPosition$}
              cellsPerBeat={this.state.cellsPerBeat}
              playing={this.props.playing}
              ref={this.bindPianoRoll.bind(this)} />
      </div>
    );
  }
}
import React from 'react';
import PropTypes from "prop-types";

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import VideoCell from "../js/VideoCell";
import messages from "../js/messages";


class WithUserMedia extends React.Component {
  constructor() {
    super();
    this.state = { mediaStream: null, error: null }
  }

  componentDidMount() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(
      (mediaStream) => this.setState({mediaStream}),
      (error) => this.setState({error}),
    )
  }

  render() {
    if (this.state.mediaStream != null) {
      return this.props.render(this.state.mediaStream);
    }

    if (this.state.error) {
      return <div>{this.state.error}</div>;
    }

    return <div>Waiting for user media</div>;
  }
}

class WithMessages extends React.Component {
  getChildContext() {
    return {
      messages: messages['en'],
      locale: 'en'
    };
  }

  render() {
    return this.props.children;
  }
};

WithMessages.childContextTypes = {
  messages: PropTypes.object,
  locale: PropTypes.string
};

storiesOf('VideoCell', module)
  .add('while recording', () => {
    return (
      <WithMessages>
        <WithUserMedia render={(mediaStream) => (
          <VideoCell
            onStopRecording={action('stop recording')}
            durationRecorded={123}
            mediaStream={mediaStream} />
        )} />
      </WithMessages>
    )
  })
  .add('with countdown', () => {
    return (
      <WithMessages>
        <WithUserMedia render={(mediaStream) => (
          <VideoCell
            onStopRecording={action('stop recording')}
            countdown={3}
            mediaStream={mediaStream} />
        )} />
      </WithMessages>
    )
  })

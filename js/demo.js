import './rxjs-additions';

import React from 'react';
import ReactDOM from 'react-dom';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';

import {bindAll} from 'lodash';

import SvgAssets from './SvgAssets';

import audioContext from './audioContext';
import AudioPlaybackEngine from './AudioPlaybackEngine';

import './style.scss';
import {navigate, currentRoute$} from './router2';

import bindComponentToObservable from './bindComponentToObservable';

window.main = function(node) {
  ReactDOM.render(<App />, node);
};


class App extends React.Component {
  constructor() {
    super();
    bindAll(this, 'onLogin', 'onNavigate', 'onLogout', 'bindView');

    this.state = {};
  }

  componentWillMount() {
    this.subscription = currentRoute$.subscribe((route) => {
      this.setState({
        route: route,
        viewState: route.initialState
      });
    });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();

    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
    }
  }

  bindView(view) {
    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
    }

    this.pageSubscription = new Subscription();

    if (this.state.audioEngine) {
      this.state.audioEngine.destroy();
    }

    const result = this.state.route.controller(
      this.state.route.params, view.actions, this.pageSubscription
    );

    const audioEngine = new AudioPlaybackEngine(
      result.audioEngineState.audioBuffers,
      result.audioEngineState.playCommands,
      result.audioEngineState.songPlayback
    );

    this.pageSubscription.add(
      result.viewState.subscribe((state) => this.setState({
        viewState: state,
        audioEngine: audioEngine
      }))
    );
  }

  onNavigate(href) {
    navigate(href);
    document.body.scrollTop = 0;
  }

  onLogin(providerString) {
    const provider = new firebase.auth[providerString + 'AuthProvider']();
    firebase.auth().signInWithPopup(provider);
  }

  onLogout() {
    firebase.auth().signOut();
  }

  getChildContext() {
    return {audioContext};
  }

  render() {
    const View = this.state.route.view;

    let playCommands$;
    if (this.state.audioEngine) {
      playCommands$ = this.state.audioEngine.playCommands$;
    } else {
      playCommands$ = Observable.never();
    }

    return (
      <div>
        <SvgAssets />
        <View
            {...this.state.viewState}
            playCommands$={playCommands$}
            ref={this.bindView}
            onNavigate={this.onNavigate}
            onLogin={this.onLogin}
            onLogout={this.onLogout} />
      </div>
    );
  }
}

App.childContextTypes = {
  audioContext: React.PropTypes.object
};

/* @flow */

// A global audioContext to be used throughout the app
export default new (window.AudioContext || window.webkitAudioContext)();

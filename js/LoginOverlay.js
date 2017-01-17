import React from 'react';

import Overlay from './Overlay';
import Link from './Link';

const providers = ['Facebook', 'Google', 'Twitter'];

export default class LoginOverlay extends React.Component {
  render() {
    return (
      <Overlay className='login-overlay' onClose={this.props.onClose}>
        {
          providers.map((provider) => (
            <Link
                key={provider}
                onClick={this.props.onLogin.bind(null, provider)}
                className='login-button'>
              <img src={provider.toLocaleLowerCase() + '-login.svg'} width="200px" />
            </Link>
          ))
        }
      </Overlay>
    );
  }
}

LoginOverlay.propTypes = {
  onLogin: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.func.isRequired
};

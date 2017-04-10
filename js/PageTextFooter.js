import React from 'react';

import classNames from 'classnames';
import Link from './Link';


export default class PageTextFooter extends React.Component {
  render() {
    return (
      <div className={classNames('page-footer page-text-footer', {hidden: this.props.text == null, error: this.props.error})}>
        <div className='page-footer-content'>
          {
            this.props.error ? (
              <div className='page-footer-content'>
                {this.props.text}
                <Link className='action primary' onClick={this.props.onDismissError}>
                  {this.context.messages['ok-action']()}
                </Link>
              </div>
            ) : (
              <div className='page-footer-content'>
                {this.props.text}
              </div>
            )
          }
        </div>
      </div>
    );
  };
}

PageTextFooter.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

PageTextFooter.propTypes = {
  text:           React.PropTypes.string.isRequired,
  onDismissError: React.PropTypes.func.isRequired,
  error:          React.PropTypes.bool
};
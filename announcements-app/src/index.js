import React from 'react';
import ReactDOM from 'react-dom';
import { Amplify } from 'aws-amplify';
import App from './App';
import './index.css';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID,
      allowGuestAccess: true,
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN,
          scopes: ['phone', 'email', 'profile', 'openid', 'aws.cognito.signin.user.admin'],
          redirectSignIn: process.env.REACT_APP_REDIRECT_SIGNIN,
          redirectSignOut: process.env.REACT_APP_REDIRECT_SIGNOUT,
          responseType: 'code'
        }
      }
    }
  }
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import store from './Store'
import { Provider } from 'react-redux'
import { migrateLegacyHashRoute } from './routing/browserRouting'
import { isBrowserRoutingEnabled } from './config/deploymentMode'

if (isBrowserRoutingEnabled) {
  migrateLegacyHashRoute(window)
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

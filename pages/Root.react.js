// @flow
import React from 'react';
import { Provider, BrowserRouter, Switch, Route } from 'react-router-dom';

import Home from './Home.react';

import '../styles/style.css';

class Root extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route path="/" component={Home} />
        </Switch>
      </BrowserRouter>
    );
  }
};

export default Root;

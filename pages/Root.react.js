import React from 'react';

import '../styles/style.css';

// Root element for the heap simulation
class Root extends React.Component {
  render() {
    return (
      <Provider store={store}>
      <BrowserRouter>
      <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <PrivateRoute path="/" component={Home} />
      </Switch>
      </BrowserRouter>
      </Provider>
  );
  }
};

export default Root;

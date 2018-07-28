import React from 'react';
import { render } from 'react-dom';
import Root from './components/Root.react';

// TODO add loader for the font
// import 'typeface-roboto';

// The element to feed into
const app = document.getElementById('app');
// Shortcut for ReactDOM.render() via importing the property 'render'
// (which is a function) from the ReactDOM module
render(<Root/>, app);

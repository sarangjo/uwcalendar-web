// We only want to get the hotloader if we're in development
var loaders = ['babel'];
if (process.env.NODE_ENV === 'development') {
  loaders.push('react-hot');
}

module.exports = {
  devtool: 'eval',
  entry: './app-client.js', // entry file
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js',
    publicPath: '/dist/'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: loaders,
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loaders: [ 'style-loader', 'css-loader' ]
      }
    ]
  }
};

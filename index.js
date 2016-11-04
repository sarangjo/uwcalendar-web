// TODO: make ES6-y

var express = require('express');
var firebase = require('firebase');
var bodyParser = require('body-parser');
var connect = require('./connect');

var app = express();

firebase.initializeApp({
  serviceAccount: 'uwcalendar-69fc31da40b7.json',
  databaseURL: 'https://uwcalendar.firebaseio.com'
});

var db = firebase.database();
var requestsRef = db.ref('requests');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));

var router = express.Router();

// Middleware for authentication and such
router.use(function(req, res, next) {
  console.log('Something is happening.');
  next();
});

router.get('/', function(req, res) {
  res.json({ message: 'Welcome to the UW Calendar API!' });
});

/**
 * POST /api/connect/
 * Params: userA, userB: user ID's from Firebase
 */
router.route('/connect')
  .post(function(req, res) {
    console.log(req.body);
    var userA = req.body.userA;
    var userB = req.body.userB;
    var request = req.body.request;
    var quarter = req.body.quarter;
    connect(db, userA, userB, request, quarter).then(function resolve(status) {
      console.log(status);
      res.json({ message: status });
    }, function reject(reason) {
      // TODO make reason include the code and message
      res.status(400).json({ message: 'Failed. Reason: ' + reason });
    });
  });

app.use('/api', router);

// app.use(express.static(__dirname + '/public'));
//
// // views is directory for all template files
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');
//
// app.get('/', function(request, response) {
//   var db = firebase.database();
//   var ref = db.ref('requests');
//   ref.once('value', function(snapshot) {
//     console.log(snapshot.val());
//   });
//   response.render('pages/index');
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

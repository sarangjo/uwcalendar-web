// TODO: make ES6-y

var express = require('express');
var admin = require('firebase-admin');
var bodyParser = require('body-parser');
var connect = require('./connect');

var app = express();

var serviceAccount = require("./uwcalendar-web-secret.json");

// Initialize Firebase server admin account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://uwcalendar.firebaseio.com"
});

var db = admin.database();
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
 *
 * Connects two schedules together.
 *
 * Params:
 * - connection: connection ID from Firebase
 * - quarter: quarter ID of the form sp16
 */
router.route('/connect')
  .post(function(req, res) {
    console.log(req.body);
    connect(db, req.body.connectionId, req.body.quarter).then(function resolve(status) {
      console.log(status);
      res.json({ message: status });
    }, function reject(reason) {
      // TODO make reason include the code and message
      res.status(400).json({ message: 'Failed. Reason: ' + reason });
    });
  });

app.use('/api', router);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

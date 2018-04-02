var express = require('express');
var router = express.Router();

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

/**
 * GET /api/users/
 * 
 * Returns a JSON blob of users.
 */
router.route('/users')
  .get(function(req, res) {
    // TODO retrieve users
    
  });

module.exports = router;

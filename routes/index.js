var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'UW Calendar' });
});

/* POST login page */
router.post('/login', function(req, res, next) {
  console.log(req);
  res.send(req.body);
});

module.exports = router;

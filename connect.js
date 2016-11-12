"use strict"

// TODO: make ES6-y

var _ = require('lodash');

var NUMBER_OF_DAYS = 5;
var LATEST_TIME = '23:59';

var SCHEDULES_KEY = 'schedules';
var REQUESTS_KEY = 'requests';
var USERS_KEY = 'users';
var CONNECTIONS_KEY = 'connections';
var PARTICIPANTS_KEY = 'participants';
var DATA_KEY = 'data';
var CONNECTION_ID_KEY = 'connectionId';
var CONNECTION_WITH_KEY = 'with';

var NO_CLASS = 'NO_CLASS';

/**
 * @param {object} quarter a quarter snapshot from Firebase
 * @returns {list} a list of sanitized classes
 */
function sanitize(quarter) {
  var sanitizedQuarter = [];
  _.forOwn(quarter, function(value) {
    sanitizedQuarter.push(value);
  });
  return sanitizedQuarter;
}

/**
 * @param {day} a a day object
 */
function dayComp(a, b) {
  return ((a.time < b.time) ? -1 : ((a.time > b.time) ? 1 : 0));
}

/**
 * Given a quarter, returns a week representation.
 */
function getWeek(quarter) {
  var week = [];

  for (var i = 0; i < NUMBER_OF_DAYS; i++) {
    var day = [];

    quarter.forEach(function(singleClass) {
      if (singleClass.days & (1 << i)) {
        day.push({
          time: singleClass.start, currentClass: singleClass.name // TODO: save full class
        });
        day.push({
          time: singleClass.end, currentClass: NO_CLASS // indicates the class is over
        });
      }
    });

    // Sort day by time of each segment
    day.sort(dayComp);

    week[i] = day;
  }

  return week;
}

/**
 * Combines days
 */
function combineDays(days) {
  // Each day should be well-formed.
  // - at least one class
  // - start and end of each class --> length divisible by 2
  if(days.values.some(function(day) { return !day.length || (day.length % 2); })) {
    return null;
  }

  var combinedDay = [];

  //////// START ALGORITHM
  // TODO: optimize by only interating once?
  var indices = _.mapValues(days, () => 0); // which marker we are considering for each day
  var classes = _.mapValues(days, () => NO_CLASS); // the current set of classes that are active for the current time slot
  var validIndices = _.mapValues(days, () => true); // keeps track of which users still have markers left to consider; starts out as all true's

  // TODO figure this out
  // Go as long as there is at least 1 index that is valid
  while (validIndices) {
    // Find which markers of the current ones are the earliest so far
    var earliestMarkers = [];
    var earliestTime = LATEST_TIME;
    _.forOwn(days, (day, userId) => {
      if (validIndices & 1 << userId) {
        var currMarker = day[indices[userId]];

        if (currMarker.time < earliestTime) {
          earliestMarkers = [userId];
          earliestTime = currMarker.time;
        } else if (currMarker.time == earliestTime) {
          earliestMarkers.push(userId);
        }
      }
    });

    // Set the corresponding classes in `classes` to be the classes contained in each marker
    // Move the current indices for the days just updated
    earliestMarkers.forEach(function(dayIndex) {
      classes[dayIndex] = days[dayIndex][indices[dayIndex]].currentClass;
      indices[dayIndex]++;
    });

    // Push a new marker with `classes` and the time of the marker
    combinedDay.push({
      time: earliestTime, classes: _.cloneDeep(classes)
    });

    // Update the value of validIndices
    indices.forEach(function(markerIndex, i) {
      if (markerIndex >= days[i].length && (validIndices & 1 << i)) {
        validIndices -= (1 << i);
      }
    });

    console.log('Days left: ' + validIndices);
  }
  //////// END ALGORITHM

  return combinedDay;
}

/**
 * TODO
 */
function combineQuartersIntoWeek(quarterA, quarterB) {
  // Now that the quarters have been retrieved, sanitize and combine them
  quarterA = sanitize(quarterA);
  quarterB = sanitize(quarterB);

  var weekA = getWeek(quarterA);
  var weekB = getWeek(quarterB);

  var combinedWeek = weekA.map(function(dayOfWeek, i) {
    return combineDays([dayOfWeek, weekB[i]]);
  });

  console.log(JSON.stringify(combinedWeek));

  return combinedWeek;
}

/**
 * @return {Promise} a promise
 */
function saveConnection(db, combinedWeek, quarter, userA, userB) {
  // Creating a promise
  return new Promise(function (resolve, reject) {
    // Add to connections collection
    var connRef = db.ref(CONNECTIONS_KEY).push();

    // 1. Participants
    connRef.child(PARTICIPANTS_KEY).push(userA);
    connRef.child(PARTICIPANTS_KEY).push(userB);
    // 2. Data
    var dataRef = connRef.child(DATA_KEY);
    var quarterRef = dataRef.child(quarter);
    quarterRef.set(combinedWeek);

    // Add to users' connections child
    var usersRef = db.ref(USERS_KEY);
    var userAConnRef = usersRef.child(userA).child(CONNECTIONS_KEY).push({
      [CONNECTION_ID_KEY]: connRef.key,
      [CONNECTION_WITH_KEY]: userB
    });
    var userBConnRef = usersRef.child(userB).child(CONNECTIONS_KEY).push({
      [CONNECTION_ID_KEY]: connRef.key,
      [CONNECTION_WITH_KEY]: userA
    });

    resolve('Connection saved.');
  });
}

/**
 * Connects the schedules for users.
 *
 * @return {Promise}
 */
function connect(db, userA, userB, request, quarterId) {
  var error = '';
  if (!db) error += 'Invalid database object.\n';
  if (!userA) error += 'Invalid userA.\n';
  if (!userB) error += 'Invalid userB.\n';
  if (!request) error += 'Invalid request id.\n';
  if (!quarterId) error += 'Invalid quarter.\n';
  if (error) {
    return Promise.reject(error);
  }

  // TODO: confirm that a request exists
  // TODO: confirm that a connection doesn't exist

  // Download schedule for both users
  var schedulesRef = db.ref(SCHEDULES_KEY);
  var userARef = schedulesRef.child(userA + '/' + quarterId);
  var userBRef = schedulesRef.child(userB + '/' + quarterId);

  // TODO: clean up big-time
  var userAQuarter, userBQuarter;
  return userARef.once('value') // returns a Promise
    .then(function(snapshot) {
      userAQuarter = snapshot.val();
    }).then(function() {
      return userBRef.once('value').then(function(snapshot) {
        userBQuarter = snapshot.val();
      })
      .then(function() {
        if (userAQuarter && userBQuarter) {
          var combinedWeek = combineQuartersIntoWeek(userAQuarter, userBQuarter);

          if (combinedWeek) {
            // return Promise.resolve('Yay!');
            return saveConnection(db, combinedWeek, quarterId, userA, userB).then(function() {
              var reqRef = db.ref(REQUESTS_KEY);
              reqRef.child(userA + '/' + request).set(null);
              reqRef.child(userB + '/' + request).set(null);
              return 'Success';
            });
          }
          return Promise.reject('Combining quarters failed.');
        }
        return Promise.reject('Both users need to have schedules for ' + quarterId + '.');
      });
    });
}

module.exports = connect;

"use strict"

var _ = require('lodash');
var Constants = require('./constants.js');

var NUMBER_OF_DAYS = 5;
var LATEST_TIME = '23:59';
var NO_CLASS = 'NO_CLASS';

/**
* Given a quarter, returns a week representation.
* A week is a sorted list of days. A day is a list of objects { time, currentClass }.
*/
function getWeek(quarter) {
  var week = [];

  for (var i = 0; i < NUMBER_OF_DAYS; i++) {
    var day = [];

    quarter.forEach(function (singleClass) {
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
    day.sort((a, b) => ((a.time < b.time) ? -1 : ((a.time > b.time) ? 1 : 0)));

    week[i] = day;
  }

  return week;
}

/**
* @param {object} days a map of user ID's to days combine
* Combines days.
*/
function combineDays(days) {
  console.log("Days in combineDays:");
  console.log(days);

  // Each day should be well-formed.
  // - at least one class
  // - start and end of each class --> length divisible by 2
  if (_.values(days).some(function (day) { return !day.length || (day.length % 2); })) {
    return null;
  }

  var combinedDay = [];

  //////// START ALGORITHM
  var indices = _.mapValues(days, () => 0); // which marker we are considering for each user ID
  var classes = _.mapValues(days, () => NO_CLASS); // the current set of classes, for each user ID, that are active for the current time slot
  var validIndices = _.mapValues(days, () => true); // keeps track of which users still have markers left to consider; starts out as all true's

  while (true) {
    // Go as long as there is at least 1 index that is valid
    var allDone = false;
    _.forOwn(validIndices, function (validIndex) { allDone = allDone || validIndex; });
    if (!allDone) {
      break;
    }

    // Find which markers of the current ones are the earliest so far
    var earliestMarkers = [];
    var earliestTime = LATEST_TIME;
    _.forOwn(days, (day, userId) => {
      // First check if we're considering this userId
      if (validIndices[userId]) {
        var currMarker = day[indices[userId]];

        if (currMarker.time < earliestTime) {
          // Reset the earliest markers, we found a new earliest user id!
          earliestMarkers = [userId];
          earliestTime = currMarker.time;
        } else if (currMarker.time == earliestTime) {
          earliestMarkers.push(userId);
        }
      }
    });

    // Set the corresponding classes in `classes` to be the classes contained in each marker
    earliestMarkers.forEach(function (userId) {
      // Get the day for this user
      var userDay = days[userId];
      // Set that user's class to be its `currentClass`
      classes[userId] = userDay[indices[userId]].currentClass;
      // Move the current indices for the days just updated
      indices[userId]++;
    });

    // Push a new marker with `classes` and the time of the marker
    combinedDay.push({
      time: earliestTime, classes: _.cloneDeep(classes)
    });

    // Update the value of validIndices
    _.forOwn(indices, function (markerIndex, userId) {
      if (markerIndex >= days[userId].length && validIndices[userId]) {
        validIndices[userId] = false;
      }
    });

    console.log('Days left: ' + validIndices);
  }
  //////// END ALGORITHM

  return combinedDay;
}

/**
* Combines two quarters into a single week representation.
* @param {Snapshot} quarterA the Firebase snapshot for quarterA
* @param {Snapshot} quarterB the Firebase snapshot for quarterB
*/
function combineQuartersIntoWeek(quarterA, quarterB, userA, userB) {
  // Now that the quarters have been retrieved, sanitize and combine them

  // We don't care about the key for the class, so just store a list of the classes
  quarterA = _.values(quarterA);
  quarterB = _.values(quarterB);

  var weekA = getWeek(quarterA);
  var weekB = getWeek(quarterB);

  // TODO: fix when one user has no classes on a particular day

  var combinedWeek = weekA.map(function (dayWeekA, i) {
    return combineDays({
      [userA]: dayWeekA,
      [userB]: weekB[i]
    });
  });

  console.log(JSON.stringify(combinedWeek));

  return combinedWeek;
}

/**
* @return {Promise} a promise TODO what?
*/
function saveConnection(db, combinedWeek, quarter, connectionId) {
  // Creating a promise
  return new Promise(function (resolve, reject) {
    // Save Data
    var quarterRef = db.ref(Constants.CONNECTIONS_KEY)
      .child(connectionId).child(Constants.DATA_KEY).child(quarter);
    quarterRef.set(combinedWeek);

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
  var schedulesRef = db.ref(Constants.SCHEDULES_KEY);
  var userARef = schedulesRef.child(userA + '/' + quarterId);
  var userBRef = schedulesRef.child(userB + '/' + quarterId);

  var userAQuarter, userBQuarter;
  return Promise.all([userARef.once('value'), userBRef.once('value')])
    .then(values => {
      userAQuarter = values[0].val();
      userBQuarter = values[1].val();

      var combinedWeek = combineQuartersIntoWeek(userAQuarter, userBQuarter, userA, userB);

      if (combinedWeek) {
        // TODO: clean up
        return saveConnection(db, combinedWeek, quarterId, userA, userB).then(function () {
          var reqRef = db.ref(Constants.REQUESTS_KEY);
          reqRef.child(userA + '/' + request).set(null);
          reqRef.child(userB + '/' + request).set(null);
          return 'Success';
        });
      }
      return Promise.reject('Combining quarters failed.');
    }, reason => {
      console.log(reason);

      return Promise.reject('Both users need to have schedules for ' + quarterId + '.');
    });
}

function connect2(db, connectionId, quarterId) {
  var error = '';
  if (!db) error += 'Invalid database object.\n';
  if (!connectionId) error += 'Invalid connectionId id.\n';
  if (!quarterId) error += 'Invalid quarter.\n';
  if (error) {
    return Promise.reject(error);
  }

  // TODO: confirm that a connection exists
  // TODO: delete data if it exists -- or figure out clever way to update

  // Download schedule for both users
  var participantsRef = db.ref(Constants.CONNECTIONS_KEY + '/' + connectionId + '/' + Constants.PARTICIPANTS_KEY);
  return participantsRef.once('value').then(function (snapshot) {
    // Get participants
    var i = 0;
    var userA = null, userB = null;
    snapshot.forEach(function (child) {
      if (i++ == 0) userA = child.val();
      else userB = child.val();
    });

    // Download schedules for the current quarter
    var schedulesRef = db.ref(Constants.SCHEDULES_KEY);
    var userARef = schedulesRef.child(userA + '/' + quarterId);
    var userBRef = schedulesRef.child(userB + '/' + quarterId);

    var userAQuarter, userBQuarter;
    return Promise.all([userARef.once('value'), userBRef.once('value')])
      .then(values => {
        userAQuarter = values[0].val();
        userBQuarter = values[1].val();

        var combinedWeek = combineQuartersIntoWeek(userAQuarter, userBQuarter, userA, userB);

        if (combinedWeek) {
          // TODO: clean up
          return saveConnection(db, combinedWeek, quarterId, connectionId);
        }
        return Promise.reject('Combining quarters failed.');
      }, reason => {
        console.log(reason);

        return Promise.reject('Both users need to have schedules for ' + quarterId + '.');
      });
  });
}

module.exports = connect2;

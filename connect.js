var _ = require('lodash');

var NUMBER_OF_DAYS = 5;

/**
 * @param {object} quarter a quarter snapshot from Firebase
 * @returns {list} a list of manageable classes
 */
function sanitize(quarter) {
  var sanitizedQuarter = [];
  _.forOwn(quarter, function(value) {
    sanitizedQuarter.push(value);
  });
  return sanitizedQuarter;
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
          time: singleClass.end, currentClass: null // indicates the class is over
        });
      }
    });

    // Sort day by time of each segment
    day.sort(function (a, b) {
      return ((a.time < b.time) ? -1 : ((a.time > b.time) ? 1 : 0));
    });

    week[i] = day;
  }

  return week;
}

/**
 * Combines days
 */
function combineDays(days) {
  if(days.some(function(day) { return !day.length || (day.length % 2); })) {
    return null;
  }

  // First, combine all the markers in each day
  var combinedDay = [];
  days.forEach(function(day, dayIndex) {
    // Add all markers from this day
    day.forEach(function(marker) {
      var classes = new Array(days.length).fill(undefined);
      classes[dayIndex] = marker.currentClass;
      combinedDay.push({
        time: marker.time,
        classes: classes
      });
    })
  });

  // Sort by time
  combinedDay.sort(function(a, b) {
    return ((a.time > b.time) ? 1 : ((a.time < b.time) ? -1 : 0));
  });

  // Then go through one day at a time and update all markers between start and end of that day's classes
  var currentClass;
  days.forEach(function(day, i) {
    currentClass = null;
    combinedDay.forEach(function(marker) {
      // Set the start point
      if (marker.classes[i]) currentClass = marker.classes[i];
      else if (marker.classes[i] !== null) marker.classes[i] = currentClass;
    });
  });

  console.log(combinedDay);

  // var indices = new Array(days.length).fill(0);
  // var classes = new Array(days.length).fill(null);
  // var shouldContinue = true;
  // var markers = days.map((day, i) => day[indices[i]]);
  // while (shouldContinue) {
  //
  // }

  return combinedDay;
}

function connectQuarters(quarterA, quarterB) {
  // Now that the quarters have been retrieved, compile them
  quarterA = sanitize(quarterA);
  quarterB = sanitize(quarterB);

  var weekA = getWeek(quarterA);
  var weekB = getWeek(quarterB);
  var combinedWeek = [];

  for (var i = 0; i < weekA.length; i++) {
    combinedWeek.push(combineDays([weekA[i], weekB[i]]));
  }

        // Map<String, List<Day>> connectedQuarters = Schedule.connect(schedule1, schedule2);
        //
        // if (connectedQuarters.isEmpty()) {
        //     // For now, do nothing because there was an issue with the schedules
        //     return;  // TODO: what?
        // }
        //
        // // Add to the connections collection
        // DatabaseReference connRef = fb.getConnectionsRef().push();
        //
        // // 1. Participants
        // DatabaseReference participantsRef = connRef.child(FirebaseData.PARTICIPANTS_KEY);
        //
        // participantsRef.push().setValue(r.usernameAndId.id);
        // participantsRef.push().setValue(fb.getUid());
        //
        // // 2. Actual connection data
        // DatabaseReference dataRef = connRef.child(FirebaseData.DATA_KEY);
        //
        // // TODO: probably abstract this out
        // for (String qtr : connectedQuarters.keySet()) {
        //     DatabaseReference qtrRef = dataRef.child(qtr);
        //     List<Day> days = connectedQuarters.get(qtr);
        //     for (int i = 0; i < days.size(); ++i) {
        //         Day d = days.get(i);
        //         DatabaseReference dayRef = qtrRef.child(i + "");
        //
        //         List<Segment> segs = d.getSegments();
        //         for (Segment s : segs) {
        //             // Special case to save a fully empty day
        //             if (s.classesMap.isEmpty() && segs.size() != 1)
        //                 continue;
        //             fb.saveSegment(dayRef.push(), s);
        //         }
        //     }
        // }
        //
        // // Add to both users' connections list:
        // // Self
        // DatabaseReference userConn = fb.getCurrentUserRef().child(FirebaseData.CONNECTIONS_KEY).push();
        // userConn.child(FirebaseData.CONNECTION_ID_KEY).setValue(connRef.getKey());
        // userConn.child(FirebaseData.CONNECTION_WITH_KEY).setValue(r.usernameAndId.id);
        //
        // // Other
        // userConn = fb.getUsersRef().child(r.usernameAndId.id).child(FirebaseData.CONNECTIONS_KEY).push();
        // userConn.child(FirebaseData.CONNECTION_ID_KEY).setValue(connRef.getKey());
        // userConn.child(FirebaseData.CONNECTION_WITH_KEY).setValue(fb.getUid());
        //
        // // Delete the request
        // fb.getRequestsRef().child(fb.getUid()).child(r.key).removeValue();
        //
        // mDialog.hide();
}

/**
 * Connects the schedules for users.
 *
 * @return {Promise}
 */
function connect(db, userA, userB, quarterId) {
  // TODO: confirm that a request exists?

  // Download schedule for both users
  var schedulesRef = db.ref('schedules');
  var userARef = schedulesRef.child(userA + '/' + quarterId);
  var userBRef = schedulesRef.child(userB + '/' + quarterId);

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
          return connectQuarters(userAQuarter, userBQuarter);
        } else {
          return Promise.reject('Both users need to have schedules for ' + quarterId + '.');
        }
      });
    });
}

module.exports = connect;

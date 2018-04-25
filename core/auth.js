const firebase = require('firebase');

firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {

});

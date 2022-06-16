require('dotenv').config()

var express = require('express');
let request = require('request');
var bodyParser = require('body-parser')
var path = require('path');
const expressLayouts = require('express-ejs-layouts');
var cron = require('node-cron');
var flash = require('express-flash-2');

var testService = require('./services/gmailApiService')

var app = express();


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

var fs = require('fs');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));


let conn = require('./config/DbConnect');
conn.connectToServer( function( err, client ) { // MAIN MONGO START

  console.log("app running");

  app.locals.moment = require('moment');

  // ROUTES
  var publicRouter = require('./routes/public')

  app.use('/', publicRouter);

  // test for CRON
    // testService.addReplyCommentToVideos()
  
  // sockpuppet | master puppet
  // cron.schedule('0 */6 * * * *', () => {
  //   console.log("==== CRON RUNNING ON PORT 3000 ====");
  //   testService.addReplyCommentToVideos()
  //   // testService.test()
  // });
  if(process.env.cronServe == "puppetMaster") {
    // console.log("puppetMaster")
    cron.schedule('0 */10 9-16 * * mon-fri', () => { 
      console.log("==== CRON RUNS EVERY 20MIN FOR PUPPET MASTERS FROM 9AM-4PM TIMEZONE: America/New_York ====");
      testService.addReplyCommentToVideos()
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });
  }
 

  // puppet 
  if(process.env.cronServe == "sockPuppet") {
    // console.log("sockPuppet")
    cron.schedule('0 */15 10-15 * * *', () => {
      console.log("==== CRON RUNS EVERY 20MIN FOR PUPPETS ====");
      testService.addCommentToVideos()
      // testService.test()
    });
  }

  // testService.addReplyCommentToVideos()

  // testService.addCommentToVideos()

})


module.exports = app;
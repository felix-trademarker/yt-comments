require('dotenv').config()

var express = require('express');
let request = require('request');
var bodyParser = require('body-parser')
var path = require('path');
const expressLayouts = require('express-ejs-layouts');
var cron = require('node-cron');
var flash = require('express-flash-2');

var testService = require('./services/gmailApiService')
var updaterService = require('./services/dataUpdaterService')
var imapService = require('./services/mailParser')

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
// conn.connectToServer( function( err, client ) { // MAIN MONGO START
conn.connectToServer( function( err, client ) { // MAIN MONGO START

  console.log("app running");

  app.locals.moment = require('moment');

  // ROUTES
  var publicRouter = require('./routes/public')

  app.use('/', publicRouter);


  // testService.addReplyCommentToVideos()

  if(process.env.cronServe == "puppetMaster") {
    // console.log("puppetMaster")
    cron.schedule('0 */45 9-16 * * mon-fri', () => {
      console.log("==== CRON RUNS EVERY 10MIN FOR PUPPET MASTERS FROM 9AM-4PM TIMEZONE: America/New_York ====");
      testService.addReplyCommentToVideos()
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });

    // cron.schedule('0 0 1 * * *', () => {
    //   console.log("==== UPDATE ASSIGNMENTS FROM MAIN COLLECTION ====");

    //   // updaterService.updateAssignmentData()
    // }, {
    //   scheduled: true,
    //   timezone: "America/New_York"
    // });
  }
  // testService.addCommentToVideos()
  // testService.addReplyCommentToVideos()
  
  // puppet 
  if(process.env.cronServe == "sockPuppet") {
    // console.log("sockPuppet")
    cron.schedule(process.env.jobSchedulePuppet, () => {
      console.log("==== CRON RUNS EVERY 13MIN-21MIN RAND FOR PUPPETS ====");
      console.log("*** DATETIME:", app.locals.moment().format("YYYY MM DD, HH:mm:ss"));
      testService.addCommentToVideos()
    });
  }

  if(process.env.cronServe == "dataUpdater") {
    console.log("updater")

    // testService.dataUpdater();
    // cron.schedule(process.env.jobSchedulePuppet, () => {
    //   console.log("==== CRON RUNS EVERY 13MIN-21MIN RAND FOR PUPPETS ====");
    // });
  }

  // test cron running
  if (process.env.jobScheduleTester) 
  cron.schedule(process.env.jobScheduleTester, () => {
    console.log("==== CRON RUNS EVERY 13MIN-21MIN RAND FOR PUPPETS ====");
    console.log("*** DATETIME:", app.locals.moment().format("YYYY MM DD, HH:mm:ss"));
    // testService.addCommentToVideos()
  });

  console.log("*** DATETIME:", app.locals.moment().format("YYYY MM DD, HH:mm:ss"));

  // testService.addCommentToVideos()
  // testService.addReplyCommentToVideos()

  // testService.updateAssignments()
})
// })


module.exports = app;
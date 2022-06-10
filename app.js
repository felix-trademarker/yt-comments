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

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube',
              'https://www.googleapis.com/auth/youtube.upload',
              'https://www.googleapis.com/auth/youtubepartner',
              'https://www.googleapis.com/auth/youtube.force-ssl',
            ];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'yt-nodejs-test2.json';

let gCode = ''

let conn = require('./config/DbConnect');
conn.connectToServer( function( err, client ) { // MAIN MONGO START

  console.log("app running");

  app.locals.moment = require('moment');

  // ROUTES
  var publicRouter = require('./routes/public')

  app.use('/', publicRouter);

  // test for CRON
  // testService.addCommentToVideos()
  cron.schedule('0 */3 * * * *', () => {
    console.log("==== CRON RUNNING ====");
    // testService.test()
  });

})


module.exports = app;
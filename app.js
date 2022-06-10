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
  testService.addCommentToVideos()
  cron.schedule('0 */3 * * * *', () => {
    // testService.test()
  });

})


// app.get('/', (req, res) => {

//   gCode = req.query.code

//   if (!req.query.code) {

//     fs.readFile('client_secret.json', function processClientSecrets(err, content) {
//       if (err) {
//         console.log('Error loading client secret file: ' + err);
//         return;
//       }
//       // Authorize a client with the loaded credentials, then call the YouTube API.
//       // authorize(res, JSON.parse(content), getChannel);
//       let credentials = JSON.parse(content)

//       var clientSecret = credentials.web.client_secret;
//       var clientId = credentials.web.client_id;
//       var redirectUrl = credentials.web.redirect_uris[0];
//       var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

//       // Check if we have previously stored a token.
//       fs.readFile(TOKEN_PATH, function(err, token) {
//         if (err) {
//           let authUrl = getNewToken(oauth2Client);
//           console.log("redirect to google", authUrl)
//           res.redirect(authUrl)
//         } else {
//           oauth2Client.credentials = JSON.parse(token);
//           res.redirect('/yt')
//           // callback(oauth2Client);
//         }
//       });

//     });

//   } else {

//     if (gCode){

//       fs.readFile('client_secret.json', function processClientSecrets(err, content) {
//         if (err) {
//           console.log('Error loading client secret file: ' + err);
//           return;
//         }
//         let credentials = JSON.parse(content)
        
//         var clientSecret = credentials.web.client_secret;
//         var clientId = credentials.web.client_id;
//         var redirectUrl = credentials.web.redirect_uris[0];
//         var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

//         oauth2Client.getToken(gCode, function(err, token) {
//           if (err) {
//             console.log('Error while trying to retrieve access token', err);
//             return;
//           }
//           // this_.storedToken = token
//           oauth2Client.credentials = token;
//           storeToken(token);

//           res.redirect('/yt')
//           // callback(oauth2Client);
//         });

//       })


//     } else {
//       res.send('hello world ')

//     }


//   }

// })

app.get('/yt', (req, res) => {

  let auth;
  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    // authorize(res, JSON.parse(content), getChannel);
    let credentials = JSON.parse(content)

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        res.redirect('/')
      }

      // oauth2Client.credentials = JSON.parse(token);
  
      // getChannel(oauth2Client)
    });

  })

  let html = `
    <form method="post" action="/yt-test">
      <table>
      <tr>
      <th>YouTube ID</th>
      <td><input type="text" name="ytId"></td>
      </tr>
      <tr>
      <th>YouTube Comment</th>
      <td><textarea name="ytComment" rows="5"></textarea></td>
      </tr>
      </table>
      <input type="submit" value="Submit">
    </form>
  `

  

  res.send(html)
})

app.post('/yt-test', (req, res) => {

  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    // authorize(res, JSON.parse(content), getChannel);
    let credentials = JSON.parse(content)

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        res.redirect('/')
      }

      oauth2Client.credentials = JSON.parse(token);

      insertComment(oauth2Client,req.body)
    });

  })

  res.send("added comment in youtube ID: "+req.body.ytId);

})

function getNewToken(oauth2Client) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  console.log(SCOPES);
  return authUrl;
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getChannel(auth) {
  var service = google.youtube('v3');
  service.channels.list({
    auth: auth,
    part: 'snippet,contentDetails,statistics',
    forUsername: 'TradeMarkersLLC'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var channels = response.data.items;
    console.log(response.data);
    if (!channels) {
      console.log('No channel found.');
    } else {
      console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                  'it has %s views.',
                  channels[0].id,
                  channels[0].snippet.title,
                  channels[0].statistics.viewCount);
    }
  });


}

function insertComment(auth, content) {

  var service = google.youtube('v3');

  service.commentThreads.insert({
    auth: auth,
    part: ["snippet"],
    requestBody: {
      snippet: {
        videoId: content.ytId,
        topLevelComment: {
          snippet: {
            textOriginal: content.ytComment,
          },
        },
      },
    },
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    console.log(response);
  });

}

module.exports = app;
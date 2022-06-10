var fs = require('fs');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')
let gmailService = require('../services/gmailApiService')

let rpoAccounts = require('../models/accounts')
let rpoVideos = require('../models/videos')

var SCOPES = ['https://www.googleapis.com/auth/youtube',
              'https://www.googleapis.com/auth/youtube.upload',
              'https://www.googleapis.com/auth/youtubepartner',
              'https://www.googleapis.com/auth/youtube.force-ssl',
              'https://www.googleapis.com/auth/user.emails.read',
              'https://www.googleapis.com/auth/userinfo.profile'
            ];

var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';


exports.index = async function(req, res, next) {

    let credentials = await helpers.getClientSecret()

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);


    if (!req.query.code) {

        let authUrl = getNewToken(oauth2Client);
        console.log("redirect to google", authUrl)
        res.redirect(authUrl)

    } else {

        oauth2Client.getToken(req.query.code, async function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }

            oauth2Client.credentials = token;
            let gmailProfile = await gmailService.getGmailProfile(oauth2Client)

            console.log(oauth2Client);
            let data = token;

            if(gmailProfile.emailAddresses){
                data.emailAddress = gmailProfile.emailAddresses[0].value
            }

            if(gmailProfile.names){
                data.displayName = gmailProfile.names[0].displayName
                data.familyName = gmailProfile.names[0].familyName
                data.givenName = gmailProfile.names[0].givenName
            }

            let findAccount = await rpoAccounts.findQuery({ emailAddress : data.emailAddress })

            if (findAccount && findAccount.length > 0) {
                rpoAccounts.update(findAccount[0]._id, data)
            } else {
                rpoAccounts.put(data)
            }
            

        });

        // oauth2Client.credentials = JSON.parse(token);

        res.render('index', {
            title: '',
            description: '',
            keywords: '',
            token: req.query.code
        });
    }
  
    
  
}

exports.addVideos = async function(req, res, next) {

    // console.log(res.app.locals.moment().format());
    res.render('addVideos', {
        title: '',
        description: '',
        keywords: '',
        message: req.query.m,
        vId: req.query.v,
    });
}

exports.addVideosSubmit = async function(req, res, next) {

    console.log(req.body);

    let data = req.body

    data.createdAt = res.app.locals.moment().format()

    rpoVideos.put(data)
    res.redirect('/add-videos?m=added&v='+req.body.videoId);
}



function getNewToken(oauth2Client) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    return authUrl;
}
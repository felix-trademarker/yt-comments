var fs = require('fs');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')
let gmailService = require('../services/gmailApiService')

let rpoAccounts = require('../models/accounts')
let rpoVideos = require('../models/videos')
let rpoVideoList = require('../models/videoList')
let rpoProductions = require('../models/productions')
let moment = require('moment')

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

    console.log("in index controller");
    let credentials = await helpers.getClientSecret()

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = process.env.googleApiReturnURL;
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

            // console.log(oauth2Client);
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

                // change approached
                // fetch cp.production

                // assign video  
                let productionAssignments = await rpoProductions.fetchOneAssign()
                let productionAssignment;
                let video;

                console.log(productionAssignments);
                // console.log(videos)
                if (productionAssignments && productionAssignments.length > 0){
                    productionAssignment = productionAssignments[0]

                    rpoProductions.update(productionAssignment._id, {assignedGmailAccount:true, assignedGmailAccountTo:data.displayName})

                    data.assignments = productionAssignment.assignments
                    // data.video = video
                }

                await rpoAccounts.put(data)

                // add video list
                if(productionAssignment && productionAssignment.assignments)
                for (let ls=0; ls < productionAssignment.assignments.length; ls++) {
                    // save in video list
                    let assignedData = productionAssignment.assignments[ls]
                    let lessonId = assignedData.jobType.split("/")[1]

                    let videoList = await rpoVideoList.findQuery({lesson:lessonId})

                    let videoData = {
                        lesson: lessonId,
                        youtubeID: videoList ? videoList[0].youtubeID : null,
                        assigned: true,
                        assignedData: data._id,
                        lastCrawled: moment().format()
                    }

                    rpoVideos.put(videoData)

                    // ls = productionAssignment.assignments.length
                }

                
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
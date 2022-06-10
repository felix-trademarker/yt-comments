let rpoAccounts = require('../models/accounts');
let rpoVideos = require('../models/videos');

var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')

exports.addCommentToVideos = async function(req, res, next) {

    let accounts = await rpoAccounts.get()
    let videos = await rpoVideos.get()

    let credentials = await helpers.getClientSecret()

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // console.log(videos);
    for(let i=0; i < videos.length; i++) {
        
        for(let c=0; c < accounts.length; c++) {
        
            oauth2Client.credentials = accounts[c];
            let commentData = {
                ytId: videos[i].videoId,
                ytComment: "Thanks!",
            }
            let gAccount = await this.getGmailProfile(oauth2Client)
            console.log(gAccount);
            // this.getComments(oauth2Client, commentData)
            // this.insertComment(oauth2Client, commentData)
            // this.insertReplyComment(oauth2Client, commentData)
        
        }
        
    }
 
}

exports.insertComment = async function(auth, content) {

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

exports.insertReplyComment = async function(auth, content) {

    var service = google.youtube('v3');
  
    service.comments.insert({
      auth: auth,
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId: content.ytId,
          parentId: 'UgxY9mhJt_4ZgKfUILN4AaABAg',
                textOriginal: content.ytComment,
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

exports.getComments = async function(auth, content) {

    var service = google.youtube('v3');
  

    service.commentThreads.list({
        auth: auth,
        part: 'snippet',
        videoId: content.ytId,
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      console.log(response.data.items);
      if (response.data.items) {
        for(let i=0; i < response.data.items.length; i++){
            let item = response.data.items[i]
            console.log(item.snippet.topLevelComment);
        }
      }
    });
  
}

exports.getGmailProfile = async function(auth) {
    return new Promise(function(resolve, reject) {

        const service = google.people({version: 'v1', auth});
        service.people.get({
            personFields: 'emailAddresses,names',
            resourceName: 'people/me',
        
        }, (err, res) => {

        if (err) reject(err);
        resolve(res.data);

        });
    });
}



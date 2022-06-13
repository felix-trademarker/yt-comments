let rpoAccounts = require('../models/accounts');
let rpoVideos = require('../models/videos');
let rpoAssignments = require('../models/assignments');

var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')

let moment = require('moment')

exports.addCommentToVideos = async function(req, res, next) {


    let videos = await rpoVideos.fetchOneCron()

    // console.log(videos);
    let credentials = await helpers.getClientSecret()

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // console.log(videos);
    for(let i=0; i < videos.length; i++) {
        
      // fetch account
      let accounts = await rpoAccounts.find(videos[i].assignedData)
      oauth2Client.credentials = accounts[0];
      let commentData = {
          ytId: videos[i].youtubeID,
          ytComment: "Thanks!",
      }
      console.log("get comments");
      // check video for comment that doesn't have any reply
      let comments = await this.getComments(oauth2Client,commentData)
      // find unreplied comment and check in list

      let findComment = await comments.find(c => c.snippet.totalReplyCount < 1);
      // let userComment = 
      console.log(findComment);
      if(findComment){
        // found
        console.log("found unreplied comment");
        let commentSnippet = findComment.snippet.topLevelComment.snippet;
        let commentAnswer = "";

        // find match FAQ in Assignment
        let findAssignments = await rpoAssignments.findQuery({jobType:"FAQ/"+videos[i].lesson})
        let findAssignment = findAssignments ? findAssignments[0] : null
console.log(findAssignment);
        if(findAssignment) {
          for(let f=0; f < findAssignment.items.length; f++) {
            if(commentSnippet.textOriginal.includes(findAssignment.items[f].question)){
              commentAnswer = findAssignment.items[f].answer
              console.log("found match");

              // direct add comment
              let contentReply = {
                ytId: findComment.snippet.videoId,
                ytParentId: findComment.id,
                ytComment: commentAnswer
              }
              if(process.env.ENVIRONMENT !== 'dev'){
                console.log("adding comment", contentReply )
                f=findAssignment.items.length
                this.insertReplyComment(oauth2Client, contentReply)

              } else {
                console.log("disable commenting on development environment");
              }

            }
          }

          console.log("this", commentAnswer);
          // found answer, reply to comment
          // if(commentAnswer) {
          //   let contentReply = {
          //     ytId: findComment.snippet.videoId,
          //     ytParentId: findComment.id,
          //     ytComment: commentAnswer
          //   }
          //   if(process.env.ENVIRONMENT !== 'dev'){
          //     console.log("adding comment", contentReply )
          //     this.insertReplyComment(oauth2Client, contentReply)
          //   } else {
          //     console.log("disable commenting on development environment");
          //   }
            
          // } else {
          //   console.log("No found proper answer");
          // }
        } else {
          console.log("Assignment Items empty");
        }

      } else {
        console.log("All comments already has replies");
      }

      // let findAssignments = await rpoAssignments.findQuery({jobType:"FAQ/"+videos[i].lesson})
      //   console.log("found assignments",findAssignments[0].items);


      // console.log("find", findComment);
      // console.log("returned comments",comments);

      // update video with lastCrawled

      rpoVideos.update(videos[i]._id, {lastCrawled: moment().format()})
    }
 
}

// exports.extrackAssignments = async function(auth, content) {

//   let assignments = await rpoAssignments.get()

//   if(assignments)
//   for(let i=0; i < assignments[0].assignments.length; i++) {
//     await rpoAssignments.put(assignments[0].assignments[i])
//   }
//   // console.log(assignments);

// }

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
  console.log("insert", content);
    service.comments.insert({
      auth: auth,
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId: content.ytId,
          parentId: content.ytParentId,
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

  return new Promise(function(resolve, reject) {

    var service = google.youtube('v3');
  

    service.commentThreads.list({
        auth: auth,
        part: 'snippet',
        videoId: content.ytId,
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err)
      }
  
      // if (response.data.items) {
      //   for(let i=0; i < response.data.items.length; i++){
      //       let item = response.data.items[i]
      //       console.log(item.snippet.topLevelComment);
      //   }
      // }
      resolve(response.data.items)
    });
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



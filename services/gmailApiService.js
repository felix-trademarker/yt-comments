const nodemailer = require("nodemailer");

let rpoAccounts = require('../models/accounts');
let rpoVideos = require('../models/videos');
let rpoAssignments = require('../models/assignments');
let rpoEmailNotifications = require('../models/emailNotification');
let rpoPostedFaq = require('../models/postedFaq');
let rpoMainProductions = require('../models/mainProductions');

var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')

let moment = require('moment')

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USERNAME, 
    pass: process.env.MAIL_PASSWORD
  }
});

exports.addReplyCommentToVideos = async function(req, res, next) {

  let videos = await rpoVideos.fetchOneCron()
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
        ytComment: "",
    }

    // check video for comment that doesn't have any reply
    let comments = await this.getComments(oauth2Client,commentData)
    // find unreplied comment and check in list

    // let findComment = await comments.find(c => c.snippet.totalReplyCount > 0);
    let findComments = await comments.filter(c => c.snippet.totalReplyCount < 1);

    if(findComments){
      for(let fc=0; fc < findComments.length; fc++){
        let findComment = findComments[fc]
        // console.log(findComment);
        // found
        console.log("found unreplied comment");
        let commentSnippet = findComment.snippet.topLevelComment.snippet;
        let commentAnswer = "";

        console.log("=== fetching youtube ID", videos[i].youtubeID);
        // find match FAQ in Assignment
        let findAssignments = await rpoAssignments.findQuery({jobType:"FAQ/"+videos[i].lesson})
        let findAssignment = findAssignments ? findAssignments[0] : null

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

              if (moment().diff(moment(commentSnippet.publishedAt),"minutes") < 20) {
                console.log("Too early to reply")
                return;
              }

              if(true | process.env.ENVIRONMENT !== 'dev'){
                console.log("adding comment", contentReply )
                
                this.insertReplyComment(oauth2Client, contentReply)

                // add updates here
                let postedFaq = await rpoPostedFaq.findQuery({ ytComment: commentSnippet.textOriginal })
                
                if(postedFaq && postedFaq.length > 0) {

                  contentReply.puppetMaster = accounts[0]
                  contentReply.dateCreated = moment().format()
                  rpoPostedFaq.update(postedFaq[0]._id, { replied: contentReply })

                  // UPDATE CP.PRODUCTION RECORD
                  let mainProductions = await rpoMainProductions.findQuery({"assignments.ID":findAssignment.ID})

                  if(mainProductions[0].assignments && mainProductions[0].assignments.length > 0){
                    
                    let assignmentNDX = mainProductions[0].assignments.findIndex((element) => element.ID == findAssignment.ID)
                    let itemsNDX = mainProductions[0].assignments[assignmentNDX].items.findIndex((element) => element.question == findAssignment.items[f].question)
                    let mainAssignments = mainProductions[0].assignments

                    mainAssignments[assignmentNDX].items[itemsNDX].contentReply = contentReply
                    rpoMainProductions.update(mainProductions[0]._id, {assignments: mainAssignments})
                  }

                }

                f=findAssignment.items.length
                fc=findComments.length

              } else {
                console.log("disable commenting on development environment");
              }

            }
          }

          if (!commentAnswer) {
            // send email notification
            // console.log("send email notification regarding", videos[i].youtubeID, commentSnippet.textOriginal);
            let dataNotify = {
              commentSnippet : commentSnippet,
              youtubeID: videos[i].youtubeID
            }

            let findNotifyData = {
              youtubeID:videos[i].youtubeID,
              commentId:findComment.id
            }
            let findNotification = await rpoEmailNotifications.findQuery(findNotifyData)
            
            // console.log(findNotification);
            if(findNotification && findNotification.length == 0) {
              
              findNotifyData.commentSnippet = commentSnippet
              rpoEmailNotifications.put(findNotifyData)
              
              if(process.env.ENVIRONMENT !== 'dev'){
                this.ytNotification(dataNotify)
              }

            }
            // this.ytNotification(dataNotify)
          }

        } else {
          console.log("Assignment Items empty");
        }
      }

    } else {
      console.log("All comments already has replies");
    }

    rpoVideos.update(videos[i]._id, {lastCrawled: moment().format()})
  }
 
}

// SERVICE FOR COMMENTERS
exports.addCommentToVideos = async function(req, res, next) {

  let videos = await rpoVideos.fetchOneCron()
  let video = videos && videos.length > 0 ? videos[0] : null

  // check if it has data fetch
  if (video) {
    let credentials = await helpers.getClientSecret()

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    let accounts = await rpoAccounts.getPuppet()

    console.log(accounts);

    let lastPosted = await rpoPostedFaq.fetchLatest()
    let puppetPostedToday = await rpoPostedFaq.findQuery({ "puppet.emailAddress": accounts[0].emailAddress, dateCreated: { $gte: moment().format("YYYY-MM-DD") } })
    
    if(accounts && accounts.length < 1){
      console.log('NO AVAILABLE PUPPET FOR POSTING COMMENTS. PUPPET MUST ONLY POST 3 COMMENT PER DAY');
      return;
    }

    if (puppetPostedToday && puppetPostedToday.length > 2) {
      console.log('NO AVAILABLE PUPPET FOR POSTING COMMENTS. PUPPET MUST ONLY POST 3 COMMENT PER DAY');
      return;
    }

    if (lastPosted && lastPosted.length > 0 && moment().diff(moment(lastPosted[0].dateCreated),"minutes") < 15) {
      console.log("CANCELLED: TOO EARLY TO ADD NEW POST")
      return;
    }

    oauth2Client.credentials = accounts[0];

    // fetch assignment collection to get faq items
    let assignments = await rpoAssignments.fetchLinkedVideo(video.lesson)

    if (assignments && assignments.length > 0) {
      let assignment = assignments[0]
      let postedFaqs = await rpoPostedFaq.findQuery({assignmentId: assignment._id})
      let faqs = assignment.items
      let postIdx = postedFaqs.length

      if (postIdx < faqs.length) {
        // add comment faqs with position index
        let comment = faqs[postIdx]
        let commentData = {
          ytId: video.youtubeID,
          ytComment: comment.question
        }
        console.log(commentData);

        
        let commentResponse = await this.insertComment(oauth2Client,commentData)

        // if(process.env.ENVIRONMENT !== 'dev')
        if (commentResponse && commentResponse.status == 200) {
          // success posting faq
          // save to repo and update lastcrawl to each data
          commentData.assignmentId = assignment._id
          commentData.puppet = accounts[0]
          commentData.dateCreated = moment().format()

          // add record 
          console.log("record faq posted", commentData);
          rpoPostedFaq.put(commentData)
          rpoAccounts.update(accounts[0]._id, {lastCrawled: moment().format()})
          rpoVideos.update(video._id, {lastCrawled: moment().format()})

          // UPDATE CP.PRODUCTION RECORD
          let mainProductions = await rpoMainProductions.findQuery({"assignments.ID":assignment.ID})

          if(mainProductions[0].assignments && mainProductions[0].assignments.length > 0){
            
            let assignmentNDX = mainProductions[0].assignments.findIndex((element) => element.ID == assignment.ID)
            let itemsNDX = mainProductions[0].assignments[assignmentNDX].items.findIndex((element) => element.question == comment.question)
            let mainAssignments = mainProductions[0].assignments

            mainAssignments[assignmentNDX].items[itemsNDX].commentData = commentData
            rpoMainProductions.update(mainProductions[0]._id, {assignments: mainAssignments})
          }

        }

      }


      // console.log();
    }


  } // close if has data fetch

  

  

  // rpoVideos.update(videos[i]._id, {lastCrawled: moment().format()})
  
 
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

  return new Promise(function(resolve, reject) {

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
        reject(err)
      }
      resolve(response)
    });
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


// SEND EMAIL NOTIFICATION
exports.ytNotification = async function(data) {

  return await transporter.sendMail({
  sender: process.env.MAIL_FROM,
  replyTo: process.env.MAIL_FROM,
  from: process.env.MAIL_FROM, 
  to: "carissa@chinesepod.com",
  cc: "felix@bigfoot.com",
  subject: "Unreplied YOUTUBE Comment - "+moment(data.commentSnippet.publishedAt).format('MMMM Do YYYY, h:mm:ss a'), 
  html: `<p>Hi Admin,</p>
          <p>Youtube ID: ${data.youtubeID}
          <br>Comment: ${data.commentSnippet.textOriginal}
          </p>
          <p></p>
      `, 
  });
  
}
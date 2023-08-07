const nodemailer = require("nodemailer");

let rpoAccounts = require('../models/accounts');
let rpoVideos = require('../models/videos');
let rpoVideoList = require('../models/videoList');
let rpoAssignments = require('../models/assignments');
let rpoAssignmentsMain = require('../models/assignmentsMain');
let rpoEmailNotifications = require('../models/emailNotification');
let rpoPostedFaq = require('../models/postedFaq');
let rpoComments = require('../models/comments');

var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')

let moment = require('moment')
let hanzi = require('hanzi')

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USERNAME, 
    pass: process.env.MAIL_PASSWORD
  }
});

exports.addReplyCommentToVideos = async function(countCalled=0) {

  let assignment = (await rpoAssignments.fetchOneCron2())[0]
  let credentials = await helpers.getClientSecret()
  let flagReply=false;

  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
      // console.log(assignment);
  // fetch account
  // let accounts = (await rpoAccounts.find(assignment.assignedData))[0]
  // temporary since becky account has exceeded quota 
  // becky : 62a9b3323933d75b8b0b177c
  // christie : 62b586e74584ea0cb1243831
  // CREATE A SWITCH BETWEEN MP
  let mpId = '62a9b3323933d75b8b0b177c';
   
   let todaysDate = moment();

   if ( todaysDate.format('D') % 2 == 1 ) {
    mpId = '62b586e74584ea0cb1243831';
   }

  let accounts = (await rpoAccounts.find(mpId))[0]
  // console.log(accounts);
  // return;
  oauth2Client.credentials = accounts;
  let commentData = {
    ytId: assignment.youtubeID,
    ytComment: "",
  } 

  // update assignments 1st to avoid infinite loop
  rpoAssignments.update(assignment._id, {lastCrawledReply: moment().format()})

  // check video for comment that doesn't have any reply
  // let comments = await this.getComments(oauth2Client,commentData)
  let comments = await helpers.getComments(assignment.youtubeID)
  // find unreplied comment and check in list

  // let findComment = await comments.find(c => c.snippet.totalReplyCount > 0);
  let findComments = await comments.filter(c => c.numReplies < 1);

  if(findComments) {
    for(let fc=0; fc < findComments.length; fc++){
      let findComment = findComments[fc]
      // console.log(findComment);
      // found
      console.log("found unreplied comment",findComment.text);
      let commentSnippet = findComment.text;
      let commentAnswer = "";

      console.log("=== fetching youtube ID", assignment.youtubeID);

      for(let f=0; f < assignment.items.length; f++) {
        // console.log("checking >> ", findAssignment.items[f].question);
        if(commentSnippet.includes(assignment.items[f].question)){
          commentAnswer = assignment.items[f].answer
          console.log("found match");

          // direct add comment
          let contentReply = {
            ytId: assignment.youtubeID,
            ytParentId: findComment.commentId,
            ytComment: commentAnswer
          }

          // if (moment().diff(moment(commentSnippet.publishedAt),"minutes") < 12) {
          //   console.log("Too early to reply")
          //   return;
          // }

          if(process.env.ENVIRONMENT !== 'dev'){
            console.log("adding comment", contentReply.ytComment )
            flagReply = true;
            // return
            this.insertReplyComment(oauth2Client, contentReply)

            
            // add updates here
            let postedFaq = await rpoPostedFaq.findQuery({ ytComment: commentSnippet })
            
            if(postedFaq && postedFaq.length > 0) {

              contentReply.puppetMaster = accounts
              contentReply.dateCreated = moment().format()
              rpoPostedFaq.update(postedFaq[0]._id, { replied: contentReply })

              contentReply.puppet = postedFaq[0].puppet
              

              // this.ytReplyCommentNotification(contentReply)

              let this_ = this;
              setTimeout(async function(){
                
                let comments = await this_.getComments(oauth2Client,contentReply)
                contentReply.comments = comments
                this_.ytReplyCommentNotification(contentReply)

                // update video record
                rpoAssignments.update(assignment._id, {comments : comments})

              }, 5000);

            } // close if posted faq

          } else {
            console.log("disable commenting on development environment");
          }

        } else {
          console.log("not found");
        }
      
      } // end for loop

      if (!commentAnswer) {
        // send email notification
        // console.log("send email notification regarding", videos[i].youtubeID, commentSnippet.textOriginal);
        let dataNotify = {
          commentSnippet : commentSnippet,
          youtubeID: assignment.youtubeID
        }

        let findNotifyData = {
          youtubeID:assignment.youtubeID,
          commentId:findComment.commentId
        }
        let findNotification = await rpoEmailNotifications.findQuery(findNotifyData)
        
        // console.log(findNotification);
        if(findNotification && findNotification.length == 0) {
          
          findNotifyData.commentSnippet = commentSnippet
          rpoEmailNotifications.put(findNotifyData)

          if(process.env.ENVIRONMENT !== 'dev' && moment().diff(moment(commentSnippet.publishedAt),"weeks") < 4){
            // this.ytNotification(dataNotify)
          }

        }
        // this.ytNotification(dataNotify)
      } // close not comment answer
    } // end for loop

  } // findcomments
  // RECALL THIS FUNCTION IF NO FOUND COMMENT
  if (countCalled < 5 && !flagReply) {
    this.addReplyCommentToVideos(countCalled+1)
  }
 
  // console.log(countCalled)
}

// SERVICE FOR COMMENTERS
exports.addCommentToVideos = async function(counter=1) {

  // check schedule
  // if (process.env.daySched != (moment().format('D') % 2)) {
    // return false;
  // }

  // end if counter > 400
  if (counter > 20) {
    return;
  }

  console.log("function called ", counter);

  let assignment = (await rpoAssignments.fetchOneCron())[0]
  let assignmentData = {
    lastCrawled: moment().format(),
  }

  rpoAssignments.update(assignment._id,assignmentData)

  // if simplified fetch from production and update items
  if (assignment.type == 'simplified' && assignment.items ) {
    // UPDATE ITEMS FROM MAIN
    console.log(assignment.ID)
    let assignmentsMain = (await rpoAssignmentsMain.findQuery({ID:assignment.ID}))[0]
    // console.log(assignmentsMain)
    if (assignmentsMain && assignmentsMain.items) {
      assignment.items = assignmentsMain.items
      assignmentData.items = assignment.items
      console.log("updating assignment", assignment.ID)

      rpoAssignments.update(assignment._id,assignmentData)
    }
    
  }

  

  

  if (assignment) {
    let credentials = await helpers.getClientSecret()

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    let accounts = (await rpoAccounts.getPuppet())[0]
    oauth2Client.credentials = accounts;

    let lastPosted = await rpoPostedFaq.fetchLatest()
    let puppetPostedToday = await rpoPostedFaq.findQuery({ "puppet.emailAddress": accounts.emailAddress, dateCreated: { $gte: moment().format("YYYY-MM-DD") } })
    
    if(!accounts){
      console.log('PUPPET NOT FOUND!!!');
      return;
    }

    if (puppetPostedToday && puppetPostedToday.length > 2) {
      console.log('NO AVAILABLE PUPPET FOR POSTING COMMENTS. PUPPET MUST ONLY POST 3 COMMENT PER DAY');
      return;
    }

    if (lastPosted && lastPosted.length > 0 && moment().diff(moment(lastPosted[0].dateCreated),"minutes") < 13) {
      console.log("CANCELLED: TOO EARLY TO ADD NEW POST")
      return;
    }

    // if assignment is traditional check if this list is updated
    if (assignment.type == 'traditional' && typeof assignment.listUpdatedAt == "undefined") {
      // return 
      // rpoAssignments.update(assignment._id, {lastCrawled: moment().format()})
      console.log("CANCELLED: Traditional faq needs modification")
      this.addCommentToVideos(counter+1)
      return;
    }

    console.log("**** continue *******", assignment.type);

    let faqs = assignment.items

    let commentData = {
      ytId: assignment.youtubeID,
      ytComment: ""
    }
    // let ytComments = await this.getComments(oauth2Client,commentData)
    // let ytCommentsArr= this.getCommentsArr(ytComments)
    // let ytCommentsArr= await helpers.getComments(assignment.youtubeID)
    
    // FIND FAQ's
    console.log("faq length", faqs.length)
    console.log("faq",assignment.youtubeID ,faqs)
    for(let c=0; c < faqs.length; c++) {
      // let resComment = ytCommentsArr.find(({ text }) => text === faqs[c].question);
      // if (!resComment) {
      //   commentData.ytComment = faqs[c].question
      //   break;
      // }
      console.log("checking", faqs[c].question);
      // find faq in mongo
      let resComment = (await rpoComments.findQuery({vidId:assignment.youtubeID, text:faqs[c].question}))[0]
      if (!resComment) {
        commentData.ytComment = faqs[c].question
        // end loop
        break;
      } else {
        console.log("Exist", resComment._id)
      }
    }
    
    
    console.log("for FAQ comment", commentData.ytComment)

    if ( commentData.ytComment) {
      // console.log("to comment", commentData)
      // return

      if (process.env.ENVIRONMENT === 'dev') {
        console.log("abort! on DEV MODE!")
        rpoAssignments.update(assignment._id,{hasUncomment: true})
        this.addCommentToVideos(counter+1)
        return;
      }

      let commentResponse = await this.insertComment(oauth2Client,commentData)

      if (commentResponse && commentResponse.status == 200) {
        // success posting faq
        // save to repo and update lastcrawl to each data
        commentData.assignmentId = assignment._id
        commentData.puppet = accounts
        commentData.dateCreated = moment().format()
        console.log("SUCCESS IN POSTING A COMMENT!!!");
        // add record 
        rpoPostedFaq.put(commentData)
        rpoAccounts.update(accounts._id, {lastCrawled: moment().format()})
        // rpoVideos.update(video._id, {lastCrawled: moment().format()})

        // update comment repository
        rpoComments.put({
          text: commentData.ytComment,
          vidId: commentData.ytId,
          numReplies: 0
        });

        // SEND EMAIL NOTIFICATION 
        let dataCommentNotif = {
          totalNoComment : puppetPostedToday.length,
          commentData : commentData

        }
        
        let this_ = this;
        setTimeout(async function(){

          let masterAccounts = await rpoAccounts.getMasterPuppet()
          oauth2Client.credentials = masterAccounts[0];
          let comments = await this_.getComments(oauth2Client,commentData)
          dataCommentNotif.comments = comments
          this_.ytCommentNotification(dataCommentNotif)

        }, 5000);

      }

    } else {
      // rpoVideos.update(video._id, {lastCrawled: moment().format()})
      console.log("No FAQ FOUND!");
      rpoAssignments.update(assignment._id,{hasUncomment: false})
      this.addCommentToVideos(counter+1)
    }

  } // close if has data fetch
  else {
    console.log("video not found");
  }

}


exports.insertComment = async function(auth, content) {

  return new Promise(function(resolve, reject) {

    var service = google.youtube('v3');
    // console.log(auth)
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
        return;
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
        // console.log('INSERT REPLY | The API returned an error: ' + err);
        return;
      }
      // console.log(response);
    });
  
}

exports.getComments = async function(auth, content) {

  // console.log(auth, content)

  return new Promise(function(resolve, reject) {

    var service = google.youtube('v3');
    
    try {

    

    service.commentThreads.list({
        auth: auth,
        part: ['snippet,replies'],
        videoId: content.ytId,
        maxResults: 100,
    }, function(err, response) {
      if (err) {
        console.log('GET COMMENTS | The API returned an error: ' + err);
        return;
      }
  
      // if (response.data.items) {
      //   for(let i=0; i < response.data.items.length; i++){
      //       let item = response.data.items[i]
      //       console.log(item.snippet.topLevelComment);
      //   }
      // }
      resolve(response.data.items)
    });

    } catch (ex) {
      console.log(ex)
    }
  });
}

exports.getCommentsArr = function(comments) {

  let commentsArr=[]
  for (let c=0; c < comments.length; c++) {
    commentsArr.push(comments[c].snippet.topLevelComment.snippet.textOriginal)
  }

  return commentsArr
}

exports.getGmailProfile = async function(auth) {
    return new Promise(function(resolve, reject) {

        const service = google.people({version: 'v1', auth});
        service.people.get({
            personFields: 'emailAddresses,names',
            resourceName: 'people/me',
        
        }, (err, res) => {

        if (err) return;
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
  to: "yt@chinesepod.com",
  cc: ["carissa@chinesepod.com", "felix@bigfoot.com", "rexy@bigfoot.com", "rebecca@chinesepod.com"],
  // to: "felix@bigfoot.com",
  subject: "Unreplied YOUTUBE Comment - "+moment(data.commentSnippet.publishedAt).format('MMMM Do YYYY, h:mm:ss a'), 
  html: `<p>Hi Admin,</p>
          <p>Youtube Link: https://www.youtube.com/watch?v=${data.youtubeID}
          <br>Comment: ${data.commentSnippet.textOriginal}
          </p>
          <p></p>
      `, 
  });
  
}

exports.ytCommentNotification = async function(data) {

  let commentHtml = "";

  if( data && data.comments ) {
    for (let i=0; i < data.comments.length; i++) {
      let comment = data.comments[i].snippet
      let replies = data.comments[i].replies
      let replyHtml = "<ul>"
      if (replies) {
        for (let r=0; r < replies.comments.length; r++) {
          // console.log(replies)
          replyHtml += `<li>${replies.comments[r].snippet.authorDisplayName} >>>> ${replies.comments[r].snippet.textOriginal}</li>`
        }
      }

      commentHtml += `<li>${comment.topLevelComment.snippet.authorDisplayName} >>> ${comment.topLevelComment.snippet.textOriginal} ${replyHtml}</li>`
    }
  }

  return await transporter.sendMail({
  sender: process.env.MAIL_FROM,
  replyTo: process.env.MAIL_FROM,
  from: process.env.MAIL_FROM, 
  to: "yt@chinesepod.com",
  cc: ["carissa@chinesepod.com", "felix@bigfoot.com", "rexy@bigfoot.com", "rebecca@chinesepod.com"],
  // to: "felix@bigfoot.com",
  subject: data.commentData.puppet.displayName + " added new comment in Youtube ID " + data.commentData.ytId + " at " +moment(data.commentData.dateCreated).format('MMMM Do YYYY, h:mm:ss a'), 
  html: `<p>Hi Admin,</p>
          <p>Commenter: ${data.commentData.puppet.displayName}
          <br>Youtube Link: https://www.youtube.com/watch?v=${data.commentData.ytId}
          <br>Comment: ${data.commentData.ytComment}
          <br>Todays Post Count: ${(data.totalNoComment + 1)}
          </p>
          <p>***** Current Video Comments *****</p>
          <ul>${commentHtml}</ul>
      `, 
  });
  
}

exports.ytReplyCommentNotification = async function(data) {

  let commentHtml = "";

  if( data && data.comments ) {
    for (let i=0; i < data.comments.length; i++) {
      let comment = data.comments[i].snippet
      let replies = data.comments[i].replies
      let replyHtml = "<ul>"
      if (replies) {
        for (let r=0; r < replies.comments.length; r++) {
          // console.log(replies)
          replyHtml += `<li>${replies.comments[r].snippet.authorDisplayName} >>>> ${replies.comments[r].snippet.textOriginal}</li>`
        }
      }

      commentHtml += `<li>${comment.topLevelComment.snippet.authorDisplayName} >>> ${comment.topLevelComment.snippet.textOriginal} ${replyHtml}</li>`
    }
  }

  return await transporter.sendMail({
  sender: process.env.MAIL_FROM,
  replyTo: process.env.MAIL_FROM,
  from: process.env.MAIL_FROM, 
  to: "yt@chinesepod.com",
  cc: ["carissa@chinesepod.com", "felix@bigfoot.com", "rexy@bigfoot.com", "rebecca@chinesepod.com"],
  // to: "felix@bigfoot.com",
  subject: (data.puppetMaster.displayName ? data.puppetMaster.displayName : 'Puppet Master') + " replied to a comment in Youtube ID " + data.ytId + " at " +moment().format('MMMM Do YYYY, h:mm:ss a'), 
  html: `<p>Hi Admin,</p>
          <p>Puppet Master: ${(data.puppetMaster.displayName ? data.puppetMaster.displayName : 'Puppet Master')}
          <br>Sock Puppet: ${(data.puppet.displayName ? data.puppet.displayName : 'Sock Master')}
          <br>Youtube Link: https://www.youtube.com/watch?v=${data.ytId}
          <br>Reply Comment: ${data.ytComment}
          </p>
          <p>***** Current Video Comments *****</p>
          <ul>${commentHtml}</ul>
      `, 
  });
  
}

// temporary function to separate traditional youtube video
exports.updateAssignments = async function() {

  return;
  // delete data
  // let videoDup = await rpoVideos.findQuery( { type: 'traditional' } )
  // for(let d=0; d < videoDup.length; d++)
  // rpoVideos.remove(videoDup[d]._id)

  // let assignmentDup = await rpoAssignments.findQuery( {type: 'traditional'} )
  // for(let d=0; d < assignmentDup.length; d++)
  // rpoAssignments.remove(assignmentDup[d]._id)

  // console.log('done');
  // return

  let assignments = await rpoAssignments.get()
  hanzi.start();

  for (let a=0; a < assignments.length; a++) { let assignment = assignments[a]
    if (assignment){

      // get video
      let videos = await rpoVideoList.findQuery({ lesson : assignment.lesson })
      let video = videos && videos.length > 0 ? videos[0] : null

      if (video) {
        if (false && video.youtubeIDtrad) {

          
          // create assignment and video for traditional
          console.log("found", video.youtubeIDtrad);

          let assignmentData = assignment
          delete assignmentData._id
          assignmentData.youtubeID = video.youtubeIDtrad
          assignmentData.type="traditional"

          let videoData = {
            lesson: assignmentData.lesson,
            youtubeID: assignmentData.youtubeID,
            assigned: true,
            type: 'traditional',
            assignedData: assignmentData.assignedData,
            lastCrawled: moment().format()
          }

          // replace simplified characters to traditional
          let items = [];
          if(assignmentData.items)
          for(let i=0; i < assignmentData.items.length; i++ ) { let item = assignmentData.items[i]
            // replace all simplified to traditional QUESTIONS
            for (let q=0; q < item.question.length; q++) {
              let lookup;

              if (hanzi.ifComponentExists(item.question[q]))
              lookup = hanzi.definitionLookup(item.question[q])

              if (lookup && lookup.length > 0) {
                let qChar = lookup[0].traditional
                item.question.replace(item.question[q], qChar)
              }

            }

            // replace all simplified to traditional ANSWER
            for (let a=0; a < item.answer.length; a++) {
              let lookup;

              if (hanzi.ifComponentExists(item.answer[a]))
              lookup = hanzi.definitionLookup(item.answer[a])

              if (lookup && lookup.length > 0) {
                let qChar = lookup[0].traditional
                item.answer.replace(item.answer[a], qChar)
              }

            }

            items.push(item)
          }

          assignmentData.items = items

          rpoAssignments.put(assignmentData)
          rpoVideos.put(videoData)

        } else {
          // updateAssignments and video *SET type simplified
          let vid = await rpoVideos.findQuery( { youtubeID: video.youtubeID, type: {$exists: false} } )
          if (vid && vid.length > 0) {
            console.log("update",vid[0].lesson, video._id);
            rpoVideos.update(vid[0]._id, {type: 'simplified'})

          }
        }
      }

    }
  }
  
}
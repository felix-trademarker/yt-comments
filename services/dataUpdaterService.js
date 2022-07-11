const nodemailer = require("nodemailer");

let rpoAccounts = require('../models/accounts');
let rpoVideos = require('../models/videos');
let rpoVideoList = require('../models/videoList');
let rpoAssignments = require('../models/assignments');
let rpoEmailNotifications = require('../models/emailNotification');
let rpoPostedFaq = require('../models/postedFaq');
let rpoMainProductions = require('../models/mainProductions');

var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')

let moment = require('moment')
let hanzi = require('hanzi')

exports.updateData = async function() {
  // fetch main productions
  let productions = await rpoMainProductions.get()

  console.log(productions);
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
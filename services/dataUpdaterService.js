const nodemailer = require("nodemailer");

let rpoAccounts = require('../models/accounts');
let rpoVideos = require('../models/videos');
let rpoVideoList = require('../models/videoList');
let rpoAssignments = require('../models/assignments');
let rpoEmailNotifications = require('../models/emailNotification');
let rpoPostedFaq = require('../models/postedFaq');
let rpoMainProductions = require('../models/mainProductions');
// let rpoMainProductions158 = require('../models/mainProductions158');

var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
let helpers = require('../helpers')

let moment = require('moment')
let hanzi = require('hanzi')

exports.updateData = async function() {
  // fetch main productions
  console.log("=== fetching production records ===")
  let productions = await rpoMainProductions.get()

  console.log(productions);
}

// ADD OR UPDATE ASSIGNMENT COLLECTION BASED ON MONGO158 PRODUCTIONS
exports.upsertAssignment = async function() {
  return;
  // fetch main productions
  let productions = await rpoMainProductions158.getProductions()

  // EXTRACT PRODUCTIONS
  if (productions && productions.length > 0)
  for (let p=0; p < productions.length; p++) {
    
    let production = productions[p]
    
    // EXTRACK ASSIGNMENTS
    if (production && production.assignments && production.assignments.length > 0)
    for (let a=0; a < production.assignments.length; a ++) {
      let assignment = production.assignments[a]


      let lessonId = assignment.jobType ? assignment.jobType.split("/")[1] : null

      let videoList = (await rpoVideoList.findQuery({lesson:lessonId}))[0]

      if (videoList) {

        // ALTERNATE ASSIGN TO MASTER PUPPET
             
        let masterPuppet = (await rpoAccounts.getMasterPuppet())[0]

        if (assignment.assignedData) {
          masterPuppet = await rpoAccounts.find(assignment.assignedData)
        } else {
          // update
          await rpoAccounts.update(masterPuppet._id, {lastCrawled:moment().format()})
        }

        let oldAssign = (await rpoAssignments.findQuery({ID:assignment.ID,youtubeID:assignment.youtubeID}))[0]
        // console.log(masterPuppet.emailAddress);
        // return;
        // INSERT START
        if(assignment.items && assignment.items.length && lessonId && assignment.ID){

          assignment.lesson = lessonId,
          assignment.youtubeID = videoList.youtubeID,
          assignment.assigned = true,
          assignment.type = 'simplified',
          assignment.assignedData = masterPuppet._id,
          assignment.lastCrawled = moment().format()
          assignment.updatedAt = moment().format()

          if (!oldAssign) {
            console.log("added new", assignment.ID);
            assignment.new = true
          } else {
            console.log("update old", assignment.ID);
          }

          rpoAssignments.upsert({ID:assignment.ID,youtubeID:assignment.youtubeID},assignment)

          let videoData = {
            lesson: lessonId,
            youtubeID: assignment.youtubeID,
            assigned: true,
            type: 'simplified',
            assignedData: masterPuppet._id,
            lastCrawled: moment().format()
          }

          rpoVideos.upsert({youtubeID: assignment.youtubeID},videoData)

          if (videoList && videoList.youtubeIDtrad) {

            let videoDataTrad = {
              lesson: lessonId,
              youtubeID: videoList ? videoList.youtubeIDtrad : null,
              assigned: true,
              type: 'traditional',
              assignedData: masterPuppet._id,
              lastCrawled: moment().format()
            }

            rpoVideos.upsert({youtubeID: videoDataTrad.youtubeID},videoDataTrad)

            let assignmentTrad = assignment

            // replace simplified characters to traditional
            let items = [];
            if(assignmentTrad.items)
            for(let i=0; i < assignmentTrad.items.length; i++ ) { let item = assignmentTrad.items[i]
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

            assignmentTrad.items = items

            assignmentTrad.lesson = lessonId,
            assignmentTrad.youtubeID = videoList ? videoList.youtubeIDtrad : null,
            assignmentTrad.assigned = true,
            assignmentTrad.type = 'traditional',
            assignmentTrad.assignedData = masterPuppet._id,
            assignmentTrad.lastCrawled = moment().format()

            rpoAssignments.upsert({ID:assignmentTrad.ID,youtubeID:assignmentTrad.youtubeID},assignmentTrad)
          }
        } 
      }
      // INSERT END
    } 
  }
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



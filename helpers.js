var fs = require('fs');
let moment = require('moment')
let rpoComments = require('./models/comments')

const ytcm = require("@freetube/yt-comment-scraper")


exports.getClientSecret = async function() {
    
    return new Promise(function(resolve, reject) {
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {

            if (err) reject(err)
            
            resolve(JSON.parse(content))
        });
    });

}

exports.getClientSecretv2 = async function() {
    
    return new Promise(function(resolve, reject) {
        fs.readFile('client_secretv2.json', function processClientSecrets(err, content) {

            if (err) reject(err)
            
            resolve(JSON.parse(content))
        });
    });

}

exports.getPuppetEnv = function() {
    
    let todaysDate = moment();
    let endOfLastMonth = moment().startOf('month').subtract(1, 'week');

    let weekOfMonth = todaysDate.diff(endOfLastMonth, 'weeks');
    // console.log(weekOfMonth % 2);

    return ((weekOfMonth % 2) === 1 ? process.env.puppet : (process.env.puppet2 ? process.env.puppet2 : process.env.puppet))

}

exports.getComments = async function(vidId) {

    let continuation = null;
    let arrComments = []
    const { google } = require('googleapis');
    let nextPageToken = '';
    do {

        // let payload = {
        //     videoId: vidId,
        //     continuation: continuation,
        // }

        const youtube = google.youtube({
            version: 'v3',
            auth: process.env.googleApi
          });

        const response = await youtube.commentThreads.list({
            part: 'snippet',
            videoId: vidId,
            maxResults: 100,
            pageToken: nextPageToken
        });
        // console.log(response);

        let comments = response.data.items.map(item => {
            console.log(item)
            const comment = item.snippet.topLevelComment.snippet;
            // return item.snippet.topLevelComment.snippet;

            

            let ytData = {
                text: comment.textOriginal,
                numReplies: item.snippet.totalReplyCount,
                vidId: vidId,
                commentId: item.snippet.topLevelComment.id
            }

            arrComments.push(ytData)
            // console.log(ytData)
            rpoComments.upsert({vidId: vidId,text: ytData.text }, ytData)
            
        });
      
        nextPageToken = response.data.nextPageToken;

    } while (nextPageToken);

    // console.log(arrComments);

    return arrComments;

}




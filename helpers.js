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

    do {

        let payload = {
            videoId: vidId,
            continuation: continuation,
        }
        
        let comments = await ytcm.getComments(payload).then((data) =>{
            // console.log(data.comments);
            return data;
        }).catch((error)=>{
            // console.log(error);
            return null;
        });

        if (comments) {
            // push to arr comments
            for(let i=0; i < comments.comments.length; i++) {
                let c = comments.comments[i]
                let ytData = {
                    text: c.text, 
                    numReplies: c.numReplies,
                    vidId: vidId
                }
                arrComments.push(ytData)

                await rpoComments.upsert({vidId: vidId,text: c.text }, ytData)
            }
            continuation = comments.continuation
        }
        console.log(arrComments);

    } while (continuation);

    // console.log(arrComments);

    return arrComments;

}




var fs = require('fs');
let moment = require('moment')

exports.getClientSecret = async function() {
    
    return new Promise(function(resolve, reject) {
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {

            if (err) reject(err)
            
            resolve(JSON.parse(content))
        });
    });

}

exports.getPuppetEnv = function() {
    
    let todaysDate = moment();
    let endOfLastMonth = moment().startOf('month').subtract(1, 'week');

    let weekOfMonth = todaysDate.diff(endOfLastMonth, 'weeks');
    console.log(weekOfMonth % 2);

    return ((weekOfMonth % 2) === 1 ? process.env.puppet : (process.env.puppet2 ? process.env.puppet2 : process.env.puppet))

}




var fs = require('fs');

exports.getClientSecret = async function() {
    
    return new Promise(function(resolve, reject) {
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {

            if (err) reject(err)
            
            resolve(JSON.parse(content))
        });
    });

}

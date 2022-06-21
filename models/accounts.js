let _table = process.env.TBLEXT + "accounts";
var Model = require('./_model')
var defaultModel = new Model(_table)
var moment = require('moment')
let helpers = require('./../helpers')


let conn = require('../config/DbConnect');
const app = require('../app');

module.exports = {

    // BASE FUNCTIONS LOCATED IN defaultModel
    get : async function() {
        return await defaultModel.get()
    },
    find : async function(id) {
        return await defaultModel.find(id)
	},
	findQuery : async function(query) {
        return await defaultModel.findQuery(query)
	},
	update : async function(id,data) {
        return await defaultModel.update(id,data)
    },
	put : async function(data) {
        return await defaultModel.put(data)
    },
    remove : async function(id) {
        return await defaultModel.remove(id)
    },

    // ADD CUSTOM FUNCTION BELOW ========================
    // ==================================================

    getPuppet : async function() {
		return new Promise(function(resolve, reject) {

            // console.log(moment().subtract("1", "day").format());
			// let query = {role: "commenter", lastCrawled : {$lte : moment().subtract("1", "day").format() }  }
			let query = {emailAddress: helpers.getPuppetEnv()}
			
            conn.getDb()
                .collection(_table)
                .find(query)
                .limit(1)
                .toArray(function(err, result) {
					
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }

			});

		});
    },

    getMasterPuppet : async function() {
		return new Promise(function(resolve, reject) {

            // console.log(moment().subtract("1", "day").format());
			// let query = {role: "commenter", lastCrawled : {$lte : moment().subtract("1", "day").format() }  }
			let query = {role: 'replyComment'}
			
            conn.getDb()
                .collection(_table)
                .find(query)
                .limit(1)
                .toArray(function(err, result) {
					
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }

			});

		});
    },

}
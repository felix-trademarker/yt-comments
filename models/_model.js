class Model{
    constructor(table){
        this.db = require('../config/DbConnect');
        this.table = table
    }

    get() {
        var this_ = this
        return new Promise(function(resolve, reject) {
            
            this_.db.getDb().collection(this_.table).find().toArray(function(err, result) {
					
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}

			});

        });
    }

    find(id) {
        var this_ = this
        let ObjectID = require('mongodb').ObjectID;
        return new Promise(function(resolve, reject) {
            
            let query = { _id: ObjectID(id) };
			
			this_.db.getDb().collection(this_.table).find(query).toArray(function(err, result) {
					
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}

			});

        });
    }

    findQuery(query) {
        var this_ = this
        let ObjectID = require('mongodb').ObjectID;
        return new Promise(function(resolve, reject) {
            
			
			this_.db.getDb().collection(this_.table).find(query).toArray(function(err, result) {
					
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}

			});

        });
    }

    update(id, data) {
        var this_ = this
        let ObjectID = require('mongodb').ObjectID;
        return new Promise(function(resolve, reject) { 

            let query = { _id: ObjectID(id) };

            this_.db.getDb().collection(this_.table).updateOne(query,{$set: data }, 
                function(err, result) {
                
                if (err) reject(err);
					
                resolve(result);
                
			});

		});
    }

    put(data) {
        var this_ = this
        return new Promise(function(resolve, reject) {
            
			this_.db.getDb().collection(this_.table).insertOne(data, 
				function(err, result) {
					if (err) reject(err);
					
					resolve(result);
				}
			);

        });
    }

    remove(id) {

        var this_ = this

		return new Promise(function(resolve, reject) {
            let ObjectID = require('mongodb').ObjectID;
			let query = { _id: ObjectID(id) };
            

			this_.db.getDb().collection(this_.table).deleteOne(query, function(err, result) {
				if (result) {
					console.log('ok');
					resolve(result)
				} else {
					console.log('err', err.message);
					reject(err);
				}
			});
		});

    }
}

module.exports = Model;
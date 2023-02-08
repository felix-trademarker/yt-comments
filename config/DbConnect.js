const MongoClient = require( 'mongodb' ).MongoClient;
const _variables = require( './variables' );

var _db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( process.env.MongoURL158 ,  _variables.mongoOptions, function( err, client ) {
      _db  = client.db('chinesepod');
      return callback( err );
    } );
  },

  getDb: function() {
    return _db;
  }

};
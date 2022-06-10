const MongoClient = require( 'mongodb' ).MongoClient;
const _variables = require( './variables' );

var _db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( _variables.mongoURL ,  _variables.mongoOptions, function( err, client ) {
      _db  = client.db(_variables.mongoDB);
      return callback( err );
    } );
  },

  getDb: function() {
    return _db;
  },

};
const MongoClient = require( 'mongodb' ).MongoClient;
const _variables = require( './variables' );

var _db, _db158;

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
  connectToServer158: function( callback ) {
    MongoClient.connect( process.env.MongoURL158 ,  _variables.mongoOptions, function( err, client ) {
      _db158  = client.db('chinesepod');
      return callback( err );
    } );
  },

  getDb158: function() {
    return _db158;
  }

};
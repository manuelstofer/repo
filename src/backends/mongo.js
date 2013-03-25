var mongodb = require("mongodb"),
    ObjectID = require('mongodb').ObjectID,
    map = require('mapr').map;

module.exports = function (options, callback) {

    var mongoserver = new mongodb.Server(
            options.server.host || 'localhost',
            options.server.port || mongodb.Connection.DEFAULT_PORT,
            options.server.options
        ),
        db_connector = new mongodb.Db(
            options.db.name,
            mongoserver,
            options.db.options
        ),
        collection,

        objectId = function (obj) {
            if (obj && obj._id) {
                obj._id = new ObjectID(obj._id);
            }
            return obj;
        },

        strObjectId = function (obj) {
            if (obj && obj._id) {
                obj._id = obj._id.toString();
            }
            return obj;
        };


    var api = {

        put: function (obj, fn) {
            var oldObj = {};
            if (obj._id) {
                objectId(obj);
                collection.find({_id: obj._id}).limit(1).toArray(function (err, docs) {
                    oldObj = docs[0];
                    var findErr = err || (docs.length != 1 ? 'error': null);

                    if (findErr) {
                        fn(findErr, {}, {});
                    } else {
                        collection.save(obj, {safe: true}, function (err) {
                            fn(err, strObjectId(obj), strObjectId(oldObj));
                        })
                    }
                });
            } else {
                collection.insert(obj, {safe: true}, function (err, docs) {
                    fn(err, strObjectId(docs[0]), strObjectId(oldObj));
                });
            }
        },

        get: function (_id, fn) {
            collection.find(objectId({_id: _id})).limit(1).toArray(function (err, docs) {
                fn(
                    err || (docs.length != 1? 'error' : null),
                    strObjectId(docs[0])
                );
            });
        },

        del: function (_id, fn) {
            collection.find(objectId({_id: _id})).limit(1).toArray(function (err, docs) {

                var findErr = err || (docs.length != 1 ? 'error': null),
                    oldObj = docs[0];

                if (findErr) {
                    fn(findErr, {});
                } else {
                    collection.remove(objectId({_id: _id}), true, function (err) {
                        fn(err || findErr, strObjectId(oldObj));
                    });
                }
            });
        },

        query: function (query, fn) {
            collection.find(query).toArray(function (err, docs) {
                fn(err, map(docs, strObjectId));
            });
        }
    };

    db_connector.open(function (error, client) {
        collection = new mongodb.Collection(client, options.collection);
        collection.remove({}, function () {
            callback(api);
        });
    });
};

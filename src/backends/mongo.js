'use strict';

var mongodb     = require("mongodb"),
    ObjectID    = mongodb.ObjectID,
    map         = require('mapr').map;

/**
 * Backend implementation for MongoDB
 *
 * @param options
 */
module.exports = function (options) {

    var collection = options.collection,

        /**
         * Converts to object id to MongoDB ObjectID
         *
         * @param obj {}
         */
        mongoId = function (obj) {
            if (obj && obj._id) {
                obj._id = new ObjectID(obj._id);
            }
            return obj;
        },

        /**
         * Converts the object id back to string
         *
         * @param obj {}
         */
        strId = function (obj) {
            if (obj && obj._id) {
                obj._id = obj._id.toString();
            }
            return obj;
        };


    /**
     * Implementation of the storage backend interface
     *
     * @type {{put: Function, get: Function, del: Function, query: Function}}
     */
    return {

        put: function (obj, fn) {
            var oldObj = {};
            mongoId(obj);

            if (obj._id) {
                collection.find({_id: obj._id}).limit(1).toArray(function (err, docs) {
                    oldObj = docs[0];
                    var findErr = err || (docs.length != 1 ? 'error': null);

                    if (findErr) {
                        fn(findErr, {}, {});
                    } else {
                        collection.save(obj, {safe: true}, function (err) {
                            fn(err, strId(obj), strId(oldObj));
                        })
                    }
                });
            } else {
                collection.insert(obj, {safe: true}, function (err, docs) {
                    fn(err, strId(docs[0]), strId(oldObj));
                });
            }
        },

        get: function (_id, fn) {
            collection.find(mongoId({_id: _id})).limit(1).toArray(function (err, docs) {
                fn(
                    err || (docs.length != 1? 'error' : null),
                    strId(docs[0])
                );
            });
        },

        del: function (_id, fn) {
            collection.find(mongoId({_id: _id})).limit(1).toArray(function (err, docs) {

                var findErr = err || (docs.length != 1 ? 'error': null),
                    oldObj = docs[0];

                if (findErr) {
                    fn(findErr, {});
                } else {
                    collection.remove(mongoId({_id: _id}), true, function (err) {
                        fn(err || findErr, strId(oldObj));
                    });
                }
            });
        },

        query: function (query, fn) {
            collection.find(query).toArray(function (err, docs) {
                fn(err, map(docs, strId));
            });
        }
    };
};

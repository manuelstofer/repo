'use strict';

var mongodb     = require("mongodb"),
    queue       = require('../util/queue'),
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

            var doPut = function (done) {
                var oldObj = {};
                mongoId(obj);

                if (obj._id) {
                    collection.find({_id: obj._id}).limit(1).toArray(function (err, docs) {
                        oldObj = docs[0];
                        var findErr = err || (docs.length != 1 ? 'error': null);

                        if (findErr) {
                            done();
                            fn(findErr, {}, {});
                        } else {
                            collection.save(obj, {safe: true}, function (err) {
                                done();
                                fn(err, strId(obj), strId(oldObj));
                            })
                        }
                    });
                } else {
                    collection.insert(obj, {safe: true}, function (err, docs) {
                        done();
                        fn(err, strId(docs[0]), strId(oldObj));
                    });
                }
            };

            if (obj._id) {
                queue(obj._id)(doPut)
            } else {
                doPut(function () {});
            }
        },

        get: function (_id, fn) {
            var doGet = function (done) {
                collection.find(mongoId({_id: _id})).limit(1).toArray(function (err, docs) {
                    done();
                    fn(
                        err || (docs.length != 1? 'error' : null),
                        strId(docs[0])
                    );
                });
            };
            queue(_id)(doGet);
        },

        del: function (_id, fn) {
            var doDel = function (done) {
                collection.find(mongoId({_id: _id})).limit(1).toArray(function (err, docs) {

                    var findErr = err || (docs.length != 1 ? 'error': null),
                        oldObj = docs[0];

                    if (findErr) {
                        done();
                        fn(findErr, {});
                    } else {
                        collection.remove(mongoId({_id: _id}), true, function (err) {
                            done();
                            fn(err || findErr, strId(oldObj));
                        });
                    }
                });
            };
            queue(_id)(doDel);
        },

        query: function (query, fn) {
            collection.find(query).toArray(function (err, docs) {
                fn(err, map(docs, strId));
            });
        }
    };
};

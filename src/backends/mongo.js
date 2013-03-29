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
        },

        /**
         * Makes db operations execute sequential for operations on the
         * same document
         *
         * -> only if options.sequential is true
         *
         * @see https://github.com/manuelstofer/repo/wiki/Concurrent-updates
         * @param fn db operation function
         */
        sequential = function (fn) {

            if (!options.sequential) {
                return fn;
            }

            return function (obj, callback) {
                var chanel = typeof obj === 'object' ? obj._id : obj,
                    add = queue(chanel);

                if (!chanel) {
                    fn.apply(null, arguments);
                } else {
                    add(function (done) {
                        fn(obj, function () {
                            done();
                            callback.apply(null, arguments);
                        });
                    });
                }
            }
        };

    /**
     * Implementation of the storage backend interface
     *
     * @type {{put: Function, get: Function, del: Function, query: Function}}
     */
    return {

        put: sequential(function (obj, fn) {

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
        }),

        get: sequential(function (_id, fn) {
            collection.find(mongoId({_id: _id})).limit(1).toArray(function (err, docs) {
                fn(
                    err || (docs.length != 1? 'error' : null),
                    strId(docs[0])
                );
            });
        }),

        del: sequential(function (_id, fn) {
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
        }),

        query: function (query, fn) {
            collection.find(query).toArray(function (err, docs) {
                fn(err, map(docs, strId));
            });
        }
    };
};

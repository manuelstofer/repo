'use strict';
var qry         = require('qry'),
    _           = require('underscore'),
    each        = require('foreach'),
    getQueryId  = require('./query-id');

module.exports = function storage (options) {

    var backend         = options.backend,

        // sockets subscribed to an object
        objectSubscriptions   = {},

        // sockets subscribed to a query
        querySubscriptions = {},
        queries = {};

    return {
        addClient: addClient
    };

    function addClient (socket) {

        var objectSubscriptionCount = {},
            querySubscriptionCount = {},

            subscribe = function (_id) {
                objectSubscriptionCount[_id] = (objectSubscriptionCount[_id] || 0) + 1;
                objectSubscriptions[_id] = objectSubscriptions[_id] || [];
                objectSubscriptions[_id].push(socket);
                objectSubscriptions[_id] = _.uniq(objectSubscriptions[_id]);
            },

            subscribeQuery = function (query) {
                var queryId = getQueryId(query);
                querySubscriptionCount[queryId] = (querySubscriptionCount[queryId] || 0) + 1;
                querySubscriptions[queryId] = querySubscriptions[queryId] || [];
                querySubscriptions[queryId].push(socket);
                querySubscriptions[queryId] = _.uniq(querySubscriptions[queryId]);
                queries[queryId] = qry(query);
            },

            notify = function (_id, notification) {
                each(objectSubscriptions[_id] || [], function (socket) {
                    socket.emit('notify', _id, notification);
                });
            },

            notifyQueries = function (oldObj, newObj) {
                oldObj = oldObj || {};
                newObj = newObj || {};
                each(queries, function (query, queryId) {
                    var oldMatch = query(oldObj),
                        newMatch = query(newObj);

                    if (oldMatch != newMatch) {
                        var event = !oldMatch ? 'match' : 'unmatch';
                        socket.emit('notify-query', queryId, {
                            event: event,
                            data: newObj
                        });
                    }
                });
            };

        socket.on('put', function (obj, fn) {
            var event = obj._id ? 'change' : 'create';
            backend.put(obj, function (err, newObj, oldObj) {
                var notification = {
                    event: err? 'error': event,
                    data: obj
                };
                if (fn) { fn(notification); }
                notify(obj._id, notification);
                notifyQueries(oldObj, newObj);
                subscribe(obj._id);
            });
        });

        socket.on('get', function (_id, fn) {
            subscribe(_id);
            backend.get(_id, function (err, obj) {
                var notification = {
                    event: err? 'error': 'get',
                    data: obj
                };
                if (fn) {
                    fn(notification);
                }
            });
        });


        socket.on('del', function (_id, fn) {
            backend.del(_id, function (err, oldObj) {
                var notification = {
                    event: err? 'error': 'del'
                };
                notify(_id, notification);
                notifyQueries(oldObj, null)
                if (fn) {
                    fn(notification);
                }
            });
        });

        socket.on('query', function (query, fn) {
            backend.query(query, function (err, objs) {
                var notification = {
                    event: err? 'error': 'query-result',
                    data: objs
                };
                each(_.pluck(objs, '_id'), subscribe);
                subscribeQuery(query);
                if (fn) {
                    fn(notification);
                }
            });
        });

        socket.on('unsub', function (_id) {
            if (--objectSubscriptionCount[_id] === 0) {
                objectSubscriptions[_id] = _.without(objectSubscriptions[_id], socket);
                if (objectSubscriptions[_id].length === 0) {
                    delete objectSubscriptions[_id];
                }
            }
        });

        socket.on('unsub-query', function (queryId) {
            if (--querySubscriptionCount[queryId] === 0) {
                querySubscriptions[queryId] = _.without(querySubscriptions[queryId], socket);
                if (querySubscriptions[queryId].length === 0) {
                    delete querySubscriptions[queryId];
                }
            }
        });
    }
};

'use strict';
var qry         = require('qry'),
    _           = require('underscore'),
    each        = require('foreach'),
    getQueryId  = require('./query-id');

module.exports = function storage (options) {

    var backend         = options.backend,

        // dictionary:  { id : [sockets] }
        subscriptions   = {},

        queries         = {};

    return {

        addClient: function (socket) {

            var subscriptionCount = {},

                subscribe = function (_id) {
                    subscriptionCount[_id] = (subscriptionCount[_id] || 0) + 1;
                    subscriptions[_id] = subscriptions[_id] || [];
                    subscriptions[_id].push(socket);
                    subscriptions[_id] = _.uniq(subscriptions[_id]);
                },

                subscribeQuery = function (query) {
                    var queryId = getQueryId(query);
                    subscribe(queryId);
                    queries[queryId] = qry(query);
                },

                notify = function (_id, notification) {
                    each(subscriptions[_id] || [], function (socket) {
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
                if (--subscriptionCount[_id] === 0) {
                    subscriptions[_id] = _.without(subscriptions[_id], socket);
                    if (subscriptions[_id].length === 0) {
                        delete subscriptions[_id];
                    }
                }
            });

            socket.on('unsub-query', function (queryId) {
                if (--subscriptionCount[queryId] === 0) {
                    subscriptions[queryId] = _.without(subscriptions[queryId], socket);
                    if (subscriptions[queryId].length === 0) {
                        delete subscriptions[queryId];
                        delete queries[queryId];
                    }
                }
            });
        }
    };
};

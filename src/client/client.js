'use strict';
var emitter = require('emitter'),
    each    = require('foreach'),
    map     = require('mapr').map,
    _       = require('underscore'),
    getQueryId = require('../query-id');

module.exports = function (options) {

    var em = emitter({}),

        socket = options.socket,

        addObjectNotificationCallback = function (_id, fn) {
            em.on(_id, fn);
        },

        addQueryNotificationCallback = function (queryId, fn) {
            em.on(queryId, fn);
        },

        createObjectCallback = function (_id, fn) {
            return function (notification) {
                var subFn;
                _id = _id || notification.data._id;

                var unsub = _.once(function () {
                    api.unsub(_id, subFn);
                });

                if (fn) {
                    subFn = fn(notification, unsub);
                    if (notification.event !== 'error' && typeof subFn === 'function') {
                        addObjectNotificationCallback(_id, subFn);
                    }
                }
                if (!subFn) {
                    unsub();
                }
            };
        },

        doAsync = function (fn) {
            return function () {
                var args = arguments;
                return setTimeout(function () {
                    fn.apply(null, args);
                }, 0);
            }
        },

        api = map({

            get: function (_id, fn) {
                socket.emit('get', _id, createObjectCallback(_id, fn));
            },

            put: function (obj, fn) {
                socket.emit('put', obj, createObjectCallback(obj._id, fn));
            },

            del: function (_id, fn) {
                socket.emit('del', _id, fn);
            },

            query: function (query, callback) {
                var queryId = getQueryId(query);

                socket.emit('query', query, function (notification) {

                    var isSubscribed = true,

                        unsubQuery = _.once(function () {
                            isSubscribed = false;
                            api.unsubQuery(query, handleQueryNotification);
                        }),

                        getNotificationObj = function (notificationObj) {
                            if (!notificationObj) return {};
                            if (typeof notificationObj == 'function') {
                                return {
                                    object: notificationObj
                                }
                            }
                            return notificationObj;
                        },

                        handleQueryNotification = function (notification) {
                            if (isSubscribed) {
                                if (_.contains(['match', 'unmatch'], notification.event)) {
                                    if (notificationObj.query) {
                                        notificationObj.query(notification);
                                    }
                                } else {
                                    if (notificationObj.object) {
                                        notificationObj.object(notification);
                                    }
                                }
                            }
                        },

                        notificationObj = getNotificationObj(callback(notification, unsubQuery));

                    if (notificationObj.query || notificationObj.object) {
                        addQueryNotificationCallback(queryId, handleQueryNotification);
                    } else {
                        unsubQuery();
                    }

                });
            },

            unsub: function (_id, fn, send) {
                if (typeof _id === 'undefined') { throw new Error('_id is not defined'); }
                if (fn) { em.off(_id, fn); }

                if (send !== false) {
                    socket.emit('unsub', _id);
                }
            },

            unsubQuery: function (query, fn, send) {
                var queryId = getQueryId(query);
                if (fn) {
                    em.off(queryId, fn);
                }
                if (send !== false) {
                    socket.emit('unsub-query', queryId);
                }
            }

        }, doAsync);

    socket.on('notify', function (_id, notification) {
        em.emit(_id, notification);
    });

    socket.on('notify-query', function (_id, notification) {
        em.emit(_id, notification);
    });

    return api;
};

'use strict';
var emitter = require('emitter'),
    each    = require('foreach'),
    map     = require('mapr').map,
    getQueryId = require('./query-id');

module.exports = function (options) {

    var em = emitter({}),
        socket = options.socket,

        addObjectNotificationCallback = function (_id, fn) {
            em.on(_id, fn);
        },

        addQueryNotificationCallback = function (query, fn) {
            var queryId = getQueryId(query);
            em.on(queryId, fn);
        },

        createObjectCallback = function (_id, fn) {
            return function (notification) {
                var subFn;
                _id = _id || notification.data._id;
                if (fn) {
                    subFn = fn(notification);
                    if (notification.action !== 'error' && typeof subFn === 'function') {
                        addObjectNotificationCallback(_id, subFn);
                    }
                }
                api.unsub(_id);
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

            query: function (query, fn) {
                socket.emit('query', query, function (notification) {
                    var objs = notification.data,

                        unsubQuery = function () {
                            each(objs, function (obj) {
                                api.unsub(obj._id, notificationObj.object);
                            });
                            api.unsubQuery(query, notificationObj.query);
                        },

                        getNotificationObj = function (notificationObj) {
                            if (!notificationObj) return {};
                            if (typeof notificationObj == 'function') {
                                return {
                                    object: notificationObj
                                }
                            }
                            return notificationObj;
                        },

                        notificationObj = getNotificationObj(fn(notification, unsubQuery));


                    each(objs, function (obj) {
                        if (notificationObj.object) {
                            addObjectNotificationCallback(obj._id, notificationObj.object);
                        } else {
                            api.unsub(obj._id);
                        }
                    });

                    if (notificationObj.query) {
                        addQueryNotificationCallback(query, notificationObj.query);
                    } else {
                        api.unsubQuery(getQueryId(query));
                    }

                });
            },

            unsub: function (_id, fn) {
                if (fn) { em.off(_id, fn); }
                socket.emit('unsub', _id);
            },

            unsubQuery: function (query, fn) {
                var queryId = getQueryId(query);
                if (fn) {
                    em.off(queryId, fn);
                }
                socket.emit('unsub-query', queryId);
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

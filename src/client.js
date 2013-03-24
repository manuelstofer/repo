'use strict';
var emitter = require('emitter'),
    each    = require('foreach'),
    map     = require('mapr').map,
    _       = require('underscore'),
    getQueryId = require('./query-id');

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
                if (fn) {
                    subFn = fn(notification);
                    if (notification.event !== 'error' && typeof subFn === 'function') {
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
                var queryId = getQueryId(query);

                socket.emit('query', query, function (notification) {

                    var objs = notification.data,

                        unsubQuery = function () {
                            each(objs, function (obj) {
                                api.unsub(obj._id, notificationObj.object);
                            });
                            api.unsubQuery(query, notificationObj.query);
                            api.unsubQuery(query, addRemoveObjects, false);
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

                        notificationObj = getNotificationObj(fn(notification, unsubQuery)),

                        addRemoveObjects = function (notification) {

                            if (notification.event === 'match') {
                                addObjectNotificationCallback(notification.data._id, notificationObj.object);
                                objs.push(notification.data);
                            }

                            if (notification.event === 'unmatch') {
                                api.unsub(notification.data._id, notificationObj.object);
                                objs = _.filter(objs, function (obj) {
                                    return obj._id !== notification.data._id;
                                });
                            }
                        };


                    each(objs, function (obj) {
                        if (notificationObj.object) {
                            addObjectNotificationCallback(obj._id, notificationObj.object);
                        } else {
                            api.unsub(obj._id);
                        }
                    });

                    if (notificationObj.query) {
                        addQueryNotificationCallback(queryId, addRemoveObjects);
                        addQueryNotificationCallback(queryId, notificationObj.query);
                    } else {
                        api.unsubQuery(queryId);
                    }

                });
            },

            unsub: function (_id, fn) {
                if (fn) { em.off(_id, fn); }
                socket.emit('unsub', _id);
            },

            unsubQuery: function (query, fn, send) {
                var queryId = getQueryId(query);
                if (fn) {
                    em.off(queryId, fn);
                }
                if (send !== false) socket.emit('unsub-query', queryId);
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

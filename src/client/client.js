'use strict';
var emitter = require('emitter'),
    each    = require('foreach'),
    map     = require('mapr').map,
    _       = require('underscore'),
    getQueryId = require('../query-id');

module.exports = function (options) {

    var em = emitter({}),

        socket = options.socket,

        doAsync = function (fn) {
            return function () {
                var args = arguments;
                return setTimeout(function () {
                    fn.apply(null, args);
                }, 0);
            }
        },

        unsubscribe = doAsync(function (_id, fn, send) {
            if (typeof _id === 'undefined') { throw new Error('_id is not defined'); }
            if (fn) { em.off(_id, fn); }

            if (send !== false) {
                socket.emit('unsub', _id);
            }
        }),

        createObjectCallback = function (_id, fn) {
            return function (notification) {
                var subFn;
                _id = _id || notification.data._id;

                var isSubscribed = true,
                    unsub = _.once(function () {
                        isSubscribed = false;
                        unsubscribe(_id, handleChanges);
                    }),
                    handleChanges = function (notification) {
                        subFn(notification);
                    };

                if (fn) {
                    subFn = fn(notification, unsub);
                    if (notification.event !== 'error' && typeof subFn === 'function') {
                        em.on(_id, handleChanges);
                    }
                }
                if (!subFn) {
                    unsub();
                }
            };
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

                        unsub = _.once(function () {
                            isSubscribed = false;
                            unsubscribe(queryId, handleQueryNotification);
                        }),

                        handleQueryNotification = function (notification) {
                            if (isSubscribed) {
                                if (typeof notificationObj === 'function') {
                                    notificationObj(notification);
                                } else {
                                    var handler = notificationObj[notification.event];
                                    if (handler) {
                                        handler(notification);
                                    }
                                }
                            }
                        },

                        notificationObj = callback(notification, unsub);

                    if (notificationObj) {
                        em.on(queryId, handleQueryNotification)
                    } else {
                        unsub();
                    }

                });
            }
        }, doAsync);

    socket.on('notify', function (_id, notification) {
        em.emit(_id, notification);
    });

    return api;
};

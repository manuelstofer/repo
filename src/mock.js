'use strict';

var each = require('foreach');

module.exports =  function (options) {

    var autoInc = 0,
        callbackFns = {},
        data = options.data;

    var addCallback = function (_id, callback) {
        if (callback) {
            if (typeof callbackFns[_id] === 'undefined') {
                callbackFns[_id] = [];
            }
            callbackFns[_id] = [];
            callbackFns[_id].push(callback);
        }
    };

    var notify = function (_id, notification) {
        var callbacks = callbackFns[_id];
        if (callbacks) {
            each(callbacks, function (callback) {
                callback(notification);
            });
        }
    };

    return {
        get: function (_id, fn) {
            setTimeout(function () {
                var action = typeof data[_id] !== 'undefined' ? 'change' : 'error';
                var callback = fn({
                    id:     _id,
                    action: action,
                    data:   data[_id]
                });
                addCallback(_id, callback);
            });
        },

        put: function (obj, fn) {
            setTimeout(function () {
                var action = typeof obj._id !== 'undefined' ? 'change': 'create',
                    callback;
                obj._id = obj._id || ++autoInc;
                data[obj._id] = obj;
                if (fn) {
                    callback = fn({
                        action: action,
                        data: obj
                    });
                }
                notify(obj._id, {action: 'change', data: obj});
                if (callback) {
                    addCallback(obj._id, callback);
                }
            }, 0);
        },

        del: function (_id, fn) {
            setTimeout(function () {
                var action = typeof data[_id] !== 'undefined' ? 'del': 'error';
                delete data[_id];
                var notification = {
                    action: action
                };

                if (fn) {
                    fn(notification);
                }
                notify(_id, notification);
            });
        }
    };
};

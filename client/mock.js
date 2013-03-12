'use strict';

module.exports =  function (options) {

    var autoInc = 0,
        callbackFns = {},
        data = options.data;

    var addCallback = function (id, callback) {
        if (callback) {
            if (typeof callbackFns[id] === 'undefined') {
                callbackFns[id] = [];
            }
            callbackFns[id] = [];
            callbackFns[id].push(callback);
        }
    };

    var notify = function (notification) {
        var id = notification.id;
        var callbacks = callbackFns[id];
        if (callbacks) {
            callbacks.forEach(function (callback) {
                callback(notification);
            });
        }
    };

    return {
        get: function (id, fn) {
            setTimeout(function () {
                var action = typeof data[id] !== 'undefined' ? 'change' : 'error';
                var callback = fn({
                    id:     id,
                    action: action,
                    data:   data[id]
                });
                addCallback(id, callback);
            });
        },

        put: function (obj, fn) {
            setTimeout(function () {
                var action = typeof obj.id !== 'undefined' ? 'change': 'create',
                    callback;
                obj.id = obj.id || ++autoInc;
                data[obj.id] = obj;
                if (fn) {
                    callback = fn({
                        id: obj.id,
                        action: action,
                        data: obj
                    });
                }
                notify({action: 'change', id: obj.id, data: obj});
                addCallback(obj.id, callback);
            }, 0);
        },

        del: function (id, fn) {
            setTimeout(function () {
                var action = typeof data[id] !== 'undefined' ? 'del': 'error';
                delete data[id];
                var notification = {
                    action: action,
                    id: id
                };

                if (fn) {
                    fn(notification);
                }
                notify(notification);
            });
        }
    };
};

'use strict';

module.exports = function (options) {
    var objs = {},
        id = 0;

    return {
        put: function (obj, fn) {
            if (!obj.id) {
                obj.id = ++id;
            }
            objs[obj.id] = obj;
            fn(null, obj);
        },

        get: function (id, fn) {
            var err = typeof objs[id] !== 'undefined' ? null: 'error';
            fn(err, objs[id]);
        },

        del: function (id, fn) {
            var err = typeof objs[id] !== 'undefined' ? null: 'error';
            delete objs[id];
            fn(err);
        }
    };
};


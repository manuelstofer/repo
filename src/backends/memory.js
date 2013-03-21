'use strict';

module.exports = function (options) {
    var objs = {},
        autoIncId = 0;

    function autoInc () {
       while(typeof objs[++autoIncId] !== 'undefined');
       return autoIncId;
    }

    return {

        put: function (obj, fn) {
            if (!obj._id) {
                obj._id = autoInc();
            }
            objs[obj._id] = obj;
            fn(null, obj);
        },

        get: function (_id, fn) {
            var err = typeof objs[_id] !== 'undefined' ? null: 'error';
            fn(err, objs[_id]);
        },

        del: function (_id, fn) {
            var err = typeof objs[_id] !== 'undefined' ? null: 'error';
            delete objs[_id];
            fn(err);
        }
    };
};


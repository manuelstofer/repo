'use strict';

var qry = require('qry');

module.exports = function (options) {
    var objs = {},
        autoIncId = 0;

    function autoInc () {
       while(typeof objs[++autoIncId] !== 'undefined');
       return autoIncId;
    }

    function getObjData (obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    return {

        put: function (obj, fn) {
            var oldObj = {};
            if (!obj._id) {
                obj._id = autoInc();
            } else {
                oldObj = objs[obj._id];
            }
            objs[obj._id] = getObjData(obj);
            fn(null, obj, oldObj);
        },

        get: function (_id, fn) {
            var err = typeof objs[_id] !== 'undefined' ? null: 'error';
            fn(err, objs[_id]);
        },

        del: function (_id, fn) {
            var err = typeof objs[_id] !== 'undefined' ? null: 'error';
            var oldObj = objs[_id];
            delete objs[_id];
            fn(err, oldObj);
        },

        query: function (query, fn) {
            var match = qry(query);
            fn(null, values(objs).filter(match));
        }
    };
};

function values (obj) {
    var vals = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            vals.push(obj[key]);
        }
    }
    return vals;
}

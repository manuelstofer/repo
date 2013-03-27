'use strict';

var qry = require('qry'),
    _   = require('underscore');

/**
 * In-memory implementation of the storage backend interface
 * - for development and mocks
 *
 * @param options
 * @returns {{put: Function, get: Function, del: Function, query: Function}}
 */
module.exports = function (options) {
    options = options || {};

    var objs = options.data || {},
        autoIncId = 0;

    /**
     * Returns an incrementing number
     *
     * @returns {number}
     */
    function autoInc () {
       while(typeof objs[++autoIncId] !== 'undefined');
       return autoIncId;
    }

    /**
     * Creates a deep cloned object, ensures only JSON compatible
     * data is stored
     *
     * @param obj
     * @returns {*}
     */
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
            fn(null, _.filter(_.values(objs), match));
        }
    };
};


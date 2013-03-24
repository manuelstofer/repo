'use strict';
var qry         = require('qry'),
    _           = require('underscore'),
    each        = require('foreach'),
    getQueryId  = require('./query-id');

/**
 * Creates a storage for a backend specified by options.backend
 *
 * - The storage should be accessed with a client
 * - Emulates MongoDB queries with qry to provide real-time queries
 *
 * @param options
 * @returns {{addClient: Function}}
 */
module.exports = function storage (options) {

    var backend         = options.backend,

        /**
         * Dictionary: { id : [sockets] }
         */
        subscriptions   = {},

        /**
         * Dictionary: { query id : query match function }
         */
        queries         = {};


    return {

        /**
         * Add a client
         *
         * - A client is represented as a event emitter, for example a socket.io socket
         *
         * - The storage does not rely on socket.io specific features, which makes it
         *   possible to use the storage for a client side mock.
         *
         * - The storage listens to following events of a client:
         *
         *      put (object, callback)
         *      get (_id, callback)
         *      del (_id, callback)
         *      query (query, callback)
         *      unsub (_id)
         *      unsub-query (id)
         *
         * - Subscriptions are added implicit on the get, put, query event.
         *   The client MUST cancel subscriptions manually using the unsub and unsub-query event.
         *
         * - The storage keeps a subscription count to release subscriptions as soon as their count reaches zero.
         *   All notifications are sent only once to each client. Even if a client has multiple subscriptions to
         *   the same object / query.
         *
         * - The storage sends direct results of events back using the callback methods.
         *   Changes on subscribed objects and on query results are sent as notifications.
         *
         * - Notifications:
         *
         *      Are transmitted with the 'notify' and 'notify-query' event.
         *
         *      Structure:
         *      {
         *          event:  'create' | 'change' | 'del' | 'query-result' | 'match' | 'unmatch' | 'error'
         *          data:   the payload data (object or query result) | undefined
         *      }
         *
         *      Notification events for objects:
         *
         *          'create':       A Object was created
         *          'change':       A Object updated
         *          'del':          A Object was deleted
         *
         *      Notification events for queries:
         *
         *          'query-result': The results for a query
         *          'match':        A new object matches a subscribed query
         *          'unmatch':      A object in a query result does not match the query anymore
         *
         *
         * @param client
         */
        addClient: function (client) {

            var subscriptionCount = {},

                /**
                 * Subscribe to a id
                 *
                 * @param _id (object|query id)
                 */
                subscribe = function (_id) {
                    subscriptionCount[_id] = (subscriptionCount[_id] || 0) + 1;
                    subscriptions[_id] = subscriptions[_id] || [];
                    subscriptions[_id].push(client);
                    subscriptions[_id] = _.uniq(subscriptions[_id]);
                },

                /**
                 * Unsubscribe from a id
                 *
                 * @param _id (object|query id)
                 */
                unsubscribe = function (_id) {
                    subscriptionCount[_id] = Math.max(--subscriptionCount[_id], 0);
                    if (subscriptionCount[_id] === 0) {

                        subscriptions[_id] = _.filter(subscriptions[_id], function (c) {
                            return c !== client;
                        });

                        delete subscriptionCount[_id];

                        if (subscriptions[_id].length === 0) {
                            delete subscriptions[_id];
                            delete queries[_id];
                        }
                    }
                },

                /**
                 * Subscribe to a query
                 *
                 * @param query MongoDB query object
                 */
                subscribeQuery = function (query) {
                    var queryId = getQueryId(query);
                    subscribe(queryId);
                    queries[queryId] = qry(query);
                },

                /**
                 * Send a notification for a object
                 *
                 * @param event 'notify' | 'notify-query'
                 * @param _id the object id
                 * @param notification the notification
                 */
                notify = function (event, _id, notification) {
                    each(subscriptions[_id] || [], function (socket) {
                        client.emit(event, _id, notification);
                    });
                },

                /**
                 * Sends 'match' | 'unmatch' notifications
                 *
                 * @param oldObj    Object state before changes
                 * @param newObj    Object state after changes
                 */
                notifyQueries = function (oldObj, newObj) {
                    oldObj = oldObj || {};
                    newObj = newObj || {};

                    var _id = newObj._id || oldObj._id;

                    each(queries, function (query, queryId) {
                        var oldMatch = query(oldObj),
                            newMatch = query(newObj);

                        if (oldMatch != newMatch) {
                            var event = !oldMatch ? 'match' : 'unmatch',
                                notification = {
                                    event: event,
                                    data: newObj,
                                    _id: _id
                                };

                            notify('notify-query', queryId, notification);

                            if (event === 'match') {
                                subscribe(newObj._id);
                            }
                        }
                    });
                };

            /**
             * Handles the 'put' event
             */
            client.on('put', function (obj, callback) {
                var event = obj._id ? 'change' : 'create';
                backend.put(obj, function (err, newObj, oldObj) {

                    var _id = newObj._id || oldObj._id;

                    var notification = {
                        event: err? 'error': event,
                        data: obj
                    };

                    if (callback) { callback(notification); }

                    // notifies object subscriptions
                    notify('notify', _id, notification);

                    // notifies query subscriptions
                    notifyQueries(oldObj, newObj);

                    // subscribe to further changes to the object
                    subscribe(obj._id);
                });
            });

            /**
             * Handles the 'get' event
             */
            client.on('get', function (_id, callback) {

                // subscribe to further changes to the object
                subscribe(_id);

                backend.get(_id, function (err, obj) {
                    var notification = {
                        event: err? 'error': 'get',
                        data: obj
                    };
                    if (callback) { callback(notification); }
                });
            });

            /**
             * Handles the 'del' event
             */
            client.on('del', function (_id, callback) {
                backend.del(_id, function (err, oldObj) {
                    var notification = {
                        event: err? 'error': 'del'
                    };

                    if (callback) { callback(notification); }

                    // notify object subscriptions
                    notify('notify', _id, notification);

                    // notify query subscriptions
                    notifyQueries(oldObj, null)
                });
            });

            /**
             * Handles the 'query' event
             */
            client.on('query', function (query, callback) {
                backend.query(query, function (err, objs) {

                    var notification = {
                        event: err? 'error': 'query-result',
                        data: objs
                    };

                    if (callback) { callback(notification); }

                    // subscribes to all objects in the result set
                    each(_.pluck(objs, '_id'), subscribe);

                    // subscribes to the query
                    subscribeQuery(query);
                });
            });

            /**
             * Handles the 'unsub' event
             */
            client.on('unsub', unsubscribe);

            /**
             * Handles the 'unsub-query' event
             */
            client.on('unsub-query', unsubscribe);

            /**
             * Handles the 'disconnect event
             */
            client.on('disconnect', function () {

                if (options.debug) {
                    console.log({
                        subscriptions: subscriptions,
                        queries: queries,
                        subscriptionCount: subscriptionCount
                    });
                }
            });
        }
    };
};

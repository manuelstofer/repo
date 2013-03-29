'use strict';

module.exports = queue;

var queues = {};

/**
 * Creates a queue to execute asynchronous functions sequential
 * in concurrent chanels
 *
 * @param chanel
 * @returns {Function} add
 */
function queue (chanel) {

    /**
     * Deletes the queue
     */
    function end () {
        delete queues[chanel];
    }

    /**
     * Execute the next function in the queue
     *
     * @returns {boolean} Returns false if the queue is empty
     */
    function next () {
        var queue = queues[chanel],
            fn = queue[0];

        fn && fn(function () {
            queue.shift();
            next() || end();
        });

        return queue.length;
    }

    /**
     * Add a function to the queue
     * - fn is called with function `done` as argument.
     * - `done` should be called when its done
     *
     * @param fn
     */
    function add (fn) {
        (queues[chanel] = queues[chanel] || []).push(fn);
        queues[chanel].length === 1 && next();
    }

    return add;
}


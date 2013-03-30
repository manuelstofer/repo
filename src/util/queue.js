'use strict';

module.exports = queue;

var queues = {};

/**
 * Creates a queue to execute asynchronous functions sequential
 * in concurrent channels
 *
 * @param channel
 * @returns {Function} add
 */
function queue (channel) {

    /**
     * Deletes the queue
     */
    function end () {
        delete queues[channel];
    }

    /**
     * Execute the next function in the queue
     *
     * @returns {boolean} Returns false if the queue is empty
     */
    function next () {
        var queue = queues[channel],
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
        (queues[channel] = queues[channel] || []).push(fn);
        queues[channel].length === 1 && next();
    }

    return add;
}


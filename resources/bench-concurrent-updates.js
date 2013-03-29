'use strict';
var _           = require('underscore'),
    util        = require('util'),
    mongodb     = require('mongodb'),
    mongoServer = new mongodb.Server('localhost', mongodb.Connection.DEFAULT_PORT),
    connector   = new mongodb.Db(
        'test',
        mongoServer,
        {
            safe: true
        }
    );

connector.open(function (error, client) {
    var collection = new mongodb.Collection(client, 'test');
    collection.remove({}, function () {
        collection.insert({test: 'bla'}, {safe: true}, function (err, docs) {
            bench(collection, docs[0]);
        })
    });
});

function bench (collection, doc) {
    var concurrent          = 180,
        nDocs               = 30000,
        count               = 0,
        maxCount            = 0,

        status = {
            error: 0,
            ordered: 0,
            unordered: 0,
            total: 0
        },

        start = (new Date).getTime(),

        doUpdate = function () {

            var myCount = ++count;

            doc.test = Math.random();

            collection.save(doc, {safe: true}, function (err) {

                var end = (new Date).getTime(),
                    time = end - start;

                status.total++;
                if (err) {
                    status.error++;
                } else {
                    if (maxCount != myCount - 1) {
                        status.unordered++;
                    } else {
                        status.ordered++;
                    }
                }
                maxCount = Math.max(myCount, maxCount);

                if (status.total >= nDocs) {

                    console.log(util.inspect({
                        updates:                status.total,
                        concurrent:             concurrent,
                        updatesPerSecond:       status.total / time * 1000,
                        ordered:                status.ordered / status.total * 100 + '%',
                        unordered:              status.unordered / status.total * 100 + '%',
                        error:                  status.error / status.total * 100 + '%'
                    }, false, 1, true));

                    process.exit();
                } else {
                    doUpdate();
                }
            });
        }

    _.each(_.range(concurrent), doUpdate);
}

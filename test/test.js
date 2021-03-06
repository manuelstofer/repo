'use strict';

var storage = require('repo'),
    mock    = storage.mock(),
    client  = storage.client({
        socket: io.connect('http://localhost:2014')
    });

describeInterface('mock', mock);
describeInterface('client', client);


describe('mock', function () {
    it('should be possible to add initial documents to mock', function (done) {

        var mock = storage.mock({
            docs: {
                "10" : {
                    example: 'expected'
                }
            }
        });

        mock.get('10', function (notification) {
            notification.doc._id.should.equal('10');
            notification.doc.example.should.equal('expected');
            done();
        });
    });
});

function describeInterface(name, client) {
    describe(name, function () {

        describe('create object', function () {

            it('should get `create` notifications', function (done) {
                client.put({example: 'expected'}, function (notification) {
                    notification.event.should.equal('create');
                    notification.doc.example.should.equal('expected');
                    notification.doc._id.should.not.be.undefined;
                    removeDocuments([notification.doc], done);
                });
            });

            it('should get `change` notifications', function (done) {
                client.put({example: 'expected'}, function (notification, unsub) {
                    var obj = notification.doc;
                    obj.example = 'changed';

                    client.put(obj);

                    return function (notification) {
                        notification.event.should.equal('change');
                        notification.doc.example.should.equal('changed');
                        unsub();
                        removeDocuments([obj], done);
                    };
                });
            });

            it('should get `del` notifications', function (done) {
                client.put({example: 'expected'}, function (notification, unsub) {
                    var obj = notification.doc;
                    client.del(obj._id);

                    return {
                        del: function (notification) {
                            notification.event.should.equal('del');
                            unsub();
                            done();
                        }
                    }
                });
            });
        });

        describe('change object', function () {

            it('should get `change` notifications', function (done) {
                client.put({example: 'expected'}, function (notification) {
                    var obj = notification.doc;
                    obj.example = 'changed';
                    client.put(obj, function (notification) {
                        notification.event.should.equal('change');
                        notification.doc.example.should.equal('changed');
                        notification.doc._id.should.not.be.undefined;
                        removeDocuments([obj], done);
                    });
                });
            });
        });

        describe('get object', function () {

            it('should get `error` notification getting a non existent object', function (done) {
                client.get('non-existent', function (notification) {
                    notification.event.should.equal('error');
                    done();
                });
            });
        });

        describe('delete object', function () {

            it('should get `error` notification deleting a non existent object', function (done) {
                client.del('non-existent', function (notification) {
                    notification.event.should.equal('error');
                    done();
                });
            });
        });

        describe('query', function () {

            it('should return correct results', function (done) {
                var obj1 = {tag: 'hello'},
                    obj2 = {tag: 'hello'},
                    obj3 = {tag: 'bla'};

                createDocuments([obj1, obj2, obj3], function (objs) {

                    client.query({tag: 'hello'}, function (notification) {
                        notification.event.should.equal('query-result');
                        notification.docs.length.should.equal(2);
                        notification.docs[0].tag.should.equal('hello');
                        notification.docs[1].tag.should.equal('hello');

                        removeDocuments(objs, done);
                    });
                });
            });

            it('should receive `unmatch` notification when object from result set is deleted', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function () {

                    client.query({tag: 'hello'}, function (notification, unsub) {
                        var obj = notification.docs[0];
                        client.del(obj._id);
                        return function (notification) {
                            unsub();
                            notification.event.should.equal('unmatch');
                            done();
                        }
                    });
                });
            });

            it('should receive `change` notifications for objects in result set', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function (objs) {

                    client.query({tag: 'hello'}, function (notification, unsub) {
                        var obj = notification.docs[0];
                        obj.example = 'hello';
                        client.put(obj);

                        return {
                            change: function (notification) {
                                unsub();
                                notification.event.should.equal('change');
                                removeDocuments(objs, done);
                            }
                        };
                    });
                });
            });

            it('should receive `match` notification when new object matches the query', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {
                        var add = {bla: 'bla', tag: 'hello'};
                        client.put(add);

                        return {
                            match: function (notification) {
                                notification.event.should.equal('match');
                                notification.doc.bla.should.equal('bla');
                                notification.doc.tag.should.equal('hello');
                                unsub();
                                objs.push(notification.doc);
                                removeDocuments(objs, done);
                            }
                        };
                    });
                });
            });

            it('should receive `unmatch` notification when an object does not match the query anymore', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function (objs) {
                    var query = {tag: 'hello'},
                        obj = objs[0];

                    client.query(query, function (notification, unsub) {
                        obj.tag = 'changed';
                        client.put(obj);
                        return function (notification) {
                            notification.event.should.equal('unmatch');
                            notification.doc.tag.should.equal('changed');
                            unsub();
                            removeDocuments(objs, done);
                        };
                    });
                });
            });

            it('should receive `change` notifications for new objects matching a query', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {

                        var add = {tag: 'hello', title: 'bla'},
                            change;

                        client.put(add, function (notification) {
                            change = notification.doc;
                            change.title = 'changed';
                            client.put(change);
                        });

                        return {
                            change: function (notification) {
                                notification.event.should.equal('change');
                                notification.doc.title.should.equal('changed');
                                unsub();

                                objs.push(change);
                                removeDocuments(objs, done);
                            }
                        };
                    });
                });
            });

            it('should receive `unmatch` notifications for objects added to result set and removed again', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {

                        var add = {tag: 'hello', title: 'bla'};

                        client.put(add, function (notification) {
                            client.del(notification.doc._id);
                        });

                        return {
                            unmatch: function (notification) {
                                notification.event.should.equal('unmatch');
                                unsub();

                                removeDocuments(objs, done);
                            }
                        };
                    });
                });
            });

            it('should not receive notifications when unsubscribed', function (done) {
                var obj1 = {tag: 'hello'};

                createDocuments([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {
                        var change = notification.docs[0];
                        change.tag = 'no-match';
                        unsub();

                        client.put(change, function () {
                            removeDocuments(objs, done);
                        });

                        return function () {
                             done();
                        };
                    });
                });
            });
        });
    });

    function createDocuments(objs, fn) {
        var i = 0,
            insertedObjs = [];
        objs.forEach(function (obj, index) {
            client.put(obj, function (notification) {
                insertedObjs[index] = notification.doc;
                if (++i === objs.length) {
                    fn(insertedObjs);
                }
            });
        });
    }

    function removeDocuments(objs, fn) {
        var n = objs.length;
        objs.forEach(function (obj) {
            client.del(obj._id, function () {
                if (--n == 0) {
                    fn();
                }
            });
        });
    }
}


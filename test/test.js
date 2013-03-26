/*global describe, it, io*/

    'use strict';

var storage = require('repo'),
    mock = storage.mock(),
    client = storage.client({socket: io.connect('http://localhost:2014')});

describeInterface('mock', mock);
describeInterface('client', client);


describe('mock', function () {
    it('should be possible to add initial data to mock', function (done) {

        var mock = storage.mock({
            data: {
                "10" : {
                    _id: "10",
                    example: 'expected'
                }
            }
        });

        mock.get('10', function (notification) {
            notification.data._id.should.equal('10');
            notification.data.example.should.equal('expected');
            done();
        });
    });
});

function describeInterface(name, client) {
    describe(name, function () {

        describe('create object', function () {

            it('should get a "create" notification', function (done) {
                client.put({example: 'expected'}, function (notification) {
                    notification.event.should.equal('create');
                    notification.data.example.should.equal('expected');
                    notification.data._id.should.not.be.undefined;
                    removeData([notification.data], done);
                });
            });

            it('should get "change" on the returned callback', function (done) {

                client.put({example: 'expected'}, function (notification, unsub) {
                    var obj = notification.data;
                    obj.example = 'changed';

                    client.put(obj);

                    return function (notification) {
                        notification.event.should.equal('change');
                        notification.data.example.should.equal('changed');
                        unsub();
                        removeData([obj], done);
                    };
                });
            });

            it('should get "del" on the returned callback', function (done) {
                client.put({example: 'expected'}, function (notification, unsub) {
                    var obj = notification.data;
                    client.del(obj._id);
                    return function (notification) {
                        notification.event.should.equal('del');
                        unsub();
                        done();
                    };
                });
            });
        });

        describe('change object', function () {

            it('should get a "change" notification', function (done) {
                client.put({example: 'expected'}, function (notification) {
                    var obj = notification.data;
                    obj.example = 'changed';
                    client.put(obj, function (notification) {
                        notification.event.should.equal('change');
                        notification.data.example.should.equal('changed');
                        notification.data._id.should.not.be.undefined;
                        removeData([obj], done);
                    });
                });
            });
        });

        describe('get object', function () {

            it('should get "error" notification getting a non existent object', function (done) {

                client.get('non-existent', function (notification) {
                    notification.event.should.equal('error');
                    done();
                });
            });
        });

        describe('delete object', function () {

            it('should get "error" notification deleting a non existent object', function (done) {
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

                createData([obj1, obj2, obj3], function (objs) {

                    client.query({tag: 'hello'}, function (notification) {
                        notification.event.should.equal('query-result');
                        notification.data.length.should.equal(2);
                        notification.data[0].tag.should.equal('hello');
                        notification.data[1].tag.should.equal('hello');

                        removeData(objs, done);
                    });
                });
            });

            it('should receive `unmatch` notification when object from result set is deleted', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function () {

                    client.query({tag: 'hello'}, function (notification, unsub) {
                        var obj = notification.data[0];
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

                createData([obj1], function (objs) {

                    client.query({tag: 'hello'}, function (notification, unsub) {
                        var obj = notification.data[0];
                        obj.example = 'hello';
                        client.put(obj);

                        return {
                            change: function (notification) {
                                unsub();
                                notification.event.should.equal('change');
                                removeData(objs, done);
                            }
                        };
                    });
                });
            });

            it('should receive `match` notification when new object matches the query', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {
                        var add = {bla: 'bla', tag: 'hello'};
                        client.put(add);

                        return {
                            match: function (notification) {
                                notification.event.should.equal('match');
                                notification.data.bla.should.equal('bla');
                                notification.data.tag.should.equal('hello');
                                unsub();
                                objs.push(notification.data);
                                removeData(objs, done);
                            }
                        };
                    });
                });
            });

            it('should receive `unmatch` notification when an object does not match the query anymore', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function (objs) {
                    var query = {tag: 'hello'},
                        obj = objs[0];

                    client.query(query, function (notification, unsub) {
                        obj.tag = 'changed';
                        client.put(obj);
                        return function (notification) {
                            notification.event.should.equal('unmatch');
                            notification.data.tag.should.equal('changed');
                            unsub();
                            removeData(objs, done);
                        };
                    });
                });
            });

            it('should receive `change` notifications for new objects matching a query', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {

                        var add = {tag: 'hello', title: 'bla'},
                            change;

                        client.put(add, function (notification) {
                            change = notification.data;
                            change.title = 'changed';
                            client.put(change);
                        });

                        return {
                            change: function (notification) {
                                notification.event.should.equal('change');
                                notification.data.title.should.equal('changed');
                                unsub();

                                objs.push(change);
                                removeData(objs, done);
                            }
                        };
                    });
                });
            });

            it('should receive `unmatch` notifications for objects added to result set and removed again', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {

                        var add = {tag: 'hello', title: 'bla'};

                        client.put(add, function (notification) {
                            client.del(notification.data._id);
                        });

                        return {
                            unmatch: function (notification) {
                                notification.event.should.equal('unmatch');
                                unsub();

                                removeData(objs, done);
                            }
                        };
                    });
                });
            });


            it('should not receive notifications when unsubscribed', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function (objs) {
                    var query = {tag: 'hello'};

                    client.query(query, function (notification, unsub) {
                        var change = notification.data[0];
                        change.tag = 'no-match';
                        unsub();

                        client.put(change, function () {
                            removeData(objs, done);
                        });

                        return function () {
                             done();
                        };
                    });
                });
            });
        });
    });

    function createData(objs, fn) {
        var i = 0,
            insertedObjs = [];
        objs.forEach(function (obj, index) {
            client.put(obj, function (notification) {
                insertedObjs[index] = notification.data;
                if (++i === objs.length) {
                    fn(insertedObjs);
                }
            });
        });
    }

    function removeData(objs, fn) {
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






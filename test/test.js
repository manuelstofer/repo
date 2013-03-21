/*global describe, it, io*/

    'use strict';

var storage = require('repo'),
    mock = storage.mock(),
    client = storage.client({socket: io.connect('http://localhost:2014')});

describeInterface('mock', mock);
describeInterface('client', client);

function describeInterface(name, client) {
    describe(name, function () {

        describe('create object', function () {

            it('should get a "create" notification', function (done) {
                client.put({example: 'expected'}, function (notification) {
                    notification.action.should.equal('create');
                    notification.data.example.should.equal('expected');
                    notification.data._id.should.not.be.undefined;
                    done();
                });
            });

            it('should get "change" on the returned callback', function (done) {

                client.put({example: 'expected'}, function (notification) {
                    var obj = notification.data;
                    obj.example = 'changed';

                    client.put(obj);

                    return function (notification) {
                        notification.action.should.equal('change');
                        notification.data.example.should.equal('changed');
                        client.unsub(obj._id);
                        done();
                    };
                });
            });

            it('should get "del" on the returned callback', function (done) {

                client.put({example: 'expected'}, function (notification) {
                    var obj = notification.data;

                    client.del(obj._id);
                    return function (notification) {
                        notification.action.should.equal('del');
                        client.unsub(obj._id);
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
                        notification.action.should.equal('change');
                        notification.data.example.should.equal('changed');
                        notification.data._id.should.not.be.undefined;
                        done();
                    });
                });
            });
        });

        describe('get object', function () {

            it('should get "error" notification getting a non existent object', function (done) {

                client.get('non-existent', function (notification) {
                    notification.action.should.equal('error');
                    done();
                });
            });
        });

        describe('delete object', function () {

            it('should get "error" notification deleting a non existent object', function (done) {
                client.del('non-existent', function (notification) {
                    notification.action.should.equal('error');
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

                        notification.action.should.equal('query-result');
                        notification.data.length.should.equal(2);
                        notification.data[0].tag.should.equal('hello');
                        notification.data[1].tag.should.equal('hello');

                        removeData(objs, done);
                    });
                });
            });

            it('should receive delete notifications for query results', function (done) {
                var obj1 = {tag: 'hello'};

                createData([obj1], function () {

                    client.query({tag: 'hello'}, function (notification) {
                        var obj = notification.data[0];
                        client.del(obj._id);
                        return [
                            function (notification) {
                                client.unsub(obj._id);
                                notification.action.should.equal('del');
                                done();
                            }
                        ];
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






/*global describe, it, io*/

describe('client', function () {
    'use strict';
    var storage = require('storage'),
        client = storage.client({socket: io.connect('http://localhost:2014')});

    describe('create object', function () {

        it('should get a "create" notification', function (done) {
            client.put({example: 'expected'}, function (notification) {
                notification.action.should.equal('create');
                notification.data.example.should.equal('expected');
                notification.id.should.not.be.undefined;
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
                    notification.id.should.not.be.undefined;
                    done();
                };
            });
        });

        it('should get "del" on the returned callback', function (done) {

            client.put({example: 'expected'}, function (notification) {
                var obj = notification.data;

                client.del(obj.id);
                return function (notification) {
                    notification.action.should.equal('del');
                    notification.id.should.equal(obj.id);
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
                    notification.id.should.not.be.undefined;
                    done();
                });
            });
        });
    });

    describe('get object', function () {

        it('should get "error" notification getting a non existent object', function (done) {

            client.get('non-existent', function (notification) {
                notification.action.should.equal('error');
                notification.id.should.equal('non-existent');
                done();
            });
        });
    });

    describe('delete object', function () {

        it('should get "error" notification deleting a non existent object', function (done) {
            client.del('non-existent', function (notification) {
                notification.action.should.equal('error');
                notification.id.should.equal('non-existent');
                done();
            });
        });
    });
});

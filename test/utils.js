// Load modules

var Fs = require('fs');

var Code = require('code');
var Lab = require('lab');
var Util = require('../lib/utils');

// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;

// Declare internals

var internals = {};

describe('Utils', function () {

    describe('forever()', function () {

        it('calls itself recursively asynchronously', function (done) {

            var count = 0;
            Util.recursiveAsync(0, function (value, callback) {

                value++;
                count = value;
                if (value === 10) {

                    // Do this to simulate async
                    setImmediate(function () {

                        callback(true);
                    });
                }
                else {
                    setImmediate(function () {

                        callback(null, value);
                    });
                }
            }, function (error) {

                expect(error).to.exist();
                expect(count).to.equal(10);
                done();
            });
        });

        it('throw an error if no callback supplied', function (done) {

            expect(function () {

                Util.recursiveAsync(0, function (value, callback) {

                    callback(new Error('no callback'));
                });
            }).to.throw('no callback');
            done();
        });
    });

    describe('series()', function () {

        it('calls a series of tasks in order', function (done) {

            var result = [];

            Util.series([
                function (callback) {

                    setTimeout(function () {

                        result.push(1);
                        callback(null);
                    }, 200);
                },
                function (callback) {

                    setTimeout(function () {

                        result.push(2);
                        callback(null);
                    }, 100);
                }
            ], function (err) {

                expect(err).to.not.exist();
                expect(result).to.deep.equal([1, 2]);
                done();
            });
        });

        it('calls back with an error if one occurs', function (done) {
            Util.series([
                function (callback) {

                    setTimeout(function () {

                        callback(true);
                    }, 200);
                }
            ], function (err) {

                expect(err).to.be.true;
                done();
            });
        });
    });

    describe('Liner', function() {

        it('it transforms a new line file into JSON objects', function (done) {

            var fileStream = Fs.createReadStream('./test/fixtures/test_01.log', { encoding: 'utf8' });
            var transForm = new Util.Liner();
            var contents = [];

            transForm.on('readable', function () {

                var line;

                while (line = this.read()) {
                    contents.push(line);
                }
            });

            transForm.on('end', function () {

                expect(this._size).to.equal(503);
                expect(contents).to.deep.equal([{
                    event: 'request',
                    timestamp: 1369328752975,
                    id: '1369328752975-42369-3828',
                    instance: 'http://localhost:8080',
                    labels: [
                        'api',
                        'http'
                    ],
                    method: 'get',
                    path: '/test',
                    query: {},
                    source: {
                        remoteAddress: '127.0.0.1'
                    },
                    responseTime: 71,
                    statusCode: 200
                },
                {
                    event: 'request',
                    timestamp: 1369328753222,
                    id: '1369328753222-42369-62002',
                    instance: 'http://localhost:8080',
                    labels: [
                        'api',
                        'http'
                    ],
                    method: 'get',
                    path: '/test',
                    query: {},
                    source: {
                        remoteAddress: '127.0.0.1'
                    },
                    responseTime: 9,
                    statusCode: 200
                }]);
                done();
            });

            fileStream.pipe(transForm);
        });

        it('it transforms a new line file into JSON objects correctly handling weird chunk sizes', function (done) {

            var fileStream = Fs.createReadStream('./test/fixtures/test_01.log', { encoding: 'utf8', highWaterMark: 128 });
            var transForm = new Util.Liner({});
            var contents = [];

            transForm.on('readable', function () {

                var line;

                while (line = this.read()) {
                    contents.push(line);
                }
            });

            transForm.on('end', function () {

                expect(this._size).to.equal(503);
                expect(contents).to.deep.equal([{
                    event: 'request',
                    timestamp: 1369328752975,
                    id: '1369328752975-42369-3828',
                    instance: 'http://localhost:8080',
                    labels: [
                        'api',
                        'http'
                    ],
                    method: 'get',
                    path: '/test',
                    query: {},
                    source: {
                        remoteAddress: '127.0.0.1'
                    },
                    responseTime: 71,
                    statusCode: 200
                },
                    {
                        event: 'request',
                        timestamp: 1369328753222,
                        id: '1369328753222-42369-62002',
                        instance: 'http://localhost:8080',
                        labels: [
                            'api',
                            'http'
                        ],
                        method: 'get',
                        path: '/test',
                        query: {},
                        source: {
                            remoteAddress: '127.0.0.1'
                        },
                        responseTime: 9,
                        statusCode: 200
                    }]);
                done();
            });

            fileStream.pipe(transForm);
        });

        it('filters out invalid JSON objects', function (done) {

            var fileStream = Fs.createReadStream('./test/fixtures/test_01.log', { encoding: 'utf8' });
            var transForm = new Util.Liner();
            var contents = [];
            var tryParse = Util.Liner.prototype._tryParse;
            var count = 0;
            var consoleError = console.error;

            Util.Liner.prototype._tryParse = function (item) {

                count++;

                if (count === 1) {
                    item = '';
                }
                else {
                    item += '}';
                }

                tryParse(item);
            };

            console.error = function (value) {

                expect(value.message).to.equal('Unexpected token }');
            };

            transForm.on('readable', function () {

                var line;

                while (line = this.read()) {
                    contents.push(line);
                }
            });

            transForm.on('end', function () {

                expect(contents).to.be.empty();
                Util.Liner.prototype._tryParse = tryParse;
                console.error = consoleError;
                done();
            });

            fileStream.pipe(transForm);
        });
    });
});

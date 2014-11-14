// Declare internals

var Stream = require('stream');
var Hoek = require('hoek');

var internals = {};

exports.recursiveAsync = function (initialValues, fn, callback) {

    var next = function () {

        var args = [];
        for (var i = 0, il = arguments.length; i < il; ++i) {
            args.push(arguments[i]);
        }

        var err = args.shift();
        if (err) {
            if (callback) {
                return callback(err);
            }
            throw err;
        }
        args.push(next);
        return fn.apply(null, args);

    };
    next(null, initialValues);
};

exports.series = function (tasks, callback) {

    var executeTask = function (task) {

        task(function (err) {

            if (err) {
                return callback(err);
            }
            var next = tasks.shift();
            if (next) {
                return executeTask(next);
            }
            return callback(null);
        });
    };

    executeTask(tasks.shift());
};

var Liner = exports.Liner = function (options) {

    options = options || {};
    options.objectMode = true;

    this._lastLineData = undefined;
    this._size = 0;

    Stream.Transform.call(this, options);
};

Hoek.inherits(Liner, Stream.Transform);

Liner.prototype._transform = function (chunk, encoding, done) {

    var data = chunk.toString();

    this._size += data.length;

    if (this._lastLineData) {
        data = this._lastLineData + data;
    }

    var lines = data.split('\n');


    this._lastLineData = lines.splice(lines.length - 1, 1)[0];

    for (var i = 0, il = lines.length; i < il; ++i) {
        var line = lines[i];
        var item = this._tryParse(line);

        if (item) {
            this.push(item);
        }
    }

    done();
};

Liner.prototype._flush = function (done) {


    var item = this._tryParse(this._lastLineData);
    if (item) {
        this.push(item);
    }

    this._lastLineData = null;
    done();
};

Liner.prototype._tryParse = function(item) {

    var result = undefined;

    if (!item) {
        return result;
    }

    try {
        result = JSON.parse(item);
    } catch (e) {

        console.error(e);
    }
    return result;
};

var main = require("./main");

exports["test main"] = function (assert) {'use strict';
    assert.pass("Unit test running!");
};

exports["test main async"] = function (assert, done) {'use strict';
    assert.pass("async Unit test running!");
    done();
};

require("sdk/test").run(exports);

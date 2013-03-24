var md5 = require('md5').digest_s;

module.exports = function (query) {
    return md5(JSON.stringify(query));
};
var md5 = require('md5');
md5 = typeof md5 === 'function' ? md5 : md5.digest_s;

module.exports = function (query) {
    return md5(JSON.stringify(query));
};

module.exports = require('./src/storage');
module.exports.client = require('./src/client/client');
module.exports.backends = {
    memory: require('./src/backends/memory'),
    mongo: require('./src/backends/mongo')
};

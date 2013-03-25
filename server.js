
module.exports = require('./src/storage');
module.exports.backends = {
    memory: require('./src/backends/memory'),
    mongo: require('./src/backends/mongo')
};

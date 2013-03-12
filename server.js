
module.exports = require('./server/storage');
module.exports.backends = {
    memory: require('./server/backends/memory')
};

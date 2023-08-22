const mongoose = require('mongoose');
const config = require('../config/database');
mongoose.Promise = global.Promise;

module.exports = function () {
    mongoose.set('useCreateIndex', true)
    mongoose.connect(config.database, { useNewUrlParser: true })
        .then(() => console.log('Connected to database ' + config.database))
        .catch(err => console.error('Error in connection' + err));
}

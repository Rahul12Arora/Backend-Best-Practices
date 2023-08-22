const compression = require('compression');
const helmet = require('helmet');

module.exports = function (app) {
    app.use(compression());
    app.use(helmet());
}

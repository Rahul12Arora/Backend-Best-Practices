// const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
// const auth = passport.authenticate('jwt', { session: false });

const auth = (req, res, next) => {

    let token = req.headers['x-auth'] || req.headers['authorization']; // Express headers are auto converted to lowercase
    // console.log(token, "Token", req);
    if (token) {
        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Token is not valid'
                });
            } else {
                req.user = decoded;
                next();
            }
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'Auth token is not supplied'
        });
    }
};

module.exports = auth;

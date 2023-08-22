const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const User = require('../models/user');
const Customer = require('../models/customer');
const config = require('../config/database');

module.exports = function (passport) {
    var opts = {}
    opts.jwtFromRequest = ExtractJwt.fromHeader('x-auth');
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
        // console.log(jwt_payload,"id");
        if(jwt_payload.customer_no){
            Customer.findById(jwt_payload._id, function (err, customer) {
                if (err) {
                    return done(err, false);
                }
                if (customer) {
                    return done(null, customer);
                } else {
                    return done(null, false);
                }
            });
        } else {
            User.findById(jwt_payload._id, function (err, user) {
                // console.log('>>>>>>>>>>>>>>>>>')
                if (err) {
                    return done(err, false);
                }
                if (user) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        }
        
    }));
}

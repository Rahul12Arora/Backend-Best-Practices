'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    hashed_password: {
        type: String,
        default: ''
    },
    salt: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: '',
        required: false
    },
    image: {
        type: String,
        default: null,
        required: false
    },
    isUserVerified: {
        type: Boolean,
        default: false
    },
    lastLeadAssigned: {
        type: Boolean,
        default: false,
        required: false
    },
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    }],
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: false
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team'
    },
    managerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    orgId: {
        type: Schema.Types.ObjectId,
        ref: "Organisation"
    },
    locationId: [{
        type: Schema.Types.ObjectId,
        ref: "Location"
    }],
    experienceCenterId: [{
        type: Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    }],
    isActive: {
        type: Boolean,
        default: true,
        required: true
    }
});

/**
 * Virtuals
 */

UserSchema.virtual('password').set(function (password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
}).get(function () {
    return this._password;
});

/**
 * Validations
 */

UserSchema.path('mobile').validate(function (mobile) {
    if (this.skipValidation()) return true;
    return mobile.length;
}, 'mobile cannot be blank');

UserSchema.path('name').validate(function (name) {
    if (this.skipValidation()) return true;
    return name.length;
}, 'name cannot be blank');

UserSchema.path('hashed_password').validate(function (name) {
    if (this.skipValidation()) return true;
    return name.length;
}, 'password cannot be blank');

UserSchema.methods = {

    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */

    authenticate: function (plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */

    makeSalt: function () {
        return Math.round((new Date().valueOf() * Math.random())) + '';
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */

    encryptPassword: function (password) {
        if (!password) return '';
        try {
            return crypto
                .createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch (err) {
            return '';
        }
    },

    /**
     * Validation is not required if using OAuth
     */

    skipValidation: function () {
        return false;
    }
};

/**
 * Statics
 */

UserSchema.statics = {

    /**
     * Load
     *
     * @param {Object} options
     * @param {Function} cb
     * @api private
     */

    load: function (options, cb) {
        options.select = options.select || 'name mobile';
        return this.findOne(options.criteria)
            .select(options.select)
            .exec(cb);
    }
};

UserSchema.plugin(require('mongoose-timestamp'));
UserSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});


module.exports = mongoose.model('User', UserSchema);

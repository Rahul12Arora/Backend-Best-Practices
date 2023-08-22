'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoleSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    can: [{
        type: String,
        required: true
    }],
});


RoleSchema.plugin(require('mongoose-timestamp'));
RoleSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

module.exports = mongoose.model('Role', RoleSchema);

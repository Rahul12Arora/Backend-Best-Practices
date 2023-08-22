'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LatestProjectNoSchema = new mongoose.Schema({
    locationId: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
    },
    erpProjectNo: {
        type: String,
    },
    experienceCenterId: {
        type: Schema.Types.ObjectId,
        ref: "ExperienceCenter"
    },
});

const LatestProjectNo = module.exports = mongoose.model('LatestProjectNo', LatestProjectNoSchema);

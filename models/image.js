'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ImageSchema = new mongoose.Schema({
    s3Location: {
        type: String
        // required: true
    },
    uploadedBy : {
        type: Schema.Types.ObjectId,
        ref: 'User',
        // required: true
    }
});


ImageSchema.plugin(require('mongoose-timestamp'));
ImageSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});
const Image = module.exports = mongoose.model('Image', ImageSchema);


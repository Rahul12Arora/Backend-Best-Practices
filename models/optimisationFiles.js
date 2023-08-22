'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OptimizationFilesSchema = new mongoose.Schema({
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    excelFileLink: {
        type: String,
        default: ""
    },
    sawFileLink: {
        type: String,
        default: ""
    },
    pastingFile: {
        type: String,
        default: ""
    },
    uploadedBy : {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    optimizationNumber:{
        type: String,
    }
});


OptimizationFilesSchema.plugin(require('mongoose-timestamp'));
const OptimizationFiles = module.exports = mongoose.model('OptimizationFiles', OptimizationFilesSchema);


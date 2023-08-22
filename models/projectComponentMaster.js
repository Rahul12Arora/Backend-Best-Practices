const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectComponentMasterSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'ProductMaster',
        required: true
    }],
    priority: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

ProjectComponentMasterSchema.plugin(require('mongoose-timestamp'));
ProjectComponentMasterSchema.plugin(require('mongoose-delete'), {
    overrideMethods: true,
    deletedAt: true
});

const ProjectComponentMaster = module.exports = mongoose.model('ProjectComponentMaster', ProjectComponentMasterSchema);

ProjectComponentMaster.findProjectById = function (id) {
    return ProjectComponentMaster.findById(id)
        .then((project) => {
            if (!project) return Promise.reject('Project not found.');
            return Promise.resolve(project);
        });
}

ProjectComponentMaster.checkProductInProject = function (product) {
    query = { products: { $in: product } };
    return ProjectComponentMaster.findOne(query)
        .then((product) => {
            if (product) return Promise.reject('Product already exist in this Project.');
        });
}
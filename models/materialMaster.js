'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('../utils/constants');
const databaseValidation = require('../utils/databaseValidation');

const MaterialMasterSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	code: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	aliasName: {
		type: String,
		trim: true
	},
	stocks: {
		factory: {
			available: {
				type: Number,
				validate: [{
					validator: databaseValidation.validateNegative,
					msg: 'Quantity can not be negative.'
				}],
				default: 0
			},
			consumed: {
				type: Number,
				validate: [{
					validator: databaseValidation.validateNegative,
					msg: 'Quantity can not be negative.'
				}],
				default: 0
			}
		},
		store: {
			available: {
				type: Number,
				validate: [{
					validator: databaseValidation.validateNegative,
					msg: 'Quantity can not be negative.'
				}],
				default: 0
			},
			consumed: {
				type: Number,
				validate: [{
					validator: databaseValidation.validateNegative,
					msg: 'Quantity can not be negative.'
				}],
				default: 0
			}
		},
	},
	quantity: {
		type: Number,
		validate: [
			{
				validator: databaseValidation.validateNegative,
				msg: 'Quantity can not be negative.'
			},
		],
		default: 0
	},
	subCategoryId: {
		type: Schema.Types.ObjectId,
		ref: "SubCategory"
	},
	pricePerUnit: {
		type: String,
		required: false,
		get: v => Number(v) || 0,
		validate: [
			{
				validator: databaseValidation.validateNegative,
				msg: 'Price can not be negative.'
			}
		],
		default: 0
	},
	unitId: {
		type: Schema.Types.ObjectId,
		ref: "UnitTypeMaster",
	},
	status: {
		type: String,
		required: true,
		enum: constants.MaterialStatus.all(),
		default: constants.MaterialStatus.active
	},
});


MaterialMasterSchema.plugin(require('mongoose-timestamp'));
MaterialMasterSchema.plugin(require('mongoose-delete'), {
	overrideMethods: true,
	deletedAt: true
});

const MaterialMaster = module.exports = mongoose.model('MaterialMaster', MaterialMasterSchema);


MaterialMaster.updatePrice = function (materialId, pricePerUnit, quantity) {
	MaterialMaster.findById(materialId)
		.then((material) => {
			material.pricePerUnit = (material.pricePerUnit * material.quantity + pricePerUnit * quantity) / (material.quantity + quantity);
			material.quantity = quantity;
		})
}


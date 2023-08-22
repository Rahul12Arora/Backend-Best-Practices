const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');

const auth = require('../middlewares/authentication');
const ProductMaster = require('../models/productMaster');
const ProjectComponentMaster = require('../models/projectComponentMaster');

// Create project comp. masters
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can create product master');
    categoryArray = req.body.categoryArray;
    let productId = '';
    let newCode = '';
    ProductMaster.find().sort({ code: -1 }).limit(1)
        .then((pro) => {
            newCode = `P${Number(pro[0].code.substr(1)) + 1}`;
            if (newCode.length == 0) throw new Error('Error in code.');
            return ProductMaster.findProductMaster(req.body.name,newCode);
        })
        .then(() => {
            productMaster = new ProductMaster({
                code: newCode,
                name: req.body.name,
                description: req.body.description,
                pricePerUnit: req.body.pricePerUnit,
                unit: req.body.unit,
                subUnitType: req.body.subUnitType,
                priority: req.body.priority,
                plyInclude: req.body.plyInclude,
                finishInclude: req.body.finishInclude,
                scope: req.body.scope
            });
            return productMaster.save();
        })
        .then((product) => {
            productId = product._id;
            return ProjectComponentMaster.find({ _id: { $in: categoryArray } });
        })
        .then((components) => {
            async.each(components, function (component, callback) {
                component.products.push(productId);
                component.save(function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                })
            }, function (err) {
                if (err) {
                    res.status(400).send(err);
                } else {
                    res.status(200).json('Product saved.');
                }
            })
        })
        .catch((err)=>{
            console.log(err,"err");
            res.status(400).send(err);
        })
        .catch((err) => res.status(400).send(err))
});

// Get all project comp. masters
router.get('/all', auth, (req, res) => {
    ProductMaster.find()
        .select('name description pricePerUnit unit subUnitType priority isActive fixingPrice plyInclude finishInclude scope code newpricePerUnit')
        .populate('unit', 'name')
        .populate('scope', 'name')
        .sort({ 'name': 1 })
        .then((docs) => {
            res.status(200).send(docs);
        })
        .catch((err) => res.status(400).send(err));
});

//services api for default services
router.get('/services', auth, (req, res) => {
    let services = ['Floor Covering with tarpaulin', 'Deep Cleaning includes cleaning of furniture, house and debris removal'];
    let response = {};
    ProductMaster.find({ name: services })
        .select('name description pricePerUnit unit subUnitType priority isActive fixingPrice plyInclude finishInclude scope')
        .populate('unit', 'name')
        .populate('scope', 'name')
        .sort({ 'name': 1 })
        .then((products) => {
            response.product = products;
            return ProjectComponentMaster.find({ name: 'SERVICES' });
            // res.status(200).send(products);
        })
        .then((services) => {
            response.serviceId = services[0]._id;
            res.status(200).send(response);
        })
        .catch((err) => res.status(400).send(err));
})


// Deactivate product master
router.put('/deactivate/:id', auth, (req, res) => {
    ProductMaster.findById(req.params.id)
        .select('isActive')
        .then((product) => {
            if (product.isActive) {
                product.isActive = false;
                ProjectComponentMaster.findOneAndUpdate({ products: { $in: req.params.id } }, { $pull: { products: req.params.id } });
            } else {
                product.isActive = true;
            }
            return product.save();
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});

// Edit a product master
router.put('/edit/:id', auth, (req, res) => {
    categoryArray = req.body.categoryArray;
    let productId = req.params.id;
    let update = _.pick(req.body, ['name', 'description', 'pricePerUnit', 'fixingPrice', 'priority', 'unit', 'subUnitType', 'plyInclude', 'finishInclude', 'scope','newpricePerUnit']);
    let options = { new: true };
    return ProductMaster.findByIdAndUpdate(productId, update, options)
        .then(() => {
            return ProjectComponentMaster.find();
        })
        .then((components) => {
            async.each(components, function (component, callback) {
                var addToComponent = _.find(categoryArray, function (o) { return o == component._id; })
                if (addToComponent) {
                    var isExists = _.find(component.products, function (o) { return o == productId; });
                    if (!isExists) {
                        component.products.push(productId);
                    }
                } else {
                    var isExists = _.find(component.products, function (o) { return o == productId; });
                    if (isExists) {
                        // _.filter(component.products, function (o) { return o != productId; });
                        component.products.pop(productId);
                    }
                }
                component.save(function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                })
            }, function (err) {
                if (err) {
                    res.status(400).send(err);
                } else {
                    res.status(200).json('Product edited.');
                }
            })
        })
        .catch((err) => res.status(400).send(err));
});


// Adding product code
router.post('/addProductCode', (req, res) => {
    ProductMaster.find()
        .select('code name')
        .then((productMasters) => {
            // res.json(productMasters);
            let code = 101;
            productMasters.forEach(productMaster => {
                productMaster.code = `P${code}`;
                productMaster.save();
                code++;
            })
            // console.log('done');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
})

module.exports = router;

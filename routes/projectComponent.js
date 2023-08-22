const express = require('express');
const router = express.Router();
const async = require('async');

const auth = require('../middlewares/authentication');
const ProjectComponent = require('../models/projectComponent');
const ProjectComponentMaster = require('../models/projectComponentMaster');
const ProductMaster = require('../models/productMaster');
require('../models/spaceNames')
require('../models/materialMaster')
// Create project comp.
router.post('/new', auth, (req, res) => {
    // ProjectComponent.findByComponent(req.body.projectId, req.body.projectComponent)
    ProjectComponent.findByComponent(req.body.leadId, req.body.projectComponent)
        .then(() => {
            newProjectComponent = new ProjectComponent({
                // projectId: req.body.projectId,
                leadId: req.body.leadId,
                categoryId: req.body.projectComponent,
                // plyType: req.body.plyType,
                priority: req.body.priority
            });
            // req.body.products.forEach(product => {
            //     newProjectComponent.products.push(product);
            // });
            return newProjectComponent.save()
        })
        .then((project) => {
            res.status(200).send(project);
        })
        .catch((err) => {
            if (err.name == 'ValidationError') {
                return res.status(400).json('Validation required.');
            }
            res.status(400).send(err);
        })
});


// router.get('/all', auth, (req, res) => {
//     if (req.user.role != 'Admin') return res.status(403).send();
//     ProjectComponent.find({})
//         .populate('projectId', 'project_no status')
//         .populate('projectComponent', 'name priority')
//         .populate('products', 'name description pricePerUnit unit priority')
//         .then((projects) => {
//             res.status(200).send(projects);
//         })
//         .catch((err) => res.status(400).send(err));
// });
router.get('/edit/editPriority', (req, res) => {
    ProjectComponent.find({})
        .then(data => {
            async.each(data, function (projectComponentId, callback) {
                ProjectComponentMaster.find({ _id: projectComponentId.projectComponent }, { priority: 1, name: 1, _id: 0 })
                    .then((prior) => {
                        ProjectComponent.update({ _id: projectComponentId }, { $set: { priority: prior[0].priority } })
                            .then(() => {
                                callback();
                            })
                            .catch(error => {
                                callback();
                            });
                    })
                    .catch(err => {
                        console.log("error for", err);
                    })
            }, (err) => {
                if (err) {
                    console.log(err, "err");
                }
                // console.log("done");
            });
        })
});

// Get details of a particular project
router.get('/:leadId', auth, (req, res) => {
    // ProjectComponent.find({ projectId: req.params.projectId })
    ProjectComponent.find({ leadId: req.params.leadId })
        .populate({ path: 'leadId', select: 'createdAt status discountOnAllScopes' })
        .populate('plyType')
        .populate({ path: 'categoryId', populate: { path: 'products', select: 'name code priority pricePerUnit subUnitType unitId isActive plyInclude finishInclude' }, select: 'name priority' })
        .populate({ path: 'products.product', populate: { path: 'scopeId', select: 'name eligibleForDiscount' }, select: 'name code subUnitType isActive plyInclude finishInclude priority' })
        .populate({ path: 'products.finishType' })
        .populate({ path: 'products.unitType' })
        .sort({ 'createdAt': 1 })
        .then((components) => {
            if (components.length == 0) return res.status(200).json([]);
            res.status(200).send(components);
        })
        .catch((err) => res.status(400).send(err));
});


// Get latest price of items of a project
/*router.get('/:projectId', auth, (req, res) => {
    ProjectComponent.find({ projectId: req.params.projectId })
        .populate({ path: 'projectId', populate: { path: 'plyType', select: 'name' }, select: 'project_no status discountOnAllScopes' })
        .populate({ path: 'projectComponent', populate: { path: 'products', select: 'name code priority pricePerUnit subUnitType isActive plyInclude finishInclude' }, select: 'name priority' })
        .populate({ path: 'products.product', populate: { path: 'scope', select: 'name eligibleForDiscount' }, select: 'name code pricePerUnit subUnitType isActive plyInclude finishInclude newpricePerUnit' })
        .populate({ path: 'products.finishType', select: 'name pricePerUnit' })
        .sort({ 'createdAt': 1 })
        .then((components) => {
            let productIds = [];
            if (components.length == 0) return res.status(400).json('No components found.');
            return components;
        })
        .then((components) => {
            let productIds = [];
            components.forEach((component) => {
              component.products.forEach((product) => {
                 productIds.push(product.product.code);
              })
            })
            //console.log('productIds: ', productIds)
            ProductMaster.find({ code: { $in: productIds } })
                .then((products) => {
                    //console.log('products: ', products);
                    components.forEach((component) => {
                        component.products.forEach((product) => {
                           console.log('product Code: ',product.product)
                    })
                })
                    res.status(200).send(components);
                })
                .catch((err) => res.status(400).send(err));
        })
        .catch((err) => res.status(400).send(err));
    
});*/





// Edit project
router.put('/edit', async (req, res) => {
    try {
        for (let i = 0; i < req.body.length; i++) {
            let query = { leadId: req.body[i].leadId, categoryId: req.body[i].categoryId };
            let update = { $set: { products: req.body[i].products, plyType: req.body[i].plyType._id } };
            let options = { new: true };
            await ProjectComponent.findOneAndUpdate(query, update, options)
        }
        return res.status(200).json("updated")
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad request")
    }
});

router.put('/changePriority', auth, (req, res) => {
    async.each(req.body, function (data, callback) {
        ProjectComponent.update({ _id: data.component_id }, { $set: { priority: data.priority } })
            .then((res) => {
                console.log(res);
                callback();
            })
            .catch((err) => {
                console.log(err);
            })
    }, function (err) {
        if (err) {
            res.json(error).status(404);
        } else {
            res.json("Successfully updated").status(200);
        }
    }
    )
})


// Delete project
router.delete('/remove/:id', auth, (req, res) => {
    ProjectComponent.deleteOne({ _id: req.params.id })
        .then((deleteOk) => {
            if (deleteOk.deletedCount == 0) return res.status(400).json('Some error in deleting project component');
            res.status(200).json('Project component delete successfully.');
        })
        .catch((err) => res.status(500).send(err));
});



module.exports = router;

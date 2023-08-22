const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authentication');
const ProjectComponentMaster = require('../models/projectComponentMaster');


// Create project comp. masters
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can create category master');
    projectComponentMaster = new ProjectComponentMaster({
        name: req.body.name,
        products: req.body.productId,
        priority: req.body.priority,
        description: req.body.description
    });
    projectComponentMaster.save()
        .then(() => {
            res.status(200).json('Project Component Master created.');
        })
        .catch((err) => res.status(400).send(err));
});


// Get all project comp. masters
router.get('/all', auth, (req, res) => {
    ProjectComponentMaster.find({})
        .populate('products', 'name description pricePerUnit subUnitType priority')
        .sort({ 'name': 1 })
        .then((docs) => {
            res.status(200).json(docs);
        })
        .catch((err) => res.status(400).send(err));
});


// Get a project details
router.get('/:id', auth, (req, res) => {
    ProjectComponentMaster.findById(req.params.id)
        .select('name products')
        .populate('products', 'name description pricePerUnit subUnitType')
        .then((project) => {
            if (!project) return Promise.reject('Project not found.');
            res.status(200).send(project);
        })
        .catch((err) => res.status(400).send(err));
});


// Add products in project comp. master
// router.post('/add', auth, (req, res) => {
//     id = req.body._id;
//     productId = req.body.product_id;
//     ProductMaster.findById(productId)
//         .then((product) => {
//             if (!product) return res.status(400).json('Item not found.');
//             return ProjectComponentMaster.checkProductInProject(productId);
//         })
//         .then(() => {
//             let query = id;
//             let update = { $push: { products: productId } };
//             let options = { new: true };
//             return ProjectComponentMaster.findByIdAndUpdate(query, update, options);
//         })
//         .then((docs) => {
//             res.status(200).json(docs);
//         })
//         .catch((err) => res.status(400).send(err));
// });


// Delete product component master and its products
router.delete('/remove/:id', auth, (req, res) => {
    _id = req.params.id;
    ProjectComponentMaster.findByIdAndRemove(_id)
        .then((doc) => {
            res.status(200).send(doc.name + ' deleted.');
        })
        .catch((err) => res.status(400).send(err));
});


// Remove a product from a project comp master
router.put('/edit/:id', auth, (req, res) => {
    let query = { _id: req.params.id }
    if (!req.body.name || !req.body.productId) return res.status(400).json('Bad request.');
    ProjectComponentMaster.findProjectById(req.params.id)
        .then((project) => {
            let update = {
                $set: { name: req.body.name, products: req.body.productId, priority: req.body.priority, description: req.body.description },
            };
            let options = { new: true };
            return ProjectComponentMaster.findOneAndUpdate(query, update, options);
        })
        .then((doc) => {
            res.status(200).send(doc);
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;
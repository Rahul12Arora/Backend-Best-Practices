const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const CustomerProcuredMaterial = require('../models/customerProcurementMaster');

router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(400).send('Only admin can create CustomerProcuredMaterial master.');
    customerProcuredMaterial = new CustomerProcuredMaterial(_.pick(req.body, ['value', 'name']));
    customerProcuredMaterial.save()
        .then(() => {
            res.status(200).json('Customer Procured Material master value saved.');
        })
        .catch((err) => res.status(400).send(err));

});


router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['value', 'name']);
    let options = { new: true };
    CustomerProcuredMaterial.findByIdAndUpdate(query, update, options)
        .then((customerProcuredMaterial) => {
            res.status(200).send(customerProcuredMaterial);
        })
        .catch((err) => res.status(400).send(err));
});


router.get('/all', auth, (req, res) => {
    CustomerProcuredMaterial.find({})
        .then((customerProcuredMaterial) => {
            res.status(200).json(customerProcuredMaterial);
        })
        .catch((err) => res.status(400).send(err));
})

router.put('/deactivate/:id', auth, (req, res) => {
    CustomerProcuredMaterial.findById(req.params.id)
        .select('isActive')
        .then((customerProcuredMaterial) => {
            if (customerProcuredMaterial && customerProcuredMaterial.isActive) {
                customerProcuredMaterial.isActive = false;
            } else {
                customerProcuredMaterial.isActive = true;
            }
            return customerProcuredMaterial.save();
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;
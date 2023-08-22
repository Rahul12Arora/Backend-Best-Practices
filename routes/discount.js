const express = require('express');
const router = express.Router();
const _ = require('lodash');

const auth = require('../middlewares/authentication');
const Discount = require('../models/discount');

router.post('/new', (req, res) => {
    // if (req.user.role != 'Admin') return res.status(400).send('Only admin can create discount master.');
    discount = new Discount(_.pick(req.body, ['value', 'name']));
    discount.save()
        .then(() => {
            res.status(200).json('Discount saved.');
        })
        .catch((err) => res.status(400).send(err));

});


router.put('/edit/:id', (req, res) => {
    let query = req.params.id;
    let update = _.pick(req.body, ['value', 'name']);
    let options = { new: true };
    Discount.findByIdAndUpdate(query, update, options)
        .then((discounts) => {
            res.status(200).send(discounts);
        })
        .catch((err) => res.status(400).send(err));
});


router.get('/all', (req, res) => {
    Discount.find({})
        .then((discounts) => {
            res.status(200).json(discounts);
        })
        .catch((err) => res.status(400).send(err));
})

router.put('/deactivate/:id', (req, res) => {
    Discount.findById(req.params.id)
        .select('isActive')
        .then((discounts) => {
            if (discounts && discounts.isActive) {
                discounts.isActive = false;
            } else {
                discounts.isActive = true;
            }
            return discounts.save();
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


module.exports = router;
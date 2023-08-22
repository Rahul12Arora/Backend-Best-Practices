const express = require('express');
const router = express.Router();
const Checklist = require('../models/checklist');
const lead = require('../models/lead');
const Lead = require("../models/lead");


router.get("/", async (req, res) => {
    try {
        const checklist = await Checklist.find({}).lean();
        res.status(200).send(checklist);
    } catch (error) {
        res.status(400).send(error.message)
    }
});

router.post("/", async (req, res) => {
    checklist = new Checklist({
        checkList: req.body.checkList,
        notes: req.body.notes,
        createdBy: req.body.createdBy
    })
    checklist.save()
        .then((data) => {
            res.status(200).send(data)
        })
        .catch(err => res.status(400).send(err))
})


router.delete('/remove/:id', (req, res) => {
    Checklist.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).json({
                success: true,
                msg: 'Item deleted.'
            });
        })
        .catch((err) => res.status(400).send(err));
});

router.put('/update/:id', async (req, res) => {
    try {
        const response = await Checklist.findOneAndUpdate({ _id: req.params.id }, {
            $set: {
                checkList: req.body.checkList,
                notes: req.body.notes,
                updatedBy: req.body.updatedBy
            }
        })
        res.status(200).send("Updated Successfully")
    } catch (err) {
        res.status(400).send(err.message)
    }
})

module.exports = router;
const express = require('express');
const router = express.Router();
const User = require('../models/user')
const vendorAssignmentLeads = require('../models/vendorAssignment')
const { vendorSoExecutiveRole } = require('../constant/constant')

router.get('/getVendorRoleBasedUsers', async (req, res) => {
    try {
        let users = await User.find({ roles: vendorSoExecutiveRole }).lean()
        res.status(200).json(users);
    } catch (err) {
        res.status(400).send(err)
    }
})


router.put('/assignVendorExcutive/:id', async (req, res) => {
    try {
        await vendorAssignmentLeads.findByIdAndUpdate(req.params.id, { $set: { assignTo :req.query.user}}).lean()
        res.status(200).send("Updated Successfully")
    } catch (err) {
        res.status(400).send(err)
    }
})


module.exports = router;
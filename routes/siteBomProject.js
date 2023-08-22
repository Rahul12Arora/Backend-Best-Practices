const express = require('express');
const router = express.Router();
const SiteBomProject = require('../models/siteBomProject');
const lead = require('../models/lead');
const LeadLogs = require('../models/leadLog');
const ImosProject = require('../models/imosProject');
const Lead = require('../models/lead');


router.get("/:_id", async (req, res) => {
    try {
        const siteBomProject = await SiteBomProject.find({ experienceCenterId: req.query.expCenter, stage: { $ne: "Site BOM Completed" }, assignTo : req.params._id })
            .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, populate: { path: 'assignTo', select: '_id name' }, select: 'lead_no grandTotal currentStage' })
            .populate({ path: 'assignTo', select: '_id name' })
            .populate({ path: 'projectId', select: 'divisionOfProject startDate code projectNumber expectedDeliveryDate totalPrice status' })
            .lean();
        res.status(200).send(siteBomProject);
    } catch (error) {
        res.status(400).send(error.message)
    }
});

router.put("/siteBomcomplted/:leadId", async (req, res) => {
    try {
        console.log("hitt")
        let imos = await ImosProject.find({ leadId: req.params.leadId}).lean()
        let value = ''
        if(imos.length !== 0){
            value = `${imos[0].stage} & Site BOM Completed`
        }else{
            value =  `Site BOM Completed`
        }
        const project = await SiteBomProject.findOneAndUpdate(
            { leadId: req.params.leadId },
            {
                $set: {
                    stage: "Site BOM Completed"
                },
            }
        )
        await Lead.findByIdAndUpdate(req.params.leadId , { currentStage : value })
        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user;
        leadLogs.user = req.user;
        leadLogs.leadId = req.params.leadId;
        leadLogs.dealActivity = `${req.user.name} has updated the Project stage to Site Bom Completed.`;
        leadLogs.save();
        res.status(200).send("Updated Successfully");
    } catch (err) {
        res.status(400).send(err.message);
    }
})

module.exports = router;
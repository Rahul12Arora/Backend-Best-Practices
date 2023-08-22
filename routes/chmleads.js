const express = require('express');
const router = express.Router();
const ChmLeads = require('../models/chmleads');
const User = require('../models/user');

router.get('/chm_lead_counts/:expcenter', async (req, res) => 
{
    try
    {
        let teamMembers = await User.find
        ({
            teamId: req.user.teamId
        })
        .select('_id');

        let response = await ChmLeads.find
        ({
            experienceCenterId: req.params.expcenter,
            assignTo: teamMembers
        })
        .populate('assignTo', 'name email mobile')
        .lean()
        
        let response2 = [], obj = {}

        for(let i = 0; i < response.length; i++)
        {
            if(obj[response[i].assignTo._id])
            {
                obj[response[i].assignTo._id].lead_count++
            }
            else
            {
                obj[response[i].assignTo._id] = {}
                obj[response[i].assignTo._id].name = response[i].assignTo.name
                obj[response[i].assignTo._id].lead_count = 1
            }
        }

        for(let j = 0; j < Object.keys(obj).length; j++)
        {
            response2.push
            ({
                name: obj[Object.keys(obj)[j]].name,
                id: Object.keys(obj)[j],
                lead_count: obj[Object.keys(obj)[j]].lead_count
            })
        }
        return res.status(200).send(response2)
    }
    catch (err)
    {
        console.log(err, "Error");
    }
})

router.get('/:expcenter', async (req, res) => {
    try {
        let response = [];
        let query = {experienceCenterId: req.params.expcenter};
        if (req.user.roles.find(role => role.name === "CHM_Manager")) {
            let teamMembers = await User.find({ teamId: req.user.teamId }).select('_id');
            query = {
                ...query,
                assignTo: teamMembers
            }
        } else if (req.user.roles.find(role => role.name === "CHM_User")) {
            query = {
                ...query,
                assignTo: req.user._id
            }
        }
        response = await ChmLeads.find(query)
            .populate('assignTo', 'name email mobile')
            .populate({ path: 'leadId', populate: { path: 'customerId', select: 'name _id' }, select: 'lead_no grandTotal salesStage executionStage imosStage factoryStage designStages finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo' })
            .populate({ path: 'leadId', populate: { path: 'assignTo', select: 'name _id' }})
            .populate({ path: 'leadId', populate: { path: 'designUser', select: 'name' }})

            .sort({ createdAt: -1 })
            .lean()

        return res.status(200).send(response)
    } catch (err) {
        console.log(err, "Error");
    }
})


module.exports = router;
const express = require('express');
const router = express.Router();
const CustomerSurveyRealForm = require('../models/customerSurveyReal');
const CustomerSurveyJunkForm = require('../models/customerServeyJunk');
const CustomerSurveyWonForm = require('../models/customerSurveyWon');
const CustomerSurveyLostForm = require('../models/customerSurveyLost');
const CustomerSurveyDesignForm = require('../models/customerSurveyDesign');
const CustomerSurveyDesignLostForm = require('../models/customerSurveyDesignLost');
const CustomerSurveyExecutionForm = require('../models/customerSurveyExecution');
const CustomerSurvey = require('../models/customerSurvey');
const { IpAddress } = require('../utils/config');
const emailService = require('../services/email.service');
const ChmLeads = require('../models/chmleads');
const Lead = require('../models/lead')

router.post('/addCustomerSurvey', async (req, res) => {
    try {
        let query = {}
        let data = {}
        let chm = await ChmLeads.find({ leadId: req.body.leadOwner.leadId }).lean()
        if (chm.length !== 0) {
            data.chmId = chm[0]._id
        }
        if (req.body.typeOption === 'real') {
            query.surveyType = 'real'
            const customerSurveyRealForm = new CustomerSurveyRealForm({
                feedback: req.body.feedback,
                howSatisfiedWithInteraction: req.body.howSatisfiedWithInteraction,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId
            })
            await customerSurveyRealForm.save();
        } else if (req.body.typeOption === 'junk') {
            query.surveyType = 'junk'
            const customerSurveyJunkForm = new CustomerSurveyJunkForm({
                feedback: req.body.feedback,
                whenFlatAvailbleForInterior: req.body.whenFlatAvailbleForInterior,
                budgetForInteriors: req.body.budgetForInteriors,
                conveyedMessage: req.body.conveyedMessage,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId
            })
            await customerSurveyJunkForm.save();
        } else if (req.body.typeOption === 'won') {
            query.surveyType = 'won'
            const customerSurveyWonForm = new CustomerSurveyWonForm({
                isVisitedExperienceCenter: req.body.isVisitedExperienceCenter,
                visitedExperienceCenter: req.body.visitedExperienceCenter,
                reasonToChooseDecorpot: req.body.reasonToChooseDecorpot,
                otherReasonToChooseDecorpot: req.body.otherReasonToChooseDecorpot,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                comments: req.body.comments,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId
            })
            await customerSurveyWonForm.save();
            try {
                if (req.body.customerRequriedGst) {
                    await Lead.findByIdAndUpdate(query, { $set: { customerRequriedGst: req.body.customerRequriedGst, customerGstInName: req.body.customerRequriedGst, customerGstInNumber: req.body.customerRequriedGst, customerGstShipping: req.body.customerRequriedGst } })
                } else {
                    await Lead.findByIdAndUpdate(query, { $set: { customerRequriedGst: req.body.customerRequriedGst, customerGstInName: req.body.customerRequriedGst, customerGstShipping: req.body.customerRequriedGst } })
                }
            } catch (err) {
                console.log(err)
            }
        } else if (req.body.typeOption === 'lost') {
            query.surveyType = 'lost'
            const customerSurveyLostForm = new CustomerSurveyLostForm({
                isVisitedExperienceCenter: req.body.isVisitedExperienceCenter,
                invitedExperienceCenter: req.body.invitedExperienceCenter,
                reasonForNotChoosingDecorpot: req.body.reasonForNotChoosingDecorpot,
                otherReasonForNotChoosingDecorpot: req.body.otherReasonForNotChoosingDecorpot,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                comments: req.body.comments,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId
            })
            await customerSurveyLostForm.save();
        } else if (req.body.typeOption === 'design') {
            query.surveyType = 'design'
            const customerSurveyDesignForm = new CustomerSurveyDesignForm({
                ...data,
                isDesignManagerInvolved: req.body.isDesignManagerInvolved,
                feedback: req.body.feedback,
                satisfactionIndexForDesignManager: req.body.satisfactionIndexForDesignManager,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId
            })
            await customerSurveyDesignForm.save();
        } else if (req.body.typeOption === "design-lost") {
            query.surveyType = '"design-lost"'
            const customerSurveyDesignLostForm = new CustomerSurveyDesignLostForm({
                ...data,
                isDesignManagerInvolved: req.body.isDesignManagerInvolved,
                isChmInvolved: req.body.isChmInvolved,
                satisfactionIndexForChm: req.body.satisfactionIndexForChm,
                feedback: req.body.feedback,
                satisfactionIndexForDesignManager: req.body.satisfactionIndexForDesignManager,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId,
                reasonForNotMovingAhead: req.body.reasonNotMovingAhead
            })
            await customerSurveyDesignLostForm.save();
        } else if (req.body.typeOption === 'execution') {
            query.surveyType = 'execution'
            const customerSurveyExecutionForm = new CustomerSurveyExecutionForm({
                ...data,
                howSatisfiedWithExecutionAndDelivery: req.body.howSatisfiedWithExecutionAndDelivery,
                howSatisfiedWithExecutionTeam: req.body.howSatisfiedWithExecutionTeam,
                feedbackForSpecificVendor: req.body.feedbackForSpecificVendor,
                satisfactionIndexRatio: req.body.satisfactionIndexRatio,
                additionalFeedback: req.body.additionalFeedback,
                leadOwner: req.body.leadOwner._id,
                customerId: req.body.leadOwner.customerId,
                leadId: req.body.leadOwner.leadId,
            })
            await customerSurveyExecutionForm.save();
        }
        await CustomerSurvey.findOneAndUpdate({ leadId: req.body.leadOwner.leadId, surveyType: query.surveyType }, { $set: { surveyStatus: "Submitted" } },).lean()
        return res.status(200).json('Submitted successfully')
    } catch (error) {
        console.log(error, "Error")
    }
});

router.get('/getCustomerSurveyList', async (req, res) => {
    try {
        let response = [];
        if (req.query.typeOption === 'real') {
            response = await CustomerSurveyRealForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'junk') {
            response = await CustomerSurveyJunkForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'won') {
            
            response = await CustomerSurveyWonForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager')
                .sort({ createdAt: -1 })
                .lean()
            
        } else if (req.query.typeOption === 'lost') {
            response = await CustomerSurveyLostForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'design') {
            response = await CustomerSurveyDesignForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate({ path:'leadId',populate: { path: 'experienceCenterId', select: 'name' }, select: 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager' })
                .populate({ path: 'chmId', populate: { path: 'assignTo', select: 'name' }, select: "_id" })
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'design-lost') {
            response = await CustomerSurveyDesignLostForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate({ path:'leadId',populate: { path: 'experienceCenterId', select: 'name' }, select: 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager' })
                .populate({ path: 'chmId', populate: { path: 'assignTo', select: 'name' }, select: "_id" })
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'execution') {
            response = await CustomerSurveyExecutionForm.find({})
                .populate('leadOwner', 'name email mobile teamId departmentId')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent erpProjectNo erpProjectId designManager salesWonManager')
                .populate({ path: 'chmId', populate: { path: 'assignTo', select: 'name' }, select: "_id" })
                .sort({ createdAt: -1 })
                .lean()
        }

        // filter data based on user roles
        if(req.user.roles.find(role =>role.name === "Admin")){
            response;
        }
        else if(req.user.roles.find(role => role.name == 'Sales Head'))
        {
            response = response.filter(form => form.leadOwner.departmentId.toString() == req.user.departmentId.toString())
        }
        else if(req.user.roles.find(role => role.name == 'Sales Manager'))
        
        {
            response = response.filter(form => form.leadOwner?.teamId?.toString() == req.user.teamId?._id.toString())
        }
        else if(req.user.roles.find(role => role.name == 'Assistant Sales Manager'))
        {
            response = response.filter(form => form.leadOwner?.teamId?.toString() == req.user.teamId?._id.toString())
        }
        else if(req.user.roles.find(role => role.name == 'Sales User'))
        {
            response = response.filter(form => form.leadOwner._id.toString() == req.user._id.toString())
        }
        else if(req.user.roles.find(role => role.name === "Design Head" &&  role.name == 'Design Manager') ){
            response = response.filter(item =>
                item.leadId && 
                item.leadId.experienceCenterId && 
                req.user.experienceCenterId.toString().includes(item.leadId.experienceCenterId._id.toString())
              );
        }
        else if(req.user.roles.find(role => role.name == 'Design Manager'))
        {
            response = response.filter(form => form.leadOwner?.teamId?.toString() == req.user.teamId?._id.toString())
        }
        else if(req.user.roles.find(role => role.name == 'Design User'))
        {
            response = response.filter(form => form.leadOwner._id.toString() == req.user._id.toString())
        }
        return res.status(200).send(response)
    } catch (err) {
        console.log(err, "Error");
    }
})

router.get('/checkCustomerSurveyByLead', async (req, res) => {
    try {
        let response = [];
        if (req.query.typeOption === 'real') {
            response = await CustomerSurveyRealForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        } else if (req.query.typeOption === 'junk') {
            response = await CustomerSurveyJunkForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        } else if (req.query.typeOption === 'won') {
            response = await CustomerSurveyWonForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        } else if (req.query.typeOption === 'lost') {
            response = await CustomerSurveyLostForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        } else if (req.query.typeOption === 'design') {
            response = await CustomerSurveyDesignForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        } else if (req.query.typeOption === 'design-lost') {
            response = await CustomerSurveyDesignLostForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        } else if (req.query.typeOption === 'execution') {
            response = await CustomerSurveyExecutionForm.find({ leadId: req.query.leadId })
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no')
        }
        return res.status(200).send(response)
    } catch (err) {
        console.log(err, "Error");
    }
})



router.get('/filteredCustomerSurveyList', async (req, res) => {
    let query = {
        createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
    }
    try {
        let response = [];
        if (req.query.typeOption === 'real') {
            response = await CustomerSurveyRealForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'junk') {
            response = await CustomerSurveyJunkForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'won') {
            response = await CustomerSurveyWonForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'lost') {
            response = await CustomerSurveyLostForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'design') {
            response = await CustomerSurveyDesignForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .populate({ path: 'chmId', populate: { path: 'assignTo', select: 'name' }, select: "_id" })
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'design-lost') {
            response = await CustomerSurveyDesignLostForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .populate({ path: 'chmId', populate: { path: 'assignTo', select: 'name' }, select: "_id" })
                .sort({ createdAt: -1 })
                .lean()
        } else if (req.query.typeOption === 'execution') {
            response = await CustomerSurveyExecutionForm.find({ ...query })
                .populate('leadOwner', 'name email mobile')
                .populate('customerId', 'name email mobile')
                .populate('leadId', 'lead_no grandTotal finalPaymentDone paymentDone finalTokenPercent discountPercent')
                .populate({ path: 'chmId', populate: { path: 'assignTo', select: 'name' }, select: "_id" })
                .sort({ createdAt: -1 })
                .lean()
        }
        return res.status(200).send(response)
    } catch (err) {
        console.log(err, "Error");
    }
})

module.exports = router;
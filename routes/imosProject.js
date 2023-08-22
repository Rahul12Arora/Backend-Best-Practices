const express = require('express');
const router = express.Router();
const ImosProject = require('../models/imosProject');
const Lead = require('../models/lead');
const Department = require('../models/department');
const User = require('../models/user');
const { imosStage } = require('../constant/constant')
const LeadLogs = require('../models/leadLog');

router.get("/", async (req, res) => {
    let query = {}
    if (req.user.roles.find(role => role.name === "IMOS Manager")) {
        query = { experienceCenterId: req.query.expCenter, teamId: req.user.teamId }
    } else {
        query = { experienceCenterId: req.query.expCenter, assignTo: req.user._id }
    }
    try {
        const imosProject = await ImosProject.find({...query, stage : { $ne : "IMOS Completed"}})
            .select('_id')
            .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, populate: { path: 'assignTo', select: '_id name' }, select: 'lead_no grandTotal imosStage currentStage' })
            .populate({ path: 'projectId', select: 'divisionOfProject startDate code projectNumber expectedDeliveryDate totalPrice status' })
            .lean();
        res.status(200).send(imosProject);
    } catch (error) {
        res.status(400).send(error.message)
    }
});

router.get("/completedProjects", async (req, res) => {
    let query = {}

    if (req.user.roles.find(role => role.name === "IMOS Manager")) {
        query = { stage: 'IMOS Completed', experienceCenterId: req.query.expCenter, teamId: req.user.teamId }
    } else {
        query = { stage: 'IMOS Completed', experienceCenterId: req.query.expCenter, assignTo: req.user._id }
    }
    try {
        const completedProjects = await ImosProject.find(query)
            .select('_id')
            .populate('leadId','lead_no grandTotal imosStage currentStage')
            .populate('projectId', 'code clientName divisionOfProject startDate grandTotal status')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(completedProjects);
    } catch (error) {
        console.log(error, "Error log");
    }
})

// To get the count for imos stage for manager all users and for user own data
router.get("/getProjectCount/:expcenter", async (req, res) => {
    try {
        let imosCounts = [];
        if (req.user.roles.find(role => role.name === "IMOS Manager")) {
            let departmentId = await Department.find({ name: "IMOS" }).select('_id')
            let imosUser = await User.find({ departmentId: departmentId[0]._id, experienceCenterId: req.params.expcenter, isActive: true })
            
            for (let j = 0; j < imosUser.length; j++) {
                const getProjectCount = await Lead.find({
                    assignTo: imosUser[j]._id,
                    designStages: "Design Sign-off",
                    isERPProjectCreated: true,
                    experienceCenterId: req.params.expcenter
                })
                    .select('lead_no grandTotal imosStage')
                    .populate('erpProjectId', 'code clientName divisionOfProject startDate grandTotal status')
                    .sort({ createdAt: -1 })
                    .lean();

                let obj = {
                    user: imosUser[j].name,
                    userId: imosUser[j]._id
                }
                if (obj.stage == undefined) {
                    obj.stage = {}
                }
                for (let m = 0; m < imosStage.length; m++) {
                    obj.stage[imosStage[m]] = 0
                }
                for (let i = 0; i < getProjectCount.length; i++) {
                    if (getProjectCount[i].imosStage) {
                        obj.stage[getProjectCount[i].imosStage] += 1;
                    } else {
                        obj.stage[getProjectCount[i].imosStage] = 1
                    }
                }
                imosCounts.push(obj)
            }
        } else if (req.user.roles.find(role => role.name === "IMOS User")) {
            const getProjectCount = await Lead.find({
                assignTo: req.user._id,
                designStages: "Design Sign-off",
                isERPProjectCreated: true,
                experienceCenterId: req.params.expcenter
            })
                .select('lead_no grandTotal imosStage')
                .populate('erpProjectId', 'code clientName divisionOfProject startDate grandTotal status')
                .sort({ createdAt: -1 })
                .lean();

            let obj = {
                user: req.user.name,
                userId: req.user._id
            }
            if (obj.stage == undefined) {
                obj.stage = {}
            }
            for (let m = 0; m < imosStage.length; m++) {
                obj.stage[imosStage[m]] = 0
            }
            for (let i = 0; i < getProjectCount.length; i++) {
                if (getProjectCount[i].imosStage) {
                    obj.stage[getProjectCount[i].imosStage] += 1;
                } else {
                    obj.stage[getProjectCount[i].imosStage] = 1
                }
            }
            imosCounts.push(obj)
        }
        res.status(200).send(imosCounts);
    } catch (error) {
        console.log(error, "Error log");
    }
})

// To get the details based on selected imos stage and user
router.get('/getProjectsByStage', async (req, res) => {
    try {
        let query = { 
            imosStage: req.query.imosStage === 'IMOS Drawing In Progress' ? 'IMOS Drawing In-Progress' : 
                req.query.imosStage === 'IMOS QC In Progress' ? 'IMOS QC In-Progress' : req.query.imosStage, 
            experienceCenterId: req.query.experienceCenterId, 
            assignTo: req.query.assignTo,
            designStages: "Design Sign-off",
            isERPProjectCreated: true,
        }
        const imosStageProjects = await Lead.find(query)
            .select('lead_no grandTotal')
            .populate('erpProjectId', 'code clientName divisionOfProject startDate grandTotal status')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).send(imosStageProjects);
    } catch (error) {
        console.log(error, "Error in get imos project by stage")
    }
})


router.get('/getDetailsOfImosProject/:Id', async (req, res) => {
    try {
        let arr = []
        const imosCompletedData = await LeadLogs.find({ leadId: req.params.Id, stage: "IMOS Completed" })
            .select("createdAt")
            .lean()
        const imosStartedData = await LeadLogs.find({ leadId: req.params.Id, stage: "Assign To IMOS User" })
            .select("createdAt")
            .lean()

        let obj = {}
        if (imosCompletedData.length !== 0 && imosStartedData.length !== 0) {
            obj.startedDate = imosStartedData[0].createdAt
            obj.endDate = imosCompletedData[0].createdAt
        }
        arr.push(obj)
        res.status(200).send(arr);
    } catch (err) {
        res.status(400).send(err.message)
    }
})


module.exports = router;
const express = require('express');
const router = express.Router();
const Lead = require('../models/lead');
const Customer = require('../models/customer');
const Department = require('../models/department')
const Teams = require('../models/team')
const leadService = require('../services/lead.service');
const User = require('../models/user')
const ChmLeads = require('../models/chmleads')
const Quotation = require('../models/quotation');
const ExperienceCenter = require('../models/experienceCenter')
const Project = require('../models/project');
const emailService = require('../services/email.service');
const Pdf = require('../services/generatePdf.service');
const moment = require('moment')
const Roles = require('../models/roles')
const Target = require('../models/target')
const ImosProject = require('../models/imosProject');
const SiteBomProject = require('../models/siteBomProject');
const LeadLogs = require('../models/leadLog')
const SourceOfLeadMaster = require('../models/sourceOfLeadMaster');
const { IpAddress } = require('../utils/config');
const constants = require('../utils/constants');
const CustomerTransactions = require('../models/customertransactions');
const CustomerSurveyJunkForm = require('../models/customerServeyJunk');
const CustomerSurvey = require('../models/customerSurvey');
const CustomerSurveyExecutionForm = require('../models/customerSurveyExecution');
const { salesStages, centerHeadEmail, leadStatus, ExecutionManagerRoleId, operationTeamAnkitId, siteQcRoleID, IMOSManagerId, designManagerRoleId, designHeadId, SiteBomRoleId,vendorSoManagerRole, FactoryBomRoleId, factoryManagerRoleId, ImosUserRoleId, SiteBomUserRoleId, designDepartmentId, chmManagerRoleId, chmUserRoleId, designHeadRoleId, designUserRoleId, salesManagerRoleId, salesUserRoleId, salesHeadRoleId, adminRoleId } = require('../constant/constant')
const Location = require('../models/location')
const csvParser = require("csv-parser");
const needle = require("needle");
const LatestProjectNo = require('../models/latestErpProjectNo')
const ModifiyPdf = require('../services/modifyPdf.service');
const ProjectMaterial = require('../models/projectMaterial');
const vendorAssignmentLeads = require('../models/vendorAssignment')
const CustomerSurveyWonForm = require('../models/customerSurveyWon')

router.put('/approveContractSigned/:leadId', async (req, res) => {
    try {
        const response = await Lead.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
        if (response.contractDesignApproved && response.contractDesignApproved) {
            await Lead.findByIdAndUpdate(req.params.id, { $set: { executionStage: "Working Drawing Received", currentStage: "Working Drawing Received" } })
        }
        return res.status(200).json({ message: "Approved" })
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

router.get('/contractSignedPendingApproval', async (req, res) => {
    try {
        const response = await Lead.find({ designStages: "Design Sign-off", $and: [{ contractFinanceApproved: false, contractDesignApproved: false }] })
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

router.post('/', async (req, res) => {
    try {
        let customer = await Customer.findOne({ contact_no: req.body.contact_no })
        if (!customer) {
            let newCustomerNo = 1
            const prevCustomer = await Customer.find().sort({ customer_no: -1 }).limit(1);
            if (prevCustomer.length != 0) {
                newCustomerNo = +prevCustomer[0].customer_no + 1
            }
            let customerEmail = req.body.email.trim()
            const newCustomer = new Customer({
                customer_no: newCustomerNo,
                name: req.body.customerName,
                email: customerEmail,
                contact_no: req.body.contact_no,
                address: req.body.address,
                createdBy: req.user._id
            })
            customer = await newCustomer.save()
        }
        const prevLead = await Lead.findOne({ customerId: customer._id })
        if (prevLead) return res.status(400).json('Lead Already Exists!')
        newLeadNo = customer.customer_no + '.' + 1;
        const newLead = new Lead({
            customerId: customer._id,
            lead_no: newLeadNo,
            createdBy: req.user._id,
            currentStage: req.body.status,
            status: req.body.status,
            address: req.body.address,
            area: req.body.area,
            city: req.body.city,
            experienceCenterId: req.body.experienceCenterId,
            estimatedBudget: req.body.estimatedBudget,
            propertyType: req.body.propertyType,
            remark: req.body.remark,
            sourceOfLead: req.body.sourceOfLead,
            leadType: req.body.leadType,
            assignTo: req.body.assignTo,
            previouslyAssignedTo: [req.user._id],
            teamId: req.body.team,
            isRegistered: req.body.isRegistered,
            floorPlan: req.body.floorPlan,
            projectType: req.body.projectType,
            scopeOfWork: req.body.scopeOfWork,
            startInteriors: req.body.startInteriors,
            departmentId: req.body.department,
            floorPlanAttachment: req.body.floorPlanAttachment,
            recordingFile: req.body.recordingFile,
            teamName: req.body.teamName,
            assignToName: req.body.assignToName,
            cityName: req.body.cityName,
            experienceCenterName: req.body.experienceCenterName,
            salesExecutiveApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
            salesManagerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
            customerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
            finanaceManagerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
            centerHeadApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
            businessHeadApproved: [{ status: 'Approval Not Initiated', isApproved: false }]
        })
        const leadData = await newLead.save();
        await leadService.assignRatesToLead(newLead._id, req.user.orgId, req.body.city)

        const getLeadOwnerName = await User.findOne({ _id: req.body.assignTo })

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user;
        leadLogs.user = req.user;
        leadLogs.leadId = newLead._id;
        leadLogs.dealActivity = req.user.name + ` has changed the deal owner to ${getLeadOwnerName.name} and the stage to Lead Received`;
        leadLogs.save();

        if (req.body.leadType === 'Junk' && req.body.status === 'Junk') {
            const surveyLink = `${IpAddress}customer-survey-form/junk/${newLead._id}`
            const subject = 'Customer Survey Form';
            const text = `Dear ${req.body.customerName};
                Please kindly check and fill out our survey form.
                It won’t take more than 30 seconds
                Link for survey form: ${surveyLink}`;

            const html = `<p>Dear <strong>${req.body.customerName}</strong>,</p>
                <p>Please kindly check and fill out our survey form.</p>
                <p>It won’t take more than 30 seconds</p>
                <p>Link for survey form: ${surveyLink}</p>
                <p></p>
                <p></p>
                <p>Thanks & Regards,</p>
                <p>Team Decorpot</p>`;
            await emailService.sendEmail(req.body.email.trim(), subject, text, html);

            const customerSurvey = new CustomerSurvey({
                leadId: newLead._id,
                customerId: newLead.customerId,
                leadOwner: newLead.assignTo,
                surveyType: 'junk',
                surveyStatus: 'Sent'
            })
            await customerSurvey.save();
        }

        if (req.body.leadType === 'Real') {
            const subject1 = "Lead Received";
            const text1 = `Dear ${getLeadOwnerName.name};
                Please kindly check your dashboard new lead is Assigned
                Customer Name : ${req.body.customerName}
                Customer Email: ${req.body.email}`
            const html1 = `<p>Dear <strong>${getLeadOwnerName.name}</strong>,</p>
                <p>Please kindly check your dashboard new lead is Assigned</p>
                <p>Customer Name : ${req.body.customerName}</p>
                <p> Customer Email: ${req.body.email}</p>
                <p></p>
                <p></p>
                <p>Thanks & Regards,</p>
                <p>Team Decorpot</p>`;
            emailService.sendEmail(getLeadOwnerName.email, subject1, text1, html1);
        }
        // checking if customer already filled the form or not if filled we have to not send survey mail to customer
        // let realSurvey = await CustomerSurveyRealForm.find({ leadId: newLead._id });
        // if (realSurvey.length === 0) {
        //     const surveyLink = `${IpAddress}customer-survey-form/real/${leadData._id}`
        //     const subject = 'Customer Survey Form';
        //     const text = `Dear ${req.body.customerName};
        //                     Please kindly check and fill out our survey form.
        //                     It won’t take more than 30 seconds.
        //                     Link for survey form: ${surveyLink}`;

        //     const html = `<p>Dear <strong>${req.body.customerName}</strong>,</p>
        //                     <p>Please kindly check and fill out our survey form.</p>
        //                     <p>It won’t take more than 30 seconds</p>
        //                     <p>Link for survey form: ${surveyLink}</p>
        //                     <p></p>
        //                     <p></p>
        //                     <p>Thanks & Regards,</p>
        //                     <p>Team Decorpot</p>`;

        //     emailService.sendEmail(req.body.email.trim(), subject, text, html);

        //     const customerSurvey = new CustomerSurvey({
        //         leadId: newLead._id,
        //         customerId: customer._id,
        //         leadOwner: req.body.assignTo,
        //         surveyType: 'real',
        //         surveyStatus: 'Sent'
        //     })
        //     await customerSurvey.save();
        // }
        return res.status(200).json(`Lead Created Successfully`);
        // let assignedName = ""
        // if (req.body.assignTo != '') {
        //     newLead.assignTo = req.body.assignTo;
        //     newLead.team = req.body.team;
        //     newLead.department = req.body.department;
        //     assignedName = req.body.assignToName
        // } else {
        //     const leadServiceResponse = await leadService.assignAlgo();
        //     if (leadServiceResponse) {
        //         newLead.assignTo = leadServiceResponse._id;
        //         newLead.department = leadServiceResponse.department;
        //         newLead.team = leadServiceResponse.team;
        //         assignedName = leadService.name;
        //     }
        // }


        // const projects = await Project.find({ customerId: customer._id })
        // // Remove OR Query 
        // const defaultPly = await PlyTypeMaster.findOne({ $or: [{ defaultPly: true }, { defaultPlyFor: req.user.orgId._id }] })
        // let newProjectNo = 0
        // if (Project.length == 0) newProjectNo = +customer.customer_no + +.1
        // else {
        //     const number = Math.max.apply(Math, projects.map(function (o) { return o.project_no; })).toString()
        //     newProjectNo = +customer.customer_no + +((+number.split('.')[1] + 1) / 10)
        // }
        // const newProject = new Project({
        //     project_no: newProjectNo,
        //     customerId: customer._id,
        //     projectType: req.body.projectType,
        //     ply: defaultPly._id,
        //     createdBy: req.user._id,
        //     stage: "Lead Received",
        //     address: req.body.address,
        //     area: req.body.area,
        //     city: req.body.city,
        //     estimatedBudget: req.body.estimatedBudget,
        //     floorPlan: req.body.floorPlan,
        //     propertyType: req.body.propertyType,
        //     remark: req.body.remark,
        //     scopeOfWork: req.body.scopeOfWork,
        //     sourceOfLead: req.body.sourceOfLead,
        //     startInteriors: req.body.startInteriors,
        //     leadType: req.body.leadType,
        //     isRegistered: req.body.isRegistered
        // })
        // let assignedName = ""
        // if (req.body.assignTo != '') {
        //     newProject.assignTo = req.body.assignTo;
        //     newProject.team = req.body.team;
        //     newProject.department = req.body.department;
        //     assignedName = req.body.assignToName
        // } else {
        //     const leadServiceResponse = await leadService.assignAlgo();
        //     if (leadServiceResponse) {
        //         newProject.assignTo = leadServiceResponse._id;
        //         newProject.department = leadServiceResponse.department;
        //         newProject.team = leadServiceResponse.team;
        //         assignedName = leadService.name;
        //     }
        // }
        // await newProject.save();

        // log = {
        //     projectId: newProject._id,
        //     stage: 'Lead Received',
        //     user: newProject.assignTo,
        //     dealActivity: req.user.name + ' has created a deal '
        // }
        // await projectService.saveProjectLog(log);
        // return res.status(200).json('Project created successfully & assigned to ' + assignedName);

    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})

// API to get marketing page details by selected leadType, status and teamId
router.get('/marketingDetails', async (req, res) => {
    try {
        let query = {
            experienceCenterId: req.query.experienceCenterId,
            createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
        }
        // Checking Real, Junk, Hold, To Be Called type
        if (req.query.leadType) {
            query['leadType'] = req.query.leadType
        }
        // Checking Lead Returned By Sales status
        if (req.query.status) {
            query['status'] = req.query.status
        }
        // Below line used for the sales team selected
        if (req.query.teamId) {
            query['teamId'] = req.query.teamId
        }

        if (req.user.roles.find(role => role.name === "Marketing User")) {
            query = {
                ...query,
                previouslyAssignedTo: req.user._id
            }
        } else {
            const teamMembers = await User.find({ experienceCenterId: req.query.experienceCenterId, teamId: req.user.teamId, isActive: true })
                .select('_id')
            query = {
                ...query,
                previouslyAssignedTo: { $in: teamMembers }
            }
        }
        leads = await Lead.find(query)
            .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
            .populate('customerId', '_id email address name contact_no')
            .sort({ createdAt: -1 })
            .lean()

        if (leads.length === 0) return res.status(200).json([])

        return res.status(200).json(leads)

    } catch (error) {
        console.log(error, "error");
    }
})

router.get('/details', async (req, res) => {
    try {
        const date = new Date()
        // let query = { createdAt: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() } }
        let query = {}
        let salesQuery = {}
        //    let query = { createdAt: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() } }
        switch (req.query.filterOption) {
            case "createdAt":
                query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                if (req.query.salesStage === 'Won Deals Pending Designer Assignment') {
                    salesQuery['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                }
                break;

            case "leadWonDate":
                query['leadWonDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                if (req.query.salesStage === 'Won Deals Pending Designer Assignment') {
                    salesQuery['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                }
                break;

            case "designSignOffDate":
                query['designSignOffDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                if (req.query.salesStage === 'Won Deals Pending Designer Assignment') {
                    salesQuery['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                }
                break;

            default:
                // query['leadWonDate'] = { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() };
                break;
        }
        const salesDepartment = await Department.findOne({ name: 'Sales' })
        const teams = await Teams.find({ departmentId: salesDepartment._id })
            .select('_id name')


        if (req.query.status === 'Real Lead') {
            query['teamId'] = teams
        } else if (req.query.status === 'Leads Pending Assignment' && req.query.isUser === 'false' && req.user.roles.find(role => role.name === "Sales Manager" || role.name === 'Sales User' || role.name === 'Assistant Sales Manager')) {
            query['salesStage'] = 'Lead Received'
            if (req.user._id === "6311d2cc3f4f3e7aefd737cf") {
                query['assignTo'] = "62833ea48c2abbddba2d3ea1"
            } else {
                query['assignTo'] = req.user._id
            }
        } else if (req.query.status === 'Leads Pending Assignment' && req.query.isUser === 'false' && req.user.roles.find(role => role.name === "Sales Head")) {
            query['salesStage'] = 'Lead Received'
        } else if (req.query.status === 'Leads Pending Assignment' && req.query.isUser === 'true') {
            query = { ...query, $and: [{ assignTo: req.query.selectedUser.split(',') }], salesStage: 'Lead Received' }
        } else if (req.query.status) {
            query['status'] = req.query.status
        }
        // if (req.query.startDate && req.query.endDate) {
        //     query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
        // }
        if (req.query.teamId)
            req.user.roles.find(role => role.name === "Sales Manager" || role.name === "Assistant Sales Manager") ?
                query['teamId'] = req.query.teamId
                :
                query['designerAssigned'] = false
        if (req.query.leadStatus !== 'salesUserTotal' && req.query.leadStatus) {
            query['leadStatus'] = req.query.leadStatus
        }
        if (req.query.assignTo !== "NA" && !req.query.status && req.query.assignTo) {
            query = { ...query, $or: [{ assignTo: req.query.assignTo }, { previouslyAssignedTo: req.query.assignTo }] }
            // query['assignTo'] = req.query.assignTo
        } else if (req.query.assignTo === "NA") {
            if (req.user.roles.find(role => role.name === "Sales Head")) {
                const userIndepartment = await User.find({ departmentId: salesDepartment._id, isActive: true, experienceCenterId: req.query.experienceCenterId })
                    .select('_id name departmentId teamId')
                    .populate('roles', 'name')
                let allSalesUser = [];
                let allSalesData = [];
                let allSalesUserAndManager = [];
                userIndepartment.forEach(ele => {
                    if (ele.roles.find(ele => ele.name === 'Sales User')) {
                        allSalesUser.push({ _id: ele._id })
                        allSalesData.push(ele);
                    }
                })
                query = { ...query, $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }] }
            } else if (req.user.roles.find(role => role.name === "Sales Manager")) {
                const userIndepartment = await User.find({ teamId: req.user.teamId, isActive: true, experienceCenterId: req.query.experienceCenterId })
                    .select('_id name departmentId teamId')
                    .populate('roles', 'name')
                let allSalesUser = [];
                let allSalesData = [];
                let allSalesUserAndManager = [];
                userIndepartment.forEach(ele => {
                    if (ele.roles.find(ele => ele.name === 'Sales User')) {
                        allSalesUser.push({ _id: ele._id })
                        allSalesData.push(ele);
                    } if (ele.roles.find(ele => ele.name === 'Sales User' || ele.name === 'Sales Manager')) {
                        allSalesUserAndManager.push(ele)
                    }
                })
                query = { ...query, $or: [{ previouslyAssignedTo: { $in: allSalesUserAndManager } }, { assignTo: { $in: allSalesUserAndManager } }] }
            } else if (req.user.roles.find(role => role.name === "Assistant Sales Manager")) {
                const usersInTeam = await Teams.find({ _id: req.user.teamId, isActive: true })
                    .select('assistantManagerUsers')
                let usersListInTeam = []
                if (usersInTeam.length !== 0) {
                    for (let i = 0; i < usersInTeam[0].assistantManagerUsers.length; i++) {
                        usersListInTeam.push({ _id: usersInTeam[0].assistantManagerUsers[i] })
                    }
                }
                query = { ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }] }
            }
        }
        if (req.query.isUser === 'true') {
            query = { ...query, $and: [{ assignTo: req.query.selectedUser.split(',') }] }
        }
        if (req.query.salesStage) {
            if ((req.user.roles.find(role =>role.name === "Sales Head" || role.name === "Sales Manager" || role.name === "Assistant Sales Manager")) && req.query.salesStage !== 'salesTotal') {
                query = { salesStage: req.query.salesStage, $or: [{ assignTo: req.query.assignTo }, { previouslyAssignedTo: req.query.assignTo }] }
            } else if ((req.user.roles.find(role => role.name === "Sales User" ) && req.query.salesStage !== 'salesTotal') ){
                query = { salesStage: req.query.salesStage, $or: [{ assignTo: req.query.assignTo },{ previouslyAssignedTo: req.query.assignTo }] }    
            } else if (req.query.salesStage !== 'salesTotal') {
                query['salesStage'] = req.query.salesStage
            } else {
                query = { $or: [{ assignTo: req.query.assignTo }, { previouslyAssignedTo: req.query.assignTo }] }
            }
        }
        if (req.query.leadId) {
            query['_id'] = req.query.leadId
        }
        if (req.query.leadType) {
            query['leadType'] = req.query.leadType
        }
        if (req.query.experienceCenterId && !req.query.assignTo) {
            query['experienceCenterId'] = req.query.experienceCenterId
        }
        if (req.query.locationId) {
            query['locationId'] = req.query.locationId
        }
        if (req.query.designHeadAssigned) {
            query = {
                experienceCenterId: req.query.experienceCenterId,
                assignTo: designHeadId,
                $or: [{ designHeadAssigned: req.query.designHeadAssigned }, { designerAssigned: false }, { salesStage: 'Won' }, { salesStage: 'Won Deals Pending Designer Assignment' }],
            }
            // query['designHeadAssigned'] = req.query.designHeadAssigned
            // query['departmentId'] = '5cb70b89ffa4965f53aa22d8' // Design Department Id
        }
        let leads = [];
        if (req.user.roles.find(role => role.name === "Sales Manager") && (req.user.roles.length === 1) && req.query.salesStage === 'Won Deals Pending Designer Assignment') {
            const usersInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
                .select('_id')
            query = {
                ...salesQuery,
                experienceCenterId: req.query.experienceCenterId,
                salesStage: 'Won Deals Pending Designer Assignment',
                $or: [
                    { previouslyAssignedTo: { $in: usersInTeam } },
                    { assignTo: { $in: usersInTeam } }
                ]
            }
            leads = await Lead.find(query)
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile erpProjectNo' })
                .populate('customerId', '_id email address name contact_no')
                .sort({ createdAt: -1 })
                .lean()
            if (leads.length === 0) return res.status(200).json([])

        } else if (req.user.roles.find(role => role.name === "Assistant Sales Manager") && (req.user.roles.length === 1) && req.query.salesStage === 'Won Deals Pending Designer Assignment') {
            const usersInTeam = await Teams.find({ _id: req.user.teamId, isActive: true })
                .select('assistantManagerUsers')
            let usersListInTeam = []
            if (usersInTeam.length !== 0) {
                for (let i = 0; i < usersInTeam[0].assistantManagerUsers.length; i++) {
                    usersListInTeam.push({ _id: usersInTeam[0].assistantManagerUsers[i] })
                }
            }
            query = {
                ...salesQuery,
                salesStage: 'Won Deals Pending Designer Assignment',
                $or: [
                    { previouslyAssignedTo: { $in: usersListInTeam } },
                    { assignTo: { $in: usersListInTeam } }
                ]
            }
            leads = await Lead.find(query)
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile erpProjectNo' })
                .populate('customerId', '_id email address name contact_no')
                .sort({ createdAt: -1 })
                .lean()
            if (leads.length === 0) return res.status(200).json([])
        } else if (req.user.roles.find(role => role.name === "Sales Head") && req.query.salesStage === 'Won Deals Pending Designer Assignment') {
            const teamMembers = await User.find({ experienceCenterId: req.query.experienceCenterId, departmentId: req.user.departmentId, isActive: true })
                .select('_id')

            query = {
                ...salesQuery,
                experienceCenterId: req.query.experienceCenterId,
                salesStage: 'Won Deals Pending Designer Assignment',
                $or: [
                    { previouslyAssignedTo: { $in: teamMembers } },
                    { assignTo: { $in: teamMembers } }
                ]
            }
            leads = await Lead.find(query)
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile erpProjectNo' })
                .populate('customerId', '_id email address name contact_no')
                .sort({ createdAt: -1 })
                .lean()
            if (leads.length === 0) return res.status(200).json([])

        } else {
            leads = await Lead.find({...query, experienceCenterId: req.query.experienceCenterId})
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile erpProjectNo' })
                .populate('customerId', '_id email address name contact_no')
                .sort({ createdAt: -1 })
                .lean()
            if (leads.length === 0) return res.status(200).json([])
        }
        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})

// Get the lead details by lead id
router.get('/leadDetails', async (req, res) => {
    try {
        const leads = await Lead.find({ _id: req.query.leadId })
            .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
            .populate('customerId', '_id email address name contact_no customer_no')
            .populate('city', '_id name')
            .populate('experienceCenterId', '_id name')
            .populate({ path: 'sourceOfLead', model: 'SourceOfLeadMaster' })
            .populate({ path: 'previouslyAssignedTo', populate: { path: 'roles', select: 'name' }, select: '_id name email mobile teamId departmentId' })
            .populate('discountLogs.user', 'name')
            .populate('discountLogs.actionTakenBy', 'name')
            .populate('discountLogs.discountRequestedBy', 'name')
            .populate('discountRequestedBy', 'name')
            .populate({ path: 'departmentId', select: '_id name' })
            .lean()
        if (leads.length === 0) return res.status(200).json([])
        const customerTransactions = await CustomerTransactions.find({ leadId: req.query.leadId,finalApprovalStatus:"Approve"}).lean()
        if(customerTransactions.length !== 0){
            let totalAmountPaidByCustomer = 0
            let salesManagerValue = 0
            let saleUserValue = 0
            for(let i = 0; i < customerTransactions.length; i++){
               if(customerTransactions[i].stage === 'Won Deals Pending Designer Assignment'){
                salesManagerValue = customerTransactions[i].amount
               }else if(customerTransactions[i].stage === 'Sales Manager Approval'){
                saleUserValue = customerTransactions[i].amount
               }else {
                totalAmountPaidByCustomer += +customerTransactions[i].amount
               }
            }
            if(saleUserValue <= salesManagerValue){
                totalAmountPaidByCustomer += +salesManagerValue
            }else{
                totalAmountPaidByCustomer += +saleUserValue
            }
            leads[0].totalAmountPaidByCustomer = totalAmountPaidByCustomer;
            leads[0].pendingAmountByCustomer = (leads[0].totalCustomerOutflow - totalAmountPaidByCustomer).toFixed(0)
        }
        const quotations = await Quotation.find({ leadId: req.query.leadId })
            .select('version')
        let nextVersionNo = 0;
        let lead_number = leads[0].lead_no;
        if (quotations.length == 0) {
            nextVersionNo = `${lead_number}.1`;
        } else {
            const number = Math.max.apply(Math, quotations.map(function (o) { return o.version.split('.')[o.version.split('.').length - 1] }));
            nextVersionNo = `${lead_number}.${number + 1}`;
        }
        leads[0].nextVersionNo = nextVersionNo;
    //     if (req.user.roles[0]._id === SiteBomUserRoleId){
    //         for (let j = 0; j < leads.length;j++){
    //             const sbom = await siteBomProject.find({ leadId: leads[0]._id})
    //                 .populate('assignTo', 'name email mobile _id teamId')
    //                 .lean()
    //             leads[j]["assignTo"]['_id'] = sbom[0].assignTo._id
    //             leads[j]["assignTo"]['email'] = sbom[0].assignTo.email
    //             leads[j]["assignTo"]['name'] = sbom[0].assignTo.name
    //             leads[j]["assignTo"]['mobile'] = sbom[0].assignTo.mobile
    //             leads[j]["assignTo"]['teamId'] = sbom[0].assignTo.teamId
    //         }
    //     } else if (req.user.roles[0]._id === ImosUserRoleId){
    //         for (let j = 0; j < leads.length; j++) {
    //             const imos = await ImosProject.find({ leadId: leads[0]._id })
    //             .populate('assignTo','name')
    //             .lean()
    //             leads[j]["assignTo"]['_id'] = imos[0].assignTo._id
    //             leads[j]["assignTo"]['email'] = imos[0].assignTo.email
    //             leads[j]["assignTo"]['name'] = imos[0].assignTo.name
    //             leads[j]["assignTo"]['mobile'] = imos[0].assignTo.mobile
    //             leads[j]["assignTo"]['teamId'] = imos[0].assignTo.teamId
    //     }
    // }
        return res.status(200).json(leads);
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})

// Marketing Dashboard API
router.get('/', async (req, res) => {
    try {
        const date = new Date()
        let query = { createdAt: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() }, experienceCenterId: req.query.experienceCenterId }
        let startMonth = date.getMonth()
        let endMonth = date.getMonth()
        let year = date.getFullYear()
        if (req.query.startDate && req.query.endDate) {
            query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
            startMonth = new Date(req.query.startDate).getMonth()
            endMonth = new Date(req.query.endDate).getMonth()
            year = new Date(req.query.startDate).getFullYear()
        }
        if (req.user.roles.find(role => role.name === "Marketing User")) {
            query = {
                ...query,
                previouslyAssignedTo: req.user._id
            }
        } else {
            const teamMembers = await User.find({ experienceCenterId: req.query.experienceCenterId, teamId: req.user.teamId, isActive: true })
                .select('_id')
            query = {
                ...query,
                previouslyAssignedTo: { $in: teamMembers }
            }
        }
        let monthArr = []
        for (let i = startMonth; i <= endMonth; i++) {
            monthArr.push(i)
        }
        const leadsData = await Lead.find(query)
            .populate('assignTo', '_id teamId')
        if (leadsData.length === 0) return res.status(200).json([])

        const salesDepartment = await Department.findOne({ name: 'Sales' })
        const teams = await Teams.find({ departmentId: salesDepartment._id })
            .select('_id name')
        let targetQuery = { $and: [{ month: { $in: monthArr } }, { year }], userId: req.user._id }
        let previouslyAssignedTo = { previouslyAssignedTo: { $in: [req.user._id] } }
        if (req.user.roles.find(role => role.name === "Marketing Manager")) {
            const usersInTeam = await User.find({ experienceCenterId: req.query.experienceCenterId, teamId: req.user.teamId, isActive: true })
                .select('_id')
            targetQuery = { $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: usersInTeam } }
            previouslyAssignedTo = { previouslyAssignedTo: { $in: usersInTeam } }
        }
        const target = await Target.find(targetQuery)
        // const leadsAchived = await Lead.find({ ...previouslyAssignedTo, ...query, leadType: "Real", experienceCenterId: req.query.experienceCenterId })

        const experienceCenters = await ExperienceCenter.find({})
        let leads = {}
        let toBeCalledCount = 0, onHoldCount = 0, leadReturnedFromSalesCount = 0, realLeadCount = 0, junkLeadCount = 0, totalLeadsGenerated = 0
        for (let k = 0; k < experienceCenters.length; k++) {
            if (!leads[experienceCenters[k].name]) {
                const leadsAchived = await Lead.find({ ...previouslyAssignedTo, ...query, leadType: "Real", experienceCenterId: experienceCenters[k]._id })
                leads[experienceCenters[k].name] = {}
                leads[experienceCenters[k].name].realLeadCount = 0
                leads[experienceCenters[k].name].toBeCalledCount = 0
                leads[experienceCenters[k].name].onHoldCount = 0
                leads[experienceCenters[k].name].leadReturnedFromSalesCount = 0
                leads[experienceCenters[k].name].junkLeadCount = 0
                leads[experienceCenters[k].name].totalLeadsGenerated = 0
                leads[experienceCenters[k].name].teamsAssignedCount = 0
                leads[experienceCenters[k].name].target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
                leads[experienceCenters[k].name].achived = leadsAchived.length
            }
            for (let i = 0; i < leadsData.length; i++) {
                if (leadsData[i].experienceCenterId.toString() === experienceCenters[k]._id.toString()) {
                    totalLeadsGenerated += 1
                    if (leadsData[i].status === 'Lead Returned By Sales')
                        leadReturnedFromSalesCount += 1;

                    for (let n = 0; n < leadsData[i]['previouslyAssignedTo'].length; n++) {
                        if (leadsData[i]['previouslyAssignedTo'][n].toString() === req.user._id.toString()) {
                            switch (leadsData[i].leadType) {
                                case "Real": realLeadCount = leadsData.filter(ele => ele.leadType === 'Real').length; break;
                                case "To Be Called": toBeCalledCount = leadsData.filter(ele => ele.leadType === 'To Be Called').length; break;
                                case "Hold": onHoldCount = leadsData.filter(ele => ele.leadType === 'Hold').length; break;
                                case "Junk": junkLeadCount = leadsData.filter(ele => ele.leadType === 'Junk').length; break;
                                default: null
                            }
                            break;
                        }
                    }
                    if (req.user.roles.find(role => role.name === "Marketing Manager")) {
                        switch (leadsData[i].leadType) {
                            case "Real": realLeadCount = leadsData.filter(ele => ele.leadType === 'Real').length; break;
                            case "To Be Called": toBeCalledCount = leadsData.filter(ele => ele.leadType === 'To Be Called').length; break;
                            case "Hold": onHoldCount = leadsData.filter(ele => ele.leadType === 'Hold').length; break;
                            // case "Lead Returned By Sales": leadReturnedFromSalesCount += 1; break;
                            case "Junk": junkLeadCount = leadsData.filter(ele => ele.leadType === 'Junk').length; break;
                            default: null
                        }
                    }
                }
            }

            const teamsAssignedCount = []
            for (let i = 0; i < teams.length; i++) {
                let count = 0
                let obj = {};
                for (let j = 0; j < leadsData.length; j++) {
                    if (leadsData[j].experienceCenterId.toString() === experienceCenters[k]._id.toString()) {
                        if (leadsData[j].teamId && leadsData[j].teamId.toString() == teams[i]._id.toString()) {
                            count += 1
                            obj._id = teams[i]._id
                            obj.teamName = teams[i].name;
                            obj.leadCount = count
                        }
                    }
                }
                teamsAssignedCount.push(obj)
            }
            leads[experienceCenters[k].name].realLeadCount = realLeadCount
            leads[experienceCenters[k].name].toBeCalledCount = toBeCalledCount
            leads[experienceCenters[k].name].onHoldCount = onHoldCount
            leads[experienceCenters[k].name].leadReturnedFromSalesCount = leadReturnedFromSalesCount
            leads[experienceCenters[k].name].junkLeadCount = junkLeadCount
            leads[experienceCenters[k].name].totalLeadsGenerated = realLeadCount + toBeCalledCount + onHoldCount + junkLeadCount
            leads[experienceCenters[k].name].teamsAssignedCount = teamsAssignedCount
            toBeCalledCount = 0, onHoldCount = 0, leadReturnedFromSalesCount = 0, realLeadCount = 0, junkLeadCount = 0, totalLeadsGenerated = 0
        }
        // leads.totalLeadsGenerated = leadsData.length
        // leads.realLeadCount = realLeadCount
        // leads.toBeCalledCount = toBeCalledCount
        // leads.onHoldCount = onHoldCount
        // leads.leadReturnedFromSalesCount = leadReturnedFromSalesCount
        // leads.teamsAssignedCount = teamsAssignedCount
        // leads.junkLeadCount = junkLeadCount
        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})

// get those lead which are moved to another department.
// for marketing, sales and design department
router.get('/won-deals-other-dept', async (req, res) => {
    try {
        const date = new Date()
        let query = {};
        switch (req.query.filterOption) {
            case "createdAt":
                query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            case "leadWonDate":
                query['leadWonDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            case "designSignOffDate":
                query['designSignOffDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            default:
                break;
        }

        if (req.user.departmentId === '62833e4c6999f0dd8be397a0') { // Marketing Department Id
            if (req.user.roles.find(role => role.name === "Marketing Manager")) {
                const usersInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
                    .select('_id')
                query = { ...query, leadType: 'Real', previouslyAssignedTo: { $in: usersInTeam } }
            } else {
                query = { ...query, leadType: 'Real', previouslyAssignedTo: req.user._id }
            }
        } else if (req.user.departmentId === '5cb5b38bcf5531e174cb23e0') { // Sales Department Id
            if (req.user.roles.find(role => role.name === "Sales Head")) {
                const usersInDept = await User.find({ departmentId: req.user.departmentId, isActive: true, experienceCenterId: req.query.experienceCenterId })
                    .select('_id')
                query = { ...query, leadStatus: 'Won', leadStatus: 'Won', salesStage: "Won", designHeadAssigned: true, previouslyAssignedTo: { $in: usersInDept } }
            } else if (req.user.roles.find(role => role.name === "Sales Manager")) {
                const usersInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
                    .select('_id')
                query = { ...query, salesStage: "Won", designHeadAssigned: true, previouslyAssignedTo: { $in: usersInTeam } }
            } else if (req.user.roles.find(role => role.name === "Assistant Sales Manager")) {
                const teamUsers = await Teams.find({ _id: req.user.teamId }).select('assistantManagerUsers')
                let usersListInTeam = []
                if (teamUsers.length !== 0) {
                    for (let i = 0; i < teamUsers[0].assistantManagerUsers.length; i++) {
                        usersListInTeam.push({ _id: teamUsers[0].assistantManagerUsers[i] })
                    }
                }
                query = { ...query, salesStage: "Won", designHeadAssigned: true, previouslyAssignedTo: { $in: usersListInTeam } }
            } else {
                query = { ...query, salesStage: "Won", designHeadAssigned: true, previouslyAssignedTo: req.user._id }
            }
        } else { // For Design Department
            if (req.user.roles.length !== 2 && req.user.roles.find((role) => role.name === "Design Manager")) {
                const usersInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
                    .select('_id')
                query = { ...query, isERPProjectCreated: true, previouslyAssignedTo: { $in: usersInTeam } }
            } else if (req.user.roles.find(role => role.name === "Design User")) {
                query = { ...query, isERPProjectCreated: true, previouslyAssignedTo: req.user._id }
            } else {
                const usersInDept = await User.find({ departmentId: req.user.departmentId, isActive: true })
                    .select('_id')
                query = { ...query, isERPProjectCreated: true, previouslyAssignedTo: { $in: usersInDept } }
            }
        }
        const response = await Lead.find(query)
            .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
            .populate('customerId', '_id email address name contact_no')
            .sort({ createdAt: -1 })
            .lean()
        if (response.length == 0) return res.status(200).json([])
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})



// Get selected users data, which is selected by sales manager and sales head in dashboard page
router.post('/getSelectedUsersData', async (req, res) => {
    try {
        const date = new Date()
        // let query = { createdAt: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() } }
        let query = {}
        switch (req.body.filterOption) {
            case "createdAt":
                query['createdAt'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
                break;

            case "leadWonDate":
                query['leadWonDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
                break;

            case "designSignOffDate":
                query['designSignOffDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
                break;

            default:
                query['createdAt'] = { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() };
                break;
        }
        let startMonth = date.getMonth()
        let endMonth = date.getMonth()
        let year = date.getFullYear()
        if (req.body.startDate && req.body.endDate) {
            // query['createdAt'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) }
            startMonth = new Date(req.body.startDate).getMonth()
            endMonth = new Date(req.body.endDate).getMonth()
            year = new Date(req.body.startDate).getFullYear()
        }
        let monthArr = []
        for (let i = startMonth; i <= endMonth; i++) {
            monthArr.push(i)
        }

        if (req.body.experienceCenterId) {
            query['experienceCenterId'] = req.body.experienceCenterId
        }
        if (req.body.locationId) {
            query['locationId'] = req.body.locationId
        }
        // if (req.body.assignTo) {
        //     query['assignTo'] = { $in: req.body.assignTo }
        // }
        let leads
        leads = []
        let total = {
            name: "Total"
        }
        let info = {
            name: 'topInfo'
        }
        const usersInTeam = await User.find({ teamId: req.user.teamId })
            .select('_id')
        // To get the only sales user from selected dropdown list.
        // To capture only sales user target and achived target.
        let todayDate = new Date()
        let currentDate = new Date()
        let nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
        let reminderQuery = { reminderDate: { $gte: new Date(todayDate.setHours(0, 0, 0, 0)), $lte: new Date(nextDate.setHours(0, 0, 0, 0)) } };
        const users = await User.find({})
            .select('_id')
            .populate({ path: 'roles', select: '_in name' })
        let checkTargetAndAchivedUser = [];
        for (let d = 0; d < req.body.assignTo.length; d++) {
            for (let b = 0; b < users.length; b++) {
                for (let c = 0; c < users[b].roles.length; c++) {
                    if (users[b].roles[c].name === 'Sales User' && req.body.assignTo[d].toString() === users[b]._id.toString()) {
                        checkTargetAndAchivedUser.push(req.body.assignTo[d])
                    }
                }
            }
        }

        if (query.createdAt) {
            const leadToMeetingTotal = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: { $in: checkTargetAndAchivedUser } }, { assignTo: { $in: checkTargetAndAchivedUser } }] })
            const leadToMeetingVal = await Lead.find({ salesMeetingDone: true, ...query, $or: [{ previouslyAssignedTo: { $in: checkTargetAndAchivedUser } }, { assignTo: { $in: checkTargetAndAchivedUser } }], })
            const MeetingToOrder = await Lead.find({ salesStage: 'Won', ...query, $or: [{ previouslyAssignedTo: { $in: checkTargetAndAchivedUser } }, { assignTo: { $in: checkTargetAndAchivedUser } }], })
            let leadToMeeting = {
                leadToMeetingTotal: leadToMeetingTotal.length,
                leadToMeetingVal: leadToMeetingVal.length,
                MeetingToOrder: MeetingToOrder.length
            }
            info.leadToMeeting = leadToMeeting
        }
        const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: checkTargetAndAchivedUser } })
        const achivedTarget = await Lead.find({ ...query, salesStage: "Won", $or: [{ previouslyAssignedTo: { $in: checkTargetAndAchivedUser } }, { assignTo: { $in: req.body.assignTo } }] })
        const openLeads = await Lead.find({
            leadStatus: "Open",
            $or: [{ previouslyAssignedTo: { $in: req.body.assignTo } }, { assignTo: { $in: req.body.assignTo } }],
            createdAt: { $gt: new Date(date.getFullYear(), date.getMonth() - 2, 1), $lte: new Date() },
        })
        const activitiesForToday = await LeadLogs.find({ ...reminderQuery, user: { $in: checkTargetAndAchivedUser } })
            .lean()
        info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
        info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
        info.openLeads = openLeads
        info.leadsPending10 = []
        info.activitiesForToday = activitiesForToday

        const teamMembers = await User.find({ _id: { $in: req.body.assignTo } }, '_id name teamId')
        // const teamMembers = await User.find({ $and: [{ teamId: req.user.teamId }] }, '_id name teamId')
        delete query.experienceCenterId
        let valueToBeUpdated = 0
        for (let j = 0; j < teamMembers.length; j++) {
            const response = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: { $in: teamMembers[j]._id } }, { assignTo: { $in: teamMembers[j]._id } }] })
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })

            const allresponse = await Lead.find({ experienceCenterId: req.body.experienceCenterId, $or: [{ previouslyAssignedTo: teamMembers[j]._id }, { assignTo: teamMembers[j]._id }] })
                .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })

            let stageOne = await Lead.find({ experienceCenterId: req.body.experienceCenterId, salesStage: 'Lead Received', assignTo: teamMembers[j]._id });
            valueToBeUpdated = valueToBeUpdated + stageOne.length;
            info.leadsPending = valueToBeUpdated;

            let obj = {
                userId: teamMembers[j]._id,
                name: teamMembers[j].name,
                teamId: teamMembers[j].teamId
            }

            if (obj.stage == undefined) {
                obj.stage = {}
            }
            for (let i = 0; i < salesStages.length; i++) {
                obj.stage[salesStages[i]] = 0
            }
            for (let i = 0; i < leadStatus.length; i++) {
                obj[leadStatus[i]] = {}
                obj[leadStatus[i]].count = 0
                obj[leadStatus[i]].value = 0
            }
            // for (let m = 0; m < allresponse.length; m++) {
            //     if (obj.stage[allresponse[m].salesStage]) {
            //         obj.stage[allresponse[m].salesStage] += 1
            //     } else {
            //         obj.stage[allresponse[m].salesStage] = 1
            //     }
            // }

            for (let m = 0; m < allresponse.length; m++) {
                if (allresponse[m].salesStage) {
                    obj.stage[allresponse[m].salesStage] += 1
                    obj.stage.Total += 1
                } else {
                    obj.stage[allresponse[m].salesStage] = 1
                }
                if (allresponse[m].salesStage === "Won Deals Pending Designer Assignment" && !allresponse[m].designerAssigned) {
                    if (info.designerPending == undefined) {
                        info.designerPending = 1
                    } else {
                        info.designerPending += 1
            }
                }
            }

            for (let i = 0; i < response.length; i++) {
                if (response[i].tokenPercent < 10 && response[i].salesStage === "Won") {
                    info.leadsPending10.push(response[i])
                }
                if (obj[response[i].leadStatus]) {
                    obj[response[i].leadStatus].count += 1
                    obj[response[i].leadStatus].value += +response[i].grandTotal

                } else {
                    obj[response[i].leadStatus] = {}
                    obj[response[i].leadStatus].count = 1
                    obj[response[i].leadStatus].value = +response[i].grandTotal
                }
                if (total[response[i].leadStatus]) {
                    total[response[i].leadStatus].count += 1
                    total[response[i].leadStatus].value += +response[i].grandTotal
                } else {
                    total[response[i].leadStatus] = {}
                    total[response[i].leadStatus].count = 1
                    total[response[i].leadStatus].value = +response[i].grandTotal
                }

                // if (obj.stage[response[i].salesStage]) {
                //     obj.stage[response[i].salesStage] += 1
                // } else {
                //     obj.stage[response[i].salesStage] = 1
                // }
                // if (response[i].salesStage == "Lead Received") {
                //     if (info.leadsPending == undefined) {
                //         info.leadsPending = 1
                //     } else {
                //         info.leadsPending += 1
                //     }
                // }
                if (response[i].salesStage == "Won Deals Pending Designer Assignment") {
                    // if (!response[i].designerAssigned) {
                    //     if (info.designerPending == undefined) {
                    //         info.designerPending = 1
                    //     } else {
                    //         info.designerPending += 1
                    //     }
                    // }
                    if (response[i].designerAssigned && response[i].paymentDone < 10) {
                        if (info.paymentPending == undefined)
                            info.paymentPending = 1
                        else
                            info.paymentPending += 1
                    }
                    if (response[i].designerAssigned && response[i].paymentDone < 10 && !response[i].customerAccepted) {
                        if (info.customerAcceptancePending == undefined)
                            info.customerAcceptancePending = 1
                        else
                            info.customerAcceptancePending += 1
                    }
                }
            }
            obj.salesUserTotal = {
                count: obj.Won.count + obj.Lost.count + obj.Open.count,
                value: obj.Won.value + obj.Lost.value + obj.Open.value,
            }
            leads.push(obj)
        }
        let woncount = total.Won ? Number(total.Won.count) : 0
        let OpenCount = total.Open ? Number(total.Open.count) : 0
        let lostcount = total.Lost ? Number(total.Lost.count) : 0
        let wonvalue = total.Won ? Number(total.Won.value) : 0
        let Openvalue = total.Open ? Number(total.Open.value) : 0
        let lostvalue = total.Lost ? Number(total.Lost.value) : 0
        total.salesUserTotal = {
            count: woncount + OpenCount + lostcount,
            value: wonvalue + Openvalue + lostvalue,
        }
        leads.push(total)
        leads.push(info)

        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

router.get('/search-customer', async (req, res) => {
    try {
        const date = new Date()
        let query = { designSignOffDate: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() } }
        if (req.user.roles.find(role => role.name === "Design Head")) {
            const userInDepartment = await User.find({ departmentId: req.user.departmentId }).select('_id')
            query = { ...query, $or: [{ designStatus: "Design" }, { $and: [{ leadStatus: "Won", previouslyAssignedTo: { $in: userInDepartment } }] }] }
        } else if (req.user.roles.find(role => role.name === "Design Manager")) {
            const userInTeam = await User.find({ teamId: req.user.teamId }).select('_id')
            query = { ...query, $or: [{ designStatus: "Design" }, { $and: [{ leadStatus: "Won", previouslyAssignedTo: { $in: userInTeam } }] }] }
        } else {
            query = { $or: [{ designStatus: "Design" }, { $and: [{ leadStatus: "Won", previouslyAssignedTo: req.user._id }] }] }
        }
        const response = await Lead.find(query)
        if (response.length === 0) return res.status(200).json([])
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})

// Sales Dashboard API
router.get('/sales', async (req, res) => {
    try {
        const date = new Date()
        // let query = {}
        let startMonth = date.getMonth();
        let endMonth = date.getMonth();
        let year = date.getFullYear();
        let query = {}
        switch (req.query.filterOption) {
            case "createdAt":
                query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            case "leadWonDate":
                query['leadWonDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            case "designSignOffDate":
                query['designSignOffDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            default:
                query['leadWonDate'] = { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() };
                break;
        }

        let todayDate = new Date()
        let currentDate = new Date()
        let nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
        let reminderQuery = { reminderDate: { $gte: new Date(todayDate.setHours(0, 0, 0, 0)), $lte: new Date(nextDate.setHours(0, 0, 0, 0)) } };

        if (req.query.startDate && req.query.endDate) {
            // query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
            // reminderQuery['reminderDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
            startMonth = new Date(req.query.startDate).getMonth()
            endMonth = new Date(req.query.endDate).getMonth()
            year = new Date(req.query.startDate).getFullYear()
        }
        let monthArr = []
        for (let i = startMonth; i <= endMonth; i++) {
            monthArr.push(i)
        }
        if (req.query.experienceCenterId) {
            query['experienceCenterId'] = req.query.experienceCenterId
        }
        if (req.query.locationId) {
            query['locationId'] = req.query.locationId
        }
        let leads
        if (req.user.roles.find(role => role.name === "Sales Head")) {
            leads = []
            let total = {
                name: "Total"
            }
            let info = {
                name: 'topInfo'
            }

            const userIndepartment = await User.find({ departmentId: req.user.departmentId, isActive: true, experienceCenterId: req.query.experienceCenterId })
                .select('_id name departmentId teamId')
                .populate('roles', 'name')
            let allSalesUser = [];
            let allSalesData = [];
            let allSalesUserAndManager = [];
            userIndepartment.forEach(ele => {
                if (ele.roles.find(ele => ele.name === 'Sales User')) {
                    allSalesUser.push({ _id: ele._id })
                    allSalesData.push(ele);
                }
                if (ele.roles.find(ele => ele.name === 'Sales User' || ele.name === 'Sales Manager')) {
                    allSalesUserAndManager.push(ele)
                }
            })
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: allSalesUser } })
            const achivedTarget = await Lead.find({
                $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }],
                ...query, salesStage: 'Won'
            })

            const openLeads = await Lead.find({
                leadStatus: "Open",
                $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }],
                createdAt: { $gt: new Date(date.getFullYear(), date.getMonth() - 2, 1), $lte: new Date() },
                experienceCenterId: req.query.experienceCenterId
            })
                .select('area leadType leadStatus createdAt address leadWonDate grandTotal discountPercent lead_no salesStage currentStage')
                .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' })

            const activitiesForToday = await LeadLogs.find({ ...reminderQuery, user: { $in: userIndepartment } })
                .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, select: 'lead_no' })
                .populate({ path: 'createdBy', select: 'name email contact_no' })
                .sort({ createdAt: -1 })
                .lean()
            if (query.createdAt) {
                const leadToMeetingTotal = await Lead.find({ ...query })
                const leadToMeetingVal = await Lead.find({ salesMeetingDone : true, ...query })
                const MeetingToOrder = await Lead.find({ salesStage: 'Won', ...query })
                let leadToMeeting = {
                    leadToMeetingTotal: leadToMeetingTotal.length,
                    leadToMeetingVal: leadToMeetingVal.length,
                    MeetingToOrder: MeetingToOrder.length
                }
                info.leadToMeeting = leadToMeeting
            }
            info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            info.openLeads = openLeads
            info.leadsPending10 = []
            info.activitiesForToday = activitiesForToday
            let stageOne = await Lead.find({ experienceCenterId: req.query.experienceCenterId, salesStage: 'Lead Received' });
            info.leadsPending = stageOne.length;
            const teamMembers = await User.find({ departmentId: req.user.departmentId, isActive: true, experienceCenterId: req.query.experienceCenterId }, '_id')
            const getWonDealPendingDesigner = await Lead.find({ salesStage: "Won Deals Pending Designer Assignment", experienceCenterId: req.query.experienceCenterId, $or: [{ previouslyAssignedTo: { $in: teamMembers } }, { assignTo: { $in: teamMembers } }] }).select('lead_no')
            info.designerPending = getWonDealPendingDesigner.length;
            
            for (let j = 0; j < allSalesData.length; j++) {
                delete query.experienceCenterId
                const response = await Lead.find({
                    $or: [{ previouslyAssignedTo: allSalesData[j]._id }, { assignTo: allSalesData[j]._id }],
                    ...query
                })
                    .select('lead_no leadStatus leadType grandTotal departmentId tokenPercent salesStage currentStage designerAssigned designHeadAssigned customerAccepted')
                    .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' }).populate("teamId", "name _id")
                const allresponse = await Lead.find({
                    $or: [{ previouslyAssignedTo: allSalesData[j]._id }, { assignTo: allSalesData[j]._id }],
                    experienceCenterId: req.query.experienceCenterId
                    // ...query
                })
                    .select('lead_no leadStatus leadType grandTotal departmentId tokenPercent salesStage currentStage designerAssigned designHeadAssigned customerAccepted')
                    .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' }).populate("teamId", "name _id")
                let obj = {
                    userId: allSalesData[j]._id,
                    name: allSalesData[j].name,
                    teamId: allSalesData[j].teamId
                }
                if (obj.stage == undefined) {
                    obj.stage = {}
                }
                for (let i = 0; i < salesStages.length; i++) {
                    obj.stage[salesStages[i]] = 0
                    obj.stage['Total'] = 0;
                }
                for (let i = 0; i < leadStatus.length; i++) {
                    obj[leadStatus[i]] = {}
                    obj[leadStatus[i]].count = 0
                    obj[leadStatus[i]].value = 0
                }
                for (let m = 0; m < allresponse.length; m++) {
                    if (allresponse[m].salesStage) {
                        obj.stage[allresponse[m].salesStage] += 1
                        obj.stage.Total += 1
                    } else {
                        obj.stage[allresponse[m].salesStage] = 1
                    }

                    // if (allresponse[m].salesStage === "Won Deals Pending Designer Assignment" && !allresponse[m].designerAssigned) {
                    //     if (info.designerPending == undefined) {
                    //         info.designerPending = 1
                    //     } else {
                    //         info.designerPending += 1
                    //     }
                    // }
                }
                for (let i = 0; i < response.length; i++) {
                    if (response[i].tokenPercent < 10 && response[i].salesStage === "Won") {
                        info.leadsPending10.push(response[i])
                    }
                    // Lead Status count and value
                    if (obj[response[i].leadStatus]) {
                        obj[response[i].leadStatus].count += 1
                        obj[response[i].leadStatus].value += +response[i].grandTotal

                    } else {
                        obj[response[i].leadStatus] = {}
                        obj[response[i].leadStatus].count = 1
                        obj[response[i].leadStatus].value = +response[i].grandTotal
                    }
                    // Lead Status Total
                    if (total[response[i].leadStatus]) {
                        total[response[i].leadStatus].count += 1
                        total[response[i].leadStatus].value += +response[i].grandTotal
                    } else {
                        total[response[i].leadStatus] = {}
                        total[response[i].leadStatus].count = 1
                        total[response[i].leadStatus].value = +response[i].grandTotal
                    }

                    // if (obj.stage[response[i].salesStage]) {
                    //     obj.stage[response[i].salesStage] += 1
                    // } else {
                    //     obj.stage[response[i].salesStage] = 1
                    // }
                    if (response[i].salesStage === "Won Deals Pending Designer Assignment") {
                        // if (!response[i].designerAssigned) {
                        //     if (info.designerPending == undefined) {
                        //         info.designerPending = 1
                        //     } else {
                        //         info.designerPending += 1
                        //     }
                        // }
                        if (response[i].designerAssigned && response[i].tokenPercent < 10) {
                            if (info.paymentPending == undefined)
                                info.paymentPending = 1
                            else
                                info.paymentPending += 1
                        }
                        if (response[i].designerAssigned && response[i].tokenPercent < 10 && !response[i].customerAccepted) {
                            if (info.customerAcceptancePending == undefined)
                                info.customerAcceptancePending = 1
                            else
                                info.customerAcceptancePending += 1
                        }
                    }
                }
                obj.salesUserTotal = {
                    count: obj.Won.count + obj.Lost.count + obj.Open.count,
                    value: obj.Won.value + obj.Lost.value + obj.Open.value,
                }
                leads.push(obj)
            }
            let woncount = total.Won ? Number(total.Won.count) : 0
            let OpenCount = total.Open ? Number(total.Open.count) : 0
            let lostcount = total.Lost ? Number(total.Lost.count) : 0
            let wonvalue = total.Won ? Number(total.Won.value) : 0
            let Openvalue = total.Open ? Number(total.Open.value) : 0
            let lostvalue = total.Lost ? Number(total.Lost.value) : 0
            total.salesUserTotal = {
                count: woncount + OpenCount + lostcount,
                value: wonvalue + Openvalue + lostvalue,
            }
            if(info.leadToMeeting){
            info.leadsInMarketing = info.leadToMeeting.leadToMeetingTotal - total.salesUserTotal.count
            }
            leads.push(total)
            leads.push(info)
        }
        else if (req.user.roles.find(role => role.name === "Sales Manager")) {
            leads = []
            let total = {
                name: "Total"
            }
            let info = {
                name: 'topInfo'
            }

            const usersInTeam = await User.find({ teamId: req.user.teamId, _id: { $ne: req.user._id }, isActive: true })
                .select('_id')
            const usersListInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
                .select('_id')
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: usersListInTeam } })
            const achivedTarget = await Lead.find({ previouslyAssignedTo: { $in: usersListInTeam }, ...query, salesStage: 'Won' })
            // const achivedTarget = await Lead.find({ previouslyAssignedTo: { $in: usersInTeam }, ...query, salesStage: { $in: ['Won', 'Won Deals Pending Designer Assignment'] } })
            const openLeads = await Lead.find({
                leadStatus: "Open",
                experienceCenterId: req.query.experienceCenterId,
                $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }],
                createdAt: { $gt: new Date(date.getFullYear(), date.getMonth() - 2, 1), $lte: new Date() }
            })
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' })

            const activitiesForToday = await LeadLogs.find({ ...reminderQuery, user: { $in: usersListInTeam } })
                .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, select: 'lead_no' })
                .populate({ path: 'createdBy', select: 'name email contact_no' })
                .sort({ createdAt: -1 })
                .lean()

            if (query.createdAt) {
                const leadToMeetingTotal = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }] })
                const leadToMeetingVal = await Lead.find({ salesMeetingDone : true, ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }], })
                const MeetingToOrder = await Lead.find({ salesStage: 'Won', ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }], })
                let leadToMeeting = {
                    leadToMeetingTotal: leadToMeetingTotal.length,
                    leadToMeetingVal: leadToMeetingVal.length,
                    MeetingToOrder: MeetingToOrder.length
                }
                info.leadToMeeting = leadToMeeting
            }
            info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            info.openLeads = openLeads
            info.leadsPending10 = []
            info.activitiesForToday = activitiesForToday
            let stageOne = await Lead.find({ experienceCenterId: req.query.experienceCenterId, salesStage: 'Lead Received', assignTo: req.user._id });
            info.leadsPending = stageOne.length;

            const teamMembersList = await User.find({ teamId: req.user.teamId, isActive: true }).select('_id')
            const getWonDealPendingDesigner = await Lead.find({ salesStage: "Won Deals Pending Designer Assignment", experienceCenterId: req.query.experienceCenterId, $or: [{ previouslyAssignedTo: { $in: teamMembersList } }, { assignTo: { $in: teamMembersList } }] })
            info.designerPending = getWonDealPendingDesigner.length;

            const teamMembers = await User.find({ $and: [{ teamId: req.user.teamId, isActive: true }] }, '_id name teamId')
            for (let j = 0; j < teamMembers.length; j++) {
                delete query.experienceCenterId
                // query['assignTo'] = teamMembers[j]._id
                const response = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: teamMembers[j]._id }, { assignTo: teamMembers[j]._id }] })
                    .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' })
                const allresponse = await Lead.find({ experienceCenterId: req.query.experienceCenterId, $or: [{ previouslyAssignedTo: teamMembers[j]._id }, { assignTo: teamMembers[j]._id }] })
                    .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' }).populate("teamId", "name _id")
                let obj = {
                    userId: teamMembers[j]._id,
                    name: teamMembers[j].name,
                    teamId: teamMembers[j].teamId
                }

                if (obj.stage == undefined) {
                    obj.stage = {}
                }
                for (let i = 0; i < salesStages.length; i++) {
                    obj.stage[salesStages[i]] = 0
                    obj.stage.Total = 0
                }
                for (let i = 0; i < leadStatus.length; i++) {
                    obj[leadStatus[i]] = {}
                    obj[leadStatus[i]].count = 0
                    obj[leadStatus[i]].value = 0
                }
                for (let m = 0; m < allresponse.length; m++) {
                    if (allresponse[m].salesStage) {
                        obj.stage[allresponse[m].salesStage] += 1
                        obj.stage.Total += 1
                    } else {
                        obj.stage[allresponse[m].salesStage] = 1
                    }
                }
                for (let i = 0; i < response.length; i++) {
                    if (response[i].tokenPercent < 10 && response[i].salesStage === "Won") {
                        info.leadsPending10.push(response[i])
                    }
                    if (obj[response[i].leadStatus]) {
                        obj[response[i].leadStatus].count += 1
                        obj[response[i].leadStatus].value += +response[i].grandTotal

                    } else {
                        obj[response[i].leadStatus] = {}
                        obj[response[i].leadStatus].count = 1
                        obj[response[i].leadStatus].value = +response[i].grandTotal
                    }
                    if (total[response[i].leadStatus]) {
                        total[response[i].leadStatus].count += 1
                        total[response[i].leadStatus].value += +response[i].grandTotal
                    } else {
                        total[response[i].leadStatus] = {}
                        total[response[i].leadStatus].count = 1
                        total[response[i].leadStatus].value = +response[i].grandTotal
                    }

                    // if (obj.stage[response[i].salesStage]) {
                    //     obj.stage[response[i].salesStage] += 1
                    // } else {
                    //     obj.stage[response[i].salesStage] = 1
                    // }
                    // if (response[i].salesStage == "Lead Received") {
                    //     if (info.leadsPending == undefined) {
                    //         info.leadsPending = 1
                    //     } else {
                    //         info.leadsPending += 1
                    //     }
                    // }
                    if (response[i].salesStage == "Won Deals Pending Designer Assignment") {
                        // if (!response[i].designerAssigned) {
                        //     if (info.designerPending == undefined) {
                        //         info.designerPending = 1
                        //     } else {
                        //         info.designerPending += 1
                        //     }
                        // }
                        if (response[i].designerAssigned && response[i].tokenPercent < 10) {
                            if (info.paymentPending == undefined)
                                info.paymentPending = 1
                            else
                                info.paymentPending += 1
                        }
                        if (response[i].designerAssigned && response[i].tokenPercent < 10 && !response[i].customerAccepted) {
                            if (info.customerAcceptancePending == undefined)
                                info.customerAcceptancePending = 1
                            else
                                info.customerAcceptancePending += 1
                        }
                    }
                }
                obj.salesUserTotal = {
                    count: obj.Won.count + obj.Lost.count + obj.Open.count,
                    value: obj.Won.value + obj.Lost.value + obj.Open.value,
                }
                leads.push(obj)
            }
            let woncount = total.Won ? Number(total.Won.count) : 0
            let OpenCount = total.Open ? Number(total.Open.count) : 0
            let lostcount = total.Lost ? Number(total.Lost.count) : 0
            let wonvalue = total.Won ? Number(total.Won.value) : 0
            let Openvalue = total.Open ? Number(total.Open.value) : 0
            let lostvalue = total.Lost ? Number(total.Lost.value) : 0
            total.salesUserTotal = {
                count: woncount + OpenCount + lostcount,
                value: wonvalue + Openvalue + lostvalue,
            }
            leads.push(total)
            leads.push(info)
        }
        else if (req.user.roles.find(role => role.name === "Assistant Sales Manager")) {
            leads = []
            let total = {
                name: "Total"
            }
            let info = {
                name: 'topInfo'
            }

            const usersInTeam = await Teams.find({ _id: req.user.teamId, isActive: true })
                .select('assistantManagerUsers')
            let usersListInTeam = []
            if (usersInTeam.length !== 0) {
                for (let i = 0; i < usersInTeam[0].assistantManagerUsers.length; i++) {
                    usersListInTeam.push({ _id: usersInTeam[0].assistantManagerUsers[i] })
                }
            }
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: usersListInTeam } })
            const achivedTarget = await Lead.find({ previouslyAssignedTo: { $in: usersListInTeam }, ...query, salesStage: 'Won' })

            const openLeads = await Lead.find({
                leadStatus: "Open",
                experienceCenterId: req.query.experienceCenterId,
                $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }],
                createdAt: { $gt: new Date(date.getFullYear(), date.getMonth() - 2, 1), $lte: new Date() }
            })
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' })

            const activitiesForToday = await LeadLogs.find({ ...reminderQuery, user: { $in: usersListInTeam } })
                .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, select: 'lead_no' })
                .populate({ path: 'createdBy', select: 'name email contact_no' })
                .sort({ createdAt: -1 })
                .lean()

            if (query.createdAt) {
                const leadToMeetingTotal = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }] })
                const leadToMeetingVal = await Lead.find({ salesMeetingDone : true, ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }], })
                const MeetingToOrder = await Lead.find({ salesStage: 'Won', ...query, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }], })
                let leadToMeeting = {
                    leadToMeetingTotal: leadToMeetingTotal.length,
                    leadToMeetingVal: leadToMeetingVal.length,
                    MeetingToOrder: MeetingToOrder.length
                }
                info.leadToMeeting = leadToMeeting
            }
            info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            info.openLeads = openLeads
            info.leadsPending10 = []
            info.activitiesForToday = activitiesForToday
            let stageOne = await Lead.find({ experienceCenterId: req.query.experienceCenterId, salesStage: 'Lead Received', assignTo: req.user._id });
            info.leadsPending = stageOne.length;

            const teamMembersList = await User.find({ teamId: req.user.teamId, isActive: true }).select('_id')
            const getWonDealPendingDesigner = await Lead.find({ salesStage: "Won Deals Pending Designer Assignment", experienceCenterId: req.query.experienceCenterId, $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }] })
            info.designerPending = getWonDealPendingDesigner.length;

            const users = await Teams.find({ _id: req.user.teamId, isActive: true })
                .select('_id assistantManagerUsers')
            let teamMembers = []
            for (let i = 0; i < usersInTeam[0].assistantManagerUsers.length; i++) {
                teamMembers.push({ _id: usersInTeam[0].assistantManagerUsers[i] })
            }
            for (let j = 0; j < teamMembers.length; j++) {
                const user = await User.find({ $and: [{ _id: teamMembers[j]._id, isActive: true }] }, '_id name teamId')
                delete query.experienceCenterId
                const response = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: user[0]._id }, { assignTo: user[0]._id }] })
                    .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' })
                const allresponse = await Lead.find({ experienceCenterId: req.query.experienceCenterId, $or: [{ previouslyAssignedTo: user[0]._id }, { assignTo: user[0]._id }] })
                    .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' }).populate("teamId", "name _id")
                let obj = {
                    userId: user[0]._id,
                    name: user[0].name,
                    teamId: user[0].teamId
                }

                if (obj.stage == undefined) {
                    obj.stage = {}
                }
                for (let i = 0; i < salesStages.length; i++) {
                    obj.stage[salesStages[i]] = 0
                    obj.stage.Total = 0
                }
                for (let i = 0; i < leadStatus.length; i++) {
                    obj[leadStatus[i]] = {}
                    obj[leadStatus[i]].count = 0
                    obj[leadStatus[i]].value = 0
                }
                for (let m = 0; m < allresponse.length; m++) {
                    if (allresponse[m].salesStage) {
                        obj.stage[allresponse[m].salesStage] += 1
                        obj.stage.Total += 1
                    } else {
                        obj.stage[allresponse[m].salesStage] = 1
                    }
                }
                for (let i = 0; i < response.length; i++) {
                    if (response[i].tokenPercent < 10 && response[i].salesStage === "Won") {
                        info.leadsPending10.push(response[i])
                    }
                    if (obj[response[i].leadStatus]) {
                        obj[response[i].leadStatus].count += 1
                        obj[response[i].leadStatus].value += +response[i].grandTotal

                    } else {
                        obj[response[i].leadStatus] = {}
                        obj[response[i].leadStatus].count = 1
                        obj[response[i].leadStatus].value = +response[i].grandTotal
                    }
                    if (total[response[i].leadStatus]) {
                        total[response[i].leadStatus].count += 1
                        total[response[i].leadStatus].value += +response[i].grandTotal
                    } else {
                        total[response[i].leadStatus] = {}
                        total[response[i].leadStatus].count = 1
                        total[response[i].leadStatus].value = +response[i].grandTotal
                    }


                    if (response[i].salesStage == "Won Deals Pending Designer Assignment") {
                        if (response[i].designerAssigned && response[i].tokenPercent < 10) {
                            if (info.paymentPending == undefined)
                                info.paymentPending = 1
                            else
                                info.paymentPending += 1
                        }
                        if (response[i].designerAssigned && response[i].tokenPercent < 10 && !response[i].customerAccepted) {
                            if (info.customerAcceptancePending == undefined)
                                info.customerAcceptancePending = 1
                            else
                                info.customerAcceptancePending += 1
                        }
                    }
                }
                obj.salesUserTotal = {
                    count: obj.Won.count + obj.Lost.count + obj.Open.count,
                    value: obj.Won.value + obj.Lost.value + obj.Open.value,
                }
                leads.push(obj)
            }
            let woncount = total.Won ? Number(total.Won.count) : 0
            let OpenCount = total.Open ? Number(total.Open.count) : 0
            let lostcount = total.Lost ? Number(total.Lost.count) : 0
            let wonvalue = total.Won ? Number(total.Won.value) : 0
            let Openvalue = total.Open ? Number(total.Open.value) : 0
            let lostvalue = total.Lost ? Number(total.Lost.value) : 0
            total.salesUserTotal = {
                count: woncount + OpenCount + lostcount,
                value: wonvalue + Openvalue + lostvalue,
            }
            leads.push(total)
            leads.push(info)
        }
        else {
            // query['assignTo'] = req.user._id
            leads = {}
            leads.info = {}
            const response = await Lead.find({ ...query, $or: [{ assignTo: req.user._id }, { previouslyAssignedTo: req.user._id }] })
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' })
            const allresponse = await Lead.find({ experienceCenterId: req.query.experienceCenterId, $or: [{ previouslyAssignedTo: req.user._id }, { assignTo: req.user._id }] })
                .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' }).populate("teamId", "name _id")
            const usersInTeam = await User.find({ teamId: req.user.teamId })
                .select('_id')
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: req.user._id })
            const achivedTarget = await Lead.find({ previouslyAssignedTo: req.user._id, ...query, salesStage: 'Won' })
            // const achivedTarget = await Lead.find({ previouslyAssignedTo: req.user._id, ...query, salesStage: { $in: ['Won', 'Won Deals Pending Designer Assignment'] } })
            const openLeads = await Lead.find({
                leadStatus: "Open", experienceCenterId: req.query.experienceCenterId,
                $and: [{ assignTo: req.user._id },{ currentStage: { $ne:'Won Deals Pending Designer Assignment'}}],
                createdAt: { $gte: new Date(date.getFullYear(), date.getMonth() - 2, 1), $lte: new Date() }
            })
                .select('lead_no createdAt leadWonDate grandTotal address area leadType salesStage currentStage')
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' })
            const activitiesForToday = await LeadLogs.find({ ...reminderQuery, user: req.user._id })
                .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, select: 'lead_no' })
                .populate({ path: 'createdBy', select: 'name email contact_no' })
                .sort({ createdAt: -1 })
                .lean()
            leads.info.LeadsAssigned = response.length
            leads.info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            leads.info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            leads.info.won = 0
            leads.info.openLeads = openLeads
            leads.info.leadsPending10 = []
            leads.info.activitiesForToday = activitiesForToday
            let stageOne = await Lead.find({ experienceCenterId: req.query.experienceCenterId, salesStage: 'Lead Received', assignTo: req.user._id });
            leads.info.leadsPending = stageOne.length;
            if (query.createdAt) {
                const leadToMeetingTotal = await Lead.find({ ...query, $or: [{ assignTo: req.user._id }, { previouslyAssignedTo: req.user._id }] })
                const leadToMeetingVal = await Lead.find({ salesMeetingDone : true, ...query, $or: [{ assignTo: req.user._id }, { previouslyAssignedTo: req.user._id }] })
                const MeetingToOrder = await Lead.find({ salesStage: 'Won', ...query, $or: [{ assignTo: req.user._id }, { previouslyAssignedTo: req.user._id }] })
                let leadToMeeting = {
                    leadToMeetingTotal: leadToMeetingTotal.length,
                    leadToMeetingVal: leadToMeetingVal.length,
                    MeetingToOrder: MeetingToOrder.length
                }
                leads.leadToMeeting = leadToMeeting
            }
            if (leads.stage == undefined) {
                leads.stage = {}
            }
            for (let i = 0; i < salesStages.length; i++) {
                leads.stage[salesStages[i]] = 0
                leads.stage.Total = 0
            }
            for (let i = 0; i < leadStatus.length; i++) {
                leads[leadStatus[i]] = {}
                leads[leadStatus[i]].count = 0
                leads[leadStatus[i]].value = 0
            }
            for (let m = 0; m < allresponse.length; m++) {
                if (allresponse[m].salesStage) {
                    leads.stage[allresponse[m].salesStage] += 1
                    leads.stage.Total += 1
                } else {
                    leads.stage[allresponse[m].salesStage] = 1
                }
                if (allresponse[m].salesStage === "Won Deals Pending Designer Assignment" && !allresponse[m].designerAssigned) {
                    if (leads.info.designerPending == undefined) {
                        leads.info.designerPending = 1
                    } else {
                        leads.info.designerPending += 1
                    }
                }
            }
            for (let i = 0; i < response.length; i++) {
                if (response[i].tokenPercent < 10 && response[i].salesStage === "Won") {
                    leads.info.leadsPending10.push(response[i])
                }
                if (response[i].leadStatus === "Won" && response[i].salesStage === 'Won') {
                    leads.info.won += response[i].grandTotal
                }
                if (leads[response[i].leadStatus]) {
                    leads[response[i].leadStatus].count += 1
                    leads[response[i].leadStatus].value += response[i].grandTotal
                } else {
                    leads[response[i].leadStatus] = {}
                    leads[response[i].leadStatus].count = 1
                    leads[response[i].leadStatus].value = response[i].grandTotal
                }

                // if (leads.stage[response[i].salesStage]) {
                //     leads.stage[response[i].salesStage] += 1
                // } else {
                //     leads.stage[response[i].salesStage] = 1
                // }

                if (response[i].salesStage == "Lead Received") {
                    if (leads.info.inStage1 == undefined) {
                        leads.info.inStage1 = 1
                    } else {
                        leads.info.inStage1 += 1
                    }
                }
                if (response[i].salesStage == "Won Deals Pending Designer Assignment") {
                    // if (!response[i].designerAssigned) {
                    //     if (leads.info.designerPending == undefined) {
                    //         leads.info.designerPending = 1
                    //     } else {
                    //         leads.info.designerPending += 1
                    //     }
                    // }
                    if (response[i].designerAssigned && response[i].tokenPercent < 10) {
                        if (leads.info.paymentPending == undefined)
                            leads.info.paymentPending = 1
                        else
                            leads.info.paymentPending += 1
                    }
                    if (response[i].designerAssigned && response[i].tokenPercent < 10 && !response[i].customerAccepted) {
                        if (leads.info.customerAcceptancePending == undefined)
                            leads.info.customerAcceptancePending = 1
                        else
                            leads.info.customerAcceptancePending += 1
                    }
                }
            }
        }
        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

router.put('/getDesignDataForContract', async (req, res) => {
    try {
        let leads = {};
        leads.contractSignLeads = []
        let months = []
        let years = []
        req.body.data.forEach(el => {
            !months.includes(el.number) && months.push(el.number)
            !years.includes(el.year) && years.push(el.year)
        })
        months = months.sort((a, b) => a - b)
        years = years.sort((a, b) => a - b)

        let query_1 = { salesStage: "Won", designHeadAssigned: true, $and: [{ $expr: { $gte: [{ $month: "$closureDate" }, months[0]] } }, { $expr: { $lte: [{ $month: "$closureDate" }, months[months.length - 1]] } }, { $expr: { $gte: [{ $year: "$closureDate" }, years[0]] } }, { $expr: { $lte: [{ $year: "$closureDate" }, years[years.length - 1]] } }] }
        if (
            req.user.roles.find((role) => role.name === "Design Manager")
        ) {
            let response_1 = await Lead.find({
                ...query_1,
                teamId: req.user.teamId,
                experienceCenterId: req.query.experienceCenterId
            })
                .select("teamId lead_no designStages designStatus grandTotal closureDate centerHeadApproved designSignOffDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            response_1 = response_1.filter(el => months.includes((new Date(el.closureDate)).getMonth() + 1))
            leads.contractSignLeads.push(...response_1);


        } else if (
            req.user.roles.find((role) => role.name === "Design Head")
        ) {

            let response_1 = await Lead.find({
                ...query_1,
                departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            response_1 = response_1.filter(el => months.includes((new Date(el.closureDate)).getMonth() + 1))

            const user = await User.find({
                departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
                isActive: true
            }).select("name teamId");

            const role = await Roles.findOne({ name: "Design Manager" }).select(
                "name"
            );

            const managers = await User.find({
                roles: role._id,
                experienceCenterId: req.query.experienceCenterId,
                isActive: true
            }).select("name teamId");

            for (let i = 0; i < response_1.length; i++) {
                let dmOrAdm = managers.find(user => user.teamId.toString() === response_1[i].assignTo.teamId.toString())
                leads.contractSignLeads.push({
                    ...response_1[i],
                    dmOrAdm: dmOrAdm?.name ? dmOrAdm.name : "No Data",
                });
            }

        }
        else if (
            req.user.roles.find((role) => role.name === "Center Head")
        ) {

            let response_1 = await Lead.find({
                ...query_1,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            response_1 = response_1.filter(el => months.includes((new Date(el.closureDate)).getMonth() + 1))

            const user = await User.find({
                departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
                isActive: true
            }).select("name teamId");

            const role = await Roles.findOne({ name: "Design Manager" }).select(
                "name"
            );

            const managers = await User.find({
                roles: role._id,
                experienceCenterId: req.query.experienceCenterId,
                isActive: true
            }).select("name teamId");

            for (let i = 0; i < response_1.length; i++) {
                let dmOrAdm = managers.find(user => user.teamId.toString() === response_1[i].assignTo.teamId.toString())
                leads.contractSignLeads.push({
                    ...response_1[i],
                    dmOrAdm: dmOrAdm?.name ? dmOrAdm.name : "No Data",
                });
            }

        } else {

            let response_1 = await Lead.find({
                ...query_1,
                assignTo: req.user._id,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            response_1 = response_1.filter(el => months.includes((new Date(el.closureDate)).getMonth() + 1))
            leads.contractSignLeads.push(...response_1);
        }
        return res.status(200).json(leads)

    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

// Design Dashboard API
router.get('/design', async (req, res) => {

    try {

        const date = new Date()
        const current_month = date.getMonth() + 1
        const current_year = date.getFullYear()
        let query = { salesStage: "Won", designHeadAssigned: true, $and: [{ $expr: { $eq: [{ $month: "$expectedDesignSignOffDate" }, current_month] } }, { $expr: { $eq: [{ $year: "$expectedDesignSignOffDate" }, current_year] } }] }
        let query_1 = { salesStage: "Won", departmentId: designDepartmentId, designHeadAssigned: true, $and: [{ $expr: { $eq: [{ $month: "$closureDate" }, current_month] } }, { $expr: { $eq: [{ $year: "$closureDate" }, current_year] } }] }
        let hold_active_query = { salesStage: "Won", designHeadAssigned: true, createdAt: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() } }
        let month = moment(date).format('MMMM')
        if (req.query.startDate && req.query.endDate) {
            // query['designSignOffDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
            hold_active_query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
            month = moment(req.query.endDate).format("MMMM");
        }
        let leads = {};
        leads.proposedContractForTheMonth = [];
        leads.contractSignLeads = []
        leads.activeCustomers = [];
        leads.designHoldCustomers = [];
        leads.performance = {};
        if (
            req.user.roles.find((role) => role.name === "Design Manager") && 
            !req.user.roles.find((role) => role.name === "Design Head")
        ) {
            const response = await Lead.find({
                ...query,
                teamId: req.user.teamId,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal closureDate centerHeadApproved designSignOffDate expectedDesignSignOffDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            const response_1 = await Lead.find({
                ...query_1,
                teamId: req.user.teamId,
                experienceCenterId: req.query.experienceCenterId
            })
                .select("teamId lead_no designStages designStatus grandTotal closureDate centerHeadApproved designSignOffDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();


            const hold_active_response = await Lead.find({
                ...hold_active_query,
                teamId: req.user.teamId,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("_id teamId lead_no designStages designStatus grandTotal designHoldReason closureDate designSignOffDate proposedDesignStartDate centerHeadApproved businessHeadApproved tokenPercent updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();

            const user = await User.find({
                $and: [{ teamId: req.user.teamId }],
                experienceCenterId: req.query.experienceCenterId,
            });
            leads.proposedContractForTheMonth.push(...response);
            leads.contractSignLeads.push(...response_1);
            let designSignOff = {}
            var firstDay = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            var lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 1);
            designSignOff["designSignOffDate"] = { $gte: firstDay, $lte: lastDay }

            for (let i = 0; i < user.length; i++) {
                let leadTotalValue = await Lead.find({ ...designSignOff, $or: [{ previouslyAssignedTo: { $in: user[i]._id } }, { assignTo: { $in: user[i]._id } }] }).select("grandTotal").lean()
                let grandTotalValue = 0;

                for (let j = 0; j < leadTotalValue.length; j++) {
                    grandTotalValue = grandTotalValue + (Number(leadTotalValue[j].grandTotal))
                }
                leads.performance[user[i].name] = {};
                leads.performance[user[i].name].contractSignNumbers = leadTotalValue.length ;
                leads.performance[user[i].name].contractSignValue = grandTotalValue;
                leads.performance[user[i].name].month = month;
            }

            for (let i = 0; i < hold_active_response.length; i++) {
                if (hold_active_response[i].tokenPercent >= 5) {
                    hold_active_response[i].salesDate = hold_active_response[i].centerHeadApproved[0]?.approvedDate;
                } else {
                    if (hold_active_response[i].centerHeadApproved[0]?.approvedDate <= hold_active_response[i].businessHeadApproved[0]?.approvedDate) {
                        hold_active_response[i].salesDate = hold_active_response[i].businessHeadApproved[0]?.approvedDate;
                    } else {
                        hold_active_response[i].salesDate = hold_active_response[i].centerHeadApproved[0]?.approvedDate;
                    }
                }
                const logsdata = await LeadLogs.find({ leadId: hold_active_response[i]._id, stage: "Assign to Designer" }).lean().select("stage createdAt");
                if (logsdata.length != 0) {
                    hold_active_response[i].assignedDate = logsdata[0].createdAt;
                } else {
                    hold_active_response[i].assignedDate = false;
                }
                if (
                    hold_active_response[i].designStatus !== "Design-Hold" &&
                    hold_active_response[i].salesStage !== "Lost"
                ) {
                    leads.activeCustomers.push(hold_active_response[i]);
                }
                if (
                    hold_active_response[i].designStatus === "Design-Hold" &&
                    hold_active_response[i].salesStage !== "Lost"
                ) {
                    leads.designHoldCustomers.push(hold_active_response[i]);
                }
            }

            for (let i = 0; i < response.length; i++) {
                if (leads.performance[response[i].assignTo.name]) {
                    leads.performance[response[i].assignTo.name].contractSignNumbers += 1;
                    leads.performance[response[i].assignTo.name].contractSignValue +=
                        response[i].grandTotal;
                }
            }
        } else if (
            // req.user.roles.length === 2 &&
            req.user.roles.find((role) => role.name === "Design Head")
        ) {
            const response = await Lead.find({
                ...query,
                departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate expectedDesignSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            const response_1 = await Lead.find({
                ...query_1,
                // departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();

            const hold_active_response = await Lead.find({
                ...hold_active_query,
                departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal designHoldReason designSignOffDate closureDate proposedDesignStartDate centerHeadApproved updatedAt businessHeadApproved tokenPercent")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            const user = await User.find({
                departmentId: req.user.departmentId,
                experienceCenterId: req.query.experienceCenterId,
                isActive: true
            }).select("name teamId");
            const role = await Roles.findOne({ name: "Design Manager" }).select(
                "name"
            );
            const managers = await User.find({
                roles: role._id,
                experienceCenterId: req.query.experienceCenterId,
                isActive: true
            }).select("name teamId");
            // const managers = await User.find({ teamId: req.user.teamId, roles: role._id })
            let designSignOff = {}
            var firstDay = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            var lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 1);
            designSignOff["designSignOffDate"] = { $gte: firstDay, $lte: lastDay }
            for (let i = 0; i < user.length; i++) {
                let dmOrAdm = ""
                for (let j = 0; j < managers.length; j++) {
                    dmOrAdm = managers.find(
                        (ele) => ele.teamId.toString() === user[i].teamId.toString()
                    );
                }
                let leadTotalValue = await Lead.find({...designSignOff, $or: [{ previouslyAssignedTo: { $in: user[i]._id } }, { assignTo: { $in: user[i]._id } }] }).select("grandTotal").lean()
                let grandTotalValue=0;
                
                for (let j = 0; j < leadTotalValue.length; j++) {
                grandTotalValue = grandTotalValue+(Number(leadTotalValue[j].grandTotal))
                }

                    leads.performance[user[i].name] = {};
                    leads.performance[user[i].name].contractSignNumbers = leadTotalValue.length;
                    leads.performance[user[i].name].contractSignValue = grandTotalValue;
                    leads.performance[user[i].name].month = month;
                    leads.performance[user[i].name].dmOrAdm = dmOrAdm?.name;
                }
            
            
                for (let i = 0; i < hold_active_response.length; i++) {
                if (hold_active_response[i].tokenPercent >= 5) {
                    hold_active_response[i].salesDate = hold_active_response[i].centerHeadApproved[0]?.approvedDate;
                } else {
                    if (hold_active_response[i].centerHeadApproved[0]?.approvedDate <= hold_active_response[i].businessHeadApproved[0]?.approvedDate) {
                        hold_active_response[i].salesDate = hold_active_response[i].businessHeadApproved[0]?.approvedDate;
                    } else {
                        hold_active_response[i].salesDate = hold_active_response[i].centerHeadApproved[0]?.approvedDate;
                    }
                }
                let dmOrAdm = managers.find(
                    (user) =>
                        user.teamId.toString() ===
                        hold_active_response[i].assignTo.teamId.toString()
                );
                const logsdata = await LeadLogs.find({ leadId: hold_active_response[i]._id, stage: "Assign to Designer" }).lean().select("stage createdAt");
                if (logsdata.length != 0) {
                    hold_active_response[i].assignedDate = logsdata[0].createdAt;
                } else {
                    hold_active_response[i].assignedDate = false;
                }

                if (
                    hold_active_response[i].designStatus !== "Design-Hold" &&
                    hold_active_response[i].salesStage !== "Lost"
                ) {
                    leads.activeCustomers.push({
                        ...hold_active_response[i],
                        dmOrAdm: dmOrAdm?.name ? dmOrAdm.name : "No Data",
                    });
                }
                if (
                    hold_active_response[i].designStatus === "Design-Hold" &&
                    hold_active_response[i].salesStage !== "Lost"
                ) {
                    leads.designHoldCustomers.push({
                        ...hold_active_response[i],
                        dmOrAdm: dmOrAdm.name ? dmOrAdm.name : "No Data",
                    });
                }
            }

            for (let i = 0; i < response.length; i++) {
                let dmOrAdm = managers.find(user => user.teamId.toString() === response[i].assignTo.teamId.toString())
                // Proposed Contract for month
                leads.proposedContractForTheMonth.push({
                    ...response[i],
                    dmOrAdm: dmOrAdm?.name ? dmOrAdm.name : "No Data",
                });
                // Lead Performance
                if (leads.performance[response[i].assignTo.name]) {
                    leads.performance[response[i].assignTo.name].dmOrAdm = dmOrAdm?.name
                        ? dmOrAdm.name
                        : "No Data";
                    leads.performance[response[i].assignTo.name].contractSignNumbers += 1;
                    leads.performance[response[i].assignTo.name].contractSignValue +=
                        response[i].grandTotal;
                }
            }
            for (let i = 0; i < response_1.length; i++) {
                let dmOrAdm = managers.find(user => user.teamId.toString() === response_1[i].assignTo.teamId.toString())
                leads.contractSignLeads.push({
                    ...response_1[i],
                    dmOrAdm: dmOrAdm?.name ? dmOrAdm.name : "No Data",
                });
            }
        }
        else if (
            req.user.roles.find((role) => role.name === "Center Head")
        ) {
            const response_1 = await Lead.find({
                ...query_1,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .populate({ path: 'teamId', populate: { path: 'manager', select: 'name' } })
                .sort({ createdAt: -1 })
                .lean();



            for (let i = 0; i < response_1.length; i++) {
                leads.contractSignLeads.push({
                    ...response_1[i],
                    dmOrAdm: response_1[i].teamId?.manager?.name ? response_1[i].teamId?.manager?.name : "No Data"
                });
            }

        }
        else {
            const response = await Lead.find({
                ...query,
                assignTo: req.user._id,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate expectedDesignSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            const response_1 = await Lead.find({
                ...query_1,
                assignTo: req.user._id,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal centerHeadApproved designSignOffDate closureDate updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            const hold_active_response = await Lead.find({
                ...hold_active_query,
                assignTo: req.user._id,
                experienceCenterId: req.query.experienceCenterId,
            })
                .select("teamId lead_no designStages designStatus grandTotal designHoldReason designSignOffDate closureDate proposedDesignStartDate centerHeadApproved businessHeadApproved tokenPercent updatedAt")
                .populate("customerId", "name email contact_no")
                .populate("assignTo", "name email teamId")
                .sort({ createdAt: -1 })
                .lean();
            leads.proposedContractForTheMonth.push(...response);
            leads.contractSignLeads.push(...response_1);
            leads.performance[req.user.name] = {};
            let designSignOff = {}
            var firstDay = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            var lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 1);
            designSignOff["designSignOffDate"] = { $gte: firstDay, $lte: lastDay }

            let leadTotalValue = await Lead.find({ ...designSignOff, $or: [{ previouslyAssignedTo: { $in: req.user._id } }, { assignTo: { $in: req.user._id } }] }).select("grandTotal").lean()
            let grandTotalValue = 0;

            for (let j = 0; j < leadTotalValue.length; j++) {
                grandTotalValue = grandTotalValue + (Number(leadTotalValue[j].grandTotal))
            }

            leads.performance[req.user.name].contractSignNumbers = leadTotalValue.length;
            leads.performance[req.user.name].contractSignValue = grandTotalValue;
            leads.performance[req.user.name].month = month;

            for (let i = 0; i < hold_active_response.length; i++) {
                if (hold_active_response[i].tokenPercent >= 5) {
                    hold_active_response[i].salesDate = hold_active_response[i].centerHeadApproved[0]?.approvedDate;
                } else {
                    if (hold_active_response[i].centerHeadApproved[0]?.approvedDate <= hold_active_response[i].businessHeadApproved[0]?.approvedDate) {
                        hold_active_response[i].salesDate = hold_active_response[i].businessHeadApproved[0]?.approvedDate;
                    } else {
                        hold_active_response[i].salesDate = hold_active_response[i].centerHeadApproved[0]?.approvedDate;
                    }
                }
                const logsdata = await LeadLogs.find({ leadId: hold_active_response[i]._id, stage: "Assign to Designer" }).lean().select("stage createdAt");
                if (logsdata.length != 0) {
                    hold_active_response[i].assignedDate = logsdata[0].createdAt;
                } else {
                    hold_active_response[i].assignedDate = false;
                }
                if (
                    hold_active_response[i].designStatus !== "Design-Hold" &&
                    hold_active_response[i].salesStage !== "Lost"
                ) {
                    leads.activeCustomers.push(hold_active_response[i]);
                }
                if (
                    hold_active_response[i].designStatus === "Design-Hold" &&
                    hold_active_response[i].salesStage !== "Lost"
                ) {
                    leads.designHoldCustomers.push(hold_active_response[i]);
                }
            }

            for (let i = 0; i < response.length; i++) {
                if (leads.performance[response[i].assignTo.name]) {
                    leads.performance[response[i].assignTo.name].contractSignNumbers += 1;
                    leads.performance[response[i].assignTo.name].contractSignValue +=
                        response[i].grandTotal;
                }
            }
        }

        return res.status(200).json(leads);
    } catch (error) {
        console.log("error", error)
        return res.status(400).json(error);
    }
});

router.put('/filter', async (req, res) => {
    try {
        const date = new Date()
        let query = { createdAt: { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() } }
        const keys = Object.keys(req.body)
        const values = Object.values(req.body)
        if (keys.length > 0) {
            for (let i = 0; i < keys.length; i++) {
                query[`${keys[i]}`] = values[i]
            }
        }
        const response = await Lead.find(query)
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
})

// To get all the customer Names
router.get('/all/names', async (req, res) => {
    try {
        const leads = await Lead.find({})
            .populate('customerId')
            .select('customerId')
        if (leads.length == 0) return res.status(404).json('No leads found')
        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json('Bad Request')
    }
})

// Get all lead for all department
router.get('/all', async (req, res) => {
    try {
        const leads = await leadService.getAllLeads(req.user, req.query)
        if (leads.docs.length == 0) return res.status(400).json('No leads found.');
        return res.status(200).json(leads);
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }

});

// Get the seached lead for all department
router.get('/all-search-lead', async (req, res) => {
    try {
        const leads = await leadService.getAllSearchLeads(req.user, req.query)
        if (leads.docs.length == 0) return res.status(200).json(leads);
        return res.status(200).json(leads);
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
});

// Filter lead by department, team and stage for admin login
router.get('/filter-lead-for-admin', async (req, res) => {
    try {
        let filterQuery = {}
        filterQuery.teamId = req.query.teamId;
        filterQuery.departmentId = req.query.departmentId;
        if (req.query.departmentId === '5cb5b38bcf5531e174cb23e0') {// Sales Department Id
            if (req.query.stage !== 'all' && req.query.startDate !== undefined && req.query.endDate !== undefined) {
                filterQuery = {
                    createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) },
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    salesStage: req.query.stage,
                    teamId: req.query.teamId
                }
            } else if (req.query.stage === 'all' && req.query.startDate !== undefined && req.query.endDate !== undefined) {
                filterQuery = {
                    createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) },
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    teamId: req.query.teamId
                }
            } else if (req.query.stage === 'all' && req.query.startDate === undefined && req.query.endDate === undefined) {
                filterQuery = {
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    teamId: req.query.teamId
                }
            } else {
                filterQuery = {
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    salesStage: req.query.stage,
                    teamId: req.query.teamId
                }
            }
        } else if (req.query.departmentId === '5cb70b89ffa4965f53aa22d8') { // Design Department Id
            if (req.query.stage !== 'all' && req.query.startDate !== undefined && req.query.endDate !== undefined) {
                filterQuery = {
                    createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) },
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    designStages: req.query.stage,
                    teamId: req.query.teamId
                }
            } else if (req.query.stage === 'all' && req.query.startDate !== undefined && req.query.endDate !== undefined) {
                filterQuery = {
                    createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) },
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    teamId: req.query.teamId
                }
            } else if (req.query.stage === 'all' && req.query.startDate === undefined && req.query.endDate === undefined) {
                filterQuery = {
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    teamId: req.query.teamId
                }
            } else {
                filterQuery = {
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    designStages: req.query.stage,
                    teamId: req.query.teamId
                }
            }
        } else if (req.query.departmentId === '5cb5b3f2cf5531e174cb2457') { // Execution Department Id
            if (req.query.stage !== 'all' && req.query.startDate !== undefined && req.query.endDate !== undefined) {
                filterQuery = {
                    createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) },
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    executionStage: req.query.stage,
                    teamId: req.query.teamId
                }
            } else if (req.query.stage === 'all' && req.query.startDate !== undefined && req.query.endDate !== undefined) {
                filterQuery = {
                    createdAt: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) },
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    teamId: req.query.teamId
                }
            } else if (req.query.stage === 'all' && req.query.startDate === undefined && req.query.endDate === undefined) {
                filterQuery = {
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    teamId: req.query.teamId
                }
            } else {
                filterQuery = {
                    departmentId: req.query.departmentId,
                    experienceCenterId: req.query.experienceCenterId,
                    executionStage: req.query.stage,
                    teamId: req.query.teamId
                }
            }
        }
        // added filter for sourceOfLead
        if(req.query.sourceOfLead && req.query.sourceOfLead!= 'undefined'){
            filterQuery = {
                ...filterQuery,
                sourceOfLead: { $in : req.query.sourceOfLead.split(',')},
            }
            console.log('filterQuery', filterQuery)
        }
        const filterLeads = await Lead.find(filterQuery)
            .select('departmentId lead_no status salesStage designStages leadType estimatedBudget createdBy createdAt totalCustomerOutflow grandTotal currentStage erpProjectNo sourceOfLead')
            .populate({ path: 'assignTo', populate: { path: 'roles', select: 'name' }, select: '_id name email mobile teamId departmentId roles' })
            .populate('customerId', '_id name email mobile')
            .populate('departmentId', '_id name')
            .populate({ path: 'previouslyAssignedTo', populate: { path: 'roles', select: 'name' }, select: 'name' })
            .populate({path: 'sourceOfLead', select: 'name _id isActive'})
            .sort({ createdAt: -1 })
            .lean()
        if (filterLeads.length == 0) return res.status(400).json('No leads found.');
        return res.status(200).json(filterLeads);
    } catch (error) {
        console.log(error)
        return res.status(400).json("Bad Request")
    }
});

// Update the lead stage stutus
router.put('/updateLeadStageStatus/:id', async (req, res) => {
    let query = req.params.id;
    let update = req.body;
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options)
        .populate('customerId')
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            // checking if customer already filled the form or not if filled we have to not send survey mail to customer
            let junkSurvey = await CustomerSurveyJunkForm.find({ leadId: query });

            leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user;
            leadLogs.user = req.user;
            leadLogs.leadId = query;
            if (req.body.status){
                leadLogs.dealActivity = req.user.name + ' changed the deal stage to ' + req.body.status;
            } else if(req.body.designStatus){
                leadLogs.dealActivity = req.user.name + ' changed the deal stage to ' + req.body.designStatus;
            }
            await leadLogs.save();

            // If Selected lead status is Junk then sending the customer survey link
            if (junkSurvey.length === 0 && req.body.leadType === 'Junk' && req.body.status === 'Junk') {
                const surveyLink = `${IpAddress}customer-survey-form/junk/${lead._id}`
                const subject = 'Customer Survey Form';
                const text = `Dear ${lead.customerId.name};
                            Please kindly check and fill out our survey form.
                            It won’t take more than 30 seconds
                            Link for survey form: ${surveyLink}`;

                const html = `<p>Dear <strong>${lead.customerId.name}</strong>,</p>
                            <p>Please kindly check and fill out our survey form.</p>
                            <p>It won’t take more than 30 seconds</p>
                            <p>Link for survey form: ${surveyLink}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`;
                emailService.sendEmail(lead.customerId.email, subject, text, html);

                const customerSurvey = new CustomerSurvey({
                    leadId: lead._id,
                    customerId: lead.customerId._id,
                    leadOwner: lead.assignTo,
                    surveyType: 'junk',
                    surveyStatus: 'Sent'
                })
                await customerSurvey.save();
            }
            res.status(200).json("Status Updated successfully");
        })
        .catch(err => res.status(400).json(err));
})

router.put('/updateLead/:id', async (req, res) => {
    let query = req.params.id;
    let update = req.body;
    update.currentStage = update.salesStage
    let options = { new: true };
    Lead.findById(query)
        .populate('assignTo', 'name')
        .then((project) => {
            projObj = project;
            if (req.body.salesUserId) {
                let prevWithCurrentUser = [];
                prevWithCurrentUser.push(...projObj.previouslyAssignedTo, req.body.salesUserId);
                update.previouslyAssignedTo = prevWithCurrentUser;
                try {
                    leadLogs = new LeadLogs();
                    leadLogs.createdBy = req.user
                    leadLogs.user = req.body.salesUserId;
                    leadLogs.leadId = req.params.id;
                    leadLogs.dealActivity = req.user.name + ' has changed the deal stage to Won Deals Pending Designer Assignment. [ Note: Stage will be move to Won when Center Head/Business Head Approve. ]. ' + ' Remarks : ' + update.checkListRemarkBySalesUser;
                    leadLogs.save();
                } catch (error) {
                    console.log(error, ": erorr in save lead logs");
                }
            }
            try {
                customerTransactions = new CustomerTransactions();
                customerTransactions.leadId = query;
                customerTransactions.amount = update.paymentDone;
                customerTransactions.paymentImageUrl = update.salesPaymentProofAtachement;
                customerTransactions.stage = update.salesStage;
                customerTransactions.finalApprovalStatus = "NA";
                customerTransactions.uploadedBy = update.salesUserId;
                customerTransactions.save();
            } catch (error) {
                console.log(error, ": erorr in save customerTransactions");
            }
            Lead.findByIdAndUpdate(query, update, options).populate("customerId")
                .then((lead) => {
                    if (!lead) return res.status(404).json('Lead not found.');
                    res.status(200).json("Updated successfully");
                    (async function () {
                        const pdffile = await Pdf.generateChecklistPdf(lead, req.body);
                        lead.salesChecklistPdfFile = pdffile.pdfUrl
                        if (lead.erpProjectNo) {
                            return;
                        } else {
                            // Erp Project Number Creation 
                            
                            // let newErpProjectNo = '';
                            // let checkIfBangaloreCity = false
                            // let prevErpProjectNo
                            // let value
                            // if (lead.city == "61e7faac331230532d894dbf") {
                            //     prevErpProjectNo = await LatestProjectNo.find({ locationId: lead.city })
                            //     value = prevErpProjectNo[0].erpProjectNo
                            // } else {
                            //     prevErpProjectNo = await LatestProjectNo.find({ locationId: lead.city })
                            //     value = prevErpProjectNo[0].erpProjectNo.substring(0, 1)
                            // }
                            // const city = await Location.find({ _id: lead.city }).lean()
                            // let cityName = city[0].name.substring(0, 1)
                            // let newerpProject = ''
                            // if (value === "C" || value === "H") {
                            //     let fullvalue = prevErpProjectNo[0].erpProjectNo
                            //     newerpProject = fullvalue.substring(1)
                            // } else if (cityName === "B") {
                            //     newerpProject = prevErpProjectNo[0].erpProjectNo
                            //     checkIfBangaloreCity = true;
                            // } else {
                            //     newerpProject = prevErpProjectNo[0].erpProjectNo
                            // }
                            // newErpProjectNo = prevErpProjectNo[0].erpProjectNo && !checkIfBangaloreCity ? (cityName + (+newerpProject + 1)) :
                            //     prevErpProjectNo[0].erpProjectNo && checkIfBangaloreCity ? (+newerpProject + 1) : '1';
                            // lead.erpProjectNo = newErpProjectNo

                            // Need to enable below code for when we have to send email to customer.
                            // try {
                            //     await LatestProjectNo.update({ locationId: lead.city, $set: { erpProjectNo: newErpProjectNo } })
                            // } catch (err) {
                            //     console.log(err)
                            // }

                            // const subject = 'ERP Project Number';
                            // const text = `Dear ${lead.customerId.name},
                            // For your lead ERP Project is created with Project Number: ${newErpProjectNo}`;

                            // const html = `<p>Dear <strong>${lead.customerId.name}</strong>, </p>
                            //     <p>For your lead ERP Project is created with Project Number: ${newErpProjectNo}</p>
                            //     <p></p>
                            //     <p></p>
                            //     <p>Thanks & Regards,</p>
                            //     <p>Team Decorpot</p>`

                            // await emailService.sendEmail(lead.customerId.email, subject, text, html);

                            leadLogs = new LeadLogs();
                            leadLogs.createdBy = req.user
                            leadLogs.user = req.body.salesUserId;
                            leadLogs.leadId = req.params.id;
                            //leadLogs.dealActivity = `ERP Project number: ${newErpProjectNo} is created for lead no: ${lead.lead_no} `;
                            // await leadLogs.save();
                        }
                        //terms and condition pdf file taking defalut from
                        // const termsAndConditionsPdffile = await Pdf.generateTermsAndConditions(lead);
                        // lead.termsAndConditionsPdf = termsAndConditionsPdffile.pdfUrl
                        await lead.save()
                        // let attachmentFiles = {
                        //     salesChecklistPdfFile: pdffile.pdfUrl,
                        //     salesPaymentProofAtachement: lead.salesPaymentProofAtachement,
                        //     customerName: lead.customerId.name
                        // }
                    })();
                })
                .catch(err => {
                    console.log(err);
                })
        })
        .catch((err) => res.status(400).send(err));
})


router.put('/salesManagersApprovedLead/:id', async (req, res) => {
    let query = req.params.id;
    let options = { new: true };
    let update = {};
    let user = req.user.roles.find(role => role.name).name;
    // if (user === 'Sales Manager') {
    //     update = { salesManagerApproved: req.body.salesManagerApproved, customerApproved: req.body.customerApproved }
    // } else if (user === 'Finance Manager') {
    //     update = { finanaceManagerApproved: req.body.finanaceManagerApproved, centerHeadApproved: req.body.centerHeadApproved, financeReceipt: req.body.financeReceipt, paymentDone: req.body.paymentDone, tokenPercent: req.body.tokenPercent }
    // } else if (user === 'Center Head') {
    //     if (req.body.lessThanFivePercent) {
    //         // update = { centerHeadApproved: req.body.centerHeadApproved, businessHeadApproved: req.body.businessHeadApproved, designManagerAssigned: req.body.designManagerAssigned, leadStatus: req.body.leadStatus }
    //         update = req.body
    //     } else {
    //         update = req.body
    //     }
    // } else {
    update = req.body;
    // }
    Lead.findById(query).populate("customerId", "name email")
        .then((project) => {
            projObj = project;
            // Commented below code becuase now we dont need to add the sales manager id in previouslyAssignedTo.
            // if (req.body.salesManagerId) {
            //     let prevWithCurrentUser = [];
            //     prevWithCurrentUser.push(...projObj.previouslyAssignedTo, req.body.salesManagerId);
            //     update.previouslyAssignedTo = prevWithCurrentUser;
            // }
            Lead.findByIdAndUpdate(query, update, options)
                .then(async (lead) => {
                    if (!lead) return res.status(404).json('Lead not found.');
                    if(req.body.takenAction === 'rejected'){
                    let data = await CustomerTransactions.findOne({leadId:req.params.id,$or : [{stage:"Sales Manager Approval"},{stage:"Sales Manager Approval"}]}).sort({createdAt:-1})
                    if(data.length !==0 ){
                    data.finalApprovalStatus = "Not Approved"
                    await data.save();
                    }
                    }
                    if (user === 'Finance Manager' || user === 'Scope Admin' )  {
                        try {
                            leadLogs = new LeadLogs();
                            leadLogs.createdBy = req.user
                            leadLogs.user = req.user;
                            leadLogs.leadId = req.params.id;
                            leadLogs.dealActivity = req.user.name + ' has ' + req.body.takenAction +'.  Remarks : ' + lead.finanaceManagerApproved[0].remark;
                            leadLogs.save();
                        } catch (error) {
                            console.log(error, "error in save lead logs")
                        }

                    }

                    if ((user === 'Sales Manager' || user === 'Assistant Sales Manager') && req.body.takenAction === 'approved') {
                        // } else if (user === 'Finance Manager' && req.body.takenAction === 'approved') {
                        let receiptNumber = Math.floor((Math.random() * 100000) + 1)
                        req.body.lead['receiptNumber'] = receiptNumber
                        const date = new Date()
                        req.body.lead['receiptDate'] = date
                        const amountInWords = await leadService.getReceiptAmountInWord(req.body.financeReceipt)
                        req.body.lead['amountInWords'] = amountInWords;
                        const pdffile = await Pdf.generateReceiptPdf(req.body.lead, req.body.financeReceipt);
                        lead.financeReceipt.receiptDate = date
                        lead.financeReceipt.receiptNumber = receiptNumber
                        lead.financeReceipt.s3Location = pdffile.pdfUrl
                        await lead.save()

                        try {
                            leadLogs = new LeadLogs();
                            leadLogs.createdBy = req.user
                            leadLogs.user = req.user;
                            leadLogs.leadId = req.params.id;
                            leadLogs.dealActivity = req.user.name + ' has approved the checklist and sent for the Center Head approval and Finance Manager approval.  Remarks : ' + lead.salesManagerApproved[0].remark;
                            leadLogs.save();
                        } catch (error) {
                            console.log(error, "error in save lead logs")
                        }


                        try {
                            customerTransactions = new CustomerTransactions();
                            customerTransactions.leadId = query;
                            customerTransactions.amount = update.paymentDone;
                            customerTransactions.paymentImageUrl = update.paymentProofAtachement;
                            customerTransactions.stage = update.stage;
                            customerTransactions.uploadedBy = update.salesManagerApproved[0].approvedBy;
                            customerTransactions.save();
                        } catch (error) {
                            console.log(error, ": error in save customerTransactions");
                        }
                        try {
                            const subject = 'Payment Receipt';

                            const text = `Dear ${req.body.lead.customerId.name},
                                We have attached your payment receipt along with this mail. Please kindly check.`;

                            const html = `<p>Dear <strong>${req.body.lead.customerId.name}</strong>, </p>
                                <p>We have attached your payment receipt along with this mail. Please kindly check.</p>
                                <p></p>
                                <p></p>
                                <p>Thanks & Regards,</p>
                                <p>Team Decorpot</p>`

                            await emailService.sendEmailWithAttachement(req.body.lead.customerId.email, subject, text, html, pdffile.pdfUrl, req.body.lead.customerId.name);


                            const subject1 = 'Lead Approval Request';

                            const text1 = `Dear Center Head,
                                Please login and verify the Lead approval request for customer ${req.body.lead.customerId.name}`;

                            const html1 = `<p>Dear <strong>Center Head</strong>,</p>
                                <p>Please login and verify the Lead approval request for customer ${req.body.lead.customerId.name}</p>`

                            await emailService.sendEmail(centerHeadEmail, subject1, text1, html1);
                        } catch (err) {
                            console.log(err, "err");
                        }
                    } else if (user === 'Center Head' && req.body.moreThanFivePercent === true && req.body.takenAction === 'approved') {
                        try {
                            let obj = { designManagerId: "", designManagerTeamId: "", designManagerDepttId: "", designManagerEmail: "", designManagerName: "" }
                            let designManagerArray = await User.find({ _id: { $ne: designHeadId },roles: { $in: designManagerRoleId }, isActive: true, experienceCenterId: { $in: project.experienceCenterId } })
                            .populate('teamId', 'name')
                            .sort({ name: 1 })
                            //round robin algorithm
                            let assignedLeadFound = false

                            for (let i = 0; i < designManagerArray.length; i++) {
                                if (designManagerArray[i].lastLeadAssigned === true) {
                                    assignedLeadFound = true
                                    if (i === designManagerArray.length - 1) {
                                        obj.designManagerId = designManagerArray[0]["_id"]
                                        obj.designManagerTeamId = designManagerArray[0]["teamId"]
                                        obj.designManagerDepttId = designManagerArray[0]["departmentId"]
                                        obj.designManagerEmail = designManagerArray[0]["email"]
                                        obj.designManagerName = designManagerArray[0]["name"]
                                        obj.designManagerTeamName = designManagerArray[0]["teamId"]?.name

                                    } else if (i !== designManagerArray.length) {
                                        obj.designManagerId = designManagerArray[i + 1]["_id"]
                                        obj.designManagerTeamId = designManagerArray[i + 1]["teamId"]
                                        obj.designManagerDepttId = designManagerArray[i + 1]["departmentId"]
                                        obj.designManagerEmail = designManagerArray[i + 1]["email"]
                                        obj.designManagerName = designManagerArray[i + 1]["name"]
                                        obj.designManagerTeamName = designManagerArray[i+1]["teamId"]?.name
                                    }
                                }

                                if (!assignedLeadFound) {
                                    obj.designManagerId = designManagerArray[0]["_id"]
                                    obj.designManagerTeamId = designManagerArray[0]["teamId"]
                                    obj.designManagerDepttId = designManagerArray[0]["departmentId"]
                                    obj.designManagerEmail = designManagerArray[0]["email"]
                                    obj.designManagerName = designManagerArray[0]["name"]
                                    obj.designManagerTeamName = designManagerArray[0]["teamId"]?.name
                                }

                            }
                            await User.updateMany({ roles: { $in: designManagerRoleId }, _id: { $nin: [obj.designManagerId] } }, { $set: { lastLeadAssigned: false } })
                            await User.updateOne({ _id: obj.designManagerId }, { $set: { lastLeadAssigned: true } })
console.log(obj,"obj")
                            let response = await Lead.findOneAndUpdate({ _id: query },
                                {
                                    $set: {
                                        assignTo: obj.designManagerId,
                                        designManager: obj.designManagerId,
                                        teamId: obj.designManagerTeamId,
                                        departmentId: obj.designManagerDepttId,
                                        teamName: obj.designManagerTeamName,
                                        assignToName: obj.designManagerName,
                                        currentStage: "Designer Assignment Pending",
                                        designStages: "Designer Assignment Pending"

                                    }
                                }
                            )
                            const subjectname = 'ERP - New Lead Assigned';
                            const textcontent = `Dear ${obj.designManagerName};
                            Customer Name :  ${project.customerId.name};
                            Customer email :  ${project.customerId.email};
                            is assigned Please check your crm tool`;

                            const htmlcontent = `<p>Dear <strong>${obj.designManagerName}</strong>,</p>
                            <p>Customer Name :  ${project.customerId.name};</p>
                            <p> Customer email :  ${project.customerId.email};</p>
                            <p> is assigned Please check your crm tool</p>`
                            //mail has to change just for testing
                            emailService.sendEmail(obj.designManagerEmail, subjectname, textcontent, htmlcontent);

                            const subject = 'Check List Items';
                            const customerCheckListLink = `${IpAddress}customer-check-lists-item/${req.params.id}`;
                            let emailListObj = {
                                to: project.customerId.email,
                                bcc: req.body.salesUserEmail
                            }
                            const text = `Dear ${project.customerId.name},
                        Click on this link: ${customerCheckListLink} and fill the check lists.`;

                            const html = `<!DOCTYPE html><html>
                        <head>
                            <title>Decorpot Check List</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                            <meta name="keywords" content="" />
                            <link href="https://fonts.googleapis.com/css2?family=Didact+Gothic&display=swap" rel="stylesheet">
                            <style type="text/css">
                                body{width:100%;margin:0;padding:0;-webkit-font-smoothing:antialiased;font-family:Didact Gothic,sans-serif}html{width:100%}table{font-size:14px;border:0}@media only screen and (max-width:800px){table.container.top-header-left{width:726px}}@media only screen and (max-width:736px){table.container.top-header-left{width:684px}}
                                head{width:340px!important}table.ser_left_one{width:216px}table.mail_left,table.mail_right{width:100%;height:38px}table.ban-hei{height:207px!important}td.ser_one{height:11px}}@media only screen and (max-width:320px){td.wel_text{font-size:1.9em!important}img.full{width:100%}table.container.top-header-left{width:284px!important}table.container-middle.nav-head{width:257px!important}table.ban_info{width:257px}td.future{font-size:1.2em!important}td.ban_tex{height:10px}table.ban-hei{height:175px!important}table.logo{width:56%!important}td.top_mar{height:6px}table.mail_left,table.mail_right{width:100%;height:29px}table.ser_left_one{width:181px}table.ser_left_two{width:73px}td.pic_one img{width:100%}table.cir_left img{width:37%}td.thompson{font-size:1.5em!important}table.follow{width:100%}table.follow td{text-align:center!important}table.logo{width:69%!important}}        
                            </style>
                        </head>
                        <body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0">
                            <table border="0" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="100%" align="center" valign="top" style="">
                                        <table>
                                            <tr>
                                                <td class="top_mar" height="50"></td>
                                            </tr>
                                        </table>
                                        <!-- main content -->
                                        <table style="box-shadow:0px 0px 0px 0px #E0E0E0;" width="800" border="0" cellpadding="0"
                                            cellspacing="0" align="center" class="container top-header-left">
                                            <tr>
                                                <td>
                                                    <table border="0" width="650" align="center" cellpadding="0" cellspacing="0"
                                                        class="container-middle nav-head">
                                                        <tr><td height="15"></td></tr>
                                                        <tr>
                                                            <td>
                                                                <table border="0" align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="logo">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td align="center">
                                                                                <a href="https://www.decorpot.com/" class="logo-text"
                                                                                    style="text-decoration:none;"><img
                                                                                        src="https://www.decorpot.com/images/logo-black-min.png"
                                                                                        alt=" " width="294" height="78"></a>
                                                                            </td>
                                                                        </tr>
                                                                        <tr><td height="10"></td></tr>
                                                                        <tr>
                                                                            <td class="ser_text" align="center"
                                                                                style="color:#000; font-size: 2em;line-height:1.8em;font-weight: 700">
                                                                                Welcome to Decorpot!
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr bgcolor="#ffffff">
                                                <td>
                                                    <table border="0" width="650" align="center" cellpadding="0" cellspacing="0"
                                                        class="container-middle">
                                                        <tbody>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    Dear Ms/Mr. ${project.customerId.name}
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    Thank you for deciding to have faith in the 'Decorpot brand'.
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    Please get the project status below.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="center"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;font-weight: 700;">
                                                                    Roadmap to your journey to Dream Home
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    <img src="https://qt-snag-attachment.s3.amazonaws.com/undefined/roadmap-img.jpg"
                                                                        alt="">
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    We are taking this Project to the next stage of the Design Team and they
                                                                    shall be the next point of contact for the entire design phase. You can rest
                                                                    assured that we are leaving you in the hands of one of the best design teams
                                                                    in our company, whose team has an outstanding vision when it comes to
                                                                    delivering an exquisite home interior experience.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    You can always reach the assigned Designer and Design Manager in time of any
                                                                    need. Details for the same will be available once the link below is checked
                                                                    and approved.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="center"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    <a href=${customerCheckListLink}
                                                                        style="background-color: #d60000;border: none;color: white;padding: 15px;text-decoration: none;font-size: 14px;margin: 4px 2px;border-radius: 50px; width: 250px;">Get
                                                                        Details</a>
                                                                </td>
                                                            </tr>
                                                            <tr><td height="30"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    We are really looking forward to working at your site and delivering you a
                                                                    #decorhome that bears a close resemblance to your dream home.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="30"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="center"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;font-weight: 700;">
                                                                    HAPPY CUSTOMERS, HAPPY DECORPOT!
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </body>
                        </html>`;
                            await emailService.sendEmailWithBcc(emailListObj, subject, text, html);
                            leadLogs = new LeadLogs();
                            leadLogs.createdBy = req.user
                            leadLogs.user = req.user;
                            leadLogs.leadId = req.params.id;
                            leadLogs.dealActivity = req.user.name + ' has approved the checklist and the link has been sent to the customer for approval. After the customer approval, the lead will be assigned to ' + obj.designManagerName + '  Remarks : ' + req.body.centerHeadApproved[0].remark;
                            leadLogs.save();
                        } catch (error) {
                            console.log(error, "error in save lead logs")
                        }
                    } else if (user === 'Business Head' && req.body.takenAction === 'approved') {
                        try {
                            let obj = { designManagerId: "", designManagerTeamId: "", designManagerDepttId: "", designManagerEmail: "", designManagerName: "" }
                            let designManagerArray = await User.find({ roles: { $in: designManagerRoleId }, isActive: true, experienceCenterId: { $in: project.experienceCenterId } })
                            .populate('teamId','name')
                            .sort({ name: 1 })
                            //round robin algorithm
                            let assignedLeadFound = false

                            for (let i = 0; i < designManagerArray.length; i++) {
                                if (designManagerArray[i].lastLeadAssigned === true) {
                                    assignedLeadFound = true
                                    if (i === designManagerArray.length - 1) {
                                        obj.designManagerId = designManagerArray[0]["_id"]
                                        obj.designManagerTeamId = designManagerArray[0]["teamId"]?._id
                                        obj.designManagerDepttId = designManagerArray[0]["departmentId"]
                                        obj.designManagerEmail = designManagerArray[0]["email"]
                                        obj.designManagerName = designManagerArray[0]["name"]
                                        obj.designManagerTeamName = designManagerArray[0]["teamId"]?.name

                                    } else if (i !== designManagerArray.length) {
                                        obj.designManagerId = designManagerArray[i + 1]["_id"]
                                        obj.designManagerTeamId = designManagerArray[i + 1]["teamId"]?._id
                                        obj.designManagerDepttId = designManagerArray[i + 1]["departmentId"]
                                        obj.designManagerEmail = designManagerArray[i + 1]["email"]
                                        obj.designManagerName = designManagerArray[i + 1]["name"]
                                        obj.designManagerTeamName = designManagerArray[i + 1]["teamId"]?.name
                                    }
                                }

                                if (!assignedLeadFound) {
                                    obj.designManagerId = designManagerArray[0]["_id"]
                                    obj.designManagerTeamId = designManagerArray[0]["teamId"]?._id
                                    obj.designManagerDepttId = designManagerArray[0]["departmentId"]
                                    obj.designManagerEmail = designManagerArray[0]["email"]
                                    obj.designManagerName = designManagerArray[0]["name"]
                                    obj.designManagerTeamName = designManagerArray[0]["teamId"]?.name
                                }

                            }
                            await User.updateMany({ roles: { $in: designManagerRoleId }, _id: { $nin: [obj.designManagerId] } }, { $set: { lastLeadAssigned: false } })
                            await User.updateOne({ _id: obj.designManagerId }, { $set: { lastLeadAssigned: true } })

                            let response = await Lead.findOneAndUpdate({ _id: query },
                                {
                                    $set: {
                                        assignTo: obj.designManagerId,
                                        designManager: obj.designManagerId,
                                        teamId: obj.designManagerTeamId,
                                        departmentId: obj.designManagerDepttId,
                                        teamName: obj.designManagerTeamName,
                                        assignToName: obj.designManagerName,
                                        currentStage: "Designer Assignment Pending",
                                        designStages: "Designer Assignment Pending"
                                    }
                                }
                            )
                            const subjectname = 'ERP - New Lead Assigned';
                            const textcontent = `Dear ${obj.designManagerName};
                            Customer Name :  ${project.customerId.name};
                            Customer email :  ${project.customerId.email};
                            is assigned Please check your crm tool`;

                            const htmlcontent = `<p>Dear <strong>${obj.designManagerName}</strong>,</p>
                            <p>Customer Name :  ${project.customerId.name};</p>
                            <p> Customer email :  ${project.customerId.email};</p>
                            <p> is assigned Please check your crm tool</p>`
                            //mail has to change just for testing
                            emailService.sendEmail(obj.designManagerEmail, subjectname, textcontent, htmlcontent);

                            const subject = 'Check List Items';
                            const customerCheckListLink = `${IpAddress}customer-check-lists-item/${req.params.id}`;
                            let emailListObj = {
                                to: project.customerId.email,
                                bcc: req.body.salesUserEmail
                            }
                            const text = `Dear ${project.customerId.name},
                        Click on this link: ${customerCheckListLink} and fill the check lists.`;

                            const html = `<!DOCTYPE html><html>
                        <head>
                            <title>Decorpot Check List</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                            <meta name="keywords" content="" />
                            <link href="https://fonts.googleapis.com/css2?family=Didact+Gothic&display=swap" rel="stylesheet">
                            <style type="text/css">
                                body{width:100%;margin:0;padding:0;-webkit-font-smoothing:antialiased;font-family:Didact Gothic,sans-serif}html{width:100%}table{font-size:14px;border:0}@media only screen and (max-width:800px){table.container.top-header-left{width:726px}}@media only screen and (max-width:736px){table.container.top-header-left{width:684px}}
                                head{width:340px!important}table.ser_left_one{width:216px}table.mail_left,table.mail_right{width:100%;height:38px}table.ban-hei{height:207px!important}td.ser_one{height:11px}}@media only screen and (max-width:320px){td.wel_text{font-size:1.9em!important}img.full{width:100%}table.container.top-header-left{width:284px!important}table.container-middle.nav-head{width:257px!important}table.ban_info{width:257px}td.future{font-size:1.2em!important}td.ban_tex{height:10px}table.ban-hei{height:175px!important}table.logo{width:56%!important}td.top_mar{height:6px}table.mail_left,table.mail_right{width:100%;height:29px}table.ser_left_one{width:181px}table.ser_left_two{width:73px}td.pic_one img{width:100%}table.cir_left img{width:37%}td.thompson{font-size:1.5em!important}table.follow{width:100%}table.follow td{text-align:center!important}table.logo{width:69%!important}}        
                            </style>
                        </head>
                        <body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0">
                            <table border="0" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="100%" align="center" valign="top" style="">
                                        <table>
                                            <tr>
                                                <td class="top_mar" height="50"></td>
                                            </tr>
                                        </table>
                                        <!-- main content -->
                                        <table style="box-shadow:0px 0px 0px 0px #E0E0E0;" width="800" border="0" cellpadding="0"
                                            cellspacing="0" align="center" class="container top-header-left">
                                            <tr>
                                                <td>
                                                    <table border="0" width="650" align="center" cellpadding="0" cellspacing="0"
                                                        class="container-middle nav-head">
                                                        <tr><td height="15"></td></tr>
                                                        <tr>
                                                            <td>
                                                                <table border="0" align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="logo">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td align="center">
                                                                                <a href="https://www.decorpot.com/" class="logo-text"
                                                                                    style="text-decoration:none;"><img
                                                                                        src="https://www.decorpot.com/images/logo-black-min.png"
                                                                                        alt=" " width="294" height="78"></a>
                                                                            </td>
                                                                        </tr>
                                                                        <tr><td height="10"></td></tr>
                                                                        <tr>
                                                                            <td class="ser_text" align="center"
                                                                                style="color:#000; font-size: 2em;line-height:1.8em;font-weight: 700">
                                                                                Welcome to Decorpot!
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr bgcolor="#ffffff">
                                                <td>
                                                    <table border="0" width="650" align="center" cellpadding="0" cellspacing="0"
                                                        class="container-middle">
                                                        <tbody>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    Dear Ms/Mr. ${project.customerId.name}
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    Thank you for deciding to have faith in the 'Decorpot brand'.
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    Please get the project status below.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="center"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;font-weight: 700;">
                                                                    Roadmap to your journey to Dream Home
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    <img src="https://qt-snag-attachment.s3.amazonaws.com/undefined/roadmap-img.jpg"
                                                                        alt="">
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    We are taking this Project to the next stage of the Design Team and they
                                                                    shall be the next point of contact for the entire design phase. You can rest
                                                                    assured that we are leaving you in the hands of one of the best design teams
                                                                    in our company, whose team has an outstanding vision when it comes to
                                                                    delivering an exquisite home interior experience.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    You can always reach the assigned Designer and Design Manager in time of any
                                                                    need. Details for the same will be available once the link below is checked
                                                                    and approved.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="10"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="center"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    <a href= ${customerCheckListLink}
                                                                        style="background-color: #d60000;border: none;color: white;padding: 15px;text-decoration: none;font-size: 14px;margin: 4px 2px;border-radius: 50px; width: 250px;">Get
                                                                        Details</a>
                                                                </td>
                                                            </tr>
                                                            <tr><td height="30"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="left"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;">
                                                                    We are really looking forward to working at your site and delivering you a
                                                                    #decorhome that bears a close resemblance to your dream home.
                                                                </td>
                                                            </tr>
                                                            <tr><td height="30"></td></tr>
                                                            <tr>
                                                                <td class="ser_text" align="center"
                                                                    style="color:#000; font-size: 1.2em;line-height:1.8em;font-weight: 700;">
                                                                    HAPPY CUSTOMERS, HAPPY DECORPOT!
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </body>
                        </html>`;

                            await emailService.sendEmailWithBcc(emailListObj, subject, text, html);
                            leadLogs = new LeadLogs();
                            leadLogs.createdBy = req.user
                            leadLogs.user = req.user;
                            leadLogs.leadId = req.params.id;
                            leadLogs.dealActivity = req.user.name + ' has approved the checklist and the has been link sent to the customer for approval. After the customer approval lead will be assigned to ' + obj.designManagerName + ' Remarks : ' + req.body.businessHeadApproved[0].remark;
                            leadLogs.save();
                        } catch (error) {
                            console.log(error, "error in save lead logs")
                        }
                    }
                    res.status(200).json("Updated successfully");
                })
                .catch(err => {
                    console.log(err);
                })
        })
        .catch((err) => res.status(400).send(err));
})

router.get('/getApprovedLeadLists', async (req, res) => {
    try {
        let user = req.user.roles.find(role => role.name).name;
        let query = {};
        if (user === 'Sales Head') {
            const usersInDept = await User.find({ departmentId: req.user.departmentId })
                .select('_id')
            query = {
                $and: [
                    { salesExecutiveApproved: { $elemMatch: { isApproved: true } } },
                    { salesManagerApproved: { $elemMatch: { isApproved: false } } }
                ], salesStage: 'Won Deals Pending Designer Assignment',
                experienceCenterId: req.query.experienceCenterId,
                assignTo: { $in: usersInDept }
            }
        } else if (user === 'Sales Manager') {
            const usersInTeam = await User.find({ teamId: req.user.teamId })
                .select('_id')
            query = {
                $and: [
                    { salesExecutiveApproved: { $elemMatch: { isApproved: true } } },
                    { salesManagerApproved: { $elemMatch: { isApproved: false } } }
                ], salesStage: 'Won Deals Pending Designer Assignment',
                experienceCenterId: req.query.experienceCenterId,
                assignTo: { $in: usersInTeam }
            }
        } else if (req.user.roles.find(role => role.name === "Finance Manager") ) {
            query = {
                $and: [
                    { finanaceManagerApproved: { $elemMatch: { status: 'Send for Approval' } } }
                ], salesStage: 'Won Deals Pending Designer Assignment',
                experienceCenterId: req.query.experienceCenterId
            }
        } else if (user === "Assistant Sales Manager") {
            const teamUsers = await Teams.find({ _id: req.user.teamId }).select('assistantManagerUsers')
            let usersListInTeam = []
            if (teamUsers.length !== 0) {
                for (let i = 0; i < teamUsers[0].assistantManagerUsers.length; i++) {
                    usersListInTeam.push({ _id: teamUsers[0].assistantManagerUsers[i] })
                }
            }
            query = {
                $and: [
                    { salesExecutiveApproved: { $elemMatch: { isApproved: true } } },
                    { salesManagerApproved: { $elemMatch: { isApproved: false } } }
                ], salesStage: 'Won Deals Pending Designer Assignment',
                experienceCenterId: req.query.experienceCenterId,
                assignTo: { $in: usersListInTeam }
            }
        } else if (user === 'Center Head') {
            query = {
                $and: [
                    { salesExecutiveApproved: { $elemMatch: { isApproved: true } } },
                    { salesManagerApproved: { $elemMatch: { isApproved: true } } },
                    { centerHeadApproved: { $elemMatch: { isApproved: false } } }
                ], salesStage: 'Won Deals Pending Designer Assignment',
                experienceCenterId: req.query.experienceCenterId
            }
        } else if (user === 'Business Head') {
            query = {
                $and: [
                    { salesExecutiveApproved: { $elemMatch: { isApproved: true } } },
                    { salesManagerApproved: { $elemMatch: { isApproved: true } } },
                    { centerHeadApproved: { $elemMatch: { isApproved: true } } },
                    { businessHeadApproved: { $elemMatch: { isApproved: false }, $elemMatch: { status: "Send for Approval" } } }
                ], salesStage: 'Won Deals Pending Designer Assignment',
                experienceCenterId: req.query.experienceCenterId
            }
        }
        const leads = await Lead.find(query)
            .populate('customerId assignTo')
            .populate({ path: 'previouslyAssignedTo', populate: { path: 'roles', select: 'name' }, select: '_id name email mobile teamId departmentId' })
            .sort({ createdAt: -1 })
            .lean()
        if (leads.length == 0) return res.status(404).json('No leads found')
        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json('Bad Request')
    }
})

router.put('/assignLeadToDesginUser/:id', async (req, res) => {
    let query = req.params.id;
    let options = { new: true };
    let update = req.body;
    User.find({ _id: req.body.assignTo })
        .then((user) => {
            return user
        })
        .then((userData) => {
            Lead.findByIdAndUpdate(query, update, options)
                .then(async (lead) => {
                    if (!lead) return res.status(404).json('Lead not found.');
                    try {
                        const subject = 'Lead Assigned to Design Manager';

                        const text = `Dear ${req.body.customerId.name},
                            The Design Manager is assigned to your project, Please find the below design manager details:
                            Name: ${userData[0].name}
                            Email: ${userData[0].email}
                            Mobile No: ${userData[0].mobile}
                        `;

                        const html = `<p>Dear <strong>${req.body.customerId.name}</strong>,</p>
                            <p>The Design Manager is assigned to your project, Please find the below design manager details:</p>
                            <ul>
                                <li>Name: ${userData[0].name}</li>
                                <li>Email: ${userData[0].email}</li>
                                <li>Mobile No: ${userData[0].mobile}</li>
                            </ul>`;

                        await emailService.sendEmail(req.body.customerId.email, subject, text, html);
                    } catch (err) {
                        console.log(err, "err");
                    }
                    res.status(200).json("Updated successfully");
                })
                .catch(err => res.status(400).json(err));
        })
        .catch(err => res.status(400).json(err));

})

router.put('/edit/:id', (req, res) => {
    let query = req.params.id;
    let update = req.body;
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options)
        .then((lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            let custFindQuery = lead.customerId;
            let custUpdateQuery = {
                name: req.body.name,
                email: req.body.email,
                contact_no: req.body.contact_no
            }
            let custOptionsQuery = { new: true };
            Customer.findByIdAndUpdate(custFindQuery, custUpdateQuery, custOptionsQuery)
                .then((customer) => {
                    if (!customer) return res.status(404).json('Customer not found.');
                    res.status(200).json("Lead Updated successfully");
                })
        })
        .catch(err => res.status(400).json(err));
})

router.put('/discountApproval/:id', (req, res) => {

    Lead.findByIdAndUpdate(req.params.id, { $set: { discountPercent: req.body.discountPercent, discountApprovalRequest: req.body.discountApprovalRequest, discountStatus: req.body.discountStatus, discountRequestedBy: req.user._id } })
        .then((project) => {
            res.status(200).json('Discount % sent/revoked for approval');
        })
        .catch((err) => {
            res.status(400).send(err.message);
        });
})

router.get('/discountedProjects', (req, res) => {
    Lead.find({ discountApprovalRequest: true, discountStatus: 'Sent for approval' })
        .populate('customerId', 'name')
        .populate('assignTo', 'name')
        .populate('discountLogs.user', 'name')
        .populate('discountLogs.actionTakenBy', 'name')
        .populate('discountLogs.discountRequestedBy', 'name')
        .populate('discountRequestedBy', 'name')
        .then((projects) => {
            if (projects.length == 0) return res.status(200).json('No projects found.');
            res.status(200).send(projects);
        })
        .catch((err) => res.status(400).send(err));
})

router.put('/approveDiscount/:id', (req, res) => {
    let log = {
        discountValue: req.body.discountPercent,
        user: req.body.assignTo,
        actionTakenBy: req.user._id,
        discountRequestedBy: req.body.discountRequestedBy
    }
    if (req.body.discountApprovalRequest == true) {
        log.approvalStatus = false;
    } else {
        log.approvalStatus = true;
    }
    Lead.findByIdAndUpdate(req.params.id, { $set: { discountPercent: req.body.discountPercent, discountApprovalRequest: req.body.discountApprovalRequest, discountStatus: req.body.discountStatus }, $push: { discountLogs: log } })
        .then(proj => {
            res.status(200).json('Lead edited');
        })
        .catch((err) => {
            res.status(400).send(err.message);
        });

})

router.put('/changeErpProjectNo/:erpProjectNo', async (req, res) => {
    try {
        const lead = await Lead.find({ erpProjectNo: req.query.newErpProjectNo })

        if (lead.length != 0) {
            res.status(204).json({ msg: 'This Number is already being used for ERP Project.' });
        }
        else {
            await Lead.updateOne({ _id: req.query.leadId }, { $set: { erpProjectNo: req.query.newErpProjectNo } })
            let leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user._id
            leadLogs.user = req.user._id;
            leadLogs.leadId = req.query.leadId
            leadLogs.erpProjectNo = req.params.erpProjectNo;
            leadLogs.dealActivity = req.user.name + ` has changed the ERP Project Number from:  ${req.params.erpProjectNo} to the new Number ${req.query.newErpProjectNo}`;
            leadLogs.save();

            res.status(200).json({ msg: 'Current ERP Project No. is Update Now!' });
        }

    }
    catch (err) {
        console.log("err", err)
    }
})

router.put('/updateCustomerPaymentAndSendToFinance/:leadId', async (req, res) => {
    try {
        customerTransactions = new CustomerTransactions();
        customerTransactions.leadId = req.params.leadId;
        customerTransactions.amount = req.body.amount;
        customerTransactions.paymentImageUrl = req.body.paymentAttachement;
        customerTransactions.stage = req.body.lead_no ? 'designerUpdatedPayment' : 'finalPayment';
        customerTransactions.note = req.body.note;
        customerTransactions.uploadedBy = req.user._id;
        await customerTransactions.save();

        let leadNumber;
        if (req.body.lead_no) {
            leadNumber = req.body.lead_no
        } else {
            const updatedLead = await Lead.findOneAndUpdate({ _id: req.params.leadId }, { $set: { finalPaymentApprovalRequestStatus: 'Sent' } })
            leadNumber = updatedLead.lead_no
        }

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user._id
        leadLogs.user = req.user._id;
        leadLogs.leadId = req.params.leadId;
        leadLogs.dealActivity = req.user.name + ` has updated the payment for lead no:  ${leadNumber} and written the note - ${req.body.note}. The payment has been sent to the Finance team for Approval`;
        await leadLogs.save();

        res.status(200).json('Payment sent to the Finance Manager for Approval');
    } catch (err) {
        console.log(err)
    }
})

router.put('/updateExpectedDesignSignOffDate/:id', async (req, res) => 
{
    try
    {
        await Lead.updateOne({_id: req.params.id}, {$set: {expectedDesignSignOffDate: req.body.expectedDesignSignOffDate}})

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user._id
        leadLogs.user = req.user._id;
        leadLogs.leadId = req.params.id;
        leadLogs.dealActivity = req.user.name + ` has updated the Expected Design Sign Off Date to:  ${req.body.expectedDesignSignOffDate}`;
        await leadLogs.save();
        res.status(200).send("success")
    }
    catch (error)
    {
        console.log("error: ",error);
    }
})

router.put('/designToExecutionFlow/:id', async (req, res) => {
    const url = req.body.quotationCsvFile;
    let value = await leadService.xlsxParser(url);
    try {

        if (req.body.contractSignedPaymentReceviedAttachemnt){
        try {
            customerTransactions = new CustomerTransactions();
            customerTransactions.leadId = req.params.id;
            customerTransactions.amount = req.body.contractSignedValue;
            customerTransactions.finalApprovalStatus = "NA";
            customerTransactions.paymentImageUrl = req.body.contractSignedPaymentReceviedAttachemnt;
            customerTransactions.stage = req.body.stage;
            customerTransactions.uploadedBy = req.user._id;
            customerTransactions.save();
        } catch (error) {
            console.log(error, ": error in save customerTransactions");
        }
    }
        const response = await Lead.findOneAndUpdate({ _id: req.params.id }, {
            $set: {
                designToExecutionLogsStatus: req.body.designToExecutionLogsStatus,
                designSignOffDate: req.body.designSignOffDate,
                projectCompletionDate: req.body.projectCompletionDate,
                designStages: req.body.stage,
                currentStage: req.body.stage,
                scanQuotationFile: req.body.scanQuotationFile,
                scanCheckListFile: req.body.scanCheckListFile,
                workingDrawingFile: req.body.workingDrawingFile,
                ThreeDworkingDrawingFile: req.body.ThreeDworkingDrawingFile,
                scanContractFile: req.body.scanContractFile,
                contractSignedPaymentReceviedAttachemnt: req.body.contractSignedPaymentReceviedAttachemnt,
                contractSignedValue: req.body.contractSignedValue,
                tokenPercent: Number(req.body.tokenPercent),
                quotationCsvFile: req.body.quotationCsvFile,
                grandTotal: value.totalCustomerOutflow,
                daysAsPerContractSign: req.body.daysAsPerContractSign,
                designSignOffUser: req.body.designSignOffUser,
                designSignOffUserName: req.body.designSignOffUserName,
            }
        }).populate('customerId', 'name')

        let query = req.params.id
        let prevWithCurrentUser = [];
        prevWithCurrentUser.push(...response.previouslyAssignedTo, req.user._id);
        let update = {
            previouslyAssignedTo: prevWithCurrentUser
        }
        Lead.findByIdAndUpdate(query, update, { new: true })
            .then((lead) => {
                // console.log('Lead details updated')
            })

        if (req.body.designToExecutionLogsStatus == "Sent For Approval") {
            try {
                let userInTeam = await User.find({ teamId: response.teamId })
                    .populate('roles')

                // let emails = ['financemanager@decorpot.com', 'dwgqc@decorpot.com']
                let emails = [
                    {
                        name: 'Finanace Manager',
                        email: 'financemanager@decorpot.com'
                    },
                    {
                        name: 'Devaraj GB',
                        email: 'devarajgb@decorpot.com'
                    }
                ]


                for (let i = 0; i < userInTeam.length; i++) {
                    for (let j = 0; j < userInTeam[i]['roles'].length; j++) {
                        if (userInTeam[i]['roles'][j]['name'] === 'Design Manager') {
                            emails.push({
                                name: userInTeam[i]['name'],
                                email: userInTeam[i]['email']
                            })
                        }
                    }
                }

                const subject = 'Lead Approval Request';

                for (let i = 0; i < emails.length; i++) {
                    const text = `Dear ${emails[i].name}, Please Approve this Customer: ${response.customerId.name} and lead number: ${response.lead_no}`;
                    const html = `<p>Dear ${emails[i].name},</p>
                            <p>Please Approve this Customer: <strong> ${response.customerId.name} </strong> and lead number: <strong> ${response.lead_no}</strong></p>`;
                    await emailService.sendEmail(emails[i].email, subject, text, html);
                }

                let userName = await User.findOne({ _id: response.assignTo });
                leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.params.id;
                leadLogs.dealActivity = req.user.name + ' has changed the stage to ' + req.body.stage;
                leadLogs.save();
            } catch (error) {
                console.log(error, "error in save lead logs")
            }
        }
        res.status(200).send("Success")
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.get('/designToExecutionLogs/:expcenter', async (req, res) => {
    try {
        let user = req.user.roles.find((role) => role.name).name;
        let query = {};
        let chmQuery = {}
        if (user === "Design Manager") {
            const teamUsersArray = [];
            const teamUser = await User.find({ teamId: req.user.teamId }).lean();
            teamUser.forEach((e) => {
                teamUsersArray.push(e._id);
            });
            query.assignTo = { $in: teamUsersArray }
        } else if (user === "Design User") {
            query.assignTo = req.user._id;
        }
        else if (user === "CHM_Manager") {
            let teamMembers = await User.find({ teamId: req.user.teamId }).select('_id');
            chmQuery = { assignTo: teamMembers }
        }
        else if (user === "CHM_User") {
            chmQuery = { assignTo: req.user._id }
        }

        let chmLeadResponse = await ChmLeads.find(chmQuery)

        let leadIdArray = []
        chmLeadResponse.forEach(el => leadIdArray.push(el.leadId))

        let response = []
        if (user === "CHM_Manager" || user === "CHM_User") {
            response = await Lead.find({ "_id": { $in: leadIdArray }, $or: [{ designToExecutionLogsStatus: "Sent For Approval" }, { contractCustomerApproved: false }], designStages: "Design Sign-off"})
                .select('city experienceCenterId contractFinanceApproved contractDesignApproved contractDesignManagerApproved contractFinalMarkingApproved contractQualityControlApproved designToExecutionLogsStatus contractOperationApproved contractRejectReason contactLeadRejectedRole contractCustomerApproved erpProjectNo')
                .populate('customerId', 'name')
                .populate('assignTo', 'name')
                .populate('createdBy', 'name').lean();
        } else if (user === "Design Manager") {
            response = await Lead.find({ ...query, $or: [{ designToExecutionLogsStatus: "Sent For Approval" }, { contractCustomerApproved: false }], designStages: "Design Sign-off" })
                .select('city experienceCenterId contractFinanceApproved contractDesignApproved contractDesignManagerApproved contractFinalMarkingApproved contractQualityControlApproved designToExecutionLogsStatus contractOperationApproved contractRejectReason contactLeadRejectedRole contractCustomerApproved erpProjectNo')
                .populate('customerId', 'name')
                .populate('assignTo', 'name')
                .populate('createdBy', 'name').lean();
        } else {
            response = await Lead.find({ ...query, designToExecutionLogsStatus: "Sent For Approval", designStages: "Design Sign-off"})
                .select('city experienceCenterId contractFinanceApproved contractDesignApproved contractDesignManagerApproved contractFinalMarkingApproved contractQualityControlApproved designToExecutionLogsStatus contractOperationApproved contractRejectReason contactLeadRejectedRole contractCustomerApproved erpProjectNo')
                .populate('customerId', 'name')
                .populate('assignTo', 'name')
                .populate('createdBy', 'name').lean();
        }
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.put('/designToExecutionLogs/:leadId', async (req, res) => {
    try {
        if (req.body.contractFinanceApproved !== true) {
            let response = await Lead.findOneAndUpdate({ _id: req.params.leadId },
                {
                    $set: {
                        contractFinanceApproved: req.body.contractFinanceApproved,
                        contractDesignApproved: req.body.contractDesignApproved,
                        contractDesignManagerApproved: req.body.contractDesignManagerApproved,
                        contractFinalMarkingApproved: req.body.contractFinalMarkingApproved,
                        contractQualityControlApproved: req.body.contractQualityControlApproved,
                        designToExecutionLogsStatus: req.body.designToExecutionLogsStatus,
                        contractOperationApproved: req.body.contractOperationApproved,
                    }
                }
            )
                .select('workingDrawingFile scanCheckListFile scanContractFile scanQuotationFile contractSignedPaymentReceviedAttachemnt departmentId teamId city experienceCenterId')
                .populate('customerId', 'name email contact_no')
                .populate('assignTo', 'name email')

            await Lead.update({ _id: req.params.leadId }, { $unset: { contactLeadRejectedRole: 1 } });

            leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user
            leadLogs.user = req.user;
            leadLogs.leadId = req.params.leadId;
            if (req.body.contractQualityControlApproved === true && req.body.contractDesignManagerApproved !== true) {
                leadLogs.dealActivity = req.user.name + ' Approved and sent for Design Manager Approval';
            } else if (req.body.contractDesignManagerApproved) {
                leadLogs.dealActivity = req.user.name + ' Approved and sent for Customer Approval';
            }
            leadLogs.save();

            let role = "";

            if (req.body.contractQualityControlApproved === true && req.body.contractDesignManagerApproved !== true){
                role = "Quality Control"
            }else{
                role = "Design Manager"
            }

            let signedFile = await ModifiyPdf.SignPdfByDesignToExecution(req.user.name, response.workingDrawingFile, role)
            await Lead.findOneAndUpdate({ _id: req.params.leadId },
                {
                    $set: {
                        workingDrawingFile: signedFile.pdfUrl,
                    }
                }
            )
            if (req.body.designToExecutionLogsStatus === "Sent For Approval" && req.body.contractDesignManagerApproved && req.body.contractQualityControlApproved) {
                try {
                    const subject = 'Design Sign-off Documents Verification';
                    const customerContractSingedLink = `${IpAddress}customer-contract-sign/${req.params.leadId}`;

                    const text = `Dear ${response.customerId.name},
                        We have attached the files of your signed contract and document verification.
                        Link for documents verification: ${customerContractSingedLink}.`;

                    const html = `<p>Dear <strong>${response.customerId.name}</strong>,</p>
                        <p>We have attached the files of your signed contract and document verification.</p>
                        <p>Link for documents verification: ${customerContractSingedLink}</p>
                        <p></p>
                        <p></p>
                        <p>Thanks & Regards,</p>
                        <p>Team Decorpot</p>`

                    await emailService.sendEmailWithMultipleAttchement(response, subject, text, html);

                } catch (error) {
                    console.log(error, "error in save lead logs")
                }
            }
            res.status(200).send("Updated Succesfully")
        }
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.put('/rejectContractSignedDocuments/:leadId', async (req, res) => {
    try {
        await Lead.updateOne({ _id: req.params.leadId },
            {
                $set: {
                    contractFinanceApproved: req.body.contractFinanceApproved,
                    contractDesignApproved: req.body.contractDesignApproved,
                    contractDesignManagerApproved: req.body.contractDesignManagerApproved,
                    contractFinalMarkingApproved: req.body.contractFinalMarkingApproved,
                    contractQualityControlApproved: req.body.contractQualityControlApproved,
                    designToExecutionLogsStatus: req.body.designToExecutionLogsStatus,
                    contractOperationApproved: req.body.contractOperationApproved,
                    contractCustomerApproved: req.body.contractCustomerApproved,
                    designStages: req.body.designStages,
                    currentStage: req.body.designStages,
                    assignTo: req.body.designUser._id,
                    teamId: req.body.designUser.teamId,
                    departmentId: req.body.designUser.departmentId,
                }
            }
        )

        const subject = 'Design Sign-off Documents are Rejected';

        const text = `Dear ${req.body.designUser.name} ,
                        Design Sign-off documents are rejected by ${req.user.name}.`;

        const html = `<p>Dear <strong>${req.body.designUser.name}</strong>,</p>
                        <p>Design Sign-off documents are rejected by ${req.user.name}.</p>`

        await emailService.sendEmail(req.body.designUser.email, subject, text, html);

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.params.leadId;
        leadLogs.dealActivity = `Design Sign-off documents are rejected by ${req.user.name} and the lead has been assigned to ${req.body.designUser.name}`;
        leadLogs.save();

        res.status(200).send("Design Sign-off Rejected Successfully")
    } catch (error) {
        console.log(error, "error");
        res.status(400).send(error.message)
    }
})

router.put('/designToExecutionRejectLogs/:leadId', (req, res) => {
    let query = req.params.leadId;
    let update = req.body;
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options).populate('assignTo', 'name email mobile')
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            try {
                const subject = 'Contract Signed Documents Verfication';

                const text = `Dear ${lead.assignTo.name},
                    Design Sign-off is rejected. Please check the rejected reason here ${req.body.contractRejectReason}.`;

                const html = `<p>Dear <strong>${lead.assignTo.name}</strong>,</p>
                            <p> Design Sign-off is rejected. Please check the rejected reason here ${req.body.contractRejectReason}.</p>`

                await emailService.sendEmail(lead.assignTo.email, subject, text, html);

                const data = await CustomerTransactions.findOne({leadId:req.params.leadId,stage:"Design Sign-off"}).sort({createdAt:-1})
                data.finalApprovalStatus = "Not Approved"
                await data.save();
    
                leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.params.leadId;
                leadLogs.dealActivity = `Design Sign-off is rejected by ${req.user.name} and mail send to the lead owner ${lead.assignTo.name}. Rejected Reasone is ${req.body.contractRejectReason}.`;
                leadLogs.save();
            } catch (error) {
                console.log(error, "error in save lead logs")
            }
            res.status(200).json("Lead Updated successfully");
        })
        .catch(err => res.status(400).json(err));
})

router.get('/contractApprovedLeads/:expcenter', async (req, res) => {
    try {
        const response = await Lead.find({ designToExecutionLogsStatus: "Approved", experienceCenterId: req.params.expcenter, isERPProjectCreated: false })
            .populate('customerId', 'name')
            .populate('departmentId', 'name')
            .populate('teamId', 'name')
            .populate('assignTo', 'name')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.get('/allLeadsForProjectRateCard', async (req, res) => {
    try {
        const allProjectLeads = await Lead.find({})
            .select('_id lead_no')
            .populate('customerId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(allProjectLeads);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

// To get all siteQC details of Ankit Pachauri's(Senior Operation Manager) Team
router.get('/getAllSiteQcDetails', async (req, res) =>
{
    try
    {
        let roleId = siteQcRoleID, teamId = operationTeamAnkitId
        
        const allSiteQc = await User.find
        ({
            roles: roleId,
            teamId: teamId
        })
        .populate({path: 'teamId', select: 'name'})
        
        res.status(200).send(allSiteQc)
    }
    catch(error)
    {
        console.log("error", error.message)
        
        console.error(error)
        
        res.status(400).send(error.message)
    }
    
})

router.post('/createDesignMom', async (req, res) =>
{
    try
    {
        await Customer.updateOne
        (
            {_id: req.body.customerId.toString()},
            {$set:
                {
                name: req.body.clientName,
                address: req.body.ApartmentName
                }
            }
        )


        await Lead.updateOne
        (
            {_id: req.body.leadId.toString()},
            {$set:
                {
                    dateOfDesignKickOffMeeting: req.body.dateOfKickOffMeeting,
                    possessionDate: req.body.possesionDate,
                    customerDesignSignOffDate: req.body.tentativeDesignSignOffDate,
                    clientMoveinDate: req.body.tentativeMoveInDate

                }
            }
        )

        const pdffile = await Pdf.generateDesignerMomPdf(req.body);
        
        res.status(200).send(pdffile.pdfUrl)
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).json({error: error})
    }
})

router.get('/getAllDesignKickOffLeads', async (req, res) =>
{
    try
    {
        
        let user = req.user

        let query = {}, chmManagerLeadIds = [], chmUserLeadIds = []
        if(user.roles[0]._id.toString() == chmManagerRoleId)
        {
            
            const ChmManagerLeads = await ChmLeads.find
            ({
                teamId: user.teamId._id.toString()
            })

            
            ChmManagerLeads.forEach(el => chmManagerLeadIds.push(el.leadId.toString()))
            

            if(chmManagerLeadIds.length > 0)
            {
                query._id = {$in: chmManagerLeadIds}
            }
        }
        else if(user.roles[0]._id.toString() == chmUserRoleId)
        {
            
            const ChmUserLeads = await ChmLeads.find
            ({
                assignTo: user._id.toString()
            })
            
            ChmUserLeads.forEach(el=> chmUserLeadIds.push(el.leadId.toString()))
            

            if(chmUserLeadIds.length > 0)
            {
                query._id = {$in: chmUserLeadIds}
            }
        }
        else if(user.roles[0]._id.toString() == designHeadRoleId)
        {
            // query.departmentId = user.departmentId.toString()
            null
        }
        else if(user.roles[0]._id.toString() == designManagerRoleId)
        {
            
            // query.teamId = user.teamId._id.toString()
            query.designManager = user._id.toString()
        }
        else if(user.roles[0]._id.toString() == designUserRoleId)
        {
            
            // query.assignTo = user._id.toString()
            query.designUser = user._id.toString()
        }
        else if(user.roles[0]._id.toString() == salesHeadRoleId)
        {
            null
        }
        else if(user.roles[0]._id.toString() == salesManagerRoleId)
        {
            
            // query.teamId = user.teamId._id.toString()
            query.salesWonManager = user._id.toString()
        }
        else if(user.roles[0]._id.toString() == salesUserRoleId)
        {
            
            // query.assignTo = user._id.toString()
            query.salesWonUser = user._id.toString()
        }
        else if(user.roles[0]._id.toString() == adminRoleId)
        {
            null
        }

        
        let designKickOffStages = ['Won Deals Pending Designer Assignment', 'Designer Assignment Pending', 'Assign to Designer', 'Design Kick-Off : Internal', 'Design Kick-Off : Customer']
        
        let conditions = [{currentStage: {$in: designKickOffStages}}, {...query}]
        
        const designKickOffLeads = await Lead.find
        ({
            $and: [{currentStage: {$in: designKickOffStages}}, {...query}]
        })
        .populate({path: 'customerId', select: 'name email address'})
        .populate({path: 'assignTo', populate: {path: 'roles', select: 'name'}, select: 'name email roles'})
        .populate({path: 'chmUser', select: 'name email mobile teamId'})
        .populate({path: 'designUser', populate: {path: 'roles', select: 'name'}, select: 'name roles teamId email mobile departmentId'})
        .populate({path: 'designManager', populate: {path: 'roles', select: 'name'}, select: 'name roles teamId email mobile departmentId'})
        .populate({path: 'salesWonUser', populate: {path: 'roles', select: 'name'}, select: 'name roles email mobile teamId departmentId'})
        .populate({path: 'salesWonManager', populate: {path: 'roles', select: 'name'}, select: 'name roles email mobile teamId departmentId'})
        .select('lead_no erpProjectNo customerId leadWonDate chmUser possessionDate customerDesignSignOffDate clientMoveinDate designerAssignedDate designUser designManager salesWonUser salesWonManager assignTo previouslyAssignedTo currentStage teamId departmentId isDesignKickOffCustomerApprovedFromDesign designKickOffCustomerFileLinks salesChecklistPdfFile termsAndConditionsPdf designKickOffCustomerActionFromChm createdAt')
        .sort({createdAt: -1})

        res.status(200).send(designKickOffLeads)
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).send(error)
    }
})



// assign SiteQC user manually
router.put
(
    '/assignSiteQC_Manually',
    async (req, res) =>
    {
        try
        {
            // gathering input data at single place
            let inputData =
            {
                leadId: req.body.leadId,
                siteQcUserId: req.body.siteQcUserId,
                siteQcUserTeamId: req.body.siteQcUserTeamId,
                siteQcUserTeamName: req.body.siteQcUserTeamName,
                siteQcUserDepttId: req.body.siteQcUserDepttId,
                siteQcUserName: req.body.siteQcUserName,
                siteQcUserEmail: req.body.siteQcUserEmail,
            }


            // fetching relevant docs and details
            const lead = await Lead.findById
            ({
                _id: inputData.leadId
            })
            .select('_id workingDrawingFile scanQuotationFile customerId erpProjectNo')
            .populate('customerId', 'name email contact_no')
            .lean();

            

            // updating Project
            await Project.updateOne
            (
                {
                    leadId: inputData.leadId
                },
                { $set:
                    {
                        assignedTo: inputData.siteQcUserId,
                        departmentId: inputData.siteQcUserDepttId,
                        teamId: inputData.siteQcUserTeamId
                    }
                }
            )

            // updating Lead
            await Lead.updateOne
            (
                {
                    _id: inputData.leadId
                },
                {
                    $set: 
                    {
                        assignTo: inputData.siteQcUserId,
                        departmentId: inputData.siteQcUserDepttId,
                        teamId: inputData.siteQcUserTeamId,
                        teamName: inputData.siteQcUserTeamName,
                        assignToName: inputData.siteQcUserName,
                        siteQcCompletedUser: inputData.siteQcUserId
                    }
                }
            )

            // sending mail to SiteQC User
            const subject = `Project Code ${lead.erpProjectNo} is sent for site verification.`;

            const text = `Dear ${inputData.siteQcUserName},
                    Please find the attachement and verify the project documents.`;

            const html = `<p>Dear <strong>${inputData.siteQcUserName}</strong>,</p>
                            <p> Please find the attachement and verify the project documents.</p>`

            let data = {
                'email': inputData.siteQcUserEmail,
                'projectCode': lead.erpProjectNo,
                'workingDrawingFile': lead.workingDrawingFile,
                'scanQuotationFile': lead.scanQuotationFile
            }

            emailService.sendEmailToSiteQC(data, subject, text, html);

            
            const subject1 = "Lead Received";
            const text1 = `Dear ${inputData.siteQcUserName};
                                Please kindly check your dashboard new lead is Assigned
                                Customer Name : ${lead.customerId.name}
                                Customer Email: ${lead.customerId.email}`
            const html1 = `<p>Dear <strong>${inputData.siteQcUserName}</strong>,</p>
                                <p>Please kindly check your dashboard new lead is Assigned</p>
                                <p>Customer Name : ${lead.customerId.name}</p>
                                <p>Customer Email: ${lead.customerId.email}</p>
                                <p></p>
                                <p></p>
                                <p>Thanks & Regards,</p>
                                <p>Team Decorpot</p>`;

            emailService.sendEmail(inputData.siteQcUserEmail, subject1, text1, html1);

            // updating Lead Logs
            let leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user
            leadLogs.user = req.user;
            leadLogs.leadId = inputData.leadId;
            leadLogs.dealActivity = `${req.user.name} has assigned to ${inputData.siteQcUserName} for project ${lead.erpProjectNo} site verification.`;
            leadLogs.save();

            res.status(200).json({msg: 'Site QC Assigned'})
        }
        catch(error)
        {
            console.log('error: ', error.message)
            console.error(error)
            res.status(400).send(error.message)
        }
    }
)

router.put('/getSiteQcDocument/:leadId', async (req, res) => {
    try {
    let leadDoc = await Lead.findById(req.params.leadId)
        .select('_id workingDrawingFile scanQuotationFile scanCheckListFile scanContractFile grandTotal experienceCenterId city assignTo erpProjectNo')
        .populate('assignTo', "roles")
        .lean();
    
        let obj = { docUploaderId: "", docUploaderTeamId: "", docUploaderDepttId: "", nameOfTheUser: "", email: "" }

        let docUploaderArray = []
        let docUploaders = await User.find({ roles: { $in: siteQcRoleID }, isActive: true, locationId: { $in: leadDoc.city } }).lean()
        .populate('teamId', 'name')
        .sort({ name: 1 })
        docUploaderArray = docUploaders

        //round robin algorithm
        let assignedLeadFound = false
        for (let i = 0; i < docUploaderArray.length; i++) {
            if (docUploaderArray[i].lastLeadAssigned === true) {
                assignedLeadFound = true
                if (i === docUploaderArray.length - 1) {
                    obj.docUploaderId = docUploaderArray[0]["_id"]
                    obj.docUploaderTeamId = docUploaderArray[0]["teamId"]._id
                    obj.docUploaderDepttId = docUploaderArray[0]["departmentId"]
                    obj.nameOfTheUser = docUploaderArray[0]["name"]
                    obj.email = docUploaderArray[0]["email"]
                    obj.docUploaderTeamName = docUploaderArray[0]["teamId"].name

                } else if (i !== docUploaderArray.length) {
                    obj.docUploaderId = docUploaderArray[i + 1]["_id"]
                    obj.docUploaderTeamId = docUploaderArray[i + 1]["teamId"]
                    obj.docUploaderDepttId = docUploaderArray[i + 1]["departmentId"]
                    obj.nameOfTheUser = docUploaderArray[i + 1]["name"]
                    obj.email = docUploaderArray[i + 1]["email"]
                    obj.docUploaderTeamName = docUploaderArray[i+1]["teamId"].name
                }
            }

            if (!assignedLeadFound) {
                obj.docUploaderId = docUploaderArray[0]["_id"]
                obj.docUploaderTeamId = docUploaderArray[0]["teamId"]
                obj.docUploaderDepttId = docUploaderArray[0]["departmentId"]
                obj.nameOfTheUser = docUploaderArray[0]["name"]
                obj.email = docUploaderArray[0]["email"]
                obj.docUploaderTeamName = docUploaderArray[0]["teamId"]._id
            }

        }

        const user = await User.updateMany({ roles: { $in: siteQcRoleID }, _id: { $nin: [obj.docUploaderId] } }, { $set: { lastLeadAssigned: false } })
        const user2 = await User.updateOne({ _id: obj.docUploaderId }, { $set: { lastLeadAssigned: true } })

        const project = await Project.updateOne({ leadId: req.params.leadId }, { $set: { assignedTo: obj.docUploaderId, departmentId: obj.docUploaderDepttId, teamId: obj.docUploaderTeamId } })
        const lead = await Lead.updateOne({ _id: req.params.leadId }, {
            $set: {
                assignTo: obj.docUploaderId, departmentId: obj.docUploaderDepttId, teamId: obj.docUploaderTeamId, teamName: obj.docUploaderTeamName, assignToName: obj.nameOfTheUser, siteQcCompletedUser: obj.docUploaderId} })

        let signedFile = await ModifiyPdf.SignPdfByDesignToExecution(req.user.name, leadDoc.workingDrawingFile, "Finance Manager")

        const subject = `Project Code ${leadDoc.erpProjectNo} is sent for site verification.`;

        const text = `Dear ${obj.nameOfTheUser},
                Please find the attachement and verify the project documents.`;

        const html = `<p>Dear <strong>${obj.nameOfTheUser}</strong>,</p>
                        <p> Please find the attachement and verify the project documents.</p>`

        let dataObj = {
            'email': obj.email,
            'projectCode': leadDoc.erpProjectNo,
            'workingDrawingFile': signedFile.pdfUrl,
            'scanQuotationFile': leadDoc.scanQuotationFile
        }
        await emailService.sendEmailToSiteQC(dataObj, subject, text, html);

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.params.leadId;
        leadLogs.dealActivity = `${req.user.name} has sent the mail to ${obj.nameOfTheUser} for project ${leadDoc.erpProjectNo} site verification.`;
        leadLogs.save();

        let response = await Lead.findOneAndUpdate({ _id: req.params.leadId },
            {
                $set: {
                    contractFinanceApproved: true,
                    contractDesignManagerApproved: true,
                    contractQualityControlApproved: true,
                    designToExecutionLogsStatus : "Approved",
                    contractOperationApproved: false,
                    executionStage: "Site QC",
                    currentStage: "Site QC",
                    workingDrawingFile: signedFile.pdfUrl
                }
            }
        )
            .select('workingDrawingFile scanCheckListFile scanContractFile scanQuotationFile contractSignedPaymentReceviedAttachemnt departmentId teamId city experienceCenterId')
            .populate('customerId', 'name email contact_no')
            .populate('assignTo', 'name email')

        const subject1 = "Lead Received";
        const text1 = `Dear ${response.assignTo.name};
                            Please kindly check your dashboard new lead is Assigned
                            Customer Name : ${response.customerId.name}
                            Customer Email: ${response.customerId.email}`
        const html1 = `<p>Dear <strong>${response.assignTo.name}</strong>,</p>
                            <p>Please kindly check your dashboard new lead is Assigned</p>
                            <p>Customer Name : ${response.customerId.name}</p>
                            <p>Customer Email: ${response.customerId.email}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`;
        emailService.sendEmail(response.assignTo.email, subject1, text1, html1);

        res.status(200).send(leadDoc);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.put('/updateERPLeadAndLeadLog/:leadId', async (req, res) => {
    let query = req.params.leadId;
    let update = {
        isERPProjectCreated: true,
        erpProjectId: req.body.projectId,
        assignTo: '62833ecf5e2bbcddf8acdf97', // Site QC Manager Id
        teamId: '62beef6ad75fa548e7a03d30', // Site QC Team Id
        departmentId: '62beef42d75fa548e7a03cff' // Site QC Department Id
    };
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options)
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            try {
                leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.params.leadId;
                leadLogs.dealActivity = req.user.name + ' has created the project in ERP and the Project Number is: ' + req.body.projectNumber;
                leadLogs.save();
            } catch (error) {
                console.log(error, "error in save lead logs")
            }
            res.status(200).send('success');
        })
        .catch(err => res.status(400).json(err));
})

router.put('/sendToImosAndSiteQc/:leadId', async (req, res) => {
    let query = req.params.leadId;
    const leadDoc = await Lead.findById(req.params.leadId)
        .select('_id workingDrawingFile scanQuotationFile scanCheckListFile scanContractFile grandTotal experienceCenterId city customerId')
        .populate('customerId', 'name email')
        .lean();

    let objImos = { imosUserId: "", ImosTeamId: "", ImosDeptId: "", nameOfTheUser: "", email: "" }
    let ImosArray = []
    let IMOSManager = await User.find({ roles: { $in: IMOSManagerId }, isActive: true, locationId: { $in: leadDoc.city } }).lean()
    .populate('teamId', 'name')
    .sort({ name: 1 })
    ImosArray = IMOSManager
    //round robin algorithm
    let ImosassignedLeadFound = false
    for (let i = 0; i < ImosArray.length; i++) {
        if (ImosArray[i].lastLeadAssigned === true) {
            ImosassignedLeadFound = true
            if (i === ImosArray.length - 1) {
                objImos.imosUserId = ImosArray[0]["_id"]
                objImos.ImosTeamId = ImosArray[0]["teamId"]._id
                objImos.ImosDeptId = ImosArray[0]["departmentId"]
                objImos.nameOfTheUser = ImosArray[0]["name"]
                objImos.email = ImosArray[0]["email"]
                objImos.ImosTeamName = ImosArray[0]["teamId"].name

            } else if (i !== ImosArray.length) {
                objImos.imosUserId = ImosArray[i + 1]["_id"]
                objImos.ImosTeamId = ImosArray[i + 1]["teamId"]
                objImos.ImosDeptId = ImosArray[i + 1]["departmentId"]
                objImos.nameOfTheUser = ImosArray[i + 1]["name"]
                objImos.email = ImosArray[i + 1]["email"]
                objImos.ImosTeamName = ImosArray[i+1]["teamId"].name
            }
        }

        if (!ImosassignedLeadFound) {
            objImos.imosUserId = ImosArray[0]["_id"]
            objImos.ImosTeamId = ImosArray[0]["teamId"]
            objImos.ImosDeptId = ImosArray[0]["departmentId"]
            objImos.nameOfTheUser = ImosArray[0]["name"]
            objImos.email = ImosArray[0]["email"]
            objImos.ImosTeamName = ImosArray[0]["teamId"].name
        }
    }

    await User.updateMany({ roles: { $in: IMOSManagerId }, _id: { $nin: [objImos.imosUserId] } }, { $set: { lastLeadAssigned: false } })
    await User.updateOne({ _id: objImos.imosUserId }, { $set: { lastLeadAssigned: true } })

    let objBom = { BomUserId: "", BomTeamId: "", BomDeptId: "", nameOfTheUser: "", email: "" }
    let BomArray = []
    let BomManager = await User.find({ roles: { $in: SiteBomRoleId }, isActive: true, locationId: { $in: leadDoc.city } }).lean().sort({ name: 1 })
    BomArray = BomManager
    //round robin algorithm
    let BomassignedLeadFound = false
    for (let i = 0; i < BomArray.length; i++) {
        if (BomArray[i].lastLeadAssigned === true) {
            BomassignedLeadFound = true
            if (i === BomArray.length - 1) {
                objBom.BomUserId = BomArray[0]["_id"]
                objBom.BomTeamId = BomArray[0]["teamId"]
                objBom.BomDeptId = BomArray[0]["departmentId"]
                objBom.nameOfTheUser = BomArray[0]["name"]
                objBom.email = BomArray[0]["email"]

            } else if (i !== BomArray.length) {
                objBom.BomUserId = BomArray[i + 1]["_id"]
                objBom.BomTeamId = BomArray[i + 1]["teamId"]
                objBom.BomDeptId = BomArray[i + 1]["departmentId"]
                objBom.nameOfTheUser = BomArray[i + 1]["name"]
                objBom.email = BomArray[i + 1]["email"]
            }
        }

        if (!BomassignedLeadFound) {
            objBom.BomUserId = BomArray[0]["_id"]
            objBom.BomTeamId = BomArray[0]["teamId"]
            objBom.BomDeptId = BomArray[0]["departmentId"]
            objBom.nameOfTheUser = BomArray[0]["name"]
            objBom.email = BomArray[0]["email"]
        }
    }

    await User.updateMany({ roles: { $in: SiteBomRoleId }, _id: { $nin: [objBom.BomUserId] } }, { $set: { lastLeadAssigned: false } })
    await User.updateOne({ _id: objBom.BomUserId }, { $set: { lastLeadAssigned: true } })

    let update = {
        finalWDFile: req.body.finalWorkingDrawingFile,
        imosStage: 'Assign To IMOS User',
        currentStage: 'Assign To IMOS User & Site BOM In-progress',
        assignTo: objImos.imosUserId, // IMOS Manager Id
        teamId: objImos.ImosTeamId, // IMOS Team Id
        departmentId: objImos.ImosDeptId, // IMOS Department Id
        teamName: objImos.ImosTeamName,
        assignToName: objImos.nameOfTheUser
    };
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options)
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            try {
                await Project.updateOne({ _id: req.body.erpProjectId }, {
                    $set: {
                        status: constants.ProjectStatus.imos,
                        assignedTo: objImos.imosUserId, // IMOS Manager Id
                        teamId: objImos.ImosTeamId, // IMOS Team Id
                        departmentId: objImos.ImosDeptId // IMOS Department Id
                    }
                })
                let newImosProjectNumber = 'IMOS_' + lead.lead_no;
                let newSiteQcProjectNumber = 'SBOM_' + lead.lead_no;

                leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.params.leadId;
                leadLogs.dealActivity = req.user.name + ` has uploaded the final 2D drawing file and the project has been moved to IMOS - (${objImos.nameOfTheUser})
                and Site BOM - (${objBom.nameOfTheUser}) and the respective projects are created with - ` + newImosProjectNumber + ' and ' + newSiteQcProjectNumber + ' number.';
                leadLogs.save();

                const imosProjet = await ImosProject.find({ leadId: req.params.leadId }).lean()
                if(imosProjet.length === 0){
                    const newImosProject = new ImosProject({
                        imosProjectNo: newImosProjectNumber,
                        leadId: req.params.leadId,
                        projectId: req.body.erpProjectId,
                        createdBy: req.user._id,
                        updatedBy: req.user._id,
                        projectStatus: 'IMOS-Initial',
                        stage: 'Assign To IMOS User',
                        assignTo: objImos.imosUserId, // IMOS Manager Id
                        teamId: objImos.ImosTeamId, // IMOS Team Id
                        departmentId: objImos.ImosDeptId, // IMOS Department Id
                        experienceCenterId: lead.experienceCenterId
                    })
                    await newImosProject.save()

                    const subjectname = 'ERP - New Lead Assigned';
                    const textcontent = `Dear ${objImos.nameOfTheUser};
                            Customer Name :  ${leadDoc.customerId.name};
                            Customer email :  ${leadDoc.customerId.email};
                            is assigned Please check your crm tool`;

                    const htmlcontent = `<p>Dear <strong>${objImos.nameOfTheUser}</strong>,</p>
                            <p>Customer Name :  ${leadDoc.customerId.name};</p>
                            <p> Customer email :  ${leadDoc.customerId.email};</p>
                            <p> is assigned Please check your crm tool</p>`

                    emailService.sendEmail(objImos.email, subjectname, textcontent, htmlcontent);
                }

                const siteBomProject = await SiteBomProject.find({ leadId: req.params.leadId }).lean()
                if (siteBomProject.length === 0) {
                    const newSiteBomProject = new SiteBomProject({
                        siteBomProjectNo: newSiteQcProjectNumber,
                        leadId: req.params.leadId,
                        projectId: req.body.erpProjectId,
                        createdBy: req.user._id,
                        updatedBy: req.user._id,
                        projectStatus: 'BOM-Initial',
                        stage: 'Site BOM In-progress',
                        assignTo: objBom.BomUserId, // BOM Executive Id
                        teamId: objBom.BomTeamId, // BOM Team Id
                        departmentId: objBom.BomDeptId, // BOM Department Id
                        experienceCenterId: lead.experienceCenterId
                    })
                    await newSiteBomProject.save()

                    const subjectname1 = 'ERP - New Lead Assigned';
                    const textcontent1 = `Dear ${objBom.nameOfTheUser};
                            Customer Name :  ${leadDoc.customerId.name};
                            Customer email :  ${leadDoc.customerId.email};
                            is assigned Please check your crm tool`;

                    const htmlcontent1 = `<p>Dear <strong>${objBom.nameOfTheUser}</strong>,</p>
                            <p>Customer Name :  ${leadDoc.customerId.name};</p>
                            <p> Customer email :  ${leadDoc.customerId.email};</p>
                            <p> is assigned Please check your crm tool</p>`

                    emailService.sendEmail(objBom.email, subjectname1, textcontent1, htmlcontent1);

                }

                const subject = 'Final Working Drawing File';
                const text = `Dear ${leadDoc.customerId.name};
                            Please find attached the Final Working Drawing for your project.`;

                const html = `<p>Dear <strong>${leadDoc.customerId.name}</strong>,</p>
                <p>Please find attached the Final Working Drawing for your project.</p>
                <p></p>
                <p></p>
                <p>Thanks & Regards,</p>
                <p>Team Decorpot</p>`

                await emailService.sendEmailWithAttachement(leadDoc.customerId.email, subject, text, html, req.body.finalWorkingDrawingFile, leadDoc.customerId.name);
                

            } catch (error) {
                console.log(error, "error in save lead logs")
                res.status(400).send(error.toString());
            }
            res.status(200).send('success');
        })
        .catch(err => res.status(400).json(err));
})

router.put('/uploadImosFiles/:leadId', async (req, res) => {
    let query = req.params.leadId;
    let update = req.body;
    let options = { new: true };
    
    Lead.findByIdAndUpdate(query, update, options)
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            
            res.status(200).send('success');
        })
        .catch(err => res.status(400).json(err));
})

router.put('/updateToReadyToDispatch/:leadId', async (req, res) => {
    let query = req.params.leadId;
    let update = req.body;
    let options = { new: true };
    const chmLeadAssigned = await ChmLeads.find({ leadId: req.params.leadId})
    .populate('teamId','name')
    .populate('assignTo',"name").lean()

    if (chmLeadAssigned.length === 0) return res.status(404).json('Chm user not assigned.');
    update.assignTo = chmLeadAssigned[0].assignTo._id
    update.teamId = chmLeadAssigned[0].teamId
    update.departmentId = chmLeadAssigned[0].departmentId
    update.currentStage = update.factoryStage
    update.assignToName = chmLeadAssigned[0].assignTo.name,
    update.teamName = chmLeadAssigned[0].teamId.name

    const checkUser = await User.findOne({ roles: vendorSoManagerRole })
    .select('name departmentId teamId')
    .lean()

    vendorSoManager = new vendorAssignmentLeads();
    vendorSoManager.leadId = query
    vendorSoManager.projectId = req.body.projectId;
    vendorSoManager.assignTo = checkUser._id;
    vendorSoManager.departmentId = checkUser.departmentId;
    vendorSoManager.teamId = checkUser.teamId;
    vendorSoManager.experienceCenterId = req.body.experienceCenterId;
    vendorSoManager.save();

    Lead.findByIdAndUpdate(query, update, options)
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            try {
                await Project.updateOne({ _id: lead.erpProjectId }, {
                    $set: {
                        assignedTo: chmLeadAssigned[0].assignTo._id,
                        teamId: chmLeadAssigned[0].teamId._id,
                        departmentId: chmLeadAssigned[0].departmentId,
                    }
                })
               
                leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.params.leadId;
                leadLogs.dealActivity = req.user.name + ' has changed stage to ' + req.body.factoryStage + ' and lead has been assigned to ' + chmLeadAssigned[0].assignTo.name + '  Ready To Dispatch Date: ' + moment(req.body.readyToDispatchDate).format('ll');
                leadLogs.save();

            } catch (error) {
                console.log(error, "error in save lead logs")
            }
            res.status(200).send('success');
        })
        .catch(err => res.status(400).json(err));
})

router.put('/updateFactoryStage/:leadId', async (req, res) => {
    let query = req.params.leadId;
    let update = req.body;

    const SiteBOM = await SiteBomProject.findOne({leadId: req.params.leadId}).select('_id stage')
        if(SiteBOM.stage !== "Site BOM Completed")
        {
                update.currentStage = `${update.factoryStage} & ${SiteBOM.stage}`
        }else{
                update.currentStage = update.factoryStage
        }
    
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options)
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            try {
                leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.params.leadId;
                leadLogs.dealActivity = req.user.name + ' has changed stage to ' + req.body.factoryStage + ' .';
                leadLogs.save();

            } catch (error) {
                console.log(error, "error in save lead logs")
            }
            res.status(200).send('success');
        })
        .catch(err => res.status(400).json(err));
})
router.delete('/deleteLeadConfirm/:id', (req, res) => {
  Lead.findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(200).send('Lead deleted.');
        })
        .catch((err) => res.status(400).send(err));
})

router.put('/uploadUpdatedData/:leadId', async (req, res) => {
    let query = req.params.leadId;
    let update = req.body;
    let options = { new: true };
    const SiteBOM = await SiteBomProject.findOne({leadId: req.params.leadId}).select('_id stage')
        if(SiteBOM.stage !== "Site BOM Completed")
        {
            if (req.body.materialReceived ) {
                update.currentStage = `100% Material Received & ${SiteBOM.stage}`

            } else if (req.body.materialReceived === false){
                update.currentStage = `Under Procurement & ${SiteBOM.stage}`
            }
        }
    
    Lead.findByIdAndUpdate(query, update, options)
        .then(async (lead) => {
            if (!lead) return res.status(404).json("Lead not found.");
            leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user;
            leadLogs.user = req.user;
            leadLogs.leadId = req.params.leadId;
            if (req.body.materialReceived || req.body.materialReceived === false) {
                if (req.body.materialReceived === true) {
                    leadLogs.dealActivity =
                        req.user.name +
                        " has updated that the material has been received in the factory.";
                } else {
                    leadLogs.dealActivity =
                        req.user.name +
                        " has updated that the material has not been received in the factory.";
                }
            } else {
                leadLogs.dealActivity =
                    req.user.name + " has uploaded the pasting file.";
            }
            leadLogs.save();
            res.status(200).send("success");
        })
        .catch((err) => res.status(400).json(err));
})


router.get('/getReadyToDispatchProjects/:expcenter', async (req, res) => {
    try {
        const allReadyToDispatchProjects = await Lead.find({ experienceCenterId: req.params.expcenter, currentStage: 'Ready for dispatch' })
            .select('lead_no grandTotal factoryStage readyToDispatchDate')
            .populate('erpProjectId', 'code clientName divisionOfProject startDate grandTotal status')
            .sort({ readyToDispatchDate: 1 })
            .lean();
        for (let i = 0; i < allReadyToDispatchProjects.length; i++) {
            let response = await ChmLeads.find({ leadId: allReadyToDispatchProjects[i]._id }).populate('assignTo', "name")
            allReadyToDispatchProjects[i]["chmName"] = response[0].assignTo.name
        }
        res.status(200).send(allReadyToDispatchProjects);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.get('/getReadyToDispatchProjectsForCHM/:expcenter', async (req, res) => {
    try {
        let query = { experienceCenterId: req.params.expcenter };
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
        let response = await ChmLeads.find(query)

        let leadIdArray = []

        response.forEach(el => leadIdArray.push(el.leadId))

        const allReadyToDispatchProjectsForCHM = await Lead.find({ "_id": { $in: leadIdArray }, experienceCenterId: req.params.expcenter, currentStage: 'Ready for dispatch' })
            .select('lead_no grandTotal factoryStage readyToDispatchDate')
            .populate('erpProjectId', 'code clientName divisionOfProject startDate grandTotal status')
            .sort({ readyToDispatchDate: 1 })
            .lean();
            for (let i = 0; i < allReadyToDispatchProjectsForCHM.length;i++){
                let response = await ChmLeads.find({ leadId: allReadyToDispatchProjectsForCHM[i]._id }).populate('assignTo',"name")
                allReadyToDispatchProjectsForCHM[i]["chmName"] = response[0].assignTo.name
             }
        res.status(200).send(allReadyToDispatchProjectsForCHM);

    }
    catch (error) {
        res.status(400).send(error.message)
    }
})

router.get('/getDocumentUploaderCount/:expcenter', async (req, res) => {
    try {
        let countObj = {
            readyToDispatch: 0,
            contractSigned: 0
        }
        const getLeadLists = await Lead.find({ experienceCenterId: req.params.expcenter })
            .select('designToExecutionLogsStatus isERPProjectCreated factoryStage lead_no finalPaymentApprovalRequestStatus')
        for (let i = 0; i <= getLeadLists.length; i++) {
            if (getLeadLists[i]?.factoryStage === 'Ready for dispatch' && getLeadLists[i]?.finalPaymentApprovalRequestStatus === 'NA') {
                countObj.readyToDispatch += 1
            }
            if (getLeadLists[i]?.designToExecutionLogsStatus === 'Approved' && getLeadLists[i]?.isERPProjectCreated === false) {
                countObj.contractSigned += 1
            }
        }
        res.status(200).send(countObj);
    } catch (error) {
        console.log(error, "error")
        res.status(400).send(error.message)
    }
})

router.post('/sendFinalEmailToCustomer', async (req, res) => {
    try {
        let twoDaysLaterDate = new Date(req.body.pendingPaymentDate)
        twoDaysLaterDate.setDate(twoDaysLaterDate.getDate() + 2);
        const subject = `Project Dispatch date and Due Amount`;
        const text = `Dear ${req.body.customerName},
            Greetings from Decorpot,
            Please note the below with regards to your modular materials delivery:
            1. The Modular material will be ready at the factory for dispatch on 22 October 2022.
            2. Please release the payment towards the modular material of INR  3,84,346.73/-
            3. Materials will be delivered depending upon the payment release date and the payment has to be made before 48 hours of dispatch. 
            4. Installation Team for final assembly of furniture will be deployed within 2 days once furniture reaches the site . 
            5. The Project manager will be assigned for the project  during the delivery of modular furniture and he will be the point of contact until the handover.
            
            Please find below the account details to make the pending payment - 
            
            AC NO :- 316805000120        
            IFSC :- ICIC0003168
            NAME :- SAMIKA DESIGN SOLUTIONS PVT LTD
            BANK :- ICICI BANK`;

        const html = `<p>Dear <strong>${req.body.customerName}</strong>,</p>
                <p>Greetings from Decorpot,</p>
                <p>Please note the below points with regards to your modular materials delivery:</p>
                <p>1. The Modular material will be ready at the factory for dispatch on ${moment(twoDaysLaterDate).format('ll')}.</p>
                <p>2. Please release the payment towards the modular material of INR  ${req.body.amountDue}/-</p>
                <p>3. Materials will be delivered depending upon the payment release date and the payment has to be made before 48 hours of dispatch. </p>
                <p>4. Installation Team for final assembly of furniture will be deployed within 2 days once furniture reaches the site . </p>
                <p>5. The Project manager will be assigned for the project  during the delivery of modular furniture and they will be the point of contact until the handover.</p>
                
                <p>Please find below the account details to make the pending payment - </p>
                
                <p>AC NO :- 316805000120</p>  
                <p>IFSC :- ICIC0003168</p>
                <p>NAME :- SAMIKA DESIGN SOLUTIONS PVT LTD</p>
                <p>BANK :- ICICI BANK</p>`

        await emailService.sendEmail(req.body.customerEmail, subject, text, html);

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadId;
        leadLogs.dealActivity = `${req.user.name} has sent the mail to the customer (${req.body.customerName}) for payment Due amount and final date.`;
        leadLogs.save();
        res.status(200).send('Email send successfully');
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.post('/updateStatusMaterialDispatched', async (req, res) => {
    try {
        await Lead.findOneAndUpdate({ _id: req.body.leadId }, { $set: { materialDispatchedDate: req.body.materialDispatchedDate, factoryStage: req.body.status, currentStage: req.body.status } });
        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadId;
        leadLogs.dealActivity = `${req.user.name} has changed the status to ${req.body.status} and Material Dispatched Date : ${moment(req.body.materialDispatchedDate).format('ll')}.`;
        leadLogs.save();
        res.status(200).send('Updated successfully');
    } catch (error) {
        res.status(400).send(error.message)
    }
})

// router.get('/CustomerPrivewQuotationView/:leadId', async (req, res) => {
//     try {
//         let query = { departmentId: "5cb70b89ffa4965f53aa22d8" }
//         const userss = await User.find({ _id: req.params.leadId }).lean().select('roles teamId')
//         if (userss[0].roles.length === 2) {
//             query = {
//                 ...query, $or: [{ 'QuoteApprovedByCustomer.status': "Approved" }, { 'QuoteApprovedByCustomer.status': "Rejected" }]
//             }
//         } else {
//             const roles = await (await Roles.find({ _id: userss[0].roles[0] }))
//             if (roles[0].name === "Design Manager") {
//                 query = { ...query, $or: [{ 'QuoteApprovedByCustomer.status': "Approved" }, { 'QuoteApprovedByCustomer.status': "Rejected" }], teamId: userss[0].teamId }
//             } else {
//                 query = {
//                     ...query, assignTo: req.params.leadId,
//                     $or: [{ 'QuoteApprovedByCustomer.status': "Approved" }, { 'QuoteApprovedByCustomer.status': "Rejected" }]
//                 }
//             }
//         }
//         const leads = await Lead.find(query)
//             .populate("assignTo", "name")
//             .populate('customerId', 'name')
//             .select('QuoteApprovedByCustomer customerId assignTo customerUploadedtranscation').lean()
//         res.status(200).send(leads)
//     } catch (error) {
//         res.status(400).send(error.message)
//     }
// })

router.post("/updateStatusUnderExecution", async (req, res) => {
    try {
        const executionManager = await User.findOne({
            roles: ExecutionManagerRoleId,
        }).populate('teamId','name');
        await Lead.findOneAndUpdate(
            { _id: req.body.leadId },
            {
                $set: {
                    materialDispatchedDate: req.body.materialDispatchedDate,
                    factoryStage: req.body.status,
                    currentStage: req.body.status,
                    assignTo: executionManager["_id"],
                    departmentId: executionManager.departmentId,
                    teamId: executionManager.teamId._id,
                    assignToName: executionManager.name,
                    teamName: executionManager.teamId.name
                },
            }
        );
        await Project.findOneAndUpdate(
            { leadId: req.body.leadId },
            {
                $set: {
                    assignedTo: executionManager["_id"],
                    departmentId: executionManager.departmentId,
                    teamId: executionManager.teamId,
                },
            }
        );
        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user;
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadId;
        leadLogs.dealActivity = `${req.user.name} has changed the status to ${req.body.status
            } and Material Dispatched Date : ${moment(
                req.body.materialDispatchedDate
            ).format("ll")}.`;
        leadLogs.save();
        res.status(200).send("Updated successfully");
    } catch (error) {
        res.status(400).send(error.message);
    }
});



router.put('/getUnderExecutionProjects/:expcenter', async (req, res) => {
    try {
        let query = {}

        if(req.body.leadExpCtrIds)
        {
            if(req.body.leadExpCtrIds.length > 0)
            {
                query['experienceCenterId'] = req.body.leadExpCtrIds
            }
        }

        if (req.body.startDate !== "undefined" && req.body.endDate !== "undefined" && req.body.filterOption !== "undefined")
        {
            if(req.body.filterOption === "designSignOffDate")
            {
                query['customerDesignSignOffDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
            }
            else if(req.body.filterOption === "expected-Completion-Date")
            {
                query['projectCompletionDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
            }
        }

        if (req.body.isUser) {
            query["assignTo"] = req.user._id
        }
        
        const UnderExecutionProjects = await Lead.find
        ({
            ...query,
            currentStage: "Under Execution"
        })
        .select('lead_no grandTotal factoryStage currentStage readyToDispatchDate totalCustomerOutflow projectCompletionDate customerDesignSignOffDate experienceCenterId designSignOffDate erpProjectNo')
        .populate('erpProjectId', 'code projectNumber clientName divisionOfProject startDate grandTotal status')
        .populate("customerId", "name")
        .sort({ projectCompletionDate: 1 })
        .lean();

        let UnderExecutionProjects1 = []

        for (let i = 0; i < UnderExecutionProjects.length; i++)
        {
            let projectCompletionDate = UnderExecutionProjects[i].projectCompletionDate
            let today = new Date()
            let obj = {}
            
            if(projectCompletionDate)
            {
                obj = { ...UnderExecutionProjects[i], "remainingDays": Number(((projectCompletionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)).toFixed(0)) }
            }
            else
            {
                obj = { ...UnderExecutionProjects[i], "remainingDays": "" }
            }

            UnderExecutionProjects1.push(obj)
        }

        UnderExecutionProjects1.sort((a, b) => a.remainingDays - b.remainingDays);

        res.status(200).send(UnderExecutionProjects1);

    }
    catch (error)
    {
        res.status(400).send(error.message)
    }
})

router.put('/getCompletedProjects/:expcenter', async (req, res) => {
    try
    {
        let query = {}

        if(req.body.leadExpCtrIds)
        {
            if(req.body.leadExpCtrIds.length > 0)
            {
                query['experienceCenterId'] = req.body.leadExpCtrIds
            }
        }

        if(req.body.startDate && req.body.endDate && req.body.filterOption)
        {
            if(req.body.filterOption === "designSignOffDate")
            {
                query['customerDesignSignOffDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
            }
            else if(req.body.filterOption === "projectCompletionDate")
            {
                query['executionCompletionDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
            }
        }
        if (req.body.isUser){
            query["assignTo"] = req.user._id
        }
        const allCompletedProjects = await Lead.find
        ({
            ...query,
            currentStage : 'Completed',
            finalPaymentApprovalRequestStatus: 'NA'
        })
        .select('lead_no grandTotal factoryStage currentStage readyToDispatchDate totalCustomerOutflow projectCompletionDate customerDesignSignOffDate designSignOffDate erpProjectNo clientDependency experienceCenterId experienceCenterId executionCompletionDate')
        .populate('erpProjectId', 'code projectNumber clientName divisionOfProject startDate grandTotal status')
        .populate("customerId","name")
        .sort({ designSignOffDate: 1 })
        .lean();

        res.status(200).send(allCompletedProjects);

    }
    catch (error)
    {
        res.status(400).send(error.message)
    }
})

router.put('/getCompletedMWPProjects/:expcenter', async (req, res) => {
    try
    {
        let query = {}

        if(req.body.leadExpCtrIds)
        {
            if(req.body.leadExpCtrIds.length > 0)
            {
                query['experienceCenterId'] = req.body.leadExpCtrIds
            }
        }

        if(req.body.startDate !== "undefined" && req.body.endDate !== "undefined" && req.body.filterOption !== "undefined")
        {
            if(req.body.filterOption === "designSignOffDate")
            {
                query['customerDesignSignOffDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
            }
            else if(req.body.filterOption === "expected-Completion-Date")
            {
                query['projectCompletionDate'] = { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) };
            }
        }

        if (req.body.isUser) {
            query["assignTo"] = req.user._id
        }

        const allCompletedMWPProjects = await Lead.find
        ({
            ...query,
            currentStage : 'Completed-MWP',
            finalPaymentApprovalRequestStatus: 'NA'
        })
        .select('lead_no grandTotal factoryStage currentStage readyToDispatchDate totalCustomerOutflow projectCompletionDate customerDesignSignOffDate designSignOffDate experienceCenterId erpProjectNo')
        .populate('erpProjectId', 'code projectNumber clientName divisionOfProject startDate grandTotal status')
        .populate("customerId", "name")
        .sort({ projectCompletionDate: 1 })
        .lean();

        let allCompletedMWPProjects1 = []

        for (let i = 0; i < allCompletedMWPProjects.length; i++)
        {
            let projectCompletionDate = allCompletedMWPProjects[i].projectCompletionDate
            let today = new Date()
            let obj = {}

            if(projectCompletionDate)
            {
                obj = { ...allCompletedMWPProjects[i], "remainingDays": Number(((projectCompletionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)).toFixed(0)) }
            }
            else
            {
                obj = { ...allCompletedMWPProjects[i], "remainingDays": "" }
            }

            allCompletedMWPProjects1.push(obj)

        }

        allCompletedMWPProjects1.sort((a, b) => a.remainingDays - b.remainingDays);

        res.status(200).send(allCompletedMWPProjects1);

    }
    catch (error)
    {
        res.status(400).send(error.message)
    }
})

router.put('/updateDesignKickOffCustomerFromDesign', async (req, res) =>
{
    try
    {
        await Lead.updateOne
        (
            {_id: req.body.leadDetails._id},
            {$set:
                {
                isDesignKickOffCustomerApprovedFromDesign: true,
                designKickOffCustomerFileLinks: req.body.designKickOffCustomerFileLinks
                }
            }
        )
        let leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadDetails._id;
        leadLogs.dealActivity = `'Designer${req.user.name}' has approved 'Design Kick-Off : Customer' stage . It is sent for approval to CHM '${req.body.leadDetails.chmUser.name}'.`;
        leadLogs.save();

        res.status(200).send('all good')
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).send(error)
    }
})

router.put('/updateDesignKickOffCustomerFromChm', async (req, res) =>
{
    try
    {
        if(req.body.status == 'Approved')
        {
            await Lead.updateOne
            (
                {_id: req.body.leadDetails._id},
                {
                    $set:
                    {
                        designKickOffCustomerActionFromChm:'Approved',
                        isDesignKickOffCustomerApprovedFromChm: true,
                        designStages: 'Designer Assigned',
                        currentStage: 'Designer Assigned'
                    }
                }
            )
            let leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user
            leadLogs.user = req.user;
            leadLogs.leadId = req.body.leadDetails._id;
            leadLogs.dealActivity = `CHM '${req.user.name}' has approved the lead in 'Design Kick-Off : Customer' and stage is now moved to 'Designer Assigned'.`;
            leadLogs.save();
            console.log('reqBody', req.body)

            const subject = 'Completion of Design Handover Process';
            const text = `Dear ${req.body.leadDetails.customerId.name};
                        We are pleased to inform you that the Design Handover Process has been completed. The assigned designer, [${req.body.leadDetails.designUser?.name}, ${req.body.leadDetails.designUser?.mobile},  ${req.body.leadDetails.designUser?.email}], will contact you shortly to discuss the design in further detail.
                        If you encounter any issues during the design phase, you can contact the Design Manager, [${req.body.leadDetails.designManager?.name}]. If you have any questions, please do not hesitate to reach out to me [${req.body.leadDetails.chmUser?.name}, ${req.body.leadDetails.chmUser?.mobile}, ${req.body.leadDetails.chmUser?.email}].
                        Link Please refer to the following documents:
                        Thank you for your cooperation and support.`;

            const html = `<p>Dear <strong>${req.body.leadDetails.customerId.name}</strong>,</p>
                <p>We are pleased to inform you that the Design Handover Process has been completed. The assigned designer, [${req.body.leadDetails.designUser?.name}, ${req.body.leadDetails.designUser?.mobile},  ${req.body.leadDetails.designUser?.email}], will contact you shortly to discuss the design in further detail.</p>
                <p>If you encounter any issues during the design phase, you can contact the Design Manager, [${req.body.leadDetails.designManager?.name}]. If you have any questions, please do not hesitate to reach out to me [${req.body.leadDetails.chmUser?.name}, ${req.body.leadDetails.chmUser?.mobile}, ${req.body.leadDetails.chmUser?.email}].</p>
                <p>Please refer to the following documents:</p>
                <p>Design Kick-Off Quotation PDF : ${req.body.leadDetails.designKickOffCustomerFileLinks.quotationFileLink}</p>
                <p>Design Kick-Off Designer MOM : ${req.body.leadDetails.designKickOffCustomerFileLinks.momFileLink}</p>
                <p>Sales Checklist : ${req.body.leadDetails.salesChecklistPdfFile}</p>
                <p>Contract : ${req.body.leadDetails.termsAndConditionsPdf}</p>
                <p></p>
                <p>Best Regards,</p>
                <p>${req.body.leadDetails.chmUser?.name}</p>`;

            await emailService.sendEmail(req.body.leadDetails.customerId.email.trim(), subject, text, html);



        }
        else if(req.body.status == 'Rejected')
        {
            
            let roleName = req.body.selectedUserData.roles[0].name
            if(roleName == 'Sales User' || roleName == 'Sales Manager')
            {
            await Lead.updateOne
            (
                {_id: req.body.leadDetails._id},
                {
                    $set:
                    {
                        designKickOffCustomerActionFromChm:'Rejected',
                        isDesignKickOffCustomerApprovedFromChm: false,
                        isDesignKickOffCustomerApprovedFromDesign: false,
                        currentStage: 'Won Deals Pending Designer Assignment',
                        salesStage: 'Won Deals Pending Designer Assignment',
                        salesLeadOwnRole: "NA",
                        assignTo: req.body.selectedUserData._id,
                        assignToName: req.body.selectedUserData.name,
                        teamId: req.body.selectedUserData.teamId,
                        departmentId: req.body.selectedUserData.departmentId,
                        chmReasonForDesignKickOffRejection: req.body.chmReasonForDesignKickOffRejection,
                        salesExecutiveApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                        salesManagerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                        customerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                        finanaceManagerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                        centerHeadApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                        businessHeadApproved: [{ status: 'Approval Not Initiated', isApproved: false }]
                    }
                }
            )

            await CustomerSurveyWonForm.deleteOne({leadId: req.body.leadDetails._id.toString()})

            let leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user
            leadLogs.user = req.user;
            leadLogs.leadId = req.body.leadDetails._id;
            leadLogs.dealActivity = `CHM '${req.user.name}' has rejected the lead in 'Design Kick-Off : Customer' stage and moved to 'Won Deals Pending Designer Assignment' with assignment to ${roleName} '${req.body.selectedUserData.name}'. [Reason: ${req.body.chmReasonForDesignKickOffRejection}]`;
            leadLogs.save();
            }
            else if(roleName == 'Design User' || roleName == 'Design Manager' || roleName == 'Design Head')
            {
                await Lead.updateOne
                (
                    {_id: req.body.leadDetails._id},
                    {
                        $set:
                        {
                            designKickOffCustomerActionFromChm:'Rejected',
                            isDesignKickOffCustomerApprovedFromChm: false,
                            isDesignKickOffCustomerApprovedFromDesign: false,
                            currentStage: "Design Kick-Off : Customer",
                            designStages: 'Design Kick-Off : Customer',
                            assignTo: req.body.selectedUserData._id,
                            assignToName: req.body.selectedUserData.name,
                            teamId: req.body.selectedUserData.teamId,
                            departmentId: req.body.selectedUserData.departmentId
                        }
                    }
                )

                let leadLogs = new LeadLogs();
                leadLogs.createdBy = req.user
                leadLogs.user = req.user;
                leadLogs.leadId = req.body.leadDetails._id;
                leadLogs.dealActivity = `CHM '${req.user.name}' has rejected the lead in 'Design Kick-Off : Customer' stage and assigned to ${roleName} '${req.body.selectedUserData.name}'. [Reason: ${req.body.chmReasonForDesignKickOffRejection}]`;
                leadLogs.save();

                
    
            }

            let designHead = await User.findOne({_id: designHeadId})

            let emailListObj = {
                to: req.body.selectedUserData.email,
                bcc:
                [
                    req.body.leadDetails.salesWonUser?.email,
                    req.body.leadDetails.salesWonManager?.email,
                    req.body.leadDetails.designUser?.email,
                    req.body.leadDetails.designManager?.email,
                    designHead.email
                    
                ]
            }

            const subject = 'Deal returned by CHM';
            const text = `Dear ${req.body.selectedUserData?.name};
                        We regret to inform you that the deal [LEAD NO: ${req.body.leadDetails.lead_no}] has been returned by CHM ${req.body.leadDetails.chmUser?.name}.
                        [Reason: ${req.body.chmReasonForDesignKickOffRejection}]
                        Please review the deal and make the necessary changes before resubmitting it for approval.`;

            const html = `<p>Dear <strong>${req.body.selectedUserData?.name}</strong>,</p>
                <p>We regret to inform you that the deal [LEAD NO: ${req.body.leadDetails.lead_no}] has been returned by CHM. ${req.body.leadDetails.chmUser?.name}</p>
                <p>[Reason: ${req.body.chmReasonForDesignKickOffRejection}]</p>
                <p>Please review the deal and make the necessary changes before resubmitting it for approval.</p>
                
                
                <p>Sincerely,</p>
                <p>Team Decorpot</p>`;
                
            await emailService.sendEmailWithBcc(emailListObj, subject, text, html);
            
        }
        res.status(200).send('all good')
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).send(error)
    }
})

router.post('/updateStatusFromUnderExecutionTo', async (req, res) => {
    try {
       let data = { factoryStage: req.body.status, currentStage: req.body.status, clientDependency: req.body.clientDependency }

        if(req.body.executionCompletionDate)
        {
            data.executionCompletionDate = req.body.executionCompletionDate
        }
        
        let lead = await Lead.findOneAndUpdate({ _id: req.body.leadId }, { $set: data })
        .populate('customerId','name email');
        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadId;

        leadLogs.dealActivity = req.body.executionCompletionDate ?
        `${req.user.name} has changed the status to ${req.body.status} and Execution Completed Date : ${moment(req.body.executionCompletionDate).format('ll')}.`:
        `${req.user.name} has changed the status to ${req.body.status} and Material Dispatched Date : ${moment(lead.materialDispatchedDate).format('ll')}.`
        
        leadLogs.save();
        let executionSurvey = await CustomerSurveyExecutionForm.find({ leadId: req.body.leadId });
        if (executionSurvey.length === 0 && req.body.status === "Completed") {
            const surveyLink = `${IpAddress}customer-survey-form/execution/${req.body.leadId}`
            const subject = 'Customer Survey Form';
            const text = `Dear ${lead.customerId.name};
                            Please kindly check and fill out our survey form..
                            It won’t take more than 30 seconds.
                            Link for survey form: ${surveyLink}`;

            const html = `<p>Dear <strong>${lead.customerId.name}</strong>,</p>
                            <p>Please kindly check and fill out our survey form.</p>
                            <p>It won’t take more than 30 seconds</p>
                            <p>Link for survey form: ${surveyLink}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`
            emailService.sendEmail(lead.customerId.email, subject, text, html);

            const customerSurvey = new CustomerSurvey({
                leadId: req.body.leadId,
                customerId: lead.customerId._id,
                leadOwner: lead.assignTo,
                surveyType: 'execution',
                surveyStatus: 'Sent'
            })
            await customerSurvey.save();
        }
        res.status(200).send('Updated successfully');
    } catch (error) {
        res.status(400).send(error.message)
    }
})
router.put('/reinstateProcess/:leadId', async (req, res) => {
    try {
        let query = req.params.leadId
        await Lead.findByIdAndUpdate(query, { $set: req.body })
        res.status(200).send("Updated Suceessfully")
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.get('/targetAchivedVsTarget', async (req, res) => {
    try {
        const date = new Date()
        let startMonth = date.getMonth();
        let endMonth = date.getMonth();
        let year = date.getFullYear();
        let query = {}
        switch (req.query.filterOption) {
            case "createdAt":
                query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            case "leadWonDate":
                query['leadWonDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            case "designSignOffDate":
                query['designSignOffDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
                break;

            default:
                query['leadWonDate'] = { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() };
                break;
        }

        if (req.query.startDate && req.query.endDate) {
            startMonth = new Date(req.query.startDate).getMonth()
            endMonth = new Date(req.query.endDate).getMonth()
            year = new Date(req.query.startDate).getFullYear()
        }
        let monthArr = []
        for (let i = startMonth; i <= endMonth; i++) {
            monthArr.push(i)
        }
        if (req.query.experienceCenterId) {
            query['experienceCenterId'] = req.query.experienceCenterId
        }
        if (req.query.locationId) {
            query['locationId'] = req.query.locationId
        }
        let leads
        if (req.user.roles.find(role => role.name === "Sales Head")) {
            leads = []
            let info = {
                name: 'Total'
            }

            const userIndepartment = await User.find({ departmentId: req.user.departmentId, isActive: true, experienceCenterId: req.query.experienceCenterId })
                .select('_id name departmentId teamId')
                .populate('roles', 'name')
            let allSalesUser = [];
            let allSalesData = [];
            let allSalesUserAndManager = [];
            let allSalesManagers = [];
            userIndepartment.forEach(ele => {
                if (ele.roles.find(ele => ele.name === 'Sales User')) {
                    allSalesUser.push({ _id: ele._id })
                    allSalesData.push(ele);
                }
                if (ele.roles.find(ele => ele.name === 'Sales User' || ele.name === 'Sales Manager')) {
                    allSalesUserAndManager.push(ele)
                }
                if (ele.roles.find(ele => ele.name === 'Sales Manager')) {
                    allSalesManagers.push(ele)
                }
            })
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: allSalesUser } })
            const achivedTarget = await Lead.find({
                $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }],
                ...query, salesStage: 'Won'
            }).select('grandTotal lead_no')

            info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            for (let j = 0; j < allSalesData.length; j++) {
                const response = await Lead.find({
                    $or: [{ previouslyAssignedTo: allSalesData[j]._id }, { assignTo: allSalesData[j]._id }],
                    ...query,
                    salesStage: 'Won'
                })
                    .select('_id lead_no address grandTotal discountPercent paymentDone createdAt leadWonDate tokenPercent')
                    .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' }).populate("teamId", "name _id")

                let obj = {
                    userId: allSalesData[j]._id,
                    name: allSalesData[j].name,
                    teamId: allSalesData[j].teamId,
                    role: 'Sales User'
                }
                const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: allSalesData[j]._id } })

                const achivedTarget = await Lead.find({
                    $or: [{ previouslyAssignedTo: { $in: allSalesData[j]._id } }, { assignTo: { $in: allSalesData[j]._id } }], ...query, salesStage: 'Won'
                }).select('grandTotal')
                obj.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
                obj.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0

                obj.leadList = [];
                for (let i = 0; i < response.length; i++) {
                    obj.leadList.push(response[i])
                }

                for (let m = 0; m < allSalesManagers.length; m++) {
                    if (allSalesManagers[m].teamId.toString() === allSalesData[j].teamId.toString()) {
                        obj.salesManager = allSalesManagers[m].name;
                    }
                }
                leads.push(obj)
            }
            leads.push(info)
        } else if (req.user.roles.find(role => role.name === "Sales Manager")) {
            leads = []
            let info = {
                name: 'Total'
            }
            const usersInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
                .select('_id name')
                .populate('roles', 'name')
            let allSalesManagers = [];
            usersInTeam.forEach(ele => {
                if (ele.roles.find(ele => ele.name === 'Sales Manager')) {
                    allSalesManagers.push(ele)
                }
            })
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: usersInTeam } })
            const achivedTarget = await Lead.find({
                $or: [{ previouslyAssignedTo: { $in: usersInTeam } }, { assignTo: { $in: usersInTeam } }], ...query, salesStage: 'Won'
            })
            info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            const teamMembers = await User.find({ $and: [{ teamId: req.user.teamId, isActive: true, }] }, '_id name teamId')
            for (let j = 0; j < teamMembers.length; j++) {
                const response = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: teamMembers[j]._id }, { assignTo: teamMembers[j]._id }], salesStage: 'Won' })
                    .select('_id lead_no address grandTotal discountPercent paymentDone createdAt leadWonDate tokenPercent')
                    .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' })
                let obj = {
                    userId: teamMembers[j]._id,
                    name: teamMembers[j].name,
                    teamId: teamMembers[j].teamId,
                }
                const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: teamMembers[j]._id } })

                const achivedTarget = await Lead.find({
                    $or: [{ previouslyAssignedTo: { $in: teamMembers[j]._id } }, { assignTo: { $in: teamMembers[j]._id } }], ...query, salesStage: 'Won'
                })
                obj.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
                obj.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
                obj.leadList = [];
                for (let i = 0; i < response.length; i++) {
                    obj.leadList.push(response[i])
                }
                for (let m = 0; m < allSalesManagers.length; m++) {
                    obj.salesManager = allSalesManagers[m].name;
                }
                leads.push(obj)
            }
            leads.push(info)
        } else if (req.user.roles.find(role => role.name === "Assistant Sales Manager")) {
            leads = []
            let info = {
                name: 'Total'
            }
            let teamUsers = await Teams.find({ _id: req.user.teamId }).select('assistantManagerUsers')
            let usersInTeam = []
            if (teamUsers.length !== 0) {
                for (let i = 0; i < teamUsers[0].assistantManagerUsers.length; i++) {
                    const usersListInTeam = await User.find({ _id: teamUsers[0].assistantManagerUsers[i]._id, isActive: true })
                        .select('_id name')
                        .populate('roles', 'name')
                    usersInTeam.push(usersListInTeam[0])
                }
            }
            let allSalesManagers = [];
            usersInTeam.forEach(ele => {
                if (ele.roles.find(ele => ele.name === 'Assistant Sales Manager')) {
                    allSalesManagers.push(ele)
                }
            })
            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: usersInTeam } })
            const achivedTarget = await Lead.find({
                $or: [{ previouslyAssignedTo: { $in: usersInTeam } }, { assignTo: { $in: usersInTeam } }], ...query, salesStage: 'Won'
            })
            info.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            info.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            let teamMembers = []
            if (teamUsers.length !== 0) {
                for (let i = 0; i < teamUsers[0].assistantManagerUsers.length; i++) {
                    const usersListInTeam = await User.find({ $and: [{ _id: teamUsers[0].assistantManagerUsers[i]._id, isActive: true, }] }, '_id name teamId')
                    teamMembers.push(usersListInTeam[0])
                }
            }
            for (let j = 0; j < teamMembers.length; j++) {
                const response = await Lead.find({ ...query, $or: [{ previouslyAssignedTo: teamMembers[j]._id }, { assignTo: teamMembers[j]._id }], salesStage: 'Won' })
                    .select('_id lead_no address grandTotal discountPercent paymentDone createdAt leadWonDate tokenPercent')
                    .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                    .populate({ path: 'customerId', select: '_id name email contact_no' })
                let obj = {
                    userId: teamMembers[j]._id,
                    name: teamMembers[j].name,
                    teamId: teamMembers[j].teamId,
                }
                const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: { $in: teamMembers[j]._id } })

                const achivedTarget = await Lead.find({
                    $or: [{ previouslyAssignedTo: { $in: teamMembers[j]._id } }, { assignTo: { $in: teamMembers[j]._id } }], ...query, salesStage: 'Won'
                })
                obj.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
                obj.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
                obj.leadList = [];
                for (let i = 0; i < response.length; i++) {
                    obj.leadList.push(response[i])
                }
                for (let m = 0; m < allSalesManagers.length; m++) {
                    obj.salesManager = allSalesManagers[m].name;
                }
                leads.push(obj)
            }
            leads.push(info)
        }
        else {
            leads = {}
            const response = await Lead.find({ ...query, salesStage: 'Won', $or: [{ assignTo: req.user._id }, { previouslyAssignedTo: req.user._id }] })
                .select('_id lead_no address grandTotal discountPercent paymentDone createdAt leadWonDate tokenPercent')
                .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
                .populate({ path: 'customerId', select: '_id name email contact_no' })

            const target = await Target.find({ $and: [{ month: { $in: monthArr } }, { year }], userId: req.user._id })
            const achivedTarget = await Lead.find({ previouslyAssignedTo: req.user._id, ...query, salesStage: 'Won' })
            leads.target = target.length > 0 ? target.reduce((acc, crr) => ({ value: acc.value + crr.value })).value : 0
            leads.achived = achivedTarget.length > 0 ? achivedTarget.reduce((acc, crr) => ({ grandTotal: acc.grandTotal + crr.grandTotal })).grandTotal : 0
            leads.leadList = [];
            for (let i = 0; i < response.length; i++) {
                leads.leadList.push(response[i])
            }
        }
        return res.status(200).json(leads)
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

router.put('/getDesignLeads', async (req, res) => {

    let from = `${(new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getFullYear()}-${(new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getMonth() + 2 == 13 ? 12 : (new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getMonth() + 2}-01`
    let to = `${(new Date()).getFullYear()}-${(new Date()).getMonth() + 1}-${(new Date()).getDate()}`
    const designer_not_assigned_leads = await Lead.find({ experienceCenterId: { $in: req.body.exp_ctr_ids }, salesStage: { $in: ["Won", "Won Deals Pending Designer Assignment"] }, designStages: { $in: ["Assign to Designer"] }, createdAt: { $gte: new Date(from), $lte: new Date(to) } })
    const design_leads = await Lead.find({ experienceCenterId: { $in: req.body.exp_ctr_ids }, designStages: { $in: ["Designer Assigned", "Sketchup Model Ready", "1st Meeting Completion", "Revised Quote Shared", "Booking Confirmed (10% received)", "Initial Measurement Done", "3D rendering Started", "Final Quotation Approval", "Final Marking Done", "Final Working Drawing Completed"] }, createdAt: { $gte: new Date(from), $lte: new Date(to) } })
    const design_hold_leads = await Lead.find({ experienceCenterId: { $in: req.body.exp_ctr_ids }, designStatus: "Hold", createdAt: { $gte: new Date(from), $lte: new Date(to) } })
    const design_lost_leads = await Lead.find({ experienceCenterId: { $in: req.body.exp_ctr_ids }, designStages: { $in: ["Lost"] }, createdAt: { $gte: new Date(from), $lte: new Date(to) } })
    const design_completed_leads = await Lead.find({ experienceCenterId: { $in: req.body.exp_ctr_ids }, designStages: { $in: ["Design Sign-off"] }, factoryStage: { $in: ["Completed"] }, createdAt: { $gte: new Date(from), $lte: new Date(to) } })

    function calculate_val_and_count(data) {
        const month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let obj = { "value": {}, "count": {} }, month_remaining = 13, grand_total_value = 0, grand_total_count = 0, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()

        while (month_remaining > 0) {
            obj["value"][month_names[month_index] + " " + year] = 0;
            obj["count"][month_names[month_index] + " " + year] = 0;
            month_index === 0 ? (month_index = month_names.length - 1, year -= 1) : (month_index--)
            month_remaining--;
        }

        for (let k = 0; k < data.length; k++) {
            (data[k]["totalCustomerOutflow"]) && (grand_total_value += data[k]["totalCustomerOutflow"], grand_total_count += 1,

                new Date(data[k]["createdAt"]).getMonth() == 0 ? (obj["value"][month_names[0] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[0] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                    new Date(data[k]["createdAt"]).getMonth() == 1 ? (obj["value"][month_names[1] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[1] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                        new Date(data[k]["createdAt"]).getMonth() == 2 ? (obj["value"][month_names[2] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[2] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                            new Date(data[k]["createdAt"]).getMonth() == 3 ? (obj["value"][month_names[3] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[3] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                new Date(data[k]["createdAt"]).getMonth() == 4 ? (obj["value"][month_names[4] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[4] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                    new Date(data[k]["createdAt"]).getMonth() == 5 ? (obj["value"][month_names[5] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[5] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                        new Date(data[k]["createdAt"]).getMonth() == 6 ? (obj["value"][month_names[6] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[6] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                            new Date(data[k]["createdAt"]).getMonth() == 7 ? (obj["value"][month_names[7] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[7] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                                new Date(data[k]["createdAt"]).getMonth() == 8 ? (obj["value"][month_names[8] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[8] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                                    new Date(data[k]["createdAt"]).getMonth() == 9 ? (obj["value"][month_names[9] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[9] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                                        new Date(data[k]["createdAt"]).getMonth() == 10 ? (obj["value"][month_names[10] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[10] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                                            new Date(data[k]["createdAt"]).getMonth() == 11 ? (obj["value"][month_names[11] + " " + data[k]["createdAt"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[11] + " " + data[k]["createdAt"].getFullYear()] += 1) :
                                                                null
            )
        }
        obj.grand_total_value = grand_total_value
        obj.grand_total_count = grand_total_count
        return obj;
    }
    let designer_not_assigned = calculate_val_and_count(designer_not_assigned_leads), design = calculate_val_and_count(design_leads), design_hold = calculate_val_and_count(design_hold_leads), design_lost = calculate_val_and_count(design_lost_leads), design_completed = calculate_val_and_count(design_completed_leads)
    let result = { designer_not_assigned, design, design_hold, design_lost, design_completed }
    res.status(200).json(result)
})

router.put('/getContractLeads', async (req, res) => {

    let from = `${(new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getFullYear()}-${(new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getMonth() + 2 == 13 ? 12 : (new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getMonth() + 2}-01`
    let to = `${(new Date()).getFullYear()}-${(new Date()).getMonth() + 1}-${(new Date()).getDate()}`

    const contract_leads_data = await Lead.find({ experienceCenterId: { $in: req.body.exp_ctr_ids }, designSignOffDate: { $gte: new Date(from), $lte: new Date(to) } })

    function calculate_val_and_count(data) {
        const month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let obj = { "value": {}, "count": {} }, month_remaining = 13, total_val = 0, total_count = 0, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()

        while (month_remaining > 0) {
            obj["value"][month_names[month_index] + " " + year] = 0;
            obj["count"][month_names[month_index] + " " + year] = 0;
            month_index === 0 ? (month_index = month_names.length - 1, year -= 1) : (month_index--)
            month_remaining--;
        }

        for (let k = 0; k < data.length; k++) {
            (data[k]["totalCustomerOutflow"]) && (total_val = total_val + data[k]["totalCustomerOutflow"], total_count += 1,

                new Date(data[k]["designSignOffDate"]).getMonth() == 0 ? (obj["value"][month_names[0] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[0] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                    new Date(data[k]["designSignOffDate"]).getMonth() == 1 ? (obj["value"][month_names[1] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[1] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                        new Date(data[k]["designSignOffDate"]).getMonth() == 2 ? (obj["value"][month_names[2] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[2] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                            new Date(data[k]["designSignOffDate"]).getMonth() == 3 ? (obj["value"][month_names[3] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[3] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                new Date(data[k]["designSignOffDate"]).getMonth() == 4 ? (obj["value"][month_names[4] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[4] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                    new Date(data[k]["designSignOffDate"]).getMonth() == 5 ? (obj["value"][month_names[5] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[5] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                        new Date(data[k]["designSignOffDate"]).getMonth() == 6 ? (obj["value"][month_names[6] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[6] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                            new Date(data[k]["designSignOffDate"]).getMonth() == 7 ? (obj["value"][month_names[7] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[7] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                                new Date(data[k]["designSignOffDate"]).getMonth() == 8 ? (obj["value"][month_names[8] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[8] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                                    new Date(data[k]["designSignOffDate"]).getMonth() == 9 ? (obj["value"][month_names[9] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[9] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                                        new Date(data[k]["designSignOffDate"]).getMonth() == 10 ? (obj["value"][month_names[10] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[10] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                                            new Date(data[k]["designSignOffDate"]).getMonth() == 11 ? (obj["value"][month_names[11] + " " + data[k]["designSignOffDate"].getFullYear()] += data[k]["totalCustomerOutflow"], obj["count"][month_names[11] + " " + data[k]["designSignOffDate"].getFullYear()] += 1) :
                                                                null
            )
        }
        obj.grand_total_value = total_val
        obj.grand_total_count = total_count
        return obj;
    }
    let contract_leads = calculate_val_and_count(contract_leads_data)
    let result = { contract_leads: contract_leads }
    res.status(200).json(result)
})

router.get('/getStageWiseLeadData', async (req, res) => {
    const date = new Date()
    let startMonth = date.getMonth();
    let endMonth = date.getMonth();
    let year = date.getFullYear();
    let query = {}
    switch (req.query.filterOption) {
        case "createdAt":
            query['createdAt'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
            break;
        case "leadWonDate":
            query['leadWonDate'] = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
            break;
        default:
            query['leadWonDate'] = { $gte: new Date(date.setMonth(date.getMonth() - 1)), $lte: new Date() };
            break;
    }
    if (req.user.roles.find(role => role.name === "Sales Head")) {
        let finalQuery = {}
        const userIndepartment = await User.find({ departmentId: req.user.departmentId, isActive: true, experienceCenterId: req.query.experienceCenterId })
            .select('_id name departmentId teamId')
            .populate('roles', 'name')
        let allSalesUser = [];
        let allSalesData = [];
        userIndepartment.forEach(ele => {
            if (ele.roles.find(ele => ele.name === 'Sales User')) {
                allSalesUser.push({ _id: ele._id })
                allSalesData.push(ele);
            }
        })
        if (req.query.salesStage === 'salesTotal') {
            if (req.query.salesStage === 'salesTotal' && req.query.startDate) {
                finalQuery = {
                    ...query, experienceCenterId: req.query.experienceCenterId,
                    $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }]
                }
            } else {
                finalQuery = {
                    experienceCenterId: req.query.experienceCenterId,
                    $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }]
                }
            }
        } else if (req.query.startDate) {
            finalQuery = {
                ...query, experienceCenterId: req.query.experienceCenterId, salesStage: req.query.salesStage,
                $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }]
            }
        } else {
            finalQuery = {
                experienceCenterId: req.query.experienceCenterId, salesStage: req.query.salesStage,
                $or: [{ previouslyAssignedTo: { $in: allSalesUser } }, { assignTo: { $in: allSalesUser } }]
            }
        }
        const response = await Lead.find({ ...finalQuery })
            .select('area leadType leadStatus createdAt address leadWonDate grandTotal discountPercent lead_no salesStage')
            .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
            .populate({ path: 'customerId', select: '_id name email contact_no' })
        return res.status(200).json(response)

    } else if (req.user.roles.find(role => role.name === "Sales Manager")) {
        const usersInTeam = await User.find({ teamId: req.user.teamId, isActive: true })
            .select('_id')
        if (req.query.salesStage === 'salesTotal') {
            if (req.query.salesStage === 'salesTotal' && req.query.startDate) {
                finalQuery = {
                    ...query, experienceCenterId: req.query.experienceCenterId,
                    $or: [{ previouslyAssignedTo: { $in: usersInTeam } }, { assignTo: { $in: usersInTeam } }]
                }
            } else {
                finalQuery = {
                    experienceCenterId: req.query.experienceCenterId,
                    $or: [{ previouslyAssignedTo: { $in: usersInTeam } }, { assignTo: { $in: usersInTeam } }]
                }
            }
        } else if (req.query.startDate) {
            finalQuery = {
                ...query, experienceCenterId: req.query.experienceCenterId, salesStage: req.query.salesStage,
                $or: [{ previouslyAssignedTo: { $in: usersInTeam } }, { assignTo: { $in: usersInTeam } }]
            }
        } else {
            finalQuery = {
                experienceCenterId: req.query.experienceCenterId, salesStage: req.query.salesStage,
                $or: [{ previouslyAssignedTo: { $in: usersInTeam } }, { assignTo: { $in: usersInTeam } }]
            }
        }
        const response = await Lead.find({ ...finalQuery })
            .select('area leadType leadStatus createdAt address leadWonDate grandTotal discountPercent lead_no salesStage')
            .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
            .populate({ path: 'customerId', select: '_id name email contact_no' })
        return res.status(200).json(response)
    } else if (req.user.roles.find(role => role.name === 'Assistant Sales Manager')) {
        const usersInTeam = await Teams.find({ _id: req.user.teamId, isActive: true })
            .select('assistantManagerUsers')
        let usersListInTeam = []
        if (usersInTeam.length !== 0) {
            for (let i = 0; i < usersInTeam[0].assistantManagerUsers.length; i++) {
                usersListInTeam.push({ _id: usersInTeam[0].assistantManagerUsers[i] })
            }
        }
        if (req.query.salesStage === 'salesTotal') {
            if (req.query.salesStage === 'salesTotal' && req.query.startDate) {
                finalQuery = {
                    ...query, experienceCenterId: req.query.experienceCenterId,
                    $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }]
                }
            } else {
                finalQuery = {
                    experienceCenterId: req.query.experienceCenterId,
                    $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }]
                }
            }
        } else if (req.query.startDate) {
            finalQuery = {
                ...query, experienceCenterId: req.query.experienceCenterId, salesStage: req.query.salesStage,
                $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }]
            }
        } else {
            finalQuery = {
                experienceCenterId: req.query.experienceCenterId, salesStage: req.query.salesStage,
                $or: [{ previouslyAssignedTo: { $in: usersListInTeam } }, { assignTo: { $in: usersListInTeam } }]
            }
        }
        const response = await Lead.find({ ...finalQuery })
            .select('area leadType leadStatus createdAt address leadWonDate grandTotal discountPercent lead_no salesStage')
            .populate({ path: 'assignTo', populate: { path: 'departmentId', select: 'name _id' }, select: '_id name email mobile' })
            .populate({ path: 'customerId', select: '_id name email contact_no' })
        return res.status(200).json(response)
    }
});


router.get('/getFinalPayments', async (req, res) => {
    try {
        let query = {}
        if(req.query.stageType === "designerUpdatedPayment"){
            query = {$or : [{stage:"designerUpdatedPayment"},{stage:"Sales Manager Approval"},{stage:"Design Sign-off"}]}
        }else{
            query.stage = req.query.stageType
        }
        const response = await CustomerTransactions.find({ ...query, finalApprovalStatus: "NA" })
            .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' }, select: 'lead_no grandTotal erpProjectNo' })
            .populate({ path: 'leadId', populate: { path: 'erpProjectId', select: '_id code' }, select: 'lead_no grandTotal erpProjectNo' })
            .populate({ path: 'uploadedBy', select: 'name email contact_no' })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.put('/updateFinalPaymentStatus/:id', async (req, res) => {
    try {
        await CustomerTransactions.findOneAndUpdate({ _id: req.params.id }, { $set: { finalApprovalStatus: req.body.status } });

        await Lead.findOneAndUpdate({ _id: req.body.leadId }, { $set: { finalPaymentApprovalRequestStatus: 'Approved', factoryStage: 'Site Under Control', currentStage: 'Site Under Control' } });

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadId;
        leadLogs.dealActivity = `${req.user.name} has approved the final payment status for lead number (${req.body.lead_no}) and project code: ${req.body.eprProjectCode}.`;
        leadLogs.save();

        let obj = {
            paymentDone: req.body.paymentAmount
        };
        const amountInWords = await leadService.getReceiptAmountInWord(obj)
        const date = new Date()
        let receiptNumber = Math.floor((Math.random() * 100000) + 1)

        let leadData = {
            receiptDate: date,
            receiptNumber: receiptNumber,
            paymentDone: req.body.paymentAmount,
            amountInWords: amountInWords,
            customerId: {
                name: req.body.customerName,
            }
        }

        const pdffile = await Pdf.generateReceiptPdf(leadData, req.body.financeReceipt);

        const subject = 'Payment Receipt';

        const text = `Dear ${req.body.customerName},
            We have attached your payment receipt along with this mail. Please kindly check.`;

        const html = `<p>Dear <strong>${req.body.customerName}</strong>, </p>
            <p>We have attached your payment receipt along with this mail. Please kindly check.</p>
            <p></p>
            <p></p>
            <p>Thanks & Regards,</p>
            <p>Team Decorpot</p>`;

        await emailService.sendEmailWithAttachement(req.body.customerEmail, subject, text, html, pdffile.pdfUrl, req.body.customerName);

        res.status(200).send("Updated Successfully")
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.put('/updateDesignerPaymentStatus/:id', async (req, res) => {
    try {
        await CustomerTransactions.findOneAndUpdate({ _id: req.params.id }, { $set: { finalApprovalStatus: req.body.status } });

        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.body.leadId;
        leadLogs.dealActivity = `${req.user.name} has approved the payment status for lead number (${req.body.lead_no}).`;
        await leadLogs.save();

        let obj = {
            paymentDone: req.body.paymentAmount
        };
        const amountInWords = await leadService.getReceiptAmountInWord(obj)
        const date = new Date()
        let receiptNumber = Math.floor((Math.random() * 100000) + 1)

        let leadData = {
            receiptDate: date,
            receiptNumber: receiptNumber,
            paymentDone: req.body.paymentAmount,
            amountInWords: amountInWords,
            customerId: {
                name: req.body.customerName,
            }
        }

        const pdffile = await Pdf.generateReceiptPdf(leadData, req.body.financeReceipt);

        const subject = 'Payment Receipt';

        const text = `Dear ${req.body.customerName},
            We have attached your payment receipt along with this mail. Please kindly check.`;

        const html = `<p>Dear <strong>${req.body.customerName}</strong>, </p>
            <p>We have attached your payment receipt along with this mail. Please kindly check.</p>
            <p></p>
            <p></p>
            <p>Thanks & Regards,</p>
            <p>Team Decorpot</p>`;

        await emailService.sendEmailWithAttachement(req.body.customerEmail, subject, text, html, pdffile.pdfUrl, req.body.customerName);

        res.status(200).send("Payment Approved Successfully")
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.put('/updateDesignerAssignementDetail/:id', async (req, res) => {
    try {
        // set the note
        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user
        leadLogs.user = req.user;
        leadLogs.leadId = req.params.id;
        leadLogs.dealActivity = `${req.user.name} has updated the designer assignment date: ${moment(req.body.designerAssignmentDate).format('ll')} for the lead.`;
        await leadLogs.save();

        // send the email to customer with desisgner assignment date, design manager and design user details
        const subject = 'Designer Assignement Date for project';

        const text = `Dear ${req.body.customerName},
            We have shared with you the details about the design manager of your project. Please kindly check.
            Designer assignment date: ${req.body.designerAssignmentDate}`;

        const html = `<p>Dear <strong>${req.body.customerName}</strong>, </P>
            <p>We have shared with you the details about the design manager of your project. Please kindly check.</p>
            <p>Designer assignment date: ${req.body.designerAssignmentDate}</p>
            <p>Design Manager Details:</p>
            <ul>
                <li>Name: ${req.body.designManager.name}</li>
                <li>Email Id: ${req.body.designManager.email}</li>
                <li>Mobile Number: ${req.body.designManager.mobile}</li>
            </ul>
            <p></p>
            <p></p>
            <p>Thanks & Regards,</p>
            <p>Team Decorpot</p>`;

        await emailService.sendEmail(req.body.customerEmailId, subject, text, html);

        res.status(200).json("Email send to customer successfully");
    } catch (err) {
        console.log(err, "Error");
        res.status(400).send(err.message);
    }
})


// sales_statistics API

router.put('/sales_statistics', async (req, res) => {
    try
    {
        const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        let query = {}

        let from = `${(new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getFullYear()}-${(new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getMonth() + 1 == 13 ? 12 : (new Date((new Date()).setMonth((new Date()).getMonth() - 12))).getMonth() + 1}-01`
        let to = `${(new Date()).getFullYear()}-${(new Date()).getMonth() + 1}-${(new Date()).getDate()}`

        req.body.TokenPercentage && (query.tokenPercent = { $gte: 5 })
        
        let Leads = await Lead.find
        ({
            ...query,
            $and: [{experienceCenterId: { $in: req.body.experienceCenterId }}, {leadWonDate: { $gte: new Date(from), $lte: new Date(to) }}]
        })
        .select('grandTotal taxPercent previouslyAssignedTo assignTo leadWonDate experienceCenterId')
        .populate({ path: 'assignTo', populate: { path: 'roles', select: 'name _id' }, select: '_id name email roles' })
        .populate({ path: 'previouslyAssignedTo', populate: { path: 'roles', select: 'name _id' }, select: '_id name email roles' })
        .populate({path: 'experienceCenterId', select: '_id name'})

        let SalesManagers = {}, SalesExecutives = {}, Exp_Ctrs = []
        
        for(let index = 0; index < Leads.length; index++)
        {
            let Manager_found = false
            let Executive_found = false
            
            // Updating Sales Managers
            for(let index2 = 0; index2 < Leads[index].previouslyAssignedTo.length; index2++)
            {
                // Checking Sales Manager from previouslyAssignedTo
                if(Leads[index].previouslyAssignedTo[index2]["roles"][0])
                {
                    if(!Manager_found && Leads[index].previouslyAssignedTo[index2]["roles"][0]["name"] == "Sales Manager")
                    {
                        Manager_found = true

                        let Exp_Ctr_Name = Leads[index]["experienceCenterId"]["name"]
                        let Manager_Name = Leads[index].previouslyAssignedTo[index2]["name"]

                        !Exp_Ctrs.includes(Exp_Ctr_Name) && (Exp_Ctrs.push(Exp_Ctr_Name))
                        
                        if(!SalesManagers[Exp_Ctr_Name.toString()])
                        {
                            SalesManagers[Exp_Ctr_Name.toString()] = {}
                        }

                        if(!SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()])
                        {
                            let period_obj = {}, month_remaining = 13, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()
                            
                            while (month_remaining > 0)
                            {
                                period_obj[`${MONTHS[month_index]} ${year}`] = {count: 0, value: 0}
                                month_index === 0 ? (month_index = MONTHS.length - 1, year -= 1) : (month_index--)
                                month_remaining--;
                            }

                            SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()] = period_obj
                            SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()]["isManager"] = true
                            SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()]["Exp_Ctr"] = Exp_Ctr_Name
                            SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()]["Name"] = Manager_Name.toString()
                        }

                        let period = `${MONTHS[(new Date(Leads[index]["leadWonDate"])).getMonth()]} ${(new Date(Leads[index]["leadWonDate"])).getFullYear()}`

                        SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()][period.toString()]["count"] += 1
                        SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()][period.toString()]["value"] += Number((Leads[index]["grandTotal"]/1.18).toFixed(0))

                        break
                    }
                }
            }

            // Checking Sales Manager from assignTo
            if(Leads[index].assignTo["roles"][0])
            {
                if(!Manager_found && Leads[index].assignTo["roles"][0]["name"] == "Sales Manager")
                {
                    Manager_found = true

                    let Exp_Ctr_Name = Leads[index]["experienceCenterId"]["name"]
                    let Manager_Name = Leads[index].assignTo["name"]

                    !Exp_Ctrs.includes(Exp_Ctr_Name) && (Exp_Ctrs.push(Exp_Ctr_Name))

                    if(!SalesManagers[Exp_Ctr_Name.toString()])
                    {
                        SalesManagers[Exp_Ctr_Name.toString()] = {}
                    }

                    if(!SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()])
                    {
                        let period_obj = {}, month_remaining = 13, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()
                        while (month_remaining > 0)
                        {
                            period_obj[`${MONTHS[month_index]} ${year}`] = {count: 0, value: 0}
                            month_index === 0 ? (month_index = MONTHS.length - 1, year -= 1) : (month_index--)
                            month_remaining--;
                        }

                        SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()] = period_obj
                        SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()]["isManager"] = true
                        SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()]["Exp_Ctr"] = Exp_Ctr_Name
                        SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()]["Name"] = Manager_Name.toString()
                    }

                    let period = `${MONTHS[(new Date(Leads[index]["leadWonDate"])).getMonth()]} ${(new Date(Leads[index]["leadWonDate"])).getFullYear()}`
                    
                    SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()][period.toString()]["count"] += 1
                    SalesManagers[Exp_Ctr_Name.toString()][Manager_Name.toString()][period.toString()]["value"] += Number((Leads[index]["grandTotal"]/1.18).toFixed(0))
                }
            }

            // Updating Sales Executives
            for(let index2 = 0; index2 < Leads[index].previouslyAssignedTo.length; index2++)
            {
                // Checking Sales Executives from previouslyAssignedTo
                if(Leads[index].previouslyAssignedTo[index2]["roles"][0])
                {
                    if(!Executive_found && Leads[index].previouslyAssignedTo[index2]["roles"][0]["name"] == "Sales User")
                    {
                        Executive_found = true

                        let Exp_Ctr_Name = Leads[index]["experienceCenterId"]["name"]
                        let Executive_Name = Leads[index].previouslyAssignedTo[index2]["name"]

                        !Exp_Ctrs.includes(Exp_Ctr_Name) && (Exp_Ctrs.push(Exp_Ctr_Name))
                        
                        if(!SalesExecutives[Exp_Ctr_Name.toString()])
                        {
                            SalesExecutives[Exp_Ctr_Name.toString()] = {}
                        }

                        if(!SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()])
                        {
                            let period_obj = {}, month_remaining = 13, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()
                            while (month_remaining > 0)
                            {
                                period_obj[`${MONTHS[month_index]} ${year}`] = {count: 0, value: 0}
                                month_index === 0 ? (month_index = MONTHS.length - 1, year -= 1) : (month_index--)
                                month_remaining--;
                            }

                            SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()] = period_obj
                            SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()]["isManager"] = false
                            SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()]["Exp_Ctr"] = Exp_Ctr_Name
                            SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()]["Name"] = Executive_Name.toString()
                        }

                        let period = `${MONTHS[(new Date(Leads[index]["leadWonDate"])).getMonth()]} ${(new Date(Leads[index]["leadWonDate"])).getFullYear()}`
                        
                        SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()][period.toString()]["count"] += 1
                        SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()][period.toString()]["value"] += Number((Leads[index]["grandTotal"]/1.18).toFixed(0))

                        break
                    }
                }
            }

            // Checking Sales Executives from assignTo
            if(Leads[index].assignTo["roles"][0])
            {
                if(!Executive_found && Leads[index].assignTo["roles"][0]["name"] == "Sales User")
                {
                    Executive_found = true

                    let Exp_Ctr_Name = Leads[index]["experienceCenterId"]["name"]
                    let Executive_Name = Leads[index].assignTo["name"]

                    !Exp_Ctrs.includes(Exp_Ctr_Name) && (Exp_Ctrs.push(Exp_Ctr_Name))

                    if(!SalesExecutives[Exp_Ctr_Name.toString()])
                    {
                        SalesExecutives[Exp_Ctr_Name.toString()] = {}
                    }

                    if(!SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()])
                    {
                        let period_obj = {}, month_remaining = 13, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()
                        
                        while (month_remaining > 0)
                        {
                            period_obj[`${MONTHS[month_index]} ${year}`] = {count: 0, value: 0}
                            month_index === 0 ? (month_index = MONTHS.length - 1, year -= 1) : (month_index--)
                            month_remaining--;
                        }

                        SalesExecutives[Exp_Ctr_Name.toString()][Manager_Name.toString()] = period_obj
                        SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()]["isManager"] = false
                        SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()]["Exp_Ctr"] = Exp_Ctr_Name
                        SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()]["Name"] = Executive_Name.toString()
                    }

                    let period = `${MONTHS[(new Date(Leads[index]["leadWonDate"])).getMonth()]} ${(new Date(Leads[index]["leadWonDate"])).getFullYear()}`

                    SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()][period.toString()]["count"] += 1
                    SalesExecutives[Exp_Ctr_Name.toString()][Executive_Name.toString()][period.toString()]["value"] += Number((Leads[index]["grandTotal"]/1.18).toFixed(0))
                }
            }
                

        }

        let All_Sales_Users = []

        for(let index = 0; index < Exp_Ctrs.length; index++)
        {
            All_Sales_Users.push(SalesExecutives[Exp_Ctrs[index].toString()])
            All_Sales_Users.push(SalesManagers[Exp_Ctrs[index].toString()])
        }

        let All_Sales_Users_Seperated = []

        for(let index = 0; index < All_Sales_Users.length; index++)
        {
            let Sales_Users = Object.keys(All_Sales_Users[index])
            for(let index2 = 0; index2 < Sales_Users.length; index2++)
            {
                let current_user = Sales_Users[index2].toString()
                All_Sales_Users_Seperated.push(All_Sales_Users[index][current_user])
            }
        }

        let Fields = Object.keys(All_Sales_Users_Seperated[0])
        Fields.splice(-3)

        res.status(200).json({Fields: Fields, All_Sales_Users_Seperated: All_Sales_Users_Seperated});

    }
    catch (err)
    {
        console.log("err.message",err.message)
        console.log("err", err)
        res.status(400).send(err.message)
    }

})

router.put("/moveLeadToFactory/:leadId", async (req, res) => {
    let currentStage = "Under Procurement"
    try {
        const user = await User.find({
            roles: { $in: [factoryManagerRoleId] },
        }).populate('teamId','name')
        .lean();
        const project = await Project.findOneAndUpdate(
            { leadId: req.params.leadId },
            {
                $set: {
                    assignedTo: user[0]._id,
                    departmentId: user[0].departmentId,
                    teamId: user[0].teamId._id,
                    status: "Under Procurement",
                },
            }
        );
        
        const SiteBOM = await SiteBomProject.findOne({leadId: req.params.leadId}).select('_id stage') 
        if(SiteBOM.stage !== "Site BOM Completed")
        {
            currentStage = `Under Procurement & ${SiteBOM.stage}`
        }

        await Lead.updateOne(
            { _id: req.params.leadId },
            {
                $set: {
                    assignTo: user[0]._id,
                    departmentId: user[0].departmentId,
                    teamId: user[0].teamId._id,
                    currentStage:currentStage,
                    assignToName: user[0].name,
                    teamName: user[0].teamId.name
                }
            }
        );
        leadLogs = new LeadLogs();
        leadLogs.createdBy = req.user;
        leadLogs.user = req.user;
        leadLogs.leadId = req.params.leadId;
        leadLogs.dealActivity = `${req.user.name} has updated the Project status to Under Procurement and the project has been assigned to ${user[0].name}`;
        leadLogs.save();
        res.status(200).send("Updated Successfully");
    } catch (err) {
        res.status(400).send(err.message);
    }
})


router.put('/leadWonRejection/:id', async (req, res) => {
    try{
        let query = req.params.id;
        let update = req.body;
        let options = { new: true };
        update.amountReceivedInSales = req.body.paymentDone
        let data = await Lead.findByIdAndUpdate(query, update, options).lean()
        let value = ((req.body.paymentDone / data.grandTotal) * 100).toFixed(2)
        let tenPercentPaid
        if(value >= 10){
            tenPercentPaid = true
        }else{
            tenPercentPaid = false
        }
        await Lead.findByIdAndUpdate(query, { $set: { tenPercentPaid: tenPercentPaid, tokenPercent: value}}, options).lean()
        res.status(200).send('Updated Successfully');
    }catch (err){
        res.status(400).send(err.message)
    }
})

router.put('/extraDaysDuetoClientDependency/:id', async (req, res) => {
    try {
        let query = req.params.id;
        let update = req.body;
        let options = { new: true };
        await Lead.findByIdAndUpdate(query, update, options).lean()
        res.status(200).send('Updated Successfully');
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.get("/opsTableData", async (req, res) => {
    let query = {};
    try {
        if (req.query.startDate && req.query.endDate) {
            query.designSignOffDate = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate),
            };
        }
        let arr = [];
        const lead = await Lead.find({
            ...query,
            isERPProjectCreated: true,
            currentStage: { $ne: "Completed" },
        })
            .sort({ designSignOffDate: 1 })
            .select(
                "finalWDFile imosStage updatedPastingListFile currentStage erpProjectNo erpProjectId designSignOffDate"
            )
            .populate("customerId", "name")
            .populate("assignTo", "name")
            .populate('factoryBomCompletedUser','name')
            .populate('siteQcCompletedUser', 'name')
        
            .lean();
        let siteBom = await SiteBomProject.find({})
            .select("leadId stage")
            .populate("assignTo", "name")
            .lean();
        let Imos = await ImosProject.find({})
            .select("leadId stage")
            .populate("assignTo", "name")
            .lean();
        let projectMaterial = await ProjectMaterial.find({})
            .select("projectId status")
            .lean();
        for (let i = 0; i < lead.length; i++) {
            let obj = {};
            obj["leadId"] = lead[i]._id;
            obj["customerName"] = lead[i].customerId.name;
            obj["currentStage"] = lead[i].currentStage;
            obj["designSignOffDate"] = lead[i].designSignOffDate;
            obj["projectNo"] = lead[i].erpProjectNo;
            obj["projectId"] = lead[i].erpProjectId;
            for (let j = 0; j < siteBom.length; j++) {
                if (String(siteBom[j].leadId) == String(lead[i]._id)) {
                    if (siteBom[j].stage === "Site BOM Completed") {
                        obj["siteBom"] = "Completed";
                        obj["siteBomUser"] = siteBom[j].assignTo.name;
                    } else {
                        obj["siteBom"] = "Not Completed";
                        obj["siteBomUser"] = siteBom[j].assignTo.name;
                    }
                }
            }
            if (!obj.hasOwnProperty("siteBom")) {
                obj["siteBom"] = "Not Completed";
            }
            
            for (let j = 0; j < projectMaterial.length; j++) {
                if (
                    String(lead[i].erpProjectId) === String(projectMaterial[j].projectId)
                ) {
                    if ((projectMaterial[j].status === "Rejected" || projectMaterial[j].status === "Submitted" || projectMaterial[j].status === "Saved")) {
                        obj["bom"] = "Not Approved";
                        break;
                    } else {
                        obj["bom"] = "Approved";
                    }
                }
            }
            if (!obj.hasOwnProperty("bom")) {
                obj["bom"] = "Not Approved";
            }
            if (lead[i].finalWDFile !== undefined && lead[i].finalWDFile !== null) {
                obj["siteQc"] = "Completed";
            } else {
                obj["siteQc"] = "Not Completed";
                if (lead[i].currentStage === "Site QC") {
                }
            }
            if (lead[i].siteQcCompletedUser !== undefined && lead[i].siteQcCompletedUser !== null){
                obj["siteQcUser"] = lead[i].siteQcCompletedUser.name;
            }
            if (lead[i].imosStage === "IMOS Completed") {
                obj["imos"] = "Completed";
            } else {
                obj["imos"] = "Not Completed";
            }
            for (let j = 0; j < Imos.length; j++) {
                if (String(Imos[j].leadId) == String(lead[i]._id)) {
                    obj["imosUser"] = Imos[j].assignTo.name;
                }
            }
            if (
                lead[i].updatedPastingListFile !== undefined &&
                lead[i].updatedPastingListFile !== null
            ) {
                obj["factoryBom"] = "Completed";
            } else {
                obj["factoryBom"] = "Not Completed";
            }
            if (lead[i].factoryBomCompletedUser !== undefined && lead[i].factoryBomCompletedUser !== null) {
                obj["factoryBomUser"] = lead[i].factoryBomCompletedUser.name;
            }
            arr.push(obj);
        }
        res.status(200).send(arr);
    } catch (err) {
        console.log(err.message);
        res.status(400).send(err.message);
    }
});

router.get('/getFinalPaymentsApproved/:leadId', async (req, res) => {
    try {
        const response = await CustomerTransactions.find({ leadId: req.params.leadId, finalApprovalStatus: "Approve" })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(response);
    } catch (error) {
        res.status(400).send(error.message)
    }
})

router.put('/assignLeadToExecutionUsers/:leadId', async (req, res) => {
    try {
        const response = await Lead.findByIdAndUpdate(req.params.leadId, { $set: { assignTo :req.body._id }}, { new: true })
        try {
            leadLogs = new LeadLogs();
            leadLogs.createdBy = req.user
            leadLogs.user = req.user._id;
            leadLogs.leadId = req.params.leadId;
            leadLogs.dealActivity = req.user.name + ' has Assigned Lead to ' + req.body.name;
            leadLogs.save();
        } catch (error) {
            console.log(error);
        }
        return res.status(200).json("Update Successfully")
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})


router.get('/getExecutionStage',async(req,res)=>{
   try{
    if (req.query.stage === "Under Execution"){
        try{
        const UnderExecutionProjects = await Lead.find
            ({
                assignTo: req.query.assignTo,
                currentStage: "Under Execution"
            })
            .select('lead_no grandTotal factoryStage currentStage readyToDispatchDate totalCustomerOutflow projectCompletionDate customerDesignSignOffDate experienceCenterId designSignOffDate erpProjectNo')
            .populate('erpProjectId', 'code projectNumber clientName divisionOfProject startDate grandTotal status')
            .populate("customerId", "name")
            .sort({ projectCompletionDate: 1 })
            .lean();
        let UnderExecutionProjects1 = []

        for (let i = 0; i < UnderExecutionProjects.length; i++) {
            let projectCompletionDate = UnderExecutionProjects[i].projectCompletionDate
            let today = new Date()
            let obj = {}

            if (projectCompletionDate) {
                obj = { ...UnderExecutionProjects[i], "remainingDays": Number(((projectCompletionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)).toFixed(0)) }
            }
            else {
                obj = { ...UnderExecutionProjects[i], "remainingDays": "" }
            }

            UnderExecutionProjects1.push(obj)
        }

        UnderExecutionProjects1.sort((a, b) => a.remainingDays - b.remainingDays);

        res.status(200).send(UnderExecutionProjects1);

    }
    catch (error) {
        res.status(400).send(error.message)
    }
    } else if (req.query.stage === "Completed"){
        try{
        const allCompletedProjects = await Lead.find
            ({
                assignTo: req.query.assignTo,
                currentStage: 'Completed',
                finalPaymentApprovalRequestStatus: 'NA'
            })
            .select('lead_no grandTotal factoryStage currentStage readyToDispatchDate totalCustomerOutflow projectCompletionDate customerDesignSignOffDate designSignOffDate erpProjectNo clientDependency experienceCenterId experienceCenterId executionCompletionDate')
            .populate('erpProjectId', 'code projectNumber clientName divisionOfProject startDate grandTotal status')
            .populate("customerId", "name")
            .sort({ designSignOffDate: 1 })
            .lean();

        res.status(200).send(allCompletedProjects);
       }
    catch (error) {
           res.status(400).send(error.message)
       }
    } else if (req.query.stage === "Completed MWP") {
        try{
        const allCompletedMWPProjects = await Lead.find
            ({
                assignTo: req.query.assignTo,
                currentStage: 'Completed-MWP',
                finalPaymentApprovalRequestStatus: 'NA'
            })
            .select('lead_no grandTotal factoryStage currentStage readyToDispatchDate totalCustomerOutflow projectCompletionDate customerDesignSignOffDate designSignOffDate experienceCenterId erpProjectNo')
            .populate('erpProjectId', 'code projectNumber clientName divisionOfProject startDate grandTotal status')
            .populate("customerId", "name")
            .sort({ projectCompletionDate: 1 })
            .lean();

        let allCompletedMWPProjects1 = []

        for (let i = 0; i < allCompletedMWPProjects.length; i++) {
            let projectCompletionDate = allCompletedMWPProjects[i].projectCompletionDate
            let today = new Date()
            let obj = {}

            if (projectCompletionDate) {
                obj = { ...allCompletedMWPProjects[i], "remainingDays": Number(((projectCompletionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)).toFixed(0)) }
            }
            else {
                obj = { ...allCompletedMWPProjects[i], "remainingDays": "" }
            }

            allCompletedMWPProjects1.push(obj)

        }

        allCompletedMWPProjects1.sort((a, b) => a.remainingDays - b.remainingDays);

        res.status(200).send(allCompletedMWPProjects1);
    }
    catch (error) {
        res.status(400).send(error.message)
    }
    }
} catch (error) {
    return res.status(400).json(error)
}
})

router.get('/getFactoryBomProjects/:userId',async(req,res)=>{
    try{
        const leads = await Lead.find({ assignTo: req.params.userId, experienceCenterId: req.query.expCenter })
        .populate('assignTo', '_id name')
        .populate('erpProjectId', 'divisionOfProject startDate code projectNumber expectedDeliveryDate totalPrice status')
        .select('lead_no grandTotal currentStage')
        .lean()
        res.status(200).send(leads)
    }catch(err){
        res.status(400).json(err)
    }
})

router.get('/expCenterBasedData', async (req, res) => {
    try {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const { startDate, endDate } = req.query;
        let lastDay, monthDiff, firstDay;
        if (!startDate && !endDate) {
            firstDay = new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1);
            lastDay = new Date();
            const yearDiff = lastDay.getFullYear() - firstDay.getFullYear();
            monthDiff = (yearDiff * 12) + (lastDay.getMonth() - firstDay.getMonth());
        }

        if (startDate && endDate) {
            const dateStr = startDate;
            const parts = dateStr.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            firstDay = new Date(year, month, 1);

            const lastDateStr = endDate;
            const lastParts = lastDateStr.split('-');
            const lastYear = parseInt(lastParts[0]);
            const lastMonth = parseInt(lastParts[1]) - 1;
            lastDay = new Date(lastYear, lastMonth + 1, 1);
            const yearDiff = lastDay.getFullYear() - firstDay.getFullYear();
            monthDiff = (yearDiff * 12) + (lastDay.getMonth() - firstDay.getMonth());

        }

        let query;
        let monthAndYear;
        if (req.query.stage === "Sales") {
            query = {
                "$match": {
                    "leadWonDate": {
                        "$gte": firstDay,
                        "$lte": lastDay
                    }
                }
            };
            monthAndYear = "$leadWonDate";

        } else if (req.query.stage === "Design") {
            query = {
                "$match": {
                    "designSignOffDate": {
                        "$gte": firstDay,
                        "$lte": lastDay
                    }
                }
            };
            monthAndYear = "$designSignOffDate";
        } else if (req.query.stage === "Material Delivery") {
            query = {
                "$match": {
                    "materialDispatchedDate": {
                        "$gte": firstDay,
                        "$lte": lastDay
                    }
                }
            };
            monthAndYear = "$materialDispatchedDate";
        } else if (req.query.stage === "Completed") {
            query = {
                "$match": {
                    "currentStage": 'Completed',
                    "executionCompletionDate": {
                        "$gte": firstDay,
                        "$lte": lastDay
                    }
                }
            };
            monthAndYear = "$executionCompletionDate";
        }

        const aggregatedData = await Lead.aggregate([
            query,
            {
                "$addFields": {
                    "month": { "$month": monthAndYear },
                    "year": { "$year": monthAndYear }
                }
            },
            {
                "$group": {
                    "_id": {
                        "experienceCenterId": "$experienceCenterId",
                        "month": "$month",
                        "year": "$year"
                    },
                    "totalGrandTotal": { "$sum": "$totalCustomerOutflow" },
                    "count": { "$sum": 1 }
                }
            },
            {
                "$lookup": {
                    "from": "experiencecenters",
                    "localField": "_id.experienceCenterId",
                    "foreignField": "_id",
                    "as": "experienceCenter"
                }
            },
            {
                "$unwind": "$experienceCenter"
            },
            {
                "$project": {
                    "_id": 0,
                    "experienceCenterId": "$_id.experienceCenterId",
                    "experienceCenterName": "$experienceCenter.name",
                    "monthlyGrandTotal": {
                        "monthNumber": "$_id.month",
                        "monthName": { "$arrayElemAt": [monthNames, { "$subtract": ["$_id.month", 1] }] },
                        "year": "$_id.year",
                        "totalGrandTotal": "$totalGrandTotal",
                        "count": "$count"
                    }
                }
            },
            {
                "$sort": {
                    "experienceCenterId": 1,
                    "monthlyGrandTotal.monthNumber": 1
                }
            },
            {
                "$group": {
                    "_id": {
                        "experienceCenterId": "$experienceCenterId",
                        "experienceCenterName": "$experienceCenterName"
                    },
                    "monthlyGrandTotal": { "$push": "$monthlyGrandTotal" },
                    "grandTotal": { "$sum": "$monthlyGrandTotal.totalGrandTotal" },
                    "totalCount": { "$sum": "$monthlyGrandTotal.count" }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "experienceCenterId": "$_id.experienceCenterId",
                    "experienceCenterName": "$_id.experienceCenterName",
                    "monthlyGrandTotal": 1,
                    "grandTotal": 1,
                    "totalCount": 1
                }
            }
        ]);

        const monthWiseData = {};
        let grandTotal = 0;

        for (const record of aggregatedData) {
            grandTotal += record.grandTotal;

            for (const monthlyRecord of record.monthlyGrandTotal) {
                const monthNumber = monthlyRecord.monthNumber;

                if (!monthWiseData[monthNumber]) {
                    monthWiseData[monthNumber] = {
                        monthNumber: monthNumber,
                        monthName: monthlyRecord.monthName,
                        year: monthlyRecord.year,
                        totalGrandTotal: 0,
                        count: 0,
                    };
                }

                monthWiseData[monthNumber].totalGrandTotal += monthlyRecord.totalGrandTotal;
                monthWiseData[monthNumber].count += monthlyRecord.count;
            }
        }

        const monthWiseDataArray = Object.values(monthWiseData);

        const experienceCenterTotals = {};

        for (const centerData of aggregatedData) {
            const experienceCenterId = centerData.experienceCenterId;
            const experienceCenterName = centerData.experienceCenterName;

            experienceCenterTotals[experienceCenterId] = {
                experienceCenterId,
                experienceCenterName,
                monthlyGrandTotal: [],
                grandTotal: 0,
                count: 0,
            };

            for (const month of monthWiseDataArray) {
                const monthlyRecord = centerData.monthlyGrandTotal.find(
                    m => m.monthNumber === month.monthNumber && m.year === month.year
                );

                experienceCenterTotals[experienceCenterId].monthlyGrandTotal.push({
                    monthNumber: month.monthNumber,
                    monthName: month.monthName,
                    year: month.year,
                    totalGrandTotal: monthlyRecord ? monthlyRecord.totalGrandTotal : 0,
                    count: monthlyRecord ? monthlyRecord.count : 0,
                });

                // Update the experience center's total values
                experienceCenterTotals[experienceCenterId].grandTotal += monthlyRecord
                    ? monthlyRecord.totalGrandTotal
                    : 0;
                experienceCenterTotals[experienceCenterId].count += monthlyRecord
                    ? monthlyRecord.count
                    : 0;
            }
        }

        const experienceCenterTotalArray = Object.values(experienceCenterTotals);

        const grandTotalCount = experienceCenterTotalArray.reduce(
            (total, center) => total + center.count,
            0
        );
        const grandTotalGrandTotal = experienceCenterTotalArray.reduce(
            (total, center) => total + center.grandTotal,
            0
        );

        const grandTotalObject = {
            monthlyGrandTotal: monthWiseDataArray,
            grandTotal: grandTotalGrandTotal,
            count: grandTotalCount,
            name: "Grand Total",
        };

        const experienceCenterTotalsWithGrandTotal = [...experienceCenterTotalArray, grandTotalObject];

        experienceCenterTotalsWithGrandTotal.forEach(center => {
            center.monthlyGrandTotal.sort((a, b) => {
                if (a.year !== b.year) {
                    return a.year - b.year;
                } else {
                    return a.monthNumber - b.monthNumber;
                }
            });
        });

        const output = {
            experienceCenterTotals: experienceCenterTotalsWithGrandTotal,
        };

        res.status(200).send(output);
    } catch (err) {
        res.status(400).json(err)
    }
})

router.get('/salesUsersAndManagersBasedData', async (req, res) => {
    try {
        let finalArray = []
        const roles = [{ role: "Sales Manager", name: "Manager" }, { role: "Sales User", name: "User" }]
        let dates = false;
        let lastDay, monthDiff, firstDay;

        const { startDate, endDate } = req.query;

        if (!startDate & !endDate) {
            firstDay = new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1);
            lastDay = new Date();
            const yearDiff = lastDay.getFullYear() - firstDay.getFullYear();
            monthDiff = (yearDiff * 12) + (lastDay.getMonth() - firstDay.getMonth());
        }
        if (startDate && endDate) {
            const dateStr = startDate;
            const parts = dateStr.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            firstDay = new Date(year, month, 1);

            const lastDateStr = endDate;
            const lastParts = lastDateStr.split('-');
            const lastYear = parseInt(lastParts[0]);
            const lastMonth = parseInt(lastParts[1]) - 1;
            lastDay = new Date(lastYear, lastMonth + 1, 1);
            const yearDiff = lastDay.getFullYear() - firstDay.getFullYear();
            monthDiff = (yearDiff * 12) + (lastDay.getMonth() - firstDay.getMonth());

        }

        for (let i = 0; i < roles.length; i++) {
            const aggregatedData = await Lead.aggregate([
                {
                    "$match": {
                        "leadWonDate": {
                            "$gte": firstDay,
                            "$lte": lastDay
                        }
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "previouslyAssignedTo",
                        "foreignField": "_id",
                        "as": "previousUsers"
                    }
                },
                {
                    "$match": {
                        "previousUsers.isActive": true
                    }
                },
                {
                    "$unwind": "$previousUsers"
                },
                {
                    "$lookup": {
                        "from": "roles",
                        "let": { "leadRoles": "$previousUsers.roles" },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$in": ["$_id", "$$leadRoles"]
                                    }
                                }
                            }
                        ],
                        "as": "previousUsers.rolesData"
                    }
                },
                {
                    "$match": {
                        "previousUsers.rolesData.name": roles[i].role
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$previousUsers._id",
                            "name": "$previousUsers.name",
                            "month": { "$month": "$leadWonDate" },
                            "year": { "$year": "$leadWonDate" }
                        },
                        "totalGrandTotal": { "$sum": "$totalCustomerOutflow" },
                        "count": { "$sum": 1 }
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$_id.userId",
                            "name": "$_id.name"
                        },
                        "monthlyGrandTotal": {
                            "$push": {
                                "month": {
                                    "number": "$_id.month",
                                    "name": {
                                        "$arrayElemAt": [
                                            [
                                                "January", "February", "March", "April", "May", "June",
                                                "July", "August", "September", "October", "November", "December"
                                            ],
                                            { "$subtract": ["$_id.month", 1] }
                                        ]
                                    }
                                },
                                "year": "$_id.year",
                                "totalGrandTotal": "$totalGrandTotal",
                                "count": "$count"
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "userId": "$_id.userId",
                        "name": "$_id.name",
                        "monthlyGrandTotal": 1
                    }
                },
                {
                    "$unwind": "$monthlyGrandTotal"
                },
                {
                    "$sort": { "monthlyGrandTotal.month.number": 1 }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$userId",
                            "name": "$name"
                        },
                        "grandTotal": { "$sum": "$monthlyGrandTotal.totalGrandTotal" },
                        "totalCount": { "$sum": "$monthlyGrandTotal.count" },
                        "monthlyGrandTotal": {
                            "$push": {
                                "monthName": "$monthlyGrandTotal.month.name",
                                "monthNumber": "$monthlyGrandTotal.month.number",
                                "year": "$monthlyGrandTotal.year",
                                "totalGrandTotal": "$monthlyGrandTotal.totalGrandTotal",
                                "count": "$monthlyGrandTotal.count"
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "userId": "$_id.userId",
                        "name": "$_id.name",
                        "grandTotal": 1,
                        "totalCount": 1,
                        "monthlyGrandTotal": 1
                    }
                }
            ]);

            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            const monthWiseData = {};
            let grandTotal = 0;

            for (const record of aggregatedData) {
                grandTotal += record.grandTotal;

                for (const monthlyRecord of record.monthlyGrandTotal) {
                    const monthNumber = monthlyRecord.monthNumber;

                    if (!monthWiseData[monthNumber]) {
                        monthWiseData[monthNumber] = {
                            monthNumber: monthNumber,
                            monthName: monthlyRecord.monthName,
                            year: monthlyRecord.year,
                            totalGrandTotal: 0,
                            count: 0,
                        };
                    }

                    monthWiseData[monthNumber].totalGrandTotal += monthlyRecord.totalGrandTotal;
                    monthWiseData[monthNumber].count += monthlyRecord.count;
                }
            }

            const monthWiseDataArray = Object.values(monthWiseData);

            const userTotals = {};

            for (const centerData of aggregatedData) {
                const userId = centerData.userId;
                const name = centerData.name;

                userTotals[userId] = {
                    userId,
                    name,
                    monthlyGrandTotal: [],
                    grandTotal: 0,
                    count: 0,
                };

                for (const month of monthWiseDataArray) {
                    const monthlyRecord = centerData.monthlyGrandTotal.find(
                        m => m.monthNumber === month.monthNumber && m.year === month.year
                    );

                    userTotals[userId].monthlyGrandTotal.push({
                        monthNumber: month.monthNumber,
                        monthName: month.monthName,
                        year: month.year,
                        totalGrandTotal: monthlyRecord ? monthlyRecord.totalGrandTotal : 0,
                        count: monthlyRecord ? monthlyRecord.count : 0,
                    });

                    // Update the experience center's total values
                    userTotals[userId].grandTotal += monthlyRecord
                        ? monthlyRecord.totalGrandTotal
                        : 0;
                    userTotals[userId].count += monthlyRecord
                        ? monthlyRecord.count
                        : 0;
                }
            }

            const userTotalArray = Object.values(userTotals);

            const grandTotalCount = userTotalArray.reduce(
                (total, center) => total + center.count,
                0
            );
            const grandTotalGrandTotal = userTotalArray.reduce(
                (total, center) => total + center.grandTotal,
                0
            );
            const grandTotalObject = {
                monthlyGrandTotal: monthWiseDataArray,
                grandTotal: grandTotalGrandTotal,
                count: grandTotalCount,
                name: "Grand Total",
            };

            const userTotalsWithGrandTotal = [...userTotalArray, grandTotalObject];

            userTotalsWithGrandTotal.forEach(center => {
                center.monthlyGrandTotal.sort((a, b) => {
                    if (a.year !== b.year) {
                        return a.year - b.year;
                    } else {
                        return a.monthNumber - b.monthNumber;
                    }
                });
            });

            const output = {
                userTotals: userTotalsWithGrandTotal,
            };

            finalArray.push({ [roles[i].name]: output })
        }

        res.status(200).send(finalArray)
    } catch (err) {
        res.status(400).json(err)
    }
})

router.get('/designUsersAndManagersBasedData', async (req, res) => {
    try {
        let finalArray = []
        const roles = [{ role: "Design Manager", name: "Manager" }, { role: "Design User", name: "User" }]

        let dates = false;
        let lastDay, monthDiff, firstDay;

        const { startDate, endDate } = req.query;

        if (!startDate & !endDate) {
            firstDay = new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1);
            lastDay = new Date();
            const yearDiff = lastDay.getFullYear() - firstDay.getFullYear();
            monthDiff = (yearDiff * 12) + (lastDay.getMonth() - firstDay.getMonth());
        }
        if (startDate && endDate) {
            const dateStr = startDate;
            const parts = dateStr.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            firstDay = new Date(year, month, 1);

            const lastDateStr = endDate;
            const lastParts = lastDateStr.split('-');
            const lastYear = parseInt(lastParts[0]);
            const lastMonth = parseInt(lastParts[1]) - 1;
            lastDay = new Date(lastYear, lastMonth + 1, 1);
            const yearDiff = lastDay.getFullYear() - firstDay.getFullYear();
            monthDiff = (yearDiff * 12) + (lastDay.getMonth() - firstDay.getMonth());

        }

        for (let i = 0; i < roles.length; i++) {
            const aggregatedData = await Lead.aggregate([
                {
                    "$match": {
                        "designSignOffDate": {
                            "$gte": firstDay,
                            "$lte": lastDay
                        }
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "previouslyAssignedTo",
                        "foreignField": "_id",
                        "as": "previousUsers"
                    }
                },
                {
                    "$match": {
                        "previousUsers.isActive": true
                    }
                },
                {
                    "$unwind": "$previousUsers"
                },
                {
                    "$lookup": {
                        "from": "roles",
                        "let": { "leadRoles": "$previousUsers.roles" },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$in": ["$_id", "$$leadRoles"]
                                    }
                                }
                            }
                        ],
                        "as": "previousUsers.rolesData"
                    }
                },
                {
                    "$match": {
                        "previousUsers.rolesData.name": roles[i].role
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$previousUsers._id",
                            "name": "$previousUsers.name",
                            "month": { "$month": "$designSignOffDate" },
                            "year": { "$year": "$designSignOffDate" }
                        },
                        "totalGrandTotal": { "$sum": "$totalCustomerOutflow" },
                        "count": { "$sum": 1 }
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$_id.userId",
                            "name": "$_id.name"
                        },
                        "monthlyGrandTotal": {
                            "$push": {
                                "month": {
                                    "number": "$_id.month",
                                    "name": {
                                        "$arrayElemAt": [
                                            [
                                                "January", "February", "March", "April", "May", "June",
                                                "July", "August", "September", "October", "November", "December"
                                            ],
                                            { "$subtract": ["$_id.month", 1] }
                                        ]
                                    }
                                },
                                "year": "$_id.year",
                                "totalGrandTotal": "$totalGrandTotal",
                                "count": "$count"
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "userId": "$_id.userId",
                        "name": "$_id.name",
                        "monthlyGrandTotal": 1
                    }
                },
                {
                    "$unwind": "$monthlyGrandTotal"
                },
                {
                    "$sort": { "monthlyGrandTotal.month.number": 1 }
                },
                {
                    "$group": {
                        "_id": {
                            "userId": "$userId",
                            "name": "$name"
                        },
                        "grandTotal": { "$sum": "$monthlyGrandTotal.totalGrandTotal" },
                        "totalCount": { "$sum": "$monthlyGrandTotal.count" },
                        "monthlyGrandTotal": {
                            "$push": {
                                "monthName": "$monthlyGrandTotal.month.name",
                                "monthNumber": "$monthlyGrandTotal.month.number",
                                "year": "$monthlyGrandTotal.year",
                                "totalGrandTotal": "$monthlyGrandTotal.totalGrandTotal",
                                "count": "$monthlyGrandTotal.count"
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "userId": "$_id.userId",
                        "name": "$_id.name",
                        "grandTotal": 1,
                        "totalCount": 1,
                        "monthlyGrandTotal": 1
                    }
                }
            ]);


            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            const monthWiseData = {};
            let grandTotal = 0;

            for (const record of aggregatedData) {
                grandTotal += record.grandTotal;

                for (const monthlyRecord of record.monthlyGrandTotal) {
                    const monthNumber = monthlyRecord.monthNumber;

                    if (!monthWiseData[monthNumber]) {
                        monthWiseData[monthNumber] = {
                            monthNumber: monthNumber,
                            monthName: monthlyRecord.monthName,
                            year: monthlyRecord.year,
                            totalGrandTotal: 0,
                            count: 0,
                        };
                    }

                    monthWiseData[monthNumber].totalGrandTotal += monthlyRecord.totalGrandTotal;
                    monthWiseData[monthNumber].count += monthlyRecord.count;
                }
            }

            const monthWiseDataArray = Object.values(monthWiseData);

            const userTotals = {};

            for (const centerData of aggregatedData) {
                const userId = centerData.userId;
                const name = centerData.name;

                userTotals[userId] = {
                    userId,
                    name,
                    monthlyGrandTotal: [],
                    grandTotal: 0,
                    count: 0,
                };

                for (const month of monthWiseDataArray) {
                    const monthlyRecord = centerData.monthlyGrandTotal.find(
                        m => m.monthNumber === month.monthNumber && m.year === month.year
                    );

                    userTotals[userId].monthlyGrandTotal.push({
                        monthNumber: month.monthNumber,
                        monthName: month.monthName,
                        year: month.year,
                        totalGrandTotal: monthlyRecord ? monthlyRecord.totalGrandTotal : 0,
                        count: monthlyRecord ? monthlyRecord.count : 0,
                    });

                    // Update the experience center's total values
                    userTotals[userId].grandTotal += monthlyRecord
                        ? monthlyRecord.totalGrandTotal
                        : 0;
                    userTotals[userId].count += monthlyRecord
                        ? monthlyRecord.count
                        : 0;
                }
            }

            const userTotalArray = Object.values(userTotals);

            const grandTotalCount = userTotalArray.reduce(
                (total, center) => total + center.count,
                0
            );
            const grandTotalGrandTotal = userTotalArray.reduce(
                (total, center) => total + center.grandTotal,
                0
            );
            const grandTotalObject = {
                monthlyGrandTotal: monthWiseDataArray,
                grandTotal: grandTotalGrandTotal,
                count: grandTotalCount,
                name: "Grand Total",
            };

            const userTotalsWithGrandTotal = [...userTotalArray, grandTotalObject];

            userTotalsWithGrandTotal.forEach(center => {
                center.monthlyGrandTotal.sort((a, b) => {
                    if (a.year !== b.year) {
                        return a.year - b.year;
                    } else {
                        return a.monthNumber - b.monthNumber;
                    }
                });
            });

            const output = {
                userTotals: userTotalsWithGrandTotal,
            };

            finalArray.push({ [roles[i].name]: output });

        }
        res.status(200).send(finalArray)
    } catch (err) {
        res.status(400).json(err)
    }
})

router.put("/sendDataBasedOnQuery", async (req, res) => {
    let query = {}
    query = req.body;

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthNumber = monthNames.indexOf(query.month);

    const startDate = new Date(query.year, monthNumber, 1);
    const endDate = new Date(query.year, monthNumber + 1, 1);

    if (req.body.stage === "Booking") {
        query.leadWonDate = { "$gte": startDate, "$lte": endDate };
    } else if (req.body.stage === "Design Sign Off") {
        query.designSignOffDate = { "$gte": startDate, "$lte": endDate };
    } else if (req.body.stage === "Material Delivery") {
        query.materialDispatchedDate = { "$gte": startDate, "$lte": endDate };
    } else if (req.body.stage === "Project Completion") {
        query.executionCompletionDate = { "$gte": startDate, "$lte": endDate };
        query.currentStage = 'Completed';
    }

    delete query.stage, delete query.month, delete query.year;
    try {
        const leads = await Lead.find(query)
            .populate('customerId', '_id name')
            .populate('experienceCenterId', 'name')
            .select('lead_no totalCustomerOutflow currentStage erpProjectNo executionCompletionDate designSignOffDate leadWonDate materialDispatchedDate')
            .lean()

        res.status(200).send(leads)
    } catch (err) {
        res.status(400).json(err)
    }

})

module.exports = router;
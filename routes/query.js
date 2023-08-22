const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');
const path = require('path');
const XLSX = require('xlsx');
const Excel = require('exceljs');
const ProjectRateCardMaster = require('../models/projectRateCardMaster');
const SourceOfLeadMaster = require('../models/sourceOfLeadMaster');
const auth = require('../middlewares/authentication');
const User = require('../models/user');
const Roles = require('../models/roles')
const Customer = require('../models/customer');
const moment = require('moment')
const Department = require('../models/department');
const Project = require('../models/project');
const MaterialMaster = require('../models/materialMaster');
const Team = require('../models/team');
const usersService = require('../services/users.service');
const Snag = require('../models/snag');
const ProductMaster = require('../models/productMaster');
const Lead = require('../models/lead');
const LeadLogs = require('../models/leadLog');
const ProjectComponent = require('../models/projectComponent');
const Quotation = require('../models/quotation');
const filterService = require('../services/filter.service');
const ProjectLog = require('../models/projectLog');
const Scope = require('../models/scopeMaster');
const MetaLead = require('../models/metaLead');
const PlyTypeMaster = require('../models/plyTypeMaster');
const fs = require('fs');
const RateCardMaster = require('../models/rateCardMaster')
const OrgRateCard = require('../models/orgRateCard')
const FinishTypeMaster = require('../models/finishTypeMaster')
const ProjectRateCard = require('../models/projectRateCard');
const UnitTypeMaster = require('../models/unitTypeMaster')
const leadService = require('../services/lead.service');
const CustomerSurveyWonForm = require('../models/customerSurveyWon');
const ImosProject = require('../models/imosProject');
const ChmLeads = require('../models/chmleads');
const CustomerSurveyDesignForm = require('../models/customerSurveyDesign')
const CustomerSurveyDesignLostForm = require('../models/customerSurveyDesignLost')
const constants = require('../utils/constants');
const constant = require('../constant/constant')
const ExperienceCenter = require('../models/experienceCenter');
const { defaultOptionListAppearanceProvider } = require('pdf-lib');



// query for assigning CHM's to their respective leads
router.put('/assignCHM', async (req, res) =>
{
    try
    {

        let filePath = path.join
        (
            "/",
            "Users",
            "ajitsingh",
            "Downloads",
            "CHMUndefined(ERP).xlsx"
        )

        let workbook = XLSX.readFile(filePath)

        let sheetName = workbook.SheetNames[0]

        let worksheet = workbook.Sheets[sheetName]

        let jsonRows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""})

        jsonRows = jsonRows.filter(jsonRow => jsonRow[0] !== "")

        for(let index = 1; index < jsonRows.length; index++)
        {
            const chmLead = await ChmLeads.find({leadId: jsonRows[index][1]})

            if(chmLead.length === 0)
            { 
                let obj =
                {
                    deleted: false,
                    leadId: jsonRows[index][1],
                    assignTo: jsonRows[index][5],
                    teamId: jsonRows[index][6],
                    departmentId: jsonRows[index][7],
                    experienceCenterId: jsonRows[index][3]
                }
                await ChmLeads.create(obj)
            }
            else
            {
               let obj =
               {
                    assignTo: jsonRows[index][5],
                    teamId: jsonRows[index][6],
                    departmentId: jsonRows[index][7],
                    experienceCenterId: jsonRows[index][3]
                }
                await ChmLeads.updateOne({leadId: jsonRows[index][1]}, {$set: obj})
            }
        }
        
        res.status(200).json({jsonRows: jsonRows})
    }
    catch(error)
    {
        console.log("error", error.message)
        console.log(error)
        res.status(400).send(error.message)
    }
})

// query for adding orgratecards
router.put('/addOrgRateCards', async (req, res) =>
{
    try
    {
        let chennaiRateCardMasterId = '632858c0ab76f5042ff9d800', coimbatoreRateCardMasterId = '63c154fa57f73ec83e15bc6e'
        
        // console.log("all good")
        
        const chennaiOrgRateCards = await OrgRateCard.find({rateCardMasterId: chennaiRateCardMasterId})
        
        let coimbatoreOrgRateCards = []
        
        for(let index = 0; index < chennaiOrgRateCards.length; index++)
        {
            let obj = {}
            obj.docType = chennaiOrgRateCards[index]['docType']
            obj.isActive = chennaiOrgRateCards[index]['isActive']
            obj.deleted = chennaiOrgRateCards[index]['deleted']
            obj.itemId = chennaiOrgRateCards[index]['itemId']
            obj.rate = chennaiOrgRateCards[index]['rate']
            obj.rateCardMasterId = coimbatoreRateCardMasterId

            // console.log("obj",obj)
            coimbatoreOrgRateCards.push(obj)
        }

        await OrgRateCard.insertMany(coimbatoreOrgRateCards)
        console.log("all good")
        res.status(200).json({coimbatoreOrgRateCards: coimbatoreOrgRateCards})
    }
    catch(error)
    {
        console.log("error",error.message)
        console.error(error)
        res.status(400).send(error.message)
    }
})

// Query for Updating SalesManagers in Leads
router.put('/updateSalesManagers', async (req, res) => {
    try
    {
        console.log("all good")
        let erpProjectNo =
        [
            "2475",
            "2476",
            "2477",
            "2482",
            "2484",
            "2485",
            "2486",
            "2489",
            "2490",
            "2492",
            "2493",
            "2494",
            "2500",
            "2502",
            "2503",
            "2505",
            "2508",
            "2509",
            "2510",
            "2514",
            "2517",
            "2518",
            "2519",
            "2525",
            "2526",
            "2527",
            "2529",
            "2531",
            "2537",
            "2539",
            "2540",
            "2544",
            "2546",
            "2547",
            "2548",
            "2549",
            "2552",
            "2553"
        ]
        let salesWonManager =
        [
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6d0dc4dc0714d08a2b24f",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6d0dc4dc0714d08a2b24f",
            "62a6d0dc4dc0714d08a2b24f",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3",
            "62a6bb6808c3f951607a39a3"
        ]
        let salesWonManagerName =
        [
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Atreyee",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Atreyee",
            "Atreyee",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar",
            "Chandrasekhar"
        ]

        let result = []

        for(let index = 0; index < erpProjectNo.length; index++)
        {
            result.push(`erpProjectNo: ${erpProjectNo[index]}, salesWonManager: ${salesWonManager[index]}, salesWonManagerName: ${salesWonManagerName[index]}`)
            console.log(`erpProjectNo: ${erpProjectNo[index]}, salesWonManager: ${salesWonManager[index]}, salesWonManagerName: ${salesWonManagerName[index]}`)
            await Lead.updateOne({erpProjectNo: erpProjectNo[index]}, {$set: {salesWonManager: salesWonManager[index]}, salesWonManagerName: salesWonManagerName[index]})
        }

        // for(index = 0; index < lead_ids.length; index++)
        // {
        //     let lead = await Lead.find({_id: {$in: lead_ids[index]}}).select('_id previouslyAssignedTo')
        //     let NewpreviouslyAssignedTo = lead[0].previouslyAssignedTo
        //     !NewpreviouslyAssignedTo.find(id=>id.toString() == crmMgr_ids[index].toString()) && NewpreviouslyAssignedTo.splice(1,0,crmMgr_ids[index])
        //     !NewpreviouslyAssignedTo.find(id=>id.toString() == crm_ids[index].toString()) && NewpreviouslyAssignedTo.splice(2,0,crm_ids[index])
        //     await Lead.updateOne({_id: lead_ids[index]}, {$set: {previouslyAssignedTo: NewpreviouslyAssignedTo}})
        // }
        res.status(200).json({result: result})
    }
    catch(error)
    {
        console.log("error: ", error)
        res.status(400).send(error.message)
    }
})

//Query for update some Field in Leads
// router.put
// (
//     '/update_fields_in_leads', async (req, res) =>
//     {
//         try
//         {
//             let response = await Lead.find({})
//             .select('_id salesWonUser salesWonManager teamId designSignOffUser experienceCenterId city assignTo')
//             .populate({path: 'salesWonUser', select: 'name'})
//             .populate({path: 'salesWonManager', select: 'name'})
//             .populate({path: 'teamId', select: 'name'})
//             .populate({path: 'designSignOffUser', select: 'name'})
//             .populate({path: 'experienceCenterId', select: 'name'})
//             .populate({path: 'city', select: 'name'})
//             .populate({path: 'assignTo', select: 'name'})

//             let obj = {}

//             for(let index = 0; index < response.length; index++)
//             {
//                 if(!obj[response[index]['_id']])
//                 {
//                     obj[response[index]['_id']] = {}
//                 }
//                 if(response[index]["salesWonUser"])
//                 {
//                     obj[response[index]['_id']]["salesWonUserName"] = response[index]["salesWonUser"]["name"]
//                 }
//                 if(response[index]["salesWonManager"])
//                 {
//                     obj[response[index]['_id']]["salesWonManagerName"] = response[index]["salesWonManager"]["name"]
//                 }
//                 if(response[index]["teamId"])
//                 {
//                     obj[response[index]['_id']]["teamName"] = response[index]["teamId"]["name"]
//                 }
//                 if(response[index]["designSignOffUser"])
//                 {
//                     obj[response[index]['_id']]["designSignOffUserName"] = response[index]["designSignOffUser"]["name"]
//                 }
//                 if(response[index]["experienceCenterId"])
//                 {
//                     obj[response[index]['_id']]["experienceCenterName"] = response[index]["experienceCenterId"]["name"]
//                 }
//                 if(response[index]["city"])
//                 {
//                     obj[response[index]['_id']]["cityName"] = response[index]["city"]["name"]
//                 }
//                 if(response[index]["assignTo"])
//                 {
//                     obj[response[index]['_id']]["assignToName"] = response[index]["assignTo"]["name"]
//                 }
//             }

//             for(let index = 0; index < Object.keys(obj).length; index++)
//             {
//                 let current_lead_id = Object.keys(obj)[index]
//                 let data =
//                 {
//                     salesWonUserName: obj[current_lead_id].salesWonUserName?obj[current_lead_id].salesWonUserName : "",
//                     salesWonManagerName: obj[current_lead_id].salesWonManagerName?obj[current_lead_id].salesWonManagerName : "",
//                     teamName: obj[current_lead_id].teamName?obj[current_lead_id].teamName : "",
//                     designSignOffUserName: obj[current_lead_id].designSignOffUserName?obj[current_lead_id].designSignOffUserName : "",
//                     experienceCenterName: obj[current_lead_id].experienceCenterName?obj[current_lead_id].experienceCenterName : "",
//                     cityName: obj[current_lead_id].cityName?obj[current_lead_id].cityName : "",
//                     assignToName: obj[current_lead_id].assignToName?obj[current_lead_id].assignToName : ""
//                 }

//                 await Lead.updateOne
//                 (
//                     {_id: current_lead_id},
//                     {$set: data}
//                 )
//             }
//             console.log("obj", obj)
//             res.status(200).json({msg: "All good", obj: obj})
//         }
//         catch(error)
//         {
//             console.log("error", error.message)
//             console.error("error", error)
//         }
//     }
// )

//Query for updating currentStage=Not Mapped to respective stage
router.put
(
    '/update_currentStage', async (req, res) =>
    {
        try
        {
            let response = await Lead.find
            ({
                currentStage: 'Not Mapped'
            })
            .select('_id departmentId status currentStage salesStage designStages imosStage executionStage ')
            .populate({path: 'departmentId', select: 'name'})

            let departments = []

            for(let index = 0; index < response.length; index++)
            {
                !departments.includes(response[index]["departmentId"]["name"]) &&
                (
                    departments.push(response[index]["departmentId"]["name"])
                )
             
                switch(response[index]["departmentId"]["name"])
                {
                    case "Marketing":
                        await Lead.updateOne({_id: response[index]["_id"]}, {$set: {currentStage: "Lead Received"}})
                        break;
                    case "Sales":
                        await Lead.updateOne({_id: response[index]["_id"]}, {$set: {currentStage: response[index]["salesStage"]}})
                        break;
                    case "Design":
                        await Lead.updateOne({_id: response[index]["_id"]}, {$set: {currentStage: response[index]["designStages"]}})
                        break;
                }
            }

            res.status(200).json({msg: "All good", leadCount: response.length, departments: departments, firstLead: response[0]})
        }
        catch(error)
        {
            console.log("error", error.message)
            console.error("error", error)
        }
    }
)


// Query for getting Role-wise All Users
router.get('/getRoleWiseUsers', async (req, res)=>{
    try
    {
        const response = await Roles.find
        (

        )
        .select('_id name')

        let roleWiseUsers = {}

        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet('roleWiseUsers')
        worksheet.columns = 
        [
            {header: 'Role ID', key: 'roleId'},
            {header: 'Role Name', key: 'roleName'},
            {header: 'User ID', key: 'userId'},
            {header: 'User Name', key: 'userName'},
            {header: 'Email ID', key: 'userEmailId'}
        ]

        for(let index = 0; index < response.length; index++)
        {
            let user = await User.find
            ({
                roles: {$in: [response[index]["_id"]]}
            })
            .select('_id name email')   

            // roleWiseUsers[response[index]["name"].toString()]
            // ?
            // roleWiseUsers[response[index]["name"].toString()]['users'] = user
            // :
            roleWiseUsers[response[index]["name"].toString()] = {roleId: response[index]['_id'], users: user}
           
            
        }

        let roleNames = Object.keys(roleWiseUsers)
        console.log("roleNames", roleNames)

        for(let index = 0; index < roleNames.length; index++)
        {
            let obj = {}
            worksheet.addRow
            ({
                roleId: roleWiseUsers.roleNames[index].roleId,
                roleName: roleNames[index],
                // userId: 
            })
        }

        await workbook.xlsx.writeFile('RoleWise Users')


        res.status(200).json({'roleWiseUsers': roleWiseUsers})
    }
    catch(error)
    {
        console.log("error", error.message)
        console.log("error", error)
    }
})


// Query for Updating salesWonManager in Leads
router.put('/updateSalesWonManager', async (req, res) => {
    try
    {
        console.log("updateSalesWonManager API called")
        const LEADS = await Lead.find
        ({
            $and:
            [
                {leadWonDate: {$exists: true}},
                {salesWonManager: {$exists: false}}              
            ]
        })
        .select('_id previouslyAssignedTo')
        .populate({path: 'previouslyAssignedTo', populate: {path: 'roles', select: '_id name'}, select: '_id name'})

        console.log("LEADS.count", LEADS.length)

        
        for(let index = 0; index < LEADS.length; index++)
        {
            let salesWonManager = null
            for(let index2 = 0; index2 < LEADS[index]["previouslyAssignedTo"].length; index2++)
            {
                if(LEADS[index]["previouslyAssignedTo"][index2]["roles"][0]["name"] == "Sales Manager")
                {
                    salesWonManager = LEADS[index]["previouslyAssignedTo"][index2]["_id"]
                }
            }

            await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {salesWonManager: salesWonManager}})
        }
        res.status(200).json({leads: LEADS})
    }
    catch(error)
    {
        console.log("error: ", error.message)
        console.error("error: ", error)
    }
})

// Query for Updating salesWonUser in Leads
router.put('/updateSalesWonUser', async (req, res) => {
    try
    {
        console.log("updateSalesWonUser API called")
        const LEADS = await Lead.find
        ({
            $and:
            [
                {leadWonDate: {$exists: true}},
                {salesWonUser: {$exists: false}}              
            ]
        })
        .select('_id previouslyAssignedTo')
        .populate({path: 'previouslyAssignedTo', populate: {path: 'roles', select: '_id name'}, select: '_id name'})

        console.log("LEADS.count", LEADS.length)

        
        for(let index = 0; index < LEADS.length; index++)
        {
            let salesWonUser = null
            for(let index2 = 0; index2 < LEADS[index]["previouslyAssignedTo"].length; index2++)
            {
                if(LEADS[index]["previouslyAssignedTo"][index2]["roles"][0]["name"] == "Sales User")
                {
                    salesWonUser = LEADS[index]["previouslyAssignedTo"][index2]["_id"]
                }
            }

            await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {salesWonUser: salesWonUser}})
        }
        res.status(200).json({leads: LEADS})
    }
    catch(error)
    {
        console.log("error: ", error.message)
        console.error("error: ", error)
    }
})

// Query for Updating SalesManagers & SalesUsers in Leads
router.put('/updateSalesManagers', async (req, res) => {
    try
    {
        console.log("all good")
        let lead_ids =
        [
            "6326f273be7e1c5b91ef9772",
            "62f0b110b4fa1878066155bd",
        ]
        let crmMgr_ids =
        [
            "62833ea48c2abbddba2d3ea1",
            "6358cb8012b5d00af4b17f3a",
        ]
        let crm_ids =
        [
            "62833e4c6999f0dd8be397cc",
            "62833ecf5e2bbcddf8acdf98",
        ]

        for(index = 0; index < lead_ids.length; index++)
        {
            let lead = await Lead.find({_id: {$in: lead_ids[index]}}).select('_id previouslyAssignedTo')
            let NewpreviouslyAssignedTo = lead[0].previouslyAssignedTo
            !NewpreviouslyAssignedTo.find(id=>id.toString() == crmMgr_ids[index].toString()) && NewpreviouslyAssignedTo.splice(1,0,crmMgr_ids[index])
            !NewpreviouslyAssignedTo.find(id=>id.toString() == crm_ids[index].toString()) && NewpreviouslyAssignedTo.splice(2,0,crm_ids[index])
            await Lead.updateOne({_id: lead_ids[index]}, {$set: {previouslyAssignedTo: NewpreviouslyAssignedTo}})
        }
        res.status(200).json({msg: "all good"})
    }
    catch(error)
    {
        console.log("error: ", error)
        res.status(400).send(error.message)
    }
})

// Query for Update currentStage of projects in Execution Process (assigned to Teja currently)
router.put('/updateCurrentStageInExecution', async (req, res) =>{
    try
    {
        let ExecutionManagerId = "62cd13a726c3cf4d62910416"
        let ExecutionLeads = await Lead.find({
            assignTo: ExecutionManagerId
        })
        .select('_id assignTo currentStage factoryStage executionStage')

        for(let index = 0; index < ExecutionLeads.length; index++)
        {
            await Lead.updateOne({_id: ExecutionLeads[index]._id}, {$set: {currentStage: ExecutionLeads[index].factoryStage, executionStage: ExecutionLeads[index].factoryStage}})

        }
        let updatedExecutionLeads = await Lead.find({
            assignTo: ExecutionManagerId
        })
        .select('_id assignTo currentStage factoryStage executionStage')
        res.status(200).json({updatedExecutionLeads: updatedExecutionLeads})        
    }
    catch(error)
    {
        console.log("error", error)
        res.status(400).send(error.message)
    }
})

//Query for Lead Search
router.put('/leadSearchAfterFilter', async (req, res)=>{
    try
    {
        let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        
        // update below fields
        let user_id = "62833ecf5e2bbcddf8acdf89",
        user_name = "Vinay Prabhu",
        exp_id = "61e7fcd79905175441887eb9",
        exp_name = "HSR"
        let month = 1, year = 2023
        // update above fields
        let count = 0
        let grandTotal = 0, budget = 0
        console.log("All good")
        let LEADS = await Lead.find
        ({
            $and:
            [
                {$or: [{ assignTo: user_id }, { previouslyAssignedTo: user_id }]},
                // {$or: [{ previouslyAssignedTo: user_id }]},
                {$and: [{experienceCenterId: exp_id},{ $expr: { $eq: [{ $month: "$leadWonDate" }, month] } }, { $expr: { $eq: [{ $year: "$leadWonDate" }, year] } }]}
            ]
        })
        .select('_id customerId grandTotal lead_no')
        .populate({path: 'customerId', select: '_id name email'})

        count += LEADS.length

        let MY_LEADS = []
        for(let index = 0; index < LEADS.length; index++)
        {
            MY_LEADS.push(LEADS[index])
        }

        for(let index = 0; index < LEADS.length; index++)
        {
            MY_LEADS[index]["budget"] = (Number(LEADS[index].grandTotal))/1.18
            grandTotal += Number(LEADS[index].grandTotal)
            console.log("MY_LEADS[index].budget", MY_LEADS[index].budget)
        }
        console.log("MY_LEADS", MY_LEADS)
        budget = grandTotal/1.18
        return res.status(200).json({name: user_name, exp_ctr: exp_name, period: `${months[month-1]} ${year}`, count: count, grandTotal: grandTotal, "budget(w/o GST)": budget, leads: MY_LEADS })
    }
    catch(err)
    {
        console.log("err",err)
    }
})

// Test Query for Sales Statistics
router.put('/sales_statistics', async (req, res) => {
    try
    {
        const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        let month_year_array = [], month_remaining = 13, statistics = [], query = {}, month_index = (new Date()).getMonth(), year = (new Date()).getFullYear()

        while (month_remaining > 0)
        {
            month_year_array.push({month: MONTHS[month_index], year: year})
            month_index === 0 ? (month_index = MONTHS.length - 1, year -= 1) : (month_index--)
            month_remaining--;
        }

        req.body.TokenPercentage && (query.tokenPercent = { $gte: 5 })
        
        const SALES_PEOPLES = await User.find
        ({
            experienceCenterId: { $in: req.body.experienceCenterId },
            departmentId: constants.department_ids.sales
        })
        .select('_id name roles teamId')
        .populate('roles', 'name')
        .populate('experienceCenterId', 'name')
        .lean()
        .sort({ name: 1 })
        console.log("SALES_PEOPLES.length", SALES_PEOPLES.length)
        console.log("SALES_PEOPLES", SALES_PEOPLES[0])

        let Sales_Peoples_ids = []
        SALES_PEOPLES.forEach(SALES_PEOPLE => Sales_Peoples_ids.push(SALES_PEOPLE._id))
        // console.log("Sales_Peoples_ids", Sales_Peoples_ids)

        let LEADS = await Lead.find
        ({
            ...query,
            // $or: [{ assignTo: {$in: Sales_Peoples_ids} }, { previouslyAssignedTo: {$in: Sales_Peoples_ids} }],
            $and: [{$or: [{ assignTo: {$in: Sales_Peoples_ids} }, { previouslyAssignedTo: {$in: Sales_Peoples_ids} }]},{leadWonDate: {$lte: "2023-01-24"}}, {leadWonDate: {$gte: "2022-01-01"}}]
        })
        .select('grandTotal taxPercent assignTo previouslyAssignedTo leadWonDate')
        .populate({path: 'assignTo', select: '_id'})
        .populate({path: 'previouslyAssignedTo', select: '_id'})
        console.log("LEADS.length", LEADS.length)
        console.log("LEADS", LEADS[0])

         for (let month_year_index = 0; month_year_index < month_year_array.length; month_year_index++)
        {
            let current_month = MONTHS.indexOf(month_year_array[month_year_index].month) + 1, current_year = month_year_array[month_year_index].year, current_month_users = []
            for (let i = 0; i < SALES_PEOPLES.length; i++)
            {
                let user = {}, totalValue = 0, roles = []
                let leads = LEADS.filter(LEAD => {

                    ((LEAD.assignTo._id).toString() == (SALES_PEOPLES[i]._id).toString() || (LEAD.previouslyAssignedTo.includes({_id: SALES_PEOPLES[i]._id}))) &&
                    ((new Date((LEADS.leadWonDate)?.toString()).getMonth() == current_month) && (new Date((LEADS.leadWonDate)?.toString()).getFullYear() == current_year))
                })

                SALES_PEOPLES[i].roles.forEach(el=> roles.push(el.name))
                
                leads.forEach(el=> totalValue += Number((el.grandTotal / ((el.taxPercent + 100)/100)).toFixed(0)))

                roles[0] !== "Sales Head" &&
                (
                    user.name = SALES_PEOPLES[i].name,
                    user._id = SALES_PEOPLES[i]._id,
                    user.roles = roles,
                    user.totalValue = totalValue,
                    user.count = leads.length,
                    user.month = MONTHS[MONTHS.indexOf(month_year_array[month_year_index].month)] + " " + current_year,
                    user.teamId = SALES_PEOPLES[i].teamId,
                    user.expcenter = SALES_PEOPLES[i].experienceCenterId[0].name,
                    user.prio = roles[0] === "Sales Manager" ? 3 : roles[0] === "Sales User" ? 2 : 0,
                    current_month_users.push(user)
                )

            }
            
            statistics.push(current_month_users)
        }

        res.status(200).json(statistics);

    }
    catch (err)
    {
        res.status(400).send(err.message)
    }

})

// Query for update currentStage
router.put('/updateCurrentStageOfLeads', async (req, res) => {
    try
    {
        const LEADS = await Lead.find()
        .select('factoryStage executionStage imosStage designStages salesStage isERPProjectCreated lead_no _id')
        .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
        
        console.log("LEADS Length: ", LEADS.length)

        let SiteQC_Users = ["62833ecf5e2bbcddf8acdf97", "638741028aa68f312958bf33", "638740998aa68f312958bf0c"]
        let FactoryBOM_Users = ["62c2abcc26c3cf4d628cdec5"]
        let SiteBOM_Users = ["63329f62f9d156133a5e0974", "6374c4645905f665b1d37ef9"]

        for(let index = 0; index < LEADS.length; index++)
        {
            if(SiteQC_Users.includes((LEADS[index]["assignTo"]._id).toString()))
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: "Site QC"}})
            }
            else if(FactoryBOM_Users.includes((LEADS[index]["assignTo"]._id).toString()))
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: "Factory BOM"}})
            }
            else if(SiteBOM_Users.includes((LEADS[index]["assignTo"]._id).toString()))
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: "Site BOM"}})
            }
            else if(LEADS[index]["factoryStage"])
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: LEADS[index]["factoryStage"]}})
            }
            else if(LEADS[index]["imosStage"] == 'IMOS Completed')
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: LEADS[index]["executionStage"]}})
            }
            else if(LEADS[index]["designStages"] == 'Design Sign-off' && LEADS[index]["isERPProjectCreated"])
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: LEADS[index]["imosStage"]}})
            }
            else if(LEADS[index]["salesStage"] == "Won" && !LEADS[index]["isERPProjectCreated"])
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: LEADS[index]["designStages"]}})
            }
            else
            {
                await Lead.updateOne({_id: LEADS[index]["_id"]}, {$set: {currentStage: LEADS[index]["salesStage"]}})   
            }
        }
        return res.status(200).json({ message: "All good", leads: LEADS[0] })
    }
    catch (error) {
        console.log(error)
        return res.status(400).json(error)
    }
})

router.get('/createMetaLeads', async (req,res) => {
    try{
        let allLeads = await Lead.find();
        for(let i=0;i<allLeads.length;i++){
            console.log(i)
            let expc = null
            let prass = []
            let assto = await User.findOne({_id:allLeads[i].assignTo})
            let tmid = await Team.findOne({_id:allLeads[i].teamId})
            let depid = await Department.findOne({_id:allLeads[i].departmentId})
            let cstid = await Customer.findOne({_id:allLeads[i].customerId})
            let lwonuser = ""
            let lwonteam = ""
            let lwonmanag = ""
            if(assto){
                assto = assto.name
            } else{
                assto = ""
            }
            if(tmid){
                tmid = tmid.name
            } else{
                tmid = ""
            }
            if(cstid){
                cstid=cstid.name
            } else{
                cstid = ""
            }
            if(depid){
                depid=depid.name
            } else{
                depid = ""
            }
            if (allLeads[i].experienceCenterId == "61e7fcd79905175441887eb9"){
                expc = "HSR"
            }else if(allLeads[i].experienceCenterId == "62cd1e205494d65df9d8230e"){
                expc = "Whitefield"
            }else if(allLeads[i].experienceCenterId == "61ea728cb2e70b55ec16a88c"){
                expc = "Gachibowli"
            }else if(allLeads[i].experienceCenterId == "61f22f7bb2e70b55eca2c6b7"){
                expc = "OMR"
            }
            for(let j=0;j<allLeads[i].previouslyAssignedTo.length;j++){
                let passto = await User.findOne({_id:allLeads[i].previouslyAssignedTo[j]})
                if (passto){
                    prass.push(passto.name)
                }
            }
            if (allLeads[i].salesStage == "Won" || allLeads[i].salesStage == "Won Deals Pending Designer Assignment"){
                for(let j=allLeads[i].previouslyAssignedTo.length-1;j>=0;j--){
                    let passto = await User.findOne({_id:allLeads[i].previouslyAssignedTo[j]})
                    // this means that this peron is a sales user
                    if (passto && passto.departmentId == "5cb5b38bcf5531e174cb23e0" && passto.roles){
                        let salesuserhai = false
                        for(let jk=0;jk<passto.roles.length;jk++){
                            if(passto.roles[jk]=="61c0311cb011183618a10055"){
                                salesuserhai = true
                            }
                        }
                        if (salesuserhai){
                            console.log("came")
                            lwonuser = passto.name
                            let teaaaam = await Team.findOne({_id:passto.teamId})
                            if (teaaaam){
                                lwonteam = teaaaam.name
                                let wonmanaag = await User.findOne({_id:teaaaam.manager})
                                if (wonmanaag){
                                    lwonmanag = wonmanaag.name
                                }
                            }
                        }
                    }
                }
            }
            const newMetaLead = new MetaLead({
                projectType: allLeads[i].projectType,
                discountOnAllScopes: allLeads[i].discountOnAllScopes,
                lead_no: allLeads[i].lead_no,
                isRegistered: allLeads[i].isRegistered,
                floorPlan: allLeads[i].floorPlan,
                address: allLeads[i].address,
                area: allLeads[i].area,
                propertyType: allLeads[i].propertyType,
                remark: allLeads[i].remark,
                scopeOfWork: allLeads[i].scopeOfWork,
                startInteriors: allLeads[i].startInteriors,
                experienceCenterId: expc,
                leadType: allLeads[i].leadType,
                leadStatus: allLeads[i].leadStatus,
                salesStage: allLeads[i].salesStage,
                executionStage: allLeads[i].executionStage,
                salesWonUser: lwonuser,
                salesWonManager:lwonmanag,
                salesWonTeam: lwonteam,
                imosStage: allLeads[i].imosStage,
                factoryStage: allLeads[i].factoryStage,
                readyToDispatchDate: allLeads[i].readyToDispatchDate,
                contractFinanceApproved: allLeads[i].contractFinanceApproved,
                contractDesignApproved: allLeads[i].contractDesignApproved,
                contractDesignManagerApproved: allLeads[i].contractDesignManagerApproved,
                contractFinalMarkingApproved: allLeads[i].contractFinalMarkingApproved,
                contractQualityControlApproved: allLeads[i].contractQualityControlApproved,
                contractOperationApproved: allLeads[i].contractOperationApproved,
                contractCustomerApproved: allLeads[i].contractCustomerApproved,
                designToExecutionLogsStatus: allLeads[i].designToExecutionLogsStatus,
                contractRejectReason: allLeads[i].contractRejectReason,
                designStages: allLeads[i].designStages,
                estimatedBudget: allLeads[i].estimatedBudget,
                status: allLeads[i].status,
                designStatus: allLeads[i].designStatus,
                designHoldReason: allLeads[i].designHoldReason,
                proposedDesignStartDate: allLeads[i].proposedDesignStartDate,
                expectedDesignSignOffDate: allLeads[i].expectedDesignSignOffDate,
                assignTo: assto,
                previouslyAssignedTo: prass,
                teamId: tmid,
                departmentId: depid,
                customerId: cstid,
                designerAssigned: allLeads[i].designerAssigned,
                designHeadAssigned: allLeads[i].designHeadAssigned,
                approvalDone: allLeads[i].approvalDone,
                paymentDone: allLeads[i].paymentDone,
                customerAccepted: allLeads[i].customerAccepted,
                contractSignedValue: allLeads[i].contractSignedValue,
                finalAmountInClosure: allLeads[i].finalAmountInClosure,
                quotationSentDate: allLeads[i].quotationSentDate,
                projectCompletionDate: allLeads[i].projectCompletionDate,
                designSignOffDate: allLeads[i].designSignOffDate,
                closureDate: allLeads[i].closureDate,
                clientMoveinDate: allLeads[i].clientMoveinDate,
                leadWonDate: allLeads[i].leadWonDate,
                grandTotal: allLeads[i].grandTotal,
                discountPercent: allLeads[i].discountPercent,
                taxPercent: allLeads[i].taxPercent,
                totalCustomerOutflow: allLeads[i].totalCustomerOutflow,
                discountStatus: allLeads[i].discountStatus,
                designManagerAssigned: allLeads[i].designManagerAssigned,
                tokenPercent: allLeads[i].tokenPercent,
                possessionDate: allLeads[i].possessionDate,
                isERPProjectCreated: allLeads[i].isERPProjectCreated,
                materialReceivedPercentage: allLeads[i].materialReceived,
                salesLeadOwnRole: allLeads[i].salesLeadOwnRole,
                reasonForLost: allLeads[i].reasonForLost,
                finalPaymentApprovalRequestStatus: allLeads[i].finalPaymentApprovalRequestStatus,
                customerDesignSignOffDate:allLeads[i].customerDesignSignOffDate,
                materialDispatchedDate:allLeads[i].materialDispatchedDate,
                erpProjectNo: allLeads[i].erpProjectNo,
                salesMeetingDone: allLeads[i].salesMeetingDone
            })
            await newMetaLead.save();
        }
    } catch (error) {
        console.log('error', error)
    }
})

router.get('/updateLeadWonDate', async (req, res) => {
    try {
        let leads = await Lead.find({departmentId:{$in:["5cb5b38bcf5531e174cb23e0","6285ceb48ed90945b59dc991","6285cebe8ed90945b59dc997"]}})
        let count = 0
        for(let i=0;i<leads.length;i++){
            console.log(i)
            let leadLogs1 = await LeadLogs.findOne({leadId:leads[i]._id,stage:"Site/Office visit"})
            let leadLogs2 = await LeadLogs.findOne({leadId:leads[i]._id,stage:"Negotiation"})
            let leadLogs3 = await LeadLogs.findOne({leadId:leads[i]._id,dealActivity:"Center Head has approved the checklist and link send to the customer for approval."})
            let earliestDate = null;
            if (leadLogs1){
                // console.log(leadLogs1.createdAt,"1")
                earliestDate = leadLogs1.createdAt
                if (leadLogs2 && (earliestDate > leadLogs2.createdAt)){
                    earliestDate = leadLogs2.createdAt
                }
                if (leadLogs3 && (earliestDate > leadLogs3.createdAt)){
                    earliestDate = leadLogs3.createdAt
                }
            }
            else if (leadLogs2){
                // console.log(leadLogs2.createdAt,"2")
                earliestDate = leadLogs2.createdAt
                if (leadLogs3 && (earliestDate > leadLogs3.createdAt)){
                    earliestDate = leadLogs3.createdAt
                }
            }
            else if (leadLogs3){
                // console.log(leadLogs3.createdAt)
                earliestDate = leadLogs3.createdAt
            }
            // if (leadLogs1 && leadLogs2 && leadLogs3){
            //     console.log(leadLogs1.createdAt,"1")
            //     console.log(leadLogs2.createdAt,"2")
            //     console.log(leadLogs3.createdAt,"3")

            //     if((leadLogs1.createdAt < leadLogs2.createdAt) && (leadLogs1.createdAt < leadLogs3.createdAt)){
            //         console.log("1 is earliest")
            //     }
            //     else if ((leadLogs2.createdAt < leadLogs1.createdAt) && (leadLogs2.createdAt < leadLogs3.createdAt)){
            //         console.log("2 is earliest")
            //     }
            //     else if ((leadLogs2.createdAt > leadLogs3.createdAt) && (leadLogs1.createdAt > leadLogs3.createdAt)){
            //         console.log("3 is earliest")
            //     }
            // }
            if (earliestDate){
                leads[i].salesMeetingDone = true
                leads[i].meetingWithCustomer.meetingType = "Office Meet"
                leads[i].meetingWithCustomer.meetingDate = earliestDate
                await leads[i].save();
                console.log("done")
                count++;
            }
        }
        console.log(count,"count")
        console.log(leads.length)
        res.status(200).send("Done")
    } catch (error) {
        console.log('error', error)
    }

})

router.get('/createXLSXsalesWon', async (req, res) => {
    try {
        let leads = await Lead.find({})
        console.log(leads.length)
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet('Data')
        worksheet.columns = [
            { header: 'Lead No', key: 'leadno' },
            { header: 'Department', key: 'dep' },
            { header: 'Sales Stage', key: 'ss' },
            { header: 'Owner ', key: 'own' },
            { header: 'Meeting Done?', key: 'mdone' },
            { header: 'Meeting Date', key: 'md' },
            { header: 'Meeting Type', key: 'mt' },
            { header: 'Site/Office Visit Date', key: 'sod' },
            { header: 'Negotiation Date', key: 'negda' },
            { header: 'Won Date', key: 'woda' },
        ]
        let doc = []
        for(let i=0;i<leads.length;i++){
            console.log(i)
            let obj = {}
            obj.leadno = leads[i].lead_no
            obj.woda = leads[i].leadWonDate
            let depppp = await Department.findOne({_id:leads[i].departmentId})
            if (depppp){
                obj.dep = depppp.name
            }
            obj.ss = leads[i].salesStage
            let assnto = await User.findOne({_id:leads[i].assignTo})
            if (assnto){
                obj.own = assnto.name
            }
            obj.mdone = leads[i].salesMeetingDone
            obj.md = leads[i].meetingWithCustomer.meetingDate
            obj.mt = leads[i].meetingWithCustomer.meetingType
            let leadLogs1 = await LeadLogs.findOne({leadId:leads[i]._id,stage:"Site/Office visit"})
            let leadLogs2 = await LeadLogs.findOne({leadId:leads[i]._id,stage:"Negotiation"})
            if (leadLogs1){
                obj.sod = leadLogs1.createdAt
            }
            if (leadLogs2){
                obj.negda = leadLogs2.createdAt
            }
            doc.push(obj)
        }
        doc.forEach((e, index) => {
            worksheet.addRow({
                ...e
            })
        })
        await workbook.xlsx.writeFile('Lead Sales Data.xlsx')
        console.log(leads.length)
        res.status(200).send("Done")
    } catch (error) {
        console.log('error', error)
    }

})

router.get('/leadIdMatch', async (req, res) => {
    try {
        let filePath = '';
        filePath = path.join(__dirname, '../../PostDesign.xlsx'); // Customers
        // filePath = path.join(__dirname, '../../14_7_lead_1.xlsx'); // Leads
        // filePath = path.join(__dirname, '../../1_leadLogsDetails.xlsx'); // Leads Logs
        filePath = filePath.replace(new RegExp(/\\/g), '/');
        let workbook = XLSX.readFile(filePath);
        let sheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[sheetName];
        let jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        for(let i=2;i<141;i++){
            console.log(i)
            let lead = await Lead.findOne({ erpProjectNo: jsonRows[i][0] })
            let designSignOffDateString = jsonRows[i][4]
            let designSignOffDateee = jsonRows[i][5]
            let IMOStofactoryDateString = jsonRows[i][6]
            let IMOStofactoryDate = jsonRows[i][7]
            let MaterialDispatchDateString = jsonRows[i][8]
            let MaterialDispatchDate = jsonRows[i][9]
            let ContractDays = jsonRows[i][10]
            if(lead){
                if(designSignOffDateee){
                    if (lead.designSignOffDate){}
                    else{
                        lead.designSignOffDate = moment(designSignOffDateString).format()
                    }
                }
                await lead.save();
            }
        }
        res.send("Done")
    } catch (error) {
        console.log('error', error)
    }
})

router.post('/', async (req, res) => {
    try {
        let filePath = '';
        filePath = path.join(__dirname, '../../14_7Customer_1.xlsx'); // Customers
        // filePath = path.join(__dirname, '../../14_7_lead_1.xlsx'); // Leads
        // filePath = path.join(__dirname, '../../1_leadLogsDetails.xlsx'); // Leads Logs
        filePath = filePath.replace(new RegExp(/\\/g), '/');
        let workbook = XLSX.readFile(filePath);
        let sheetName = workbook.SheetNames[0];
        console.log('sheetName: ', sheetName)
        let worksheet = workbook.Sheets[sheetName];
        let jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const fedJson = jsonRows.slice(1, 2841);
        // updatePrice(fedJson)
        // tagRateCard(fedJson)
        // addRateCard(fedJson)
        await addCustomers(jsonRows)
        // await addDepartments(fedJson)
        // await addTeams(fedJson)
        // await addUsers(fedJson)
        // await formatData(fedJson)
        // await addLeads(jsonRows)
        // await addLeadsLogs(jsonRows)
        // tagProductMaster(fedJson)
        // addFinish(fedJson)
        // addPly(fedJson)
        res.send()
    } catch (error) {
        console.log('error', error)
    }

})

const addPly = function (rows) {
    return new Promise((resolve, reject) => {

        async.each(rows, async column => {
            try {
                let finish = new PlyTypeMaster({
                    name: column[0],
                    isActive: true,
                    pricePerUnit: column[3],
                    description: column[0]

                })
                await finish.save()
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) return err
            return console.log('done')
        })
    })
}
const addFinish = function (rows) {
    return new Promise((resolve, reject) => {

        async.each(rows, async column => {
            try {
                let finish = new FinishTypeMaster({
                    name: column[0],
                    unitId: '5ca989cc4585958841722acd',
                    isActive: true,
                    pricePerUnit: column[3],
                    description: column[0]

                })
                await finish.save()
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) return err
            return console.log('done')
        })
    })
}

const updatePrice = function (rows) {
    return new Promise((resolve, reject) => {
        async.each(rows, async column => {
            try {
                const product = await ProductMaster.findOne({ name: column[0] })
                let bangalreRateCardId = '628335b607039cd989540484'; // Bangalore Rate Card Master Id
                let hyderbadRaateCardId = '62833656a4e1ddd9eb7c2775'; // Hyderabad Rate Card Master Id
                // Below line change the rateCardMasterId key value based on the location rate card apply
                await OrgRateCard.updateMany({ itemId: product._id, rateCardMasterId: bangalreRateCardId }, { $set: { rate: column[6] ? column[6] : 0 } })
            } catch (error) {
                console.log(erorr)
            }
        }, err => {
            if (err) console.log(err)
            console.log("done")
        })
    })
}

const tagProductMaster = function (rows) {
    return new Promise((resolve, reject) => {
        async.each(rows, async column => {
            const product = await ProductMaster.findOne({ name: column[0] })
            let unitId
            switch (column[2]) {
                case "Carpentry":
                case "Modular":
                    unitId = '5ca989cc4585958841722acd'
                    break
                case "Hardware":
                case "Procurement_Others":
                case "Services":
                    unitId = '61338464b421454b9dd7d86c'
                    break
                default:
                    break

            }
            if (product) {
                product.description = column[1]
                product.scopeId = await Scope.findOne({ name: column[2] })
                product.unitId = unitId
                product.subUnitType = column[4]
                product.isActive = true
                product.pricePerUnit = column[5]
                product.newpricePerUnit = column[6]
                product.priority = column[7]
                product.finishInclude = column[8]
                product.plyInclude = column[9]
                await product.save()
            } else {
                const newProduct = new ProductMaster({
                    code: column[0],
                    name: column[0],
                    description: column[1],
                    subUnitType: column[4],
                    pricePerUnit: column[5],
                    newpricePerUnit: column[6],
                    priority: column[7],
                    finishInclude: column[8],
                    plyInclude: column[9],
                    unitId: unitId,
                    isActive: true,
                    scopeId: await Scope.findOne({ name: column[2] })
                })
                console.log('Not Found', column[0], newProduct)
                await newProduct.save(err => console.log(err))
            }

        }, err => {
            if (err) console.log(err)
            console.log('done')
        })
    })
}

const addLeads = function (rows) {
    return new Promise((resolve, reject) => {
        const updatedNewLeads = [];
        async.each(rows, async column => {
            try {
                const customer = await Customer.findOne({ name: column[12], customer_no: Number(column[11]) }).select('_id')
                const createdBy = await User.findOne({ name: column[15] }).select('_id name')
                const assignTo = await User.findOne({ name: column[28] }).select('_id')
                const departmentId = await Department.findOne({ name: column[32] }).select('_id name')
                const teamId = await Team.findOne({ name: column[30] }).select('_id')
                const sourceOfLeadMasterId = await SourceOfLeadMaster.findOne({name: column[24]}).select('_id')
                const newLead = new Lead({
                    discountOnAllScopes: column[0],
                    leadStatus: column[1],
                    salesStage: column[2],
                    designStages: column[3],
                    discountPercent: column[4],
                    taxPercent: column[5],
                    grandTotal: column[6],
                    totalCustomerOutflow: column[7],
                    lead_no: column[9],
                    customerId: customer && customer._id,
                    projectType: column[13],
                    createdBy: createdBy && createdBy._id,
                    address: column[16],
                    area: column[17],
                    // city: column[17],
                    floorPlan: column[20],
                    propertyType: column[21],
                    scopeOfWork: column[22],
                    sourceOfLead: sourceOfLeadMasterId._id,
                    startInteriors: column[25],
                    leadType: column[26],
                    assignTo: assignTo && assignTo._id,
                    teamId: teamId && teamId._id,
                    departmentId: departmentId && departmentId._id,
                    createdAt: column[33],
                    previouslyAssignedTo: [createdBy && createdBy._id],
                    experienceCenterId: '61e7fcd79905175441887eb9',
                    city: '61e7faac331230532d894dbf',
                    status: "Lead Received",
                    isRegistered: "Yes",
                    designerAssigned : departmentId && departmentId.name === 'Design' ? true : false,
                    designHeadAssigned : departmentId && departmentId.name === 'Design' ? true : false,
                    salesExecutiveApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                    salesManagerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                    customerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                    finanaceManagerApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                    centerHeadApproved: [{ status: 'Approval Not Initiated', isApproved: false }],
                    businessHeadApproved: [{ status: 'Approval Not Initiated', isApproved: false }]
                })
                await newLead.save();
                await leadService.assignRatesToLead(newLead._id, '5cb8a71c7acd1e053a3682ac', '61e7faac331230532d894dbf') // To add the rate card for lead
                updatedNewLeads.push({lead_no: newLead.lead_no, _id: newLead._id, existingId: column[8]})
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) console.log(err)
            else {
                console.log(updatedNewLeads, "New Leads Id")
                console.log('done')
                resolve()
            }
        })
    })
}

const addLeadsLogs = function (rows) {
    return new Promise((resolve, reject) => {
        async.each(rows, async column => {
            try {
                const leadId = await Lead.findOne({ lead_no: column[3] }).select('_id')
                const createdBy = await User.findOne({ name: column[5] }).select('_id name')
                const newLeadLogs = new LeadLogs({
                    remark: column[0], 
                    notes: column[1],
                    leadId: leadId && leadId._id,
                    user: createdBy && createdBy._id,
                    createdBy: createdBy && createdBy._id,
                    stage: column[6],
                    reminderDate: column[7],
                    createdAt: column[8],
                    workingDrawingFile: column[9],
                    amount: column[10],
                    dealActivity: column[11],
                    closureDate: column[12],
                    clientMoveinDate: column[13],
                    salesCallDate:column[14],
                    requirements: column[15],
                    estimatedBudget: column[16],
                    salesCallComment: column[17],
                    nextFollowUpDate: column[18],
                    preSalesCallDate: column[19],
                    quotationSentDate: column[20],
                    momQuotationStage: column[21],
                    negotiationDate: column[23],
                    momNegotitationStage: column[24],
                    siteVisitDate: column[25],
                    momMeetingStage: column[26],
                    momSiteVisitStage: column[27]
                })
                console.log(newLeadLogs, 'newLeadLogs')
                await newLeadLogs.save()
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) console.log(err)
            else {
                console.log('done')
                resolve()
            }
        })
    })
}

const formatData = function (rows) {
    let customerArr = []
    let leadArr = []
    let userArr = []
    let departmentArr = []
    let teamArr = []
    let notFound = []
    return new Promise((resolve, reject) => {
        async.forEach(rows, async column => {
            const customer = await Customer.findOne({ name: column[0].toString() })
            if (customer) {
                if (customer) customerArr.push(customer)
                const lead = await Project.findOne({ project_no: column[1] }).populate('customerId team department createdBy assignTo')
                if (lead) leadArr.push(lead)
                else console.log(column[1], 'lead not found')
                const user = await User.findOne({ name: column[4] }).populate('team department')
                if (user) {
                    // console.log(!userArr.find(u => u._id.toString() === user._id.toString()))
                    if (userArr.length == 0 || !userArr.find(u => u._id.toString() === user._id.toString())) {
                        userArr.push(user)
                    }
                } else {
                    notFound.push({ userName: column[4], projectNo: column[1] })
                    console.log(column[4], "user not found", column[1])
                }
            } else {
                console.log(column[0], 'customer not found')
            }
        }, err => {
            if (err) console.log(err)
            else {
                console.log(userArr.length)
                async.each(userArr, async user => {
                    const dept = await Department.findOne({ _id: user.department }).populate('users teams', 'name')
                    if (dept) {
                        if ((departmentArr.length == 0 || !departmentArr.find(u => u._id.toString() === dept._id.toString()))) {
                            departmentArr.push(dept)
                        }
                    } else {
                        console.log(user, "dept not found")
                    }
                    const team = await Team.findOne({ _id: user.team }).populate('users manager departmentId', 'name')
                    if (team) {
                        if (teamArr.length == 0 || team && !teamArr.find(u => u._id.toString() === team._id.toString())) {
                            teamArr.push(team)
                        }
                    } else {
                        console.log(user, "team not found")
                    }
                }, err => {
                    if (err) console.log(err, "2")
                    else {
                        console.log(customerArr.length, leadArr.length, userArr.length, departmentArr.length, teamArr.length, notFound.length)
                        let customerFinalArray = []
                        let leadsFinalArray = []
                        let userFinalArray = []
                        let deptFinalArray = []
                        let teamFinalArray = []
                        customerArr.forEach(customer => {
                            customerFinalArray.push({ name: customer.name, email: customer.email, address: customer.address, isActive: customer.isActive, customer: customer.customer_no, contact: customer.contact_no, createdAt: customer.createdAt, updatedAt: customer.updatedAt })
                        })
                        leadArr.forEach(leads => {
                            leadsFinalArray.push({ leadNo: leads.project_no, customerName: leads.customerId.name, status: leads.status, stage: leads.stage, description: leads.description, projectType: leads.projectType, createdBy: leads.createdBy.name, assignTo: leads.assignTo.name, createdAt: leads.createdAt, updatedAt: leads.updatedAt, discountPercent: leads.discountPercent, grandTotal: leads.grandTotal, taxPercent: leads.taxPercent, department: leads.department.name, team: leads.team.name, totalCustomerOutflow: leads.totalCustomerOutflow, discountOnAllScopes: leads.discountOnAllScopes })
                        })
                        userArr.forEach(user => {
                            userFinalArray.push({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, contact_no: user.contact_no, role: user.role, team: user.team.name, department: user.department.name })
                        })
                        departmentArr.forEach(dept => {
                            deptFinalArray.push({ name: dept.name, stage: dept.stages.join(','), users: dept.users.map(user => user.name).join(','), team: dept.teams.map(team => team.name).join(',') })
                        })
                        teamArr.forEach(team => {
                            teamFinalArray.push({ name: team.name, users: team.users.map(user => user.name).join(','), manager: team.manager.name, departmentId: team.departmentId.name })
                        })
                        fs.writeFile('customerArr8520.json', JSON.stringify(customerFinalArray), (err, aaa) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                        fs.writeFile('leadArr8520.json', JSON.stringify(leadsFinalArray), (err, aaa) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                        fs.writeFile('userArr8520.json', JSON.stringify(userFinalArray), (err, aaa) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                        fs.writeFile('departmentArr8520.json', JSON.stringify(deptFinalArray), (err, aaa) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                        fs.writeFile('teamArr8520.json', JSON.stringify(teamFinalArray), (err, aaa) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                        resolve()
                    }
                })
            }
        })
    })
}

const addDepartments = function (rows) {
    return new Promise((resolve, reject) => {
        async.each(rows, async column => {
            try {
                const isExists = await Department.findOne({ name: column[0] })
                if (!isExists) {
                    let stages = column[1] != "" ? column[1].split(',') : []
                    console.log(stages, "stages")
                    let userList = column[1].split(',')
                    const userArr = []
                    for (let i = 0; i < userList.length; i++) {
                        const user = await User.findOne({ name: userList[i] }).select('_id')
                        if (user) userArr.push(user)
                    }
                    const newDept = new Department({
                        name: column[0],
                        stages: stages,
                        users: userArr
                    })
                    await newDept.save()
                } else {
                    console.log('Department exsits', column[0])
                    isExists.stages = column[1] != "" ? column[1].split(',') : []
                    let userList = column[1].split(',')
                    for (let i = 0; i < userList.length; i++) {
                        const user = await User.findOne({ name: userList[i] }).select('_id')
                        if (user) isExists.users.push(user)
                    }
                    isExists.users = isExists.users.filter(function (item, pos, self) {
                        return self.indexOf(item) == pos;
                    })
                    await isExists.save()
                }
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) console.log(err)
            else {
                console.log('done')
                resolve()
            }
        })
    })
}
const addUsers = function (rows) {
    return new Promise((resolve, reject) => {
        async.each(rows, async (column) => {
            try {
                const isExists = await User.findOne({ email: column[1] })
                if (!isExists) {
                    let dept = {}
                    let team = {}
                    dept = await Department.findOne({ name: column[3] }).select('_id')
                    if (!dept) {
                        let newDept = new Department({
                            name: column[3],
                            stages: []
                        })
                        dept = await newDept.save()
                    }
                    team = await Team.findOne({ name: column[2] }).select('_id')
                    if (!team) {
                        let newTeam = new Team({
                            name: column[2],
                            departmentId: dept._id
                        })
                        team = await newTeam.save()
                    }
                    const newUser = new User({
                        name: column[0],
                        email: column[1],
                        roles: ['61497e57c2baba5065def856'],
                        locationId: ['61e7faac331230532d894dbf'],
                        experienceCenterId: ['61e7fcd79905175441887eb9'],
                        mobile: '0000000000',
                        departmentId: dept,
                        team: team,
                        "hashed_password": "ba54bb84e4840c6c361c06775e97f37920eac152",
                        "salt": "1154206317264",
                        "orgId": "5cb8a71c7acd1e053a3682ac",
                    })
                    let user = await newUser.save()
                    await Team.findByIdAndUpdate(team._id, { $addToSet: { users: user } })
                    await Department.findByIdAndUpdate(dept._id, { $addToSet: { users: user, teams: team } })
                } else {
                    console.log('user already exists', column[0])
                    let dept = {}
                    let team = {}
                    dept = await Department.findOne({ name: column[3] }).select('_id')
                    if (!dept) {
                        let newDept = new Department({
                            name: column[3],
                            stages: []
                        })
                        dept = await newDept.save()
                    }
                    team = await Team.findOne({ name: column[2] }).select('_id')
                    if (!team) {
                        let newTeam = new Team({
                            name: column[2],
                            departmentId: dept._id
                        })
                        team = await newTeam.save()
                    }
                    isExists.departmentId = dept
                    isExists.teamId = team
                    await isExists.save()
                }
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) console.log(err)
            console.log('done')
            resolve()
        })
    })
}

const addTeams = async function (rows) {
    const department = await Department.find({})
    return new Promise((resolve, reject) => {
        async.each(rows, async (column) => {
            try {
                const isExists = await Team.findOne({ name: column[0] })
                if (!isExists) {
                    let userList = column[1].split(',')
                    const userArr = []
                    for (let i = 0; i < userList.length; i++) {
                        const user = await User.findOne({ name: userList[i] }).select('_id')
                        if (user) userArr.push(user)
                    }
                    const manager = await User.findOne({ name: column[2] }).select('_id')
                    let newTeam = new Team({
                        name: column[0],
                        departmentId: department.find(d => d.name.toString() == column[3].toString()),
                        users: userArr,
                        isActive: true,
                        manager: manager
                    })
                    await newTeam.save()
                } else {
                    let userList = column[1].split(',')
                    for (let i = 0; i < userList.length; i++) {
                        const user = await User.findOne({ name: userList[i] }).select('_id')
                        if (user) isExists.users.push(user)
                    }
                    const manager = await User.findOne({ name: column[2] }).select('_id')
                    isExists.manager = manager
                    isExists.departmentId = department.find(d => d.name.toString() == column[3].toString())
                    isExists.users = isExists.users.filter(function (item, pos, self) {
                        return self.indexOf(item) == pos;
                    })
                    await isExists.save()
                }
            } catch (error) {
                console.log(error)
            }
        }, err => {
            if (err) console.log(err)
            console.log('done')
            resolve()
        })
    })
}


const addCustomers = function (rows) {
    return new Promise((resolve, reject) => {
        async.each(rows, async (column) => {
            try {
                const prevCust = await Customer.findOne({ name: column[0], customer_no: column[4] })
                if (!prevCust) {
                    const newCustomer = new Customer({
                        name: column[5],
                        email: column[0],
                        address: column[1],
                        isActive: column[2],
                        customer_no: column[4],
                        contact_no: column[6],
                        createdAt: column[7]
                    })
                    await newCustomer.save()
                    console.log(newCustomer, 'newCustomer')
                } else {
                    console.log('Customer exists', column[0])
                }
            } catch (error) {
                console.log(error)
            }
        })
    }, (err) => {
        if (err) console.log(err)
        console.log('done')
        resolve('done')
    })
}

const tagRateCard = async function (rows) {
    // const finishTypeMaster = await FinishTypeMaster.find({ isActive: true })
    const plyTypeMaster = await PlyTypeMaster.find({ isActive: true })
    const defaultRateCard = await RateCardMaster.findOne({ isDefault: true, locationId: "61e7faac331230532d894dbf", orgId: "5cb8a71c7acd1e053a3682ac" })
    const newOrgRateCardList = []
    return new Promise((resolve, reject) => {
        async.each(plyTypeMaster, async (product) => {
            try {
                const newOrgRateCard = new OrgRateCard({
                    rateCardMasterId: defaultRateCard._id,
                    itemId: product._id,
                    docType: "PlyTypeMaster",
                    rate: product.pricePerUnit,
                    isActive: true
                })
                newOrgRateCardList.push(newOrgRateCard)
            } catch (error) {
                console.log(error)
            }
        }, async err => {
            if (err) console.log(err)
            else {
                try {
                    console.log(newOrgRateCardList.length)
                    await OrgRateCard.insertMany(newOrgRateCardList)
                } catch (error) {
                    console.log(error)
                }
            }
        })
    })
}

const addRateCard = function (rows) {
    return new Promise((resolve, reject) => {
        const newOrgRateCardList = []
        async.each(rows, async function (column, callback) {
            try {
                const product = await ProductMaster.findOne({ code: column[5] })
                if (!product) {
                    const newProduct = new ProductMaster({
                        code: column[5],
                        name: column[6],
                        description: column[7],
                        subUnitType: "Area",
                        pricePerUnit: column[8],
                        unit: '5ca989cc4585958841722acd'
                    })
                    await newProduct.save()
                }
            } catch (error) {
                console.log(error)
            }
        }, async err => {
            if (err) console.log(err)
            else {
                let newRateCardMaster = {}
                try {
                    await RateCardMaster.findOneAndUpdate({ locationId: '61e7faac331230532d894dbf' }, { $set: { isDefault: false } })
                    newRateCardMaster = new RateCardMaster({
                        orgId: '5cb8a71c7acd1e053a3682ac',
                        locationId: '61e7faac331230532d894dbf',
                        rateCardCode: 'DPB0001',
                        isDefault: true,
                        createdBy: '6253d16d59e133b2384c5d98'
                    })
                    await newRateCardMaster.save()


                } catch (error) {
                    console.log(error)
                }
                const productList = await ProductMaster.find({})
                async.each(rows, async column => {
                    try {
                        // console.log(column[5], "12")
                        const product = await productList.find(p => p.code == column[5])
                        const newOrgRateCard = new OrgRateCard({
                            rateCardMasterId: newRateCardMaster._id,
                            itemId: product._id,
                            docType: "ProductMaster",
                            rate: column[8],
                            isActive: true
                        })
                        newOrgRateCardList.push(newOrgRateCard)

                    } catch (error) {
                        console.log(error, column[5], productList.length, productList.find(p => p.code == column[5]))
                    }
                }, async err => {
                    if (err) console.log(err)
                    else {
                        try {
                            console.log(newOrgRateCardList.length)
                            await OrgRateCard.insertMany(newOrgRateCardList)
                        } catch (error) {
                            console.log(error)
                        }
                    }
                })
            }
        })
    })
}



router.get('/get_product_masters', async (req, res) => {
    try {
        const response = await ProductMaster.find({}).populate('scope unit')
        // const response = await FinishTypeMaster.find({}).populate('scopeId unit')
        // const response = await PlyTypeMaster.find({})
        let finalArray = []
        response.forEach(product => {
            finalArray.push({ name: product.name, description: product.description, scope: product.scope.name ? product.scope.name : "null", unitId: product.unit.name ? product.unit.name : "null", subUnitType: product.subUnitType, pricePerUnit: product.pricePerUnit, newpricePerUnit: product.newpricePerUnit, priority: product.priority, finishInclude: product.finishInclude, plyInclude: product.plyInclude })
        })
        fs.writeFile('ProductMaster.json', JSON.stringify(finalArray), (err, aaa) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });
        return res.status(200).send()
    } catch (error) {
        console.log(error)
        return res.status(400).json('bad request')
    }
})

router.get('/get-project-related-data', async (req, res) => {
    try {
        const response = await Project.find({})
            .populate('customerId department team createdBy')
            .populate({ path: 'createdBy', populate: 'department team' })
            .populate({ path: 'createdBy', populate: { path: 'team', populate: 'manager' } })
        let finalArray = []
        response.forEach(project => {
            finalArray.push({ projectNumber: project.project_no, status: project.status, stage: project.stage, description: project.description, projectType: project.projectType, customerName: project.customerId.name, customerEmail: project.customerId.email, customerAddress: project.customerId.address, customerContact: project.customerId.contact_no, customerNumber: project.customerId.customer_no, discountPercent: project.discountPercent, grandTotal: project.project.grandTotal, taxPercent: project.taxPercent, totalCustomerOutflow: project.totalCustomerOutflow, materialProcuredPercent: project.materialProcuredPercent, discountOnAllScopes: project.discountOnAllScopes, createdByName: project.createdBy.name, createdByEmail: project.createdBy.email, createdByContact: project.createdBy.contact_no, createdByRole: project.createdBy.role, createdByDepartmentName: project.createdBy.department.name, createdByTeam: project.createdBy.team.name, createdByTeamManagerName: project.createdBy.team.manager.name, createdByTeamManagerEmail: project.createdBy.team.manager.email, createdByTeamManagerContact: project.createdBy.team.manager.contact_no, createdByTeamManagerRole: project.createdBy.team.manager.role, departmentName: project.department.name, teamName: project.team.name })
        })
        fs.writeFile('Leads.json', JSON.stringify(finalArray), (err, aaa) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });
        return res.status(200).send()
    } catch (error) {
        console.log(error)
        return res.status(400).json('bad request')
    }
})

router.get('/update_project_rate_card', async (req, res) => {
    try {
        const lead_number = 100942.1
        const lead = await Lead.findOne({lead_no:lead_number})
        const deleteCurrentRC = await ProjectRateCardMaster.deleteOne({leadId:lead._id})
        const oldRateCard = await RateCardMaster.findOne({ rateCardCode:"OLD001"})
        const defaultOrgRateCards = await OrgRateCard.find({ rateCardMasterId: oldRateCard._id })
        let obj = {
            leadId:lead._id,
            rateCardId: oldRateCard._id,
            markUp: 0,
            projectRateCardCode: `${oldRateCard.rateCardCode}.1.1`
        }
        const projectRateCardMaster = new ProjectRateCardMaster(obj)
        await projectRateCardMaster.save()
        const projectRateCards = []
        async.forEach(defaultOrgRateCards, async (orgRate) => {
            let obj = {
                itemId: orgRate.itemId,
                rate: orgRate.rate,
                projectRCMasterId: projectRateCardMaster._id,
                docType: orgRate.docType
            }
            projectRateCards.push(obj)
        }, async (err) => {
            if (err) return new Error(err);
            else await ProjectRateCard.insertMany(projectRateCards)
        })
        console.log(projectRateCards.length,"ittems")
        return
    } catch (error) {
        console.log(error)
        return new Error(err)
    }
})

router.get('/update_quotations', async (req, res) => {
    try {
        const response = await ProjectComponent.find({})
        for(let r=0;r<response.length;r++){
            console.log(r)
            for(let i=0;i<response[r].products.length;i++){
                let productPricePerUnit1 = response[r].products[i].productPricePerUnit
                let area1 = response[r].products[i].area
                if (area1!=0){
                    response[r].products[i].productPrice = Number((productPricePerUnit1*area1).toFixed(2))
                }
            }
            response[r].save();
        }
        return
    } catch (error) {
        console.log(error)
        return new Error(err)
    }
})

router.get('/product-scopes', async (req, res) => {
    try {
        const response = await ProductMaster.find({})
            .populate('scope')
        let finalArr = []
        async.forEach(response, product => {
            finalArr.push({ name: product.name, code: product.code, scope: product.scope.name })
        })
        fs.writeFile('spacelerProducts.json', JSON.stringify(finalArr), (err, aaa) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });
    } catch (error) {

    }
})

router.put('/clone-project-rate-card', async (req, res) => {
    try {
        const response = await ProjectRateCard.find({ projectRCMasterId: "615c44090f8c0d3f0f39cf2f" })
        async.forEach(response, async rateCard => {
            delete rateCard.projectRCMasterId
            delete rateCard._id
            rateCard.projectRCMasterId = '61a49b9eeeb81c76b4b93dc6'
            const projectRateCard = new ProjectRateCard(rateCard)
            await rateCard.save()
        }, err => {
            console.log(err, "done")
        })
    } catch (error) {
        console.log(error)
    }
})

router.put('/migrate-to-rate-card', async (req, res) => {
    try {
        // const plys = await PlyTypeMaster.find()
        const finishTypeMaster = await FinishTypeMaster.find()
        const rateCardMaster = await RateCardMaster.findOne({ isDefault: true })
        async.forEach(finishTypeMaster, async finish => {
            let obj = {
                itemId: finish._id,
                rateCardMasterId: rateCardMaster._id,
                docType: "Finish",
                rate: finish.pricePerUnit
            }
            const data = new OrgRateCard(obj)
            await data.save()
        }, err => {
            if (err) console.log(err)
            return console.log('done')

        })
    } catch (error) {
        console.log(error)
        return res.status(400).json(error)

    }
})
router.put('/createFieldsourceOfLeadId', (req, res) => {
    // console.log("Kkkkk")
    let sourceList;
    SourceOfLeadMaster.find()
        .then(
            (sources) => {
                sourceList = sources;
                return Project.find({ sourceOfLead: { $exists: true } })
            }
        )
        .then(
            (projects) => {
                async.each(projects, function (project, callback) {
                    let findSource = sourceList.find((sr) => { return project.sourceOfLead == sr.name });
                    console.log(project.project_no, '<><><><>', findSource);
                    // callback()
                    Project.findByIdAndUpdate(
                        project._id,
                        { $set: { sourceOfLeadId: findSource._id } },
                        { upsert: true }
                    ).exec(function (err, response1) {
                        callback();
                    }
                    )
                }, (err) => {
                    console.log('done');
                });
            }
        ).catch((err) => {
            console.log(err);
        }
        )
})

router.put('/deptUserstoTeamUsers', (req, res) => {
    let deptName = req.body.deptName;
    let teamName = 'Sales 1 team';
    Department.find({ name: deptName })
        .select('users')
        .then((users) => {
            console.log(users, "uesrs");
            return Team.update({ name: teamName }, { $set: { users: users[0].users } });
        })
        .then((res) => {
            console.log("done");
        })

})


router.put('/addTeamInUsers', (req, res) => {
    User.find({})
        // .select('_id')
        .then((users) => {
            // console.log(users,"users");
            async.forEach(users, function (user, callback) {
                Team.find({ users: user._id }).exec(function (err, result) {
                    // console.log(result,"res");
                    if (result.length > 0) {
                        let token = User.generateToken({
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            department: user.department,
                            team: user.team
                        })
                        token
                            .then((token) => {
                                User.update({ _id: user._id }, { $set: { team: result[0]._id, token: token } }).exec(function (err, res) {
                                    console.log(res, "up");
                                    callback();
                                })
                            })
                        // console.log(token,"token");
                        // User.update({_id : user._id},{$set : {team : result[0]._id,token : token }}).exec(function(err,res){
                        //     console.log(res,"up");
                        //     callback();
                        // })

                    }

                })
            }, (err) => {
                if (err) {
                    console.log(err, "err");
                }
                console.log("done");
            })
        })
})


router.put('/addTeamInProjects', (req, res) => {
    Project.find({})
        .then((projects) => {
            async.forEach(projects, function (project, callback) {
                User.findOne({ _id: project.assignTo }).exec(function (err, res) {
                    if (res) {
                        Project.findOneAndUpdate({ _id: project._id }, { $set: { team: res.team, department: res.department } }).exec(function (err, result) {
                            console.log("result", result);
                        })
                    }
                })
            })

        })
})


router.get('/report', (req, res) => {
    let items = [];
    Snag.find({ scopeId: "5c758c406845e2094c335df7", createdAt: { $gte: '2020-01-01 00:00:00.000Z' } })
        // Snag.find({ scopeId: "5c758c406845e2094c335df7", projectNo: { $gte: 575 } })
        .populate('materials.logs.user', 'name')
        .populate('materials.unitType', 'name')
        .populate('materials.plyType', 'name')
        .populate('materials.finishType', 'name')
        .then((snags) => {
            console.log(snags, "snags");
            // return res.status(200).json(snags);
            snags.forEach((sn) => {
                sn.materials.forEach((material) => {
                    let item = {};
                    material.logs.forEach((log) => {

                        if (log.status == 'Approved') {

                            item.projectNo = sn.projectNo;
                            item.customerName = sn.customerName;

                            item.snagCode = sn.snagCode;
                            item.category = material.category ? material.category : "NA";
                            item.name = material.name ? material.name : "NA";
                            item.description = material.description ? material.description : "NA";
                            item.barcode = material.barcode ? material.barcode : "NA";
                            item.pieceName = material.pieceName ? material.pieceName : "NA";
                            item.size = material.size ? material.size : "NA";
                            item.length = material.length ? material.length : "NA";
                            item.breadth = material.breadth ? material.breadth : "NA";
                            item.thickness = material.thickness ? material.thickness : "NA";
                            item.dimension = material.dimension ? material.dimension : "NA";
                            item.color = material.color ? material.color : "NA";
                            item.spacename = material.spacename ? material.spacename : "NA";
                            item.unitType = material.unitType ? material.unitType.name : "NA";
                            item.plyType = material.plyType ? material.plyType.name : "NA";
                            item.finishType = material.finishType ? material.finishType.name : "NA";


                            item.expectedDeliveryDate = material.expectedDeliveryDate ? material.expectedDeliveryDate.toString() : "NA";
                            item.deliveryDate = material.deliveryDate ? material.deliveryDate.toString() : "NA";



                            item.description = sn.description;
                            item.itemName = material.itemname ? material.itemname : "NA";
                            item.reasonForChange = material.reasonForChange ? material.reasonForChange : "NA";
                            item.comment = log.comment;
                            item.approvalDate = log.date.toString();
                            item.approvalPerson = log.user.name;
                            // item.createdAt = sn.createdAt.toString().split('T')[0];
                            item.createdAt = sn.createdAt.toString();

                            items.push(item);
                        }
                    })



                })
            })
            return items;
        })
        .then((it) => {
            // console.log(it,"it");
            res.status(200).json(it);
        })
})




// Adding product code in Productmaster
router.post('/addProductCode', (req, res) => {
    ProductMaster.find()
        .select('code name')
        .then((productMasters) => {
            // res.json(productMasters);
            let code = 101;
            productMasters.forEach(productMaster => {
                productMaster.code = `P${code}`;
                productMaster.save();
                code++;
            })
            console.log('done');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
})

// router.get('/addProductCodeInComponent', (req, res) => {
//     ProjectComponent.find()
//         .select('products')
//         .lean()
//         .then((components) => {
//             // console.log(components,"components");
//             let productsArray = [];
//             let id = {};
//             async.each(components, function (com, callback) {
//                 id = com._id;
//                 // components.forEach((comps)=>{
//                 // let productsArray = [];
//                 async.each(com.products, function (product, callback) {

//                     // console.log(product, "prodid");
//                     ProductMaster.findById(product.product).lean().exec(function (err, res) {
//                         console.log(res, "res");
//                         // let productObj = {};
//                         // product['code'] = res.code;
//                         // console.log(product,"prods");
//                         // productsArray.push(product);
//                         // callback();
//                         ProjectComponent.update({"products.product" : product.product },{$set : {"products.$.code" : res.code}},{multi : true}).exec(function(err,resp){
//                             console.log(resp,"resp");
//                         })

//                     })
//                 }, (err) => {
//                     //  console.log(productsArray, "arr");
//                     // ProjectComponent.findByIdAndUpdate(com._id,{$set : {products : productsArray }}).exec(function(err,resp){
//                     //     console.log(resp,"resp");
//                     // });
//                     callback();
//                 })
//                 // callback();
//             }, (err) => {
//                 // console.log(productsArray, "arr");
//                 // let bs = new BsonArray(productsArray);
//                 // // ProjectComponent.update({_id : id},{$set : {products : bs }},{new : true}).exec(function(err,resp){
//                 // //         console.log(resp,"resp");
//                 // //     })
//                 // console.log('done');

//             })




//             // })
//         })
// })


//add code in projectcomponents query
router.get('/addProductCodeInComponent', (req, res) => {
    ProductMaster.find()
        .select('code')
        .then((pm) => {
            // console.log(pm,"pms");
            async.each(pm, function (mastercode, callback) {
                // console.log(mastercode,"ms");
                ProjectComponent.update({ "products.product": mastercode._id }, { $set: { "products.$.code": mastercode.code } }, { multi: true }).exec(function (err, res) {
                    console.log(res, "res");
                    callback();
                })
            }, (err) => {
                console.log('done');
            })
        })
})


//add code in quotation projectcomponents products
router.get('/addCodeInQuotationComponent', (req, res) => {
    ProductMaster.find()
        .select('code')
        .then((pm) => {
            async.each(pm, function (mastercode, callback) {
                // console.log(mastercode, "ms");

                // Quotation.update({ "components.products.product": mastercode._id }, { $set: { "components.$[].products.$[].code": mastercode.code } },{ "arrayFilters": [
                //     {  },
                //     { "inner.product": mastercode._id }
                // ] }, { multi: true })
                Quotation.update({ "components.products.product": mastercode._id },
                    { $set: { "components.$[].products.$[inner].code": mastercode.code } },
                    { "arrayFilters": [{ "inner.product": mastercode._id }] })

                    //For mongodb <3.4
                    // Quotation.update({ "components.products.product": mastercode._id },
                    // { $set: { "components.0.products.$.code": mastercode.code } },
                    // {multi : true})

                    .exec(function (err, res) {

                        console.log(res, "res");
                        callback();
                    }, (err) => {

                    })
            }, (err) => {
                console.log('done');
            })
        })
})


//Add priority field in projectcomponent
router.get('/edit/editPriority', (req, res) => {
    ProjectComponent.find({})
        .then(data => {
            async.each(data, function (projectComponentId, callback) {
                ProjectComponentMaster.find({ _id: projectComponentId.projectComponent }, { priority: 1, name: 1, _id: 0 })
                    .then((prior) => {
                        ProjectComponent.update({ _id: projectComponentId }, { $set: { priority: prior[0].priority } })
                            .then(() => {
                                callback();
                            })
                            .catch(error => {
                                callback();
                            });
                    })
                    .catch(err => {
                        console.log("error for", err);
                    })
            }, (err) => {
                if (err) {
                    console.log(err, "err");
                }
                console.log("done");
            });
        })
});




router.post('/leadReport', (req, res) => {
    console.log("inside", req.body);
    let startDate = new Date(req.body.fromDate);
    let endDate = new Date(req.body.toDate);
    let query = {};
    if (req.body.status && req.body.leadStatus) {
        console.log("1st");
        query = [
            { $match: { $and: [{ createdAt: { $gte: startDate, $lte: endDate } }, { status: req.body.status }, { leadStatus: req.body.leadStatus }] } },
            { $lookup: { from: 'users', localField: 'assignTo', foreignField: '_id', as: 'assignTo' } },
            { $unwind: '$assignTo' },
            { $project: { customerName: 1, leadStatus: 1, status: 1, remark: 1, createdAt: 1, contact_no: 1, estimatedBudget: 1, 'assignTo.name': 1 } },
            // {$lookup : {from : 'users',foreignKey: ''}},
            // {$project : { lead : }}
            // { status: req.body.status }, { leadStatus: req.body.leadStatus }] } },
            // { $group: { _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } } } },
            // { $sort: { _id: 1 } }
        ]
    } else if (req.body.status) {
        console.log("2nd");
        query = [{ $match: { $and: [{ createdAt: { $gte: startDate, $lte: endDate } }, { status: req.body.status }] } },
        { $lookup: { from: 'users', localField: 'assignTo', foreignField: '_id', as: 'assignTo' } },
        { $unwind: '$assignTo' },
        { $project: { customerName: 1, leadStatus: 1, status: 1, remark: 1, createdAt: 1, contact_no: 1, estimatedBudget: 1, 'assignTo.name': 1 } },

        ]
    } else {
        console.log("3rd");
        query = [
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $lookup: { from: 'users', localField: 'assignTo', foreignField: '_id', as: 'assignTo' } },
            { $unwind: '$assignTo' },
            { $project: { customerName: 1, leadStatus: 1, status: 1, remark: 1, createdAt: 1, contact_no: 1, estimatedBudget: 1, 'assignTo.name': 1 } },

        ]
    }


    Lead.aggregate(query)
        .then((leads) => {
            if (!leads) throw new Error('No lead found');
            console.log(leads, "leads");
            res.status(200).json(leads);
        })
        .catch((err) => {
            // console.log(err);
            res.status(400).send(err)
        });
})




router.get('/setDefaultPly', (req, res) => {
    PlyTypeMaster.updateMany({}, { $set: { setDefaultPly: false } })
        .then(() => {
            console.log("done");
        })
})




router.put('/addCustomerOutFlow', (req, res) => {
    Project.find({})
        // .select('_id')
        .then((projs) => {

            // console.log(projs, "id");
            async.each(projs, function (eachProject, callback) {
                Quotation.findOne({ projectId: eachProject._id }).sort({ createdAt: -1 }).limit(1).exec(function (err, quotation) {
                    // console.log(quotation, "response");
                    if (quotation) {
                        let grandTotal = 0;
                        let subTotal = 0;
                        let taxAmount = 0;
                        let discountAmount = 0;
                        let tempSubtotal = 0;

                        if (quotation.discountPercent) {
                            tempSubtotal = ((quotation.totalAmount * (100 - quotation.discountPercent)) / 100);

                            if (quotation.miscellaneousComponent) {
                                quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
                                discountAmount = (quotation.totalAmount * ((quotation.discountPercent)) / 100);
                                taxAmount = (quotation.totalAmount - discountAmount) * (quotation.taxPercent / 100);
                                subTotal = quotation.totalAmount + taxAmount - discountAmount;
                                // tempSubtotal = (quotation.totalAmount*(100- quotation.discountPercent)/100);
                                grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                            } else {
                                discountAmount = (quotation.totalAmount * ((quotation.discountPercent)) / 100);
                                taxAmount = (quotation.totalAmount - discountAmount) * (quotation.taxPercent / 100);
                                grandTotal = quotation.totalAmount + taxAmount - discountAmount;
                            }
                            // tempSubtotal = (quotation.totalAmount*(100- quotation.discountPercent)/100);


                            quotation.discountAmount = parseInt(discountAmount);
                        } else {
                            tempSubtotal = quotation.totalAmount;
                            if (quotation.miscellaneousComponent) {
                                quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
                                taxAmount = quotation.totalAmount * (quotation.taxPercent / 100);
                                subTotal = quotation.totalAmount + taxAmount;
                                grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                            } else {
                                taxAmount = quotation.totalAmount * (quotation.taxPercent / 100);
                                grandTotal = quotation.totalAmount + taxAmount;
                            }
                            // tempSubtotal = quotation.totalAmount;
                        }
                        // console.log(tempSubtotal,"tempyyyyy");
                        quotation.tempSt = parseInt(tempSubtotal.toFixed(0));
                        quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
                        quotation.subTotal = parseInt(subTotal.toFixed(0));
                        quotation.customerToBeProcured = parseInt((tempSubtotal * quotation.materialProcured) / 100);
                        quotation.decorpotScope = parseInt(quotation.tempSt - quotation.customerToBeProcured);
                        quotation.grandTotal = parseInt(grandTotal.toFixed(0));
                        quotation.taxAmount = parseInt(taxAmount.toFixed(0));
                        quotation.gstValue = parseInt(quotation.decorpotScope * 0.18);
                        let mainTotal = 0;
                        quotation.finalTotal = parseInt(quotation.grandTotal + quotation.customerToBeProcured);
                        if (quotation.miscellaneousComponent) {
                            quotation.mainTotal = quotation.decorpotScope + quotation.gstValue + quotation.miscellaneousComponent.componentPrice;
                        } else {
                            quotation.mainTotal = quotation.decorpotScope + quotation.gstValue;
                        }
                        quotation.customerOutFlow = quotation.mainTotal + quotation.customerToBeProcured;
                        // eachProject.totalCustomerOutflow = quotation.customerOutFlow;
                        // eachProject.materialProcuredPercent = quotation.materialProcured;
                        // eachProject.save();
                        Project.findByIdAndUpdate(eachProject._id, { $set: { totalCustomerOutflow: quotation.customerOutFlow, materialProcuredPercent: quotation.materialProcured } }, { new: true }).exec(function (err, updated) {
                            console.log(updated, "updated");
                        })
                    }

                })
            }, (err) => {
                console.log("done");
            })
        })

})

router.put('/addCustomerOutflowInQuotation', (req, res) => {
    Quotation.find({})
        .then((quots) => {
            console.log(quots, "ooooo")
            // quots.totalCustomerOutflow = quots.grandTotal;
            // quots.save();
            async.each(quots, function (quo, callback) {
                // console.log(mastercode,"ms");
                Quotation.update({ _id: quo._id }, { $set: { "totalCustomerOutflow": quo.grandTotal } }, { multi: true }).exec(function (err, res) {
                    console.log(res, "res");
                    callback();
                })
            }, (err) => {
                console.log('done');
            })
        })
})

router.get('/getAllItemsWithPrice', (req, res) => {
    console.log('HIT')
    ProductMaster.find()
        .select('code name newpricePerUnit')
        .then((productMasters) => {
            fs.writeFile('itemWithPrice.json', JSON.stringify(productMasters), (err, aaa) => {
                if (err) throw err;
                console.log('The file has been saved!');
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
})

router.get('/updateErpProjectNumbers',async (req,res)=>
{

    let filePath = '';
    filePath = path.join(__dirname, '../Data123.xlsx');
    filePath = filePath.replace(new RegExp(/\\/g), '/');

    let workbook = XLSX.readFile(filePath);
    let sheetName = workbook.SheetNames[1];
    let worksheet = workbook.Sheets[sheetName];
    let jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    for(let i = 1;i < 274;i++){
        let id = jsonRows[i][0]
        let project_no = jsonRows[i][4]
        console.log(i, "iii")
        await Lead.findByIdAndUpdate(id, { $set: { erpProjectNo: project_no } })  
    }
})

router.get('/updateItemScopeNewPrice', async (req, res) => {
    console.log("HIT");
    let filePath = '';
    filePath = path.join(__dirname, '../AugUpdateDecoPrice.xlsx');
    filePath = filePath.replace(new RegExp(/\\/g), '/');

    let workbook = XLSX.readFile(filePath);
    let sheetName = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[sheetName];
    let jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    const products = await ProductMaster.find();
    //const scopes = await Scope.find();

    jsonRows.forEach(column => {
        const product = products.find(o => o.code == column[3].toString().trim());
        //const scope = scopes.find( o => o.name == column[2].toString().trim());
        if (product) {
            //product.scope = scope._id;
            product.newpricePerUnit = Number(column[7].toString().trim())
            product.save(err => {
                if (err) throw new Error(err);
            })
            console.log('product: ', product);
        }
        else {
            //console.log('item missing: ',column[3].toString().trim())
        }
    })

    /*ProductMaster.find({})
        .then((products) => {
            async.each(products, function (pro, callback) {
                // console.log(mastercode,"ms");
                ProductMaster.update({ _id: pro._id }, { $set: { "pricePerUnit": ((pro.pricePerUnit) * 112) / 100 } }, { multi: true }).exec(function (err, res) {
                    console.log(res, "res");
                    callback();
                })
            }, (err) => {
                console.log('done');
            })
        })*/
})


router.put('/priceIncrease', (req, res) => {
    ProductMaster.find({})
        .then((products) => {
            console.log(products, "pro");
            async.each(products, function (pro, callback) {
                // console.log(mastercode,"ms");
                ProductMaster.update({ _id: pro._id }, { $set: { "pricePerUnit": ((pro.pricePerUnit) * 112) / 100 } }, { multi: true }).exec(function (err, res) {
                    console.log(res, "res");
                    callback();
                })
            }, (err) => {
                console.log('done');
            })
        })
})



router.put('/salesProject', (req, res) => {
    let pro = [];
    Project.find({
        stage: {
            $in: ["Lead Received",
                "Pre - Sales call",
                "Sales Call",
                "Quotation Sent",
                "Site/Office visit",
                "Negotiation",
                "Closure"]
        }
    })
        .select('craetedAt stage project_no createdAt')
        .populate('customerId', 'name contact_no ')
        .populate('assignTo', 'name contact_no ')
        .lean()
        .then((projects) => {
            // console.log(projects,"pro");
            projects.forEach(ele => {
                ele['createdAt'] = ele['createdAt'].getDate() + '/' + (Number(ele['createdAt'].getMonth()) + 1) + '/' + ele['createdAt'].getFullYear();
                // log.date.toString().split('T')[0];
                pro.push(ele);
            })
            // console.log(pro,"pppppppp");
            // console.log(pro.length,"iiiiiiii")
            res.status(200).json(pro);
        })
})



// router.put('/editUsers',(req,res)=>{
//     Team.find
// })






router.put('/productReport', auth, (req, res) => {
    // let fromDate = new Date()
    let queryObject = filterService.getQuery(req.body);
    // queryObj.createdAt = { $gte: new Date(req.body.createdAtBetween[0]), $lte: new Date(req.body.createdAtBetween[1]) }

    // Project.find({createdAt : {$gte : new Date('2019-07-08 07:35:46.000Z')}})
    Project.find(queryObject)
        .select('project_no status stage createdAt address customerId assignTo leadType totalCustomerOutflow grandTotal')
        .populate('customerId', 'name contact_no')
        // .populate('assignTo', 'name department')
        .populate({ path: 'assignTo', populate: { path: 'department', select: 'name' }, select: 'name' })
        .populate({ path: 'closedBy', populate: { path: 'team', populate: { path: 'manager', select: 'name' }, select: 'name' }, select: 'name' })
        // .populate({ path: 'contractSignedBy', populate: { path: 'team', select: 'name' }, select: 'name' })  
        .populate({ path: 'contractSignedBy', populate: { path: 'team', populate: { path: 'manager', select: 'name' }, select: 'name' }, select: 'name' })
        .lean()
        .then((proj) => {
            // console.log(proj,"pro");
            let arr = [];
            proj.forEach(pro => {
                let obj = {};
                // pro.createdAtString = pro.createdAt.toString();
                pro.createdAtString = pro['createdAt'].getDate() + '/' + (Number(pro['createdAt'].getMonth()) + 1) + '/' + pro['createdAt'].getFullYear();

                // console.log(pro.createdAtString,"lll");
                obj = pro;
                arr.push(obj);
            })
            res.status(200).json(arr);
        })
        .catch((err) => {
            // console.log(err);
            res.json(err.message);
        })
})


let suddenArray = [
    "5d36dec0dfae40122c8299e6",
    "5d3d68b356d8450b742aeade",
    "5d1215a44962e711b83dd424",
    "5d204aeee1fa4109704ada2b",
    "5d46cc004cb6b20f789d763c",
    "5d19c8ec0b7fff0b8ce2429c",
    "5d3d753f56d8450b742aedc2",
    "5cbb674da9c73717b01e22b3",
    "5d29d1b147cc2c021c120314",
    "5d5666e417f6fe06dc1ba4e7",
    "5cb9b6bfa9c73717b01e097a",
    "5d511bff8f818c16a07a1b03",
    "5d34333455b85c0c0cc54e5c",
    "5d46e5a44cb6b20f789d77bb",
    "5d25c5cbe3ecf31220f387ce",
    "5cb308faa9c73717b01dcf03",
    "5d356fea55b85c0c0cc56197",
    "5d3ffbf866026a1050b763e1",
    "5d303fd15685e2113c00984b",
    "5d2c237747cc2c021c121f77",
    "5d4aa2a34cb6b20f789db7b2",
    "5d57d89c17f6fe06dc1bb635",
    "5d5fc5170f502514e8f491ab",
    "5d428fcdf064631120d12900",
    "5d480d6b4cb6b20f789d87e1",
    "5d480dba4cb6b20f789d87e5",
    "5d5cf34918c6e00b5c8edccf",
    "5d565f4117f6fe06dc1ba487",
    "5d5aadb27dd4070588a6a450",
    "5d651da14bb6ec192876c2b7",
    "5d5be0ad18c6e00b5c8ecd84",
    "5d3bf9f456d8450b742ac461",
    "5d67bc7f204a0716948f796d",
    "5d22ff7e778dca12c88de41c",
    "5d6e1d54204a0716948fc2e9",
    "5d6e0605204a0716948fbef2",
    "5d52a4408f818c16a07a3c29",
    "5d1ef785dfa71c13987d0606",
    "5d4943e44cb6b20f789da312",
    "5d4bb7e94cb6b20f789dbe00",
    "5d6e6332204a0716948fc997",
    "5d4d4000c561d81388dcff63",
    "5d5a9e357dd4070588a6a186",
    "5d514be18f818c16a07a250d",
    "5ca87d71b7198118bc178186",
    "5d481d094cb6b20f789d8c52",
    "5d133adf4962e711b83de0a9",
    "5d76217e204a071694905c9f",
    "5d78bed10bca150b10cade87",
    "5d342fe255b85c0c0cc54e12",
    "5ce90fcb4b1af01bf896b448",
    "5d6f50fa204a0716948fcfd5",
    "5ca1f2c83afedc0ee0b83baf",
    "5d7dd4de30916404a0871327",
    "5d78c9140bca150b10cadf71",
    "5d6a72f8204a0716948fad3f",
    "5d5a5847851b7d049c431133",
    "5d846b1dbc60f212cc61bfb8",
    "5d84cf82bc60f212cc61d9ae",
    "5d7b86940bca150b10cb07a9",
    "5d7c8a6d0bca150b10cb101b",
    "5d7f26d330916404a087220a",
    "5d734c9a204a07169490250b",
    "5d63909b4bb6ec192876a6c4",
    "5d871088bc60f212cc61fbb9",
    "5d5e9afc80581111202661d1",
    "5d7ce6750bca150b10cb2385",
    "5d2838c047cc2c021c11d79f",
    "5ce1132bff45770c44f62439",
    "5d5a481b851b7d049c430f93",
    "5c9f295361887f093c721ab9",
    "5cc410171bad1013a4a3572d",
    "5d7f80ada78ddb1124d56bf2",
    "5d74e4d5204a071694905294",
    "5d259acfe3ecf31220f37f47",
    "5d91a7bd0879610dd46e9630",
    "5d92faa20879610dd46eaeb4",
    "5d46a7634cb6b20f789d7435",
    "5d863cf6bc60f212cc61f711",
    "5d861f64bc60f212cc61f206",
    "5d848db1bc60f212cc61c8d9",
    "5d7a1fe20bca150b10caf7cd",
    "5d7ce7d00bca150b10cb23ec",
    "5d710761204a071694900114",
    "5d7e28d830916404a0871cc0",
    "5d96ff050879610dd46ecdfa",
    "5d862c24bc60f212cc61f56f",
    "5d84b107bc60f212cc61d1d4",
    "5d8df70b3019731894d73fc0",
    "5d9d95f6cb7db816a09bdbff",
    "5da9aa32fa8b0107046f1ad0",
    "5d303b885685e2113c009796",
    "5d9d8a3ccb7db816a09bdaa8",
    "5da173b5d4f425118c0af8aa",
    "5d7a36010bca150b10cafa60",
    "5dab03d0da7229177013b136",
    "5dada6c8133772066811583e",
    "5d7cad370bca150b10cb14ad",
    "5d8621c6bc60f212cc61f2e6",
    "5db00ba9c35eb80d1cfc9bb6",
    "5d56ab1e17f6fe06dc1babbc",
    "5dad8d7d1337720668115580",
    "5d99d3aecb7db816a09bcea2",
    "5da32663d4f425118c0b1af0",
    "5d9d76eccb7db816a09bd7b8",
    "5d77624f204a071694907001",
    "5d6394f54bb6ec192876a8ad",
    "5dab17cada7229177013b618",
    "5dbd73ed2f88fb1ae411302b",
    "5d8c5426a9568215dc63cffa",
    "5dbd8dc22f88fb1ae4113321",
    "5d75f8c7204a0716949058e5",
    "5da81830ac4c7f0cc84ffbc3",
    "5d5295398f818c16a07a38a8",
    "5da7127dac4c7f0cc84fefeb",
    "5db17695d2e168167c681d3a",
    "5cbeaf2da9c73717b01e3c3e",
    "5da2bafbd4f425118c0b0d92",
    "5dc7ac56c55b8016aca35139",
    "5db978e82f88fb1ae4110d7c",
    "5dc262cfba638d0e7058cb25",
    "5d862f4ebc60f212cc61f5ac",
    "5da1d5c0d4f425118c0b07fb",
    "5d7f680ba78ddb1124d56858",
    "5db7e282bb8e3614d41449c8",
    "5d25c6dce3ecf31220f387de",
    "5dc50e8dba638d0e7058ec0c",
    "5d84c33abc60f212cc61d6c0",
    "5dc7b6b5c55b8016aca353d5",
    "5dc263c3ba638d0e7058cb30",
    "5dd284b3b88d6b19d8bb8046",
    "5dbd84b82f88fb1ae41131ca",
    "5c8f2f249456f104ccc3dd6e",
    "5dd0e1debbe7a41844af338e",
    "5dd23eba7a4f150bd4aa157f",
    "5d7cb9f80bca150b10cb15aa",
    "5d60e3d80f502514e8f49ddc",
    "5dd776e2b88d6b19d8bbc842",
    "5dda634da9cec10bd4c9ca98"
]

router.put('/suddenReport', auth, (req, res) => {
    // let fromDate = new Date()
    let queryObject = filterService.getQuery(req.body);
    // queryObj.createdAt = { $gte: new Date(req.body.createdAtBetween[0]), $lte: new Date(req.body.createdAtBetween[1]) }

    // Project.find({createdAt : {$gte : new Date('2019-07-08 07:35:46.000Z')}})
    // Project.find(queryObject)
    Project.find({ _id: { $in: suddenArray } })
        // .select('project_no status stage createdAt address customerId assignTo leadType totalCustomerOutflow grandTotal createdBy')
        .populate('customerId', 'name contact_no')
        .populate('assignTo', 'name')
        .populate('createdBy', 'name')
        .populate('closedBy', 'name')
        .lean()
        .then((proj) => {
            // console.log(proj,"pro");
            let arr = [];
            proj.forEach(pro => {
                let obj = {};
                // pro.createdAtString = pro.createdAt.toString();
                pro.createdAtString = pro['createdAt'].getDate() + '/' + (Number(pro['createdAt'].getMonth()) + 1) + '/' + pro['createdAt'].getFullYear();
                pro.closureDate = pro['closureDate'].getDate() + '/' + (Number(pro['closureDate'].getMonth()) + 1) + '/' + pro['closureDate'].getFullYear();

                // console.log(pro.createdAtString,"lll");
                obj = pro;
                arr.push(obj);
            })
            res.status(200).json(arr);
        })
        .catch((err) => {
            // console.log(err);
            res.json(err.message);
        })
})



router.put('/addCustomerOutflowInQuotation', (req, res) => {
    Quotation.find({})
        .then((quots) => {
            console.log(quots, "ooooo")
            // quots.totalCustomerOutflow = quots.grandTotal;
            // quots.save();
            async.each(quots, function (quo, callback) {
                // console.log(mastercode,"ms");
                Quotation.update({ _id: quo._id }, { $set: { "totalCustomerOutflow": quo.grandTotal } }, { multi: true }).exec(function (err, res) {
                    console.log(res, "res");
                    callback();
                })
            }, (err) => {
                console.log('done');
            })
        })
})


//Query to add password in customer
router.put('/addPasswordInCustomer', (req, res) => {
    let pwd = 'welcome1234';
    // Customer.find({})
    //     .then(cust=>{
    //     })
    User.encryptPassword(pwd)
        .then((pass) => {
            // console.log(pass,"pwd");
            return Customer.update({}, { $set: { password: pass.hash, salt: pass.salt } }, { multi: true });

        })
        .then((updated) => {
            console.log(updated, ">>>>>");
            res.status(200).json("Updated pw");

        })
        .catch((err) => {
            // console.log(err);
            res.json(err.message);
        })
})





router.put('/addIsConverted', (req, res) => {
    let deptIds = [];
    Department.find({ name: { $in: ['Finance', '3D Visualizer', 'Factory', 'IMOS', 'Design'] } })
        // .select('_id')
        .then(depts => {
            // console.log(depts,"depts");
            depts.forEach(dep => {
                deptIds.push(dep._id);
            })
        })
        .then(() => {
            // console.log(deptIds,">>>>>>")
            return Project.update({ department: { $in: deptIds } }, { $set: { isConverted: true } }, { multi: true });
        })
        .then((updated) => {
            // console.log("updated",updated);
            res.status(200).json("Updated");
        })
})



router.put('/addClosedBy', (req, res) => {
    Department.find({ name: { $in: ['Design', 'Factory'] } })
        .select('_id')
        .then(depts => {
            // console.log(depts,"depts");
            let deptArray = [];
            depts.forEach(dep => {
                deptArray.push(dep._id);
            })
            return deptArray;
        })
        .then((deptArr) => {
            console.log(deptArr);
            return Project.find({ department: { $in: deptArr } }).lean();
        })
        .then((projects) => {
            console.log(projects);
            async.forEach(projects, function (pro, callback) {
                ProjectLog.find({ $and: [{ projectId: pro._id }, { stage: 'Closure' }] }).sort({ 'createdAt': -1 }).limit(1).exec(function (err, response) {
                    console.log(response, "res");
                    if (response.length > 0) {
                        Project.updateOne({ _id: pro._id }, { $set: { closedBy: response[0].user } }).exec(function (err, res1) {
                            console.log(res1, "updated");
                            callback();
                        })
                    } else {
                        callback();
                    }
                })
            }, (err) => {
                console.log("done");
                res.status(200).json("Updated");
            })
        })
})


router.put('/addClosureDate', (req, res) => {
    // Department.find({ name: { $in: ['Design', 'Factory'] } })
    //     .select('_id')
    //     .then(depts => {
    //         // console.log(depts,"depts");
    //         let deptArray = [];
    //         depts.forEach(dep => {
    //             deptArray.push(dep._id);
    //         })
    //         return deptArray;
    //     })
    //     .then((deptArr) => {
    //         console.log(deptArr);
    Project.find({}).lean()
        .then((projects) => {
            console.log(projects);
            async.forEach(projects, function (pro, callback) {
                ProjectLog.find({ $and: [{ projectId: pro._id }, { stage: 'Closure' }] }).sort({ 'createdAt': -1 }).limit(1).exec(function (err, response) {
                    console.log(response, "res");
                    if (response.length > 0) {
                        // Project.updateOne({ _id: pro._id }, { $set: { closedBy: response[0].user } }).exec(function (err, res1) {
                        Project.updateOne({ _id: pro._id }, { $set: { closureDate: response[0].createdAt } }).exec(function (err, res1) {
                            console.log(res1, "updated");
                            callback();
                        })
                    } else {
                        callback();
                    }
                })
            }, (err) => {
                console.log("done");
                res.status(200).json("Updated");
            })
        })
})



router.put('/addcontractSignedBy', (req, res) => {
    Department.find({ name: { $in: ['Design', 'Factory'] } })
        .select('_id')
        .then(depts => {
            // console.log(depts,"depts");
            let deptArray = [];
            depts.forEach(dep => {
                deptArray.push(dep._id);
            })
            return deptArray;
        })
        .then((deptArr) => {
            console.log(deptArr);
            return Project.find({ department: { $in: deptArr } }).lean();
        })
        .then((projects) => {
            console.log(projects);
            async.forEach(projects, function (pro, callback) {
                ProjectLog.find({ $and: [{ projectId: pro._id }, { stage: 'Contract Signed' }] }).sort({ 'createdAt': -1 }).limit(1).exec(function (err, response) {
                    console.log(response, "res");
                    if (response.length > 0) {
                        Project.updateOne({ _id: pro._id }, { $set: { contractSignedBy: response[0].user } }).exec(function (err, res1) {
                            console.log(res1, "updated");
                            callback();
                        })
                    } else {
                        callback();
                    }
                })
            }, (err) => {
                console.log("done");
                res.status(200).json("Updated");
            })
        })
})


// db.getCollection('snags').update(
//     { 'materials.assignTo': ObjectId("5c7595996845e2094c335e02") },
//     { $set: 'materials.$[inner].assignTo': ObjectId("5c759aa56845e2094c335e11") },
//     {
//         "arrayFilters": [
//             { "inner.assignTo": ObjectId('5c7595996845e2094c335e02') }
//         ]
//     })

// db.getCollection('snags').update({
//     $and : [
//             {'materials.assignTo': ObjectId("5c7595996845e2094c335e02")},
//             {$where : "this.materials.length=2"}
//         ]
//     },
//     {$set : {'materials.$.assignTo': ObjectId("5c759aa56845e2094c335e11")}},
//     {multi : true}
// )


router.get('/addNewRates', (req, res) => {
    ProductMaster.find()
        .then((products) => {
            async.forEach(products, function (pro, callback) {
                if (pro.subUnitType == 'Area') {
                    ProductMaster.findByIdAndUpdate(pro._id, { $set: { newpricePerUnit: parseInt((pro.pricePerUnit) * 1.1) } }).exec(function (err, resp) {
                        callback();
                    })
                } else {
                    ProductMaster.findByIdAndUpdate(pro._id, { $set: { newpricePerUnit: pro.pricePerUnit } }).exec(function (err, resp) {
                        callback();
                    })
                }
            })
        })
})

router.get('/get3CustSer', async (req, res) => {
    try{
        const cswf = await CustomerSurveyWonForm.find();
        for(let i =0;i<cswf.length;i++){
            for(let j=0;j<cswf[i].satisfactionIndexRatio.length;j++){
                if (cswf[i].satisfactionIndexRatio[j].actionSelected == '1' || cswf[i].satisfactionIndexRatio[j].actionSelected == '2')
                    cswf[i].satisfactionIndexRatio[j].actionSelected = '1'
                else if (cswf[i].satisfactionIndexRatio[j].actionSelected == '3' || cswf[i].satisfactionIndexRatio[j].actionSelected == '4')
                    cswf[i].satisfactionIndexRatio[j].actionSelected = '2'
                else if (cswf[i].satisfactionIndexRatio[j].actionSelected == '5' || cswf[i].satisfactionIndexRatio[j].actionSelected == '6')
                    cswf[i].satisfactionIndexRatio[j].actionSelected = '3'
                else if (cswf[i].satisfactionIndexRatio[j].actionSelected == '7' || cswf[i].satisfactionIndexRatio[j].actionSelected == '8')
                    cswf[i].satisfactionIndexRatio[j].actionSelected = '4'
                else if (cswf[i].satisfactionIndexRatio[j].actionSelected == '9' || cswf[i].satisfactionIndexRatio[j].actionSelected == '10')
                    cswf[i].satisfactionIndexRatio[j].actionSelected = '5'
            }
            cswf[i].save()
        }
        res.send(cswf)
    } catch (error) {
        console.log('error', error)
    }
})

router.get('/get31OctData', async (req, res) => {
    try{
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet('Optimization-File')
        worksheet.columns = [
            { header: 'Material Name', key: 'matname' },
            { header: 'Store Available Quantity', key: 'stavqty' },
            { header: 'Store Consumed Quantity', key: 'stcsqty' }
        ]
        const mats = await MaterialMaster.find({});
        console.log(mats[0].stocks.store)
        let doc = []
        for(let i=0;i<mats.length;i++){
            let obj = {}
            obj.matname = mats[i].name
            obj.stavqty = mats[i].stocks.factory.available
            obj.stcsqty = mats[i].stocks.factory.consumed
            doc.push(obj)
        }
        doc.forEach((e, index) => {
            worksheet.addRow({
                ...e
            })
        })
        await workbook.xlsx.writeFile('31stMaterialFactoryData.xlsx')
        console.log(mats.length)
    } catch (error) {
        console.log('error', error)
    }
})


const addRate = function (jsonRows) {
    return new Promise((resolve, reject) => {
        async.each(jsonRows, function (row, callback) {
            // if (row[0].trim() != 'NONE') {
            console.log(row[0])
            // ProductMaster.find({name : row[0]})
            ProductMaster.update({ _id: row[1] }, { newpricePerUnit: row[7] }).exec(function (err, response) {
                callback();
            })
            // callback();
        }, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    })

}

router.post('/add', (req, res) => {
    let filePath = '';
    filePath = path.join(__dirname, '../../productMasters.xlsx');
    filePath = filePath.replace(new RegExp(/\\/g), '/');

    let workbook = XLSX.readFile(filePath);
    let sheetName = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[sheetName];
    let jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    addRate(jsonRows)


        .then(() => {
            console.log('Done')
        })
        .catch((err) => {
            console.log(err);
        })
})

router.put('/ImosDataUpdate',async (req,res)=>{
    try{
    let imos = await ImosProject.find({})
    .select('leadId')
    .lean()
    let arr = []
    for(let i = 0;i<imos.length;i++){
        let leadData = await Lead.find({ _id:imos[i].leadId }).select('imosStage')
         console.log(leadData.length)
         if(leadData.length === 0 ){
             arr.push(imos[i].leadId)
         }else{
             await ImosProject.updateOne({ leadId: imos[i].leadId }, { $set: { stage: leadData[0].imosStage}})
         }
        // 
    }
    console.log(arr)
    res.status(200).send("done")
    }catch(err){
        res.send(err.message)
    }
})

router.put('/leadDataUpdate',async(req,res)=>{
    try{
    let data = await Lead.find({}).select('tokenPercent')
    console.log(data)
    for(let i = 0;i<data.length;i++){
        if (data[i].tokenPercent >= 10){
            await Lead.findOneAndUpdate({ _id: data[i]._id }, { $set: { tenPercentPaid : true }}) 
        }else{
            await Lead.findOneAndUpdate({ _id: data[i]._id }, { $set: { tenPercentPaid: false } }) 
        }
    }
    res.status(200).send("done")
}catch(error){
    console.log(err)
}
})

router.put('/updateChmDesignData', async(req,res)=>{

    const customer = await CustomerSurveyDesignForm.find({}).lean()
    try{
        for (let i = 0; i < customer.length ; i++){
            let chm = await ChmLeads.find({ leadId: customer[i].leadId}).lean()
            console.log(chm.length)
            if (chm.length !== 0){
                await CustomerSurveyDesignForm.update({ leadId: customer[i].leadId }, { $set: { chmId: chm[0]._id }}).lean()
            }
        }

    }catch(error){
        console.log(error)
    }
console.log("done")
})


router.put('/updateChmDesignLostData', async (req, res) => {

    const customer = await CustomerSurveyDesignLostForm.find({}).lean()
    try {
        for (let i = 0; i < customer.length; i++) {
            let chm = await ChmLeads.find({ leadId: customer[i].leadId }).lean()
            console.log(chm.length)
            if (chm.length !== 0) {
                await CustomerSurveyDesignLostForm.update({ leadId: customer[i].leadId }, { $set: { chmId: chm[0]._id } }).lean()
            }
        }

    } catch (error) {
        console.log(error)
    }
    console.log("done")
})



router.get('/getSalesData', async (req,res)  => {
    let createdAt = { $gte: '2022-08-01T00:00:00.000Z', $lte: '2023-02-20T00:00:00.000Z' }

    let lead = await Lead.find({ createdAt: createdAt, tokenPercent : {$ne : 0}})
    .populate('customerId',"name email contact_no")
    .populate('assignTo','name')
    .populate('teamId','name')
    .populate('experienceCenterId','name')
    .select('salesStage currentStage erpProjectNo leadWonDate closureDate lead_no tokenPercent grandTotal paymentDone')
    res.send(lead)


})

router.put('/addSiteQcandSiteBomUsers', async(req,res)=>{
    // let logs = await LeadLogs.find({ dealActivity : { $regex:"uploaded the final 2D drawing file and the project has been moved" } })
    // .select('user leadId')
    // for(let i = 0 ; i< logs.length;i++){

    //     await Lead.findByIdAndUpdate(logs[i].leadId, { $set: { siteQcCompletedUser: logs[i].user}})
    // }

    // for updating factoryBomCompletedUser
    let logs = await LeadLogs.find({ dealActivity: { $regex:"Project status to Under Procurement" } })
    .select('user leadId')
    for(let i = 0 ; i< logs.length;i++){
        await Lead.findByIdAndUpdate(logs[i].leadId, { $set: { factoryBomCompletedUser: logs[i].user}})
    }
    res.send("done")

})



router.get('/salesDatassss',async(req,res)=>{
    let createdAt = { $gte: '2022-12-01T00:00:00.000Z', $lte: '2023-03-04T00:00:00.000Z' }
    const leads = await Lead.find({ createdAt: createdAt })
    .select('salesStage salesMeetingDone meetingWithCustomer cityName grandTotal contractSignedValue designStatus currentStage teamName assignToName createdAt salesWonUserName salesWonManagerName totalCustomerOutflow lead_no leadWonDate')
    .populate('assignTo','name')
    .populate('customerId','name')
    .populate('experienceCenterId','name')
    res.send(leads)

})



router.get('/dattttaaaUpdate',async(req,res)=>{
    let createdAt = { $gte: '2023-01-01T00:00:00.000Z', $lte: '2023-03-03T00:00:00.000Z' }
    const leads = await Lead.find({ salesMeetingDone:true,  $and :[ {"meetingWithCustomer.meetingType": { $eq: "Office Meet" }},{'meetingWithCustomer.meetingDate':{$exists:false}}] })
    // const leads = await Lead.find({ createdAt: createdAt , salesMeetingDone:true, currentStage:'Lost' ,"meetingWithCustomer.meetingDate": { $eq: null }  })
    .select('salesMeetingDone meetingWithCustomer ')
    .populate('assignTo','name')
    .populate('customerId','name')
    console.log(leads.length,"aa")
    
for(let i = 0; i<leads.length;i++ ){
//  const logs = await LeadLogs.find({leadId:leads[i]._id, stage : "Negotiation"})
// console.log(logs)
// if(logs.length !== 0){
   
    //let data = await Lead.findByIdAndUpdate(leads[i]._id,{$set:{"meetingWithCustomer.meetingDate":""}}).lean()
    
}
// }
res.send(leads)
})


router.get('/chmNotAssignedData',async(req,res)=>{
    const leads = await Lead.find({ $and:[{departmentId :{$ne:"5cb5b38bcf5531e174cb23e0"}},{departmentId:{$ne:"62833e4c6999f0dd8be397a0"}} ]})
    .select('salesStage salesMeetingDone meetingWithCustomer cityName grandTotal contractSignedValue designStatus currentStage teamName assignToName createdAt salesWonUserName salesWonManagerName totalCustomerOutflow lead_no leadWonDate')
    .populate('assignTo','name')
    .populate('customerId','name')
    .populate('experienceCenterId','name')

    let data = []

    for(let i = 0; i < leads.length; i++){
        const theData = await ChmLeads.find({leadId:leads[i]._id}).lean();
        if(theData.length === 0){
            data.push(leads[i])
        }
    }
    res.send(data)

})


router.put('/UpdateTheSalesManager', async (req,res) =>{
    const leads = await Lead.find({salesStage: "Won" , $or: [{ salesWonManagerName: "" }, { salesWonManager: null}] })
    .populate({ path: 'previouslyAssignedTo', populate: { path: 'roles', select: 'name' },select: 'name teamId' })
    .populate({ path: 'previouslyAssignedTo', populate:{ path: 'teamId', populate: { path: 'users', populate: { path: 'roles', select: 'name' }, select: 'name role' } }, select: 'name teamId'})
        .select('previouslyAssignedTo currentStage salesWonManagerName salesWonUserName')
    .lean()
    let count = 0
    for(let i = 0 ; i < leads.length ; i++){
        for (let j = 0; j < leads[i].previouslyAssignedTo.length; j++){
            if (leads[i].previouslyAssignedTo[j].length !==0 ){
                if (leads[i].previouslyAssignedTo[j].roles[0].name === "Sales User" || leads[i].previouslyAssignedTo[j].roles[0].name === "Sales Manager" || leads[i].previouslyAssignedTo[j].roles[0].name === "Assistant Sales Manager"){
                let prev = leads[i].previouslyAssignedTo[j].teamId.users
                for(let k = 0; k < prev.length; k++ ){
                    if(prev.length !== 0){
                        if (prev[k].roles[0].name === "Sales Manager" || prev[k].roles[0].name === "Assistant Sales Manager"){
                            console.log(prev[k]._id, prev[k].name,"name")
                            try{
                            // let lead = await Lead.findOneAndUpdate({ _id: leads[i]._id }, { $set: { salesWonManagerName: prev[k].name, salesWonManager: prev[k]._id } })
                                count++;
                                console.log("done")
                                break;
                            }catch (err){
                                console.log("err")
                            }
                        }
                    }
                }
            }
        }
    }
    }
    console.log(count,leads.length)
    res.send(leads)
})


router.get('/getRateCards',async(req,res)=>{
    let createdAt = { $gte: "2023-04-04T09:56:27.338+0000" }
    const data = await OrgRateCard.find({ createdAt: createdAt,rateCardMasterId: "62d138de977e2d0339219969"})
    .lean()
    let count = 0 // uncommet this code when ever we are updating OrgRateCard
    for(let i = 0; i < data.length; i++){
        try{
            console.log("hit")
            rateCard = new OrgRateCard();
            rateCard.docType = data[i].docType
            rateCard.isActive = true;
            rateCard.itemId = data[i].itemId;
            rateCard.rate = data[i].rate;
            rateCard.rateCardMasterId = "63c154fa57f73ec83e15bc6e"; // change Rate Card master id  Required Rate card to Update
            rateCard.save();
            count++;
        }catch(error){
            console.log(error)
        }
    }
    console.log(count,data.length)
    res.send(data)
})



router.get('/UpdateProjectRateCardMasterWithNewItems',async(req,res)=>{
    const ProjectRateMAster = await ProjectRateCardMaster.find({}).lean()
    let createdAt = { $gte: '2023-04-04T09:56:27.338+0000' }
    const orgRate = await OrgRateCard.find({ createdAt: createdAt, rateCardMasterId: "62d138de977e2d0339219969" })
    .lean()
    let cout = 0
    const projectRateCards = []
 
    for (let i = 0; i < ProjectRateMAster.length; i++ ){
        cout++;
        for(let j = 0; j < orgRate.length;j++ ){   
                let obj = {
                    itemId: orgRate[j].itemId,
                    rate: orgRate[j].rate,
                    projectRCMasterId: ProjectRateMAster[i]._id,
                    docType: "FinishTypeMaster"
                }
                projectRateCards.push(obj)
        }                    
    }
    const data = await ProjectRateCard.insertMany(projectRateCards)
    console.log(cout)
    res.send("Done")
})

router.get('/update_DesignUser_DesignManager', async (req, res) =>
{
    try
    {
        console.log('all good')
        console.log('constant.designDepttId', constant.designDepttId)
        const designLeads = await Lead.find
        ({
            // departmentId: constant.designDepttId
            departmentId: {$nin: constant.marketingDepttId}
        })
        .populate({path: 'previouslyAssignedTo', populate: {path: 'roles', select: '_id name'}, select: '_id name'})
        .populate({path: 'assignTo', populate: {path: 'roles', select: 'name'}, select: 'name'})
        .select('assignTo previouslyAssignedTo designUser designManager')
        for(let i = 0; i < designLeads.length; i++)
        {
            let designManager = null, designUser = null
            for(let j = 0; j < designLeads[i]['previouslyAssignedTo'].length; j++)
            {
                if(designLeads[i]['previouslyAssignedTo'][j]['roles'][0]?.name == 'Design Manager')
                {
                    designManager = designLeads[i]['previouslyAssignedTo'][j]['_id'].toString()
                }
                else if(designLeads[i]['previouslyAssignedTo'][j]['roles'][0]?.name == 'Design User')
                {
                    designUser = designLeads[i]['previouslyAssignedTo'][j]['_id'].toString()
                }
            }
            if(designLeads[i]['assignTo']['roles'][0]?.name == 'Design Manager')
            {
                designManager = designLeads[i]['assignTo']['_id'].toString()
            }
            else if(designLeads[i]['assignTo']['roles'][0]?.name == 'Design User')
            {
                designUser = designLeads[i]['assignTo']['_id'].toString()
            }
            await Lead.updateOne({_id: designLeads[i]['_id'].toString()}, {$set: {designManager: designManager, designUser: designUser}})
            console.log(`updated ${i+1}`)
        }
        res.status(200).json({designLeads: designLeads})
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).send(error.message)
    }
})

router.get('/update_salesWonUser_salesWonManager', async (req, res) =>
{
    try
    {
        console.log('all good')
        console.log('constant.marketingDepttId', constant.marketingDepttId)
        const leads = await Lead.find
        ({
            departmentId: {$nin: constant.marketingDepttId}
        })
        .populate({path: 'previouslyAssignedTo', populate: {path: 'roles', select: '_id name'}, select: '_id name'})
        .populate({path: 'assignTo', populate: {path: 'roles', select: 'name'}, select: 'name'})
        .select('assignTo previouslyAssignedTo salesWonUser salesWonManager salesWonUserName salesWonManagerName')
        console.log('leads.length', leads.length)
        for(let i = 0; i < leads.length; i++)
        {
            let salesWonManager = null, salesWonUser = null, salesWonUserName = null, salesWonManagerName = null
            for(let j = 0; j < leads[i]['previouslyAssignedTo'].length; j++)
            {
                if(leads[i]['previouslyAssignedTo'][j]['roles'][0]?.name == 'Sales Manager')
                {
                    salesWonManager = leads[i]['previouslyAssignedTo'][j]['_id'].toString()
                    salesWonManagerName = leads[i]['previouslyAssignedTo'][j]['name']
                }
                else if(leads[i]['previouslyAssignedTo'][j]['roles'][0]?.name == 'Sales User')
                {
                    salesWonUser = leads[i]['previouslyAssignedTo'][j]['_id'].toString()
                    salesWonUserName = leads[i]['previouslyAssignedTo'][j]['name']
                }
            }
            if(leads[i]['assignTo']['roles'][0]?.name == 'Sales Manager')
            {
                salesWonManager = leads[i]['assignTo']['_id'].toString()
                salesWonManagerName = leads[i]['assignTo']['name']
            }
            else if(leads[i]['assignTo']['roles'][0]?.name == 'Sales User')
            {
                salesWonUser = leads[i]['assignTo']['_id'].toString()
                salesWonUserName = leads[i]['assignTo']['name']
            }
            await Lead.updateOne({_id: leads[i]['_id'].toString()}, {$set: {salesWonManager: salesWonManager, salesWonUser: salesWonUser, salesWonManagerName: salesWonManagerName, salesWonUserName: salesWonUserName}})
            console.log(`updated ${i+1}`)
        }
        res.status(200).json({leads: leads})
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).send(error.message)
    }
})

router.get('/getUsers', async (req, res) =>
{
    try
    {
        console.log('all good')
        let departmentId = constant.chmDepttId
        const users = await User.find
        ({
            
                departmentId: departmentId,
                isActive: true
        })
        .populate({path: 'departmentId', select: 'name'})
        .populate({path: 'roles', select: 'name'})
        .select('name email departmentId')
        res.status(200).json({users: users})
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).json({error: error})
    }
})

router.post('/updateExpCtrCollection', async (req, res) =>
{
    try
    {
        console.log('all good')

        const ALL_EXP_CTRS = await ExperienceCenter.find
        (

        )
        .populate("locationId", "name state")

        let New_Exp_Ctrs = [...JSON.parse(JSON.stringify(ALL_EXP_CTRS))]

        await ExperienceCenter.deleteMany({})

        for(let i = 0; i < New_Exp_Ctrs.length; i++)
        {
            New_Exp_Ctrs[i]['city'] = New_Exp_Ctrs[i]['locationId']['name']
            New_Exp_Ctrs[i]['state'] = New_Exp_Ctrs[i]['locationId']['state']
            New_Exp_Ctrs[i]['country'] = 'India'

            // delete New_Exp_Ctrs[i]['locationId']            
        }

        await ExperienceCenter.insertMany(New_Exp_Ctrs)

        // res.status(200).send(ALL_EXP_CTRS)
        res.status(200).send(New_Exp_Ctrs)
    }
    catch(err)
    {
        console.log('err', err.message)
        res.status(400).send(err)
    }
})

router.put('/deactivatingItems',async(req,res)=>{

    const rateCardMasters = await RateCardMaster.find({"isDefault" : true}).lean()
    for(let i = 0; i < rateCardMasters.length; i++){
    // const orgRate = await OrgRateCard.findOneAndUpdate({ rateCardMasterId: rateCardMasters[i]._id,itemId: "5d08d09b05010d0a90ab9d0c" },{$set:{isActive : false}})
    // const orgRate = await OrgRateCard.find({ rateCardMasterId: rateCardMasters[i]._id,itemId: "5d08d09b05010d0a90ab9d0c" })

    // console.log(orgRate)
    }
    // const ProjectRatecard = await ProjectRateCard.deleteMany({itemId:"5d08d09b05010d0a90ab9d0c"})
    
    res.send("done")
})

router.put('/updatingTheChmsForLeads',async(req,res)=>{
//     const finding = await Lead.find({"designStages": "Design Sign-off"}).lean()
// let count = 0;
// let projects = []
//     for(let i = 0; i < finding.length; i++){
//         let chm = await ChmLeads.find({leadId : finding[i]._id}).lean()
//         if(chm.length === 0){
//             count++;
//             // console.log(finding[i]._id)

//             let obj ={
                
//                 "leadId" : finding[i]._id,
//                 // "assignTo" : "6359075012b5d00af4b1d960",
//                 "teamId" : "637b3a78a3d82d3d63bfc6e1",
//                 "departmentId" : "637b3a50a3d82d3d63bfc6cf",
//                 "experienceCenterId" : finding[i].experienceCenterId
//             }
//             if(count < 45){
//                 console.log(count,"1")
//                 obj.assignTo = '6359075012b5d00af4b1d960'
//             }else if(count < 90){
//                 console.log(count,"2")
//                 obj.assignTo = '63776467a3d82d3d63be64db'
//             }else{
//                 console.log(count,"3")
//                 obj.assignTo = '64ba5212f16e96296d7aa229'
//             }
//             projects.push(obj)
//             console.log(obj)
//         }
//     }
//     // const data = await ChmLeads.insertMany(projects)
//     console.log(count)
//     res.send('done')

})


router.get('/getTheData',async(req,res)=>{
    let lastDate = new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1);
    let currentDate = new Date()
    console.log(lastDate,currentDate)
      let lead = await Lead.find({"salesStage": "Won",
      "leadStatus": "Won",
      "leadWonDate": { 
        "$gte": lastDate, 
        "$lte": currentDate
    }})
      .populate('customerId','name')
      .populate('experienceCenterId','name')
      .select('erpProjectNo lead_no currentStage leadWonDate grandTotal')
      .lean();
      res.send(lead)

})


router.get('/GetProjectMovedComplted',async(req,res)=>{
    let lastDate = new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1);
    console.log(lastDate)
    const lead  = await Lead.find({ currentStage:"Completed", executionCompletionDate : { $exists: false } })
    .populate('customerId','name')
    .populate('experienceCenterId','name')
    .select('erpProjectNo lead_no currentStage executionCompletionDate')
    .lean()
    // console.log(lead)
    // let pusher = []
    // for(let i = 0 ; i < lead.length ; i++){
    //     let Leadlogs = await LeadLogs.findOne({ leadId : lead[i]._id ,dealActivity : { $regex : "the status to Completed and Execution Completed Date"}}).lean()
    //     // console.log(Leadlogs)
    //     if(Leadlogs && Leadlogs.createdAt >= lastDate){
    //         console.log(Leadlogs.createdAt)
    //         pusher.push(lead[i])
    //     }
    // }
    res.send(lead)
})
router.get('/tagChmUserWithLead', async (req, res) =>
{
    try
    {
        console.log('all good')
        const chmLeads = await ChmLeads.find()
        console.log('chmLeads length', chmLeads.length)
        
        for(let i = 0; i < chmLeads.length; i++)
        {
            await Lead.updateOne({_id: chmLeads[i].leadId.toString()}, {$set: {chmUser: chmLeads[i].assignTo.toString()}})
        }
        console.log('done')
        res.status(200).send(chmLeads)
    }
    catch(error)
    {
        console.log('error', error.message)
        res.status(400).send(error)
    }
})


module.exports = router;

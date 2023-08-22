const express = require('express');
const router = express.Router();
const _ = require('lodash');
const request = require('request');
const async = require('async');

const auth = require('../middlewares/authentication');
const User = require('../models/user');
const Lead = require('../models/lead')
const Project = require('../models/project');
const ProjectLog = require('../models/projectLog');
const LeadLog = require('../models/leadLog')
const Customer = require('../models/customer');
const emailService = require('../services/email.service');
const messageService = require('../services/message.service');
const assignService = require('../services/assign.service');
const ProjectComponent = require('../models/projectComponent');
const { IpAddress } = require('../utils/config');
const CustomerSurveyRealForm = require('../models/customerSurveyReal');
const CustomerSurveyLostForm = require('../models/customerSurveyLost');
const CustomerSurvey = require('../models/customerSurvey');
const CustomerSurveyDesignLostForm = require('../models/customerSurveyDesignLost');
const ImosProject = require('../models/imosProject');
const SiteBomProject = require('../models/siteBomProject');
const { FactoryBomRoleId } = require('../constant/constant');
const moment = require('moment')
// assign project
// router.post('/', auth, (req, res) => {
//     // let fileUrl = '';
//     // if (req.files) {
//     //     formData = {
//     //         // file: req.files.file.data,
//     //         name: req.files.file.name,
//     //         customerName: req.body.customerName,
//     //         my_buffer: Buffer.from(req.files.file.data),
//     //     }
//     // }
//     Project.findById(req.body.projectId)
//         .populate('assignTo', 'name')
//         .then((project) => {
//             if (project && project.assignTo._id == req.body.id && project.stage == req.body.stage) {
//                 return res.status(400).json('Project already assigned to ' + project.assignTo.name);
//             } else {
//                 Project.updateOne({ _id: req.body.projectId }, { $set: { assignTo: req.body.id, stage: req.body.stage } })
//                     .then(() => {
//                         //     return new Promise((resolve, reject) => {
//                         //         if (!req.files) return reject();
//                         //         request.post({ url: 'http://localhost:3000/api/file/upload', formData: formData }, (err, res) => {
//                         //             if (err) return reject(err);
//                         //             return resolve(res.body);
//                         //         })
//                         //     })
//                         // })
//                         // .then((fileUrl) => {
//                         projectLog = new ProjectLog({
//                             projectId: req.body.projectId,
//                             stage: req.body.stage,
//                             user: req.body.id
//                             // s3Location: fileUrl,
//                             // remark: req.body.remarks
//                         });
//                         return projectLog.save();
//                     })
//                     .then(() => {
//                         res.status(200).json('Project successfully assigned.');
//                     })
//             }
//         })
//         .catch((err) => res.status(400).send(err));
// });


router.post('/', auth, async (req, res) => {
    let smsAndEmailText = '';
    let projObj = {};
    let updateProj = {};
    let fileUrl = '';
    let dept;
    let team;
    let sendersId = [];
    // if(req.body.department){
    //     dept = req.body.department;
    // } else {
    //     dept = req.user.department;
    // }
    // if(req.body.team){
    //     team = req.body.team;
    // } else {
    //     team = req.user.team;
    // }
    if (req.files) {
        formData = {
            // file: req.files.file.data,
            name: req.files.file.name,
            customerName: req.body.customerName,
            my_buffer: Buffer.from(req.files.file.data),
        }
    }
    let updateObj = {};
    if (req.body.stageDepartment === 'sales') {
        updateObj.salesStage = req.body.stage;
        updateObj.currentStage = req.body.stage;
    } else if (req.body.stageDepartment === 'design') {
        updateObj.designStages = req.body.stage;
        updateObj.currentStage = req.body.stage;
    } else if (req.body.stageDepartment === 'factory') {
        updateObj.executionStage = req.body.stage;
    }
    else if (req.body.stageDepartment === 'imos')
    {
        updateObj.imosStage = req.body.stage;

        const SiteBOM = await SiteBomProject.findOne({leadId: req.body.leadId}).select('_id stage')
        if(SiteBOM.stage !== "Site BOM Completed")
        {
            updateObj.currentStage = `${req.body.stage} & ${SiteBOM.stage}`
        }
    }

    if (req.body.status) {
        updateObj.status = req.body.status;
    }
    if (req.body.leadType) {
        updateObj.leadType = req.body.leadType;
    }
    if (req.body.leadStatus) {
        updateObj.leadStatus = req.body.leadStatus;
    }

    if (req.body.id) {
        updateObj.departmentId = req.body.department;
        updateObj.teamId = req.body.team;
        updateObj.assignTo = req.body.id;
    }
    if(req.body.stage == "IMOS Completed")
    {
        let FactoryBOM_Executive = await User.find({roles: {$in: [FactoryBomRoleId]} }).select('_id')
        updateObj.assignTo = FactoryBOM_Executive[0]['_id'];
        updateObj.imosToFactoryDate = new Date();
        updateObj.factoryBomCompletedUser = FactoryBOM_Executive[0]['_id'];
    }
    // else {
    //     updateObj.stage = req.body.stage;
    // }
    // updateObj.stage = req.body.stage;
    // updateObj.department = dept;
    // updateObj.team = team;
    if (req.body.stage == 'Closure') {
        // updateObj.finalAmountInClosure = req.body.finalAmount;
        updateObj.isConverted = true;
        if (req.body.id) {
            updateObj.closedBy = req.body.id;
        } else {
            updateObj.closedBy = req.user._id;
        }
        updateObj.closureDate = req.body.closureDate;
    }

    if (req.body.stage == 'Design Sign-off') {
        if (req.body.id) {
            updateObj.contractSignedBy = req.body.id;
        } else {
            updateObj.contractSignedBy = req.user._id;
        }
        updateObj.designSignOffDate = req.body.designSignOffDate;
        updateObj.workingDrawingFile = req.body.workingDrawingFile;
        updateObj.projectCompletionDate = req.body.projectCompletionDate;
    }
    if (req.body.stage == 'Quotation Sent') {
        updateObj.quotationSentDate = req.body.quotationSentDate;
    }
    if (req.body.status === 'Lead Returned By Sales') {
        updateObj.status = req.body.status
    }
    if (req.body.stage == 'Lost') {
        updateObj.reasonForLost = req.body.reasonForLost
    }
    if (req.body.meetingDone === "Yes") {
        updateObj.salesMeetingDone = true
        updateObj.meetingWithCustomer = {}
        updateObj.meetingWithCustomer.meetingStage = req.body.meetingDoneStage
        updateObj.meetingWithCustomer.meetingDate = req.body.meetingDate
        updateObj.meetingWithCustomer.meetingType = req.body.meetingType
    }

    if(req.body.stage == 'Design Kick-Off : Customer')
    {
        updateObj.designerAndSalesOwnerMeetingDate = req.body.designerAndSalesOwnerMeetingDate
        updateObj.floorPlanReceivedToDesigner = req.body.floorPlanReceivedToDesigner
        updateObj.designerDiscussedQuotationWithClient = req.body.designerDiscussedQuotationWithClient
        updateObj.designerDiscussedRequirementWithClient = req.body.designerDiscussedRequirementWithClient
    }
    else if(req.body.stage == 'Design Kick-Off : Internal')
    {
    
        updateObj.designerAssignedDate = new Date()
        updateObj.designUser = req.body.id.toString()
    
        updateObj.designerAndSalesOwnerMeetingDate = req.body.designerAndSalesOwnerMeetingDate
        updateObj.floorPlanReceivedToDesigner = req.body.floorPlanReceivedToDesigner
        updateObj.designerDiscussedQuotationWithClient = req.body.designerDiscussedQuotationWithClient
        updateObj.designerDiscussedRequirementWithClient = req.body.designerDiscussedRequirementWithClient
    }

    Lead.findById(req.body.leadId)
        .populate('assignTo', 'name')
        .then((project) => {
            let assignToId = project.assignTo._id
            if (project && req.body.id && req.body.id == project.assignTo._id && project.stage == req.body.stage) {
                return res.status(400).json('Lead already assigned to ' + project.assignTo.name);
            } else {
                projObj = project;
                if (req.body.stage == 'Closure') {
                    updateObj.finalAmountInClosure = project.totalCustomerOutflow;
                }
                if (req.body.stage == 'Design Sign-off') {
                    updateObj.contractSignedValue = project.totalCustomerOutflow;
                }

                updateObj.city = req.body.city ? req.body.city : project.city;
                updateObj.experienceCenterId = req.body.experienceCenterId ? req.body.experienceCenterId : project.experienceCenterId;
                

                Lead.findByIdAndUpdate(req.body.leadId, { $set: updateObj, $push: { previouslyAssignedTo: assignToId}}, { new: true })
                    .populate('assignTo', 'name email mobile')
                    .populate('teamId', 'name manager')
                    .populate('customerId', 'name _id email contact_no')
                    .then((pro) => {
                        updateProj = pro;
                        if (updateProj.assignTo == null) {
                            assignService.getProjectAssignedUser(updateProj)
                                .then((assignuser) => {
                                    // console.log(assignuser, 'assignUser')
                                    updateProj.push(assignuser)
                                })
                        }
                        return new Promise((resolve, reject) => {
                            if (!req.files) return resolve("");
                            request.post({ url: 'http://localhost:5003/api/file/upload', formData: formData }, (err, res) => {
                                if (err) return reject(err);
                                return resolve(res.body);
                            })
                        })
                    })
                    .then(async (fileUrl) => {
                        // console.log(fileUrl);
                        projectLog = new LeadLog(req.body);
                        projectLog.createdBy = req.user
                        // projectLog.user = req.body.id;
                        projectLog.user = updateProj.assignTo._id;
                        if (req.body.stage == 'Closure') {
                            projectLog.amount = updateProj.finalAmountInClosure
                        }
                        if (req.body.stage == 'Design Sign-off') {
                            projectLog.amount = updateProj.contractSignedValue
                        }
                        if (req.body.id && req.body.id != projObj.assignTo._id) {
                            if (req.body.stage == 'Lost') {
                                projectLog.dealActivity = req.user.name + ' has changed the deal owner to ' + updateProj.assignTo.name + ' and the stage to ' + req.body.stage + ' Reason : ' + req.body.reasonForLost;
                            } else {
                                projectLog.dealActivity = req.user.name + ' has changed the deal owner to ' + updateProj.assignTo.name + ' and the stage to ' + req.body.stage;
                            }
                        } else {
                            if (req.body.stage == 'Lost') {
                                projectLog.dealActivity = req.user.name + ' has changed the deal stage to ' + req.body.stage + ' Reason : ' + req.body.reasonForLost;
                            } else {
                                projectLog.dealActivity = req.user.name + ' has changed the deal stage to ' + req.body.stage;
                            }
                        }
                        await Lead.findByIdAndUpdate(req.body.leadId, { $set: { assignToName: updateProj.assignTo.name, teamName: updateProj.teamId.name}})

                        if (req.user._id != updateProj.assignTo._id){
                            const subject1 = "Lead Received";
                            const text1 = `Dear ${updateProj.assignTo.name};
                            Please kindly check your dashboard new lead is Assigned
                            Customer Name : ${updateProj.customerId.name}
                            Customer Email: ${updateProj.customerId.email}`
                            const html1 = `<p>Dear <strong>${updateProj.assignTo.name}</strong>,</p>
                            <p>Please kindly check your dashboard new lead is Assigned</p>
                            <p>Customer Name : ${updateProj.customerId.name}</p>
                            <p>Customer Email: ${updateProj.customerId.email}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`;
                            emailService.sendEmail(updateProj.assignTo.email, subject1, text1, html1);
                        }

                        if (updateProj.erpProjectId && req.body.id && req.body.stageDepartment === "imos"){
                            let obj = {}
                            obj.departmentId = req.body.department;
                            obj.teamId = req.body.team;
                            obj.assignedTo = req.body.id;
                            try{
                            await Project.findByIdAndUpdate(updateProj.erpProjectId, { $set: obj }, { new: true })
                                await ImosProject.updateOne({ projectId: updateProj.erpProjectId }, {
                                    $set: {
                                        assignTo: req.body.id,
                                        teamId: req.body.team,
                                        departmentId: req.body.department,
                                        stage: req.body.stage
                                    }
                                }, { new: true })
                            }catch(err){
                                console.log(err.message)
                            }
                            
                        }
                        if (req.body.meetingDone === "Yes"){
                            leadLogs = new LeadLog();
                            leadLogs.createdBy = req.user;
                            leadLogs.user = req.user;
                            leadLogs.leadId = updateProj._id;
                            leadLogs.dealActivity = req.user.name + `has marked as Meeting Done, meeting type is : ${req.body.meetingType} and meeting  date is: ${moment(req.body.meetingDate).format('ll')}`;
                            leadLogs.save();

                        }
                        let realSurvey = await CustomerSurveyRealForm.find({ leadId: req.body.leadId });
                        // If Selected lead status is Real then sending the customer survey link
                        if (realSurvey.length === 0 && req.body.status === 'Lead Received' && req.body.leadType === 'Real') {
                            const surveyLink = `${IpAddress}customer-survey-form/real/${req.body.leadId}`
                            const subject = 'Customer Survey Form';
                            const text = `Dear ${updateProj.customerId.name};
                            Please kindly check and fill out our survey form..
                            It won’t take more than 30 seconds.
                            Link for survey form: ${surveyLink}`;

                            const html = `<p>Dear <strong>${updateProj.customerId.name}</strong>,</p>
                            <p>Please kindly check and fill out our survey form.</p>
                            <p>It won’t take more than 30 seconds</p>
                            <p>Link for survey form: ${surveyLink}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`
                            emailService.sendEmail(updateProj.customerId.email, subject, text, html);

                            const customerSurvey = new CustomerSurvey({
                                leadId: req.body.leadId,
                                customerId: updateProj.customerId._id,
                                leadOwner: updateProj.assignTo._id,
                                surveyType: 'real',
                                surveyStatus: 'Sent'
                            })
                            await customerSurvey.save();
                        }
                        let lostSurvey = await CustomerSurveyLostForm.find({ leadId: req.body.leadId });
                        // If Selected Stage is Lost then sending the customer survey link
                        if (lostSurvey.length === 0 && req.body.stage === 'Lost' && req.body.leadStatus === 'Lost' && req.user.departmentId !== "5cb70b89ffa4965f53aa22d8") {
                            const surveyLink = `${IpAddress}customer-survey-form/lost/${req.body.leadId}`
                            const subject = 'Customer Survey Form';
                            const text = `Dear ${updateProj.customerId.name};
                            Please kindly check and fill out our survey form.
                            It won’t take more than 30 seconds
                            Link for survey form: ${surveyLink}`;

                            const html = `<p>Dear <strong>${updateProj.customerId.name}</strong>,</p>
                            <p>Please kindly check and fill out our survey form.</p>
                            <p>It won’t take more than 30 seconds</p>
                            <p>Link for survey form: ${surveyLink}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`
                            emailService.sendEmail(updateProj.customerId.email, subject, text, html);

                            const customerSurvey = new CustomerSurvey({
                                leadId: req.body.leadId,
                                customerId: updateProj.customerId._id,
                                leadOwner: updateProj.assignTo._id,
                                surveyType: 'lost',
                                surveyStatus: 'Sent'
                            })
                            await customerSurvey.save();
                        }
                        let lostDesignSurvey = await CustomerSurveyDesignLostForm.find({ leadId: req.body.leadId });
                        if (lostDesignSurvey.length === 0 && req.body.stage === 'Lost' && req.body.leadStatus === 'Lost' && req.user.departmentId === "5cb70b89ffa4965f53aa22d8") {
                            const surveyLink = `${IpAddress}customer-survey-form/design-lost/${req.body.leadId}`
                            const subject = 'Customer Survey Form';
                            const text = `Dear ${updateProj.customerId.name};
                            Please kindly check and fill out our survey form.
                            It won’t take more than 30 seconds
                            Link for survey form: ${surveyLink}`;

                            const html = `<p>Dear <strong>${updateProj.customerId.name}</strong>,</p>
                            <p>Please kindly check and fill out our survey form.</p>
                            <p>It won’t take more than 30 seconds</p>
                            <p>Link for survey form: ${surveyLink}</p>
                            <p></p>
                            <p></p>
                            <p>Thanks & Regards,</p>
                            <p>Team Decorpot</p>`
                            emailService.sendEmail(updateProj.customerId.email, subject, text, html);

                            const customerSurvey = new CustomerSurvey({
                                leadId: req.body.leadId,
                                customerId: updateProj.customerId._id,
                                leadOwner: updateProj.assignTo._id,
                                surveyType: 'design-lost',
                                surveyStatus: 'Sent'
                            })
                            await customerSurvey.save();
                        }

                        if (req.body.stage == 'Designer Assigned') {
                            // console.log(updateProj.teamId)
                           let UsersInTeam = await User.find({teamId : updateProj.teamId, isActive: true}).populate('roles','name')
                            let designManager = []
                            UsersInTeam.forEach(ele => {
                                
                                if (ele.roles.find(ele => ele.name === "Design Manager")) {
                                    designManager.push(ele);
                                }
                            })
                            const subject = 'Lead Assigned to Designer';

                            const text = `Dear ${updateProj.customerId.name},
                            The Designer is assigned to your project, Please find the below Designer details:
                            Name: ${updateProj.assignTo.name}
                            Email: ${updateProj.assignTo.email}
                            Mobile No: ${updateProj.assignTo.mobile}
                        `;

                            const html = `
    <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        .Container {
            width: 100%;
            margin-right: 10%;
            margin-top: 10%;
        }

        .decorpot {
            width: 15%;
            margin-left: 40%
        }

        .container {
            margin-left: 5%;
            margin-right: 10%;
        }

        .roadmap {
            width: 95%;
        }

    
    </style>
</head>

<body>
    <div class='Container'>
        <div>
            <img class="decorpot" src="https://www.decorpot.com/images/logo-black-min.png" />
            <h1 style="margin-left:35% ;">Designer Assigned!</h1>
        </div>
        <div class="container">
            <div>
                <p>Dear ${updateProj.customerId.name},</p>
                <p>Congratulations! Your design team is ready to take the design journey with you.</p>
            </div>
            <div>
                <p style="padding:0;margin:0;margin-bottom: 8px;">Designer Name:- ${updateProj.assignTo.name}</p>
                <p style="padding:0;margin:0;margin-bottom: 8px;">Designer Contact :- ${updateProj.assignTo.mobile} </p>
                <p style="padding:0;margin:0;margin-bottom: 8px;">Designer Mail Id:- ${updateProj.assignTo.email}</p>
                <p style="padding:0;margin:0;margin-bottom: 8px;margin-top: 50px;">Design Manager Name:- ${designManager[0].name}</p>
                <p style="padding:0;margin:0;margin-bottom: 30px;">Design Manager Mail Id:- ${designManager[0].email}</p>
            </div>
            <div>
                <img class="roadmap" src="https://qt-snag-attachment.s3.amazonaws.com/undefined/Designer.jpg">
                <p>Our design team will be connecting with you shortly over the project discussions, they will be the
                    point of contact for
                    the entire design phase. Our team will ensure a seamless design execution at your site and will
                    deliver a great interior
                    experience at your home.</p>
            </div>
            <h4 style="margin-left: 25%;">HAPPY CUSTOMERS, HAPPY DECORPOT!</h4>
        </div>
    </div>


</body>

</html>
    `

                            emailService.sendEmail(updateProj.customerId.email, subject, text, html);
                        }
                        if (req.body.stage === "Assign to Designer") {
                            let query = req.body.leadId;
                            let prevWithCurrentUser = [];
                            prevWithCurrentUser.push(...updateProj.previouslyAssignedTo, req.user._id);
                            let update = {
                                previouslyAssignedTo: prevWithCurrentUser,
                                currentStage: 'Design Kick-Off : Internal'
                            }
                            Lead.findByIdAndUpdate(query, update, { new: true })
                                .then((lead) => {
                                    res.status(200).json('Lead details updated')
                                })
                        }
//                         if (req.body.stage === "Final Quotation Approval") {
//                             let query = req.body.leadId;
//                             let update = {
//                                 QuoteApprovedByCustomer: [{
//                                     isApproved: false,
//                                     status: "Approval Not Initiated"
//                                 }]
//                             }
//                             Lead.findByIdAndUpdate(query, { $set: update })
//                                 .then((lead) => {
//                                     res.status(200).json('Lead details updated')
//                                 })

                        //                             let link = `${IpAddress}customerpreviewquotations/${req.body.quotation_no}`
                        //                             const subject = 'Final Quotation Approval';

                        //                             const text = `Dear ${updateProj.customerId.name}, `;

                        //                             const html = `
                        //     <!DOCTYPE html>
                        // <html lang="en">

                        // <head>
                        //     <meta charset="UTF-8">
                        //     <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        //     <title>Document</title>
                        //     <style>
                        //         .Container {
                        //             width: 100%;
                        //             margin-right: 10%;
                        //             margin-top: 10%;
                        //         }

                        //         .decorpot {
                        //             width: 15%;
                        //             margin-left: 40%
                        //         }

                        //         .container {
                        //             margin-left: 5%;
                        //             margin-right: 10%;
                        //         }

                        //         .roadmap {
                        //             width: 95%;
                        //         }


                        //     </style>
                        // </head>

                        // <body>
                        //     <div class='Container'>
                        //         <div>
                        //             <img class="decorpot" src="https://www.decorpot.com/images/logo-black-min.png" />
                        //         </div>
                        //         <div class="container">
                        //             <div>
                        //                 <p>Dear ${updateProj.customerId.name},</p>
                        //             </div>
                        //             <div>
                        //             <p>Please click this link to see Quatation and verify your details: <a href=${link} >Get Details</a> </p>


                        //             </div>
                        //             <h4 style="margin-left: 25%;">HAPPY CUSTOMERS, HAPPY DECORPOT!</h4>
                        //         </div>
                        //     </div>

                        // </body>

                        // </html>
                        //     `
                        //                             emailService.sendEmail(updateProj.customerId.email, subject, text, html);
                        //                         }

                        if (fileUrl) projectLog.s3Location = fileUrl;
                        if (req.body.id) {
                            smsAndEmailText = `${projectLog.dealActivity} for project no ${updateProj.project_no},customer name ${updateProj.customerId.name}`;
                            sendersId.push(req.user._id);
                            sendersId.push(updateProj.assignTo._id);
                        }

                        return projectLog.save();
                    })
                    .then(() => {
                        // console.log(smsAndEmailText, "text format");
                        // console.log(sendersId, "ids");
                        if (sendersId.length != 0) {
                            return User.find({ _id: { $in: sendersId } })
                                .select('email contact_no');
                        } else {
                            return;
                        }
                        // res.status(200).json('Project Details Updated.');
                    })
                    .then((users) => {
                        let userDetail = {};
                        let contact_no = [];
                        let email = [];
                        if (users && users.length != 0) {
                            users.forEach((user) => {
                                contact_no.push(user.contact_no);
                                email.push(user.email);
                            })
                            userDetail.email = email;
                            userDetail.contact_no = contact_no;
                            userDetail.text = smsAndEmailText;
                            userDetail.emailText = smsAndEmailText;
                            if (process.env.NODE_ENV == 'production') {
                                return assignService.sendMessageOnAssign(userDetail);
                            }
                            // assignService.sendMessageOnAssign(userDetail);
                        }
                        // res.status(200).json('Project Details Updated.');
                    })
                    // .then(() => {
                    //     if (req.body.stage == 'Design Sign-off') {
                    //         // return ProjectComponent.update({ projectId: req.body.projectId },{$set : {'products.$[].isDelete': false}},{multi : true});
                    //         return ProjectComponent.find({ projectId: req.body.projectId });

                    //     } else {
                    //         return;
                    //     }
                    // })
                    // .then((components) => {
                    //     // console.log(components,">>>>>>>>>>");
                    //     // components.forEach(com=>{
                    //     //     com.products.forEach(prod=>{
                    //     //         prod.isDelete = false;
                    //     //     })
                    //     // })
                    //     return new Promise((resolve, reject) => {

                    //         async.forEach(components, function (comp, callback) {
                    //             comp.products.forEach(prod => {
                    //                 prod.isDelete = false;
                    //             })
                    //             comp.save();
                    //             callback();
                    //         }, (err) => {
                    //             console.log('done');
                    //             resolve();
                    //         })

                    //     })

                    //     // return components.save();
                    // })
                    // .then(() => {
                    //     if (req.body.stage == 'Closure') {
                    //         let pwd = 'welcome1234';
                    //         Customer.find({name:req.body.customerName})
                    //             .then(cust=>{
                    //             })
                    //         return User.encryptPassword(pwd);

                    //     } return;
                    // })
                    // .then((pass) => {
                    //     // console.log(pass,"pwd");
                    //     if (pass) {
                    //         // console.log(pass);
                    //         return Customer.updateOne({ _id: updateProj.customerId }, { $set: { password: pass.hash, salt: pass.salt } });
                    //     } return;

                    // })
                    .then((comps) => {
                        // console.log(comps, "comps"); 
                        res.status(200).json('Lead Details Updated.');
                    })
                    // .catch((err) => res.status(400).send(err));
                    .catch(err => {
                        console.log(err);
                    })


            }
        })
        .catch((err) => res.status(400).send(err));
});




router.post('/addNotes', auth, (req, res) => {
    // projectLog = new ProjectLog(req.body);
    projectLog = new ProjectLog(req.body);
    let smsAndEmailText = '';
    let sendersId = [];
    let htmlText = '';

    projectLog.save()
        .then(() => {
            return Project.findById(req.body.projectId).populate('customerId');
        })
        .then(async (projectId) => {
            // console.log('pppp')
            if (req.body.taggedUser) {
                let taggedUserDetails = await User.find({ _id: { $in: req.body.taggedUser } });
                let taggedNames = '';
                taggedUserDetails.forEach(tag => {
                    taggedNames += tag.name + ' & ';
                })
                htmlText = `<p>Dear ${taggedNames.substring(0, taggedNames.length - 2)},</p>
                                                    <p>You have been tagged in project no :${projectId.project_no} and client name : ${projectId.customerId.name} with below notes .</p>
                                                    <p>${req.body.notes}</p>
                                                    <br/>
                                                    <p>Regards,<br/>TEAM DECORPOT</p>`
                // smsAndEmailText = htmlText;                                    
                smsAndEmailText = `Reminder added for Project no : ${projectId.project_no}`;
                sendersId.push(req.user._id);
                sendersId.push(...req.body.taggedUser);
            }
            return;
        })
        .then(() => {
            if (sendersId.length != 0) {
                // console.log(sendersId,"")
                return User.find({ _id: { $in: sendersId } })
                    .select('email contact_no');
            } else {
            }
        })
        .then((users) => {
            // console.log(users,"ll");
            let userDetail = {};
            let contact_no = [];
            let email = [];
            if (users && users.length != 0) {
                users.forEach((user) => {
                    contact_no.push(user.contact_no);
                    email.push(user.email);
                })
                userDetail.email = email;
                userDetail.contact_no = contact_no;
                userDetail.text = smsAndEmailText;
                userDetail.html = htmlText;
                // userDetail.emailText = smsAndEmailText;
                if (process.env.NODE_ENV == 'production') {
                    return assignService.sendMessageOnAssign(userDetail);
                }
                // assignService.sendMessageOnAssign(userDetail);
            }
        })
        .then((logs) => {
            res.status(200).json('Note added successfully.');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err);
        });
})


// Assign role
router.put('/role/:id', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(401).send('Only admin can assign role.');
    User.findUserById(req.params.id)
        .then((user) => {
            user.role = req.body.role;
            return User.generateToken(_.pick(user, ['_id', 'name', 'email', 'role']));
        })
        .then((token) => {
            return User.updateOne({ _id: req.params.id }, { $set: { role: req.body.role, token: token } });
        })
        .then(() => {
            res.status(200).send('User role change to ' + req.body.role);
        })
        .catch((err) => res.status(400).send(err));
});

router.post('/leadUpdateMeeting',auth, async (req, res) => {
    try{
    let updateObj = {
        finanaceManagerApproved: [{ isApproved: false, status: 'Send for Approval' }],
        reinitiateProcess: 'Send for Approval'
    }
    if (req.body.meetingDone === "Yes") {
        updateObj.salesMeetingDone = true
        updateObj.meetingWithCustomer = {}
        updateObj.meetingWithCustomer.meetingStage = req.body.meetingDoneStage
        updateObj.meetingWithCustomer.meetingDate = req.body.meetingDate
        updateObj.meetingWithCustomer.meetingType = req.body.meetingType
        try{
            leadLogs = new LeadLog();
            leadLogs.createdBy = req.user;
            leadLogs.user = req.user;
            leadLogs.leadId = req.body.leadId;
            leadLogs.dealActivity = req.user.name + `has marked as Meeting Done, meeting type is : ${req.body.meetingType} and meeting  date is: ${moment(req.body.meetingDate).format('ll')}`;
            leadLogs.save();
        }catch(err){
            console.log(err.message)
        }
    }
    await Lead.findByIdAndUpdate(req.body.leadId, { $set: updateObj }, { new: true })
    res.status(200).send("Sucess");
    }catch(err){
        res.status(400).send(err);
    }
});

module.exports = router;


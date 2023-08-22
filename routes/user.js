const express = require('express');
const router = express.Router();
const _ = require('lodash');
const async = require('async');
const CryptoJs = require('crypto-js');

const auth = require('../middlewares/authentication');
const User = require('../models/user');
const Department = require('../models/department');
const Team = require('../models/team');
const usersService = require('../services/users.service');
const Lead = require('../models/lead');
const Customer = require('../models/customer');
const emailService = require('../services/email.service');
const LeadLogs = require('../models/leadLog');
const { IpAddress } = require('../utils/config');
const { DocumentUploaderDetail, designHeadId } = require('../constant/constant')
const ModifiyPdf = require('../services/modifyPdf.service')
const CustomerSurveyDesignForm = require('../models/customerSurveyDesign');
const CustomerSurveyWonForm = require('../models/customerSurveyWon');
const CustomerSurvey = require('../models/customerSurvey');
const Pdf = require('../services/generatePdf.service');
const ChmLeads = require('../models/chmleads');
const Roles = require('../models/roles');
const CustomerTransactions = require('../models/customertransactions');

//Generate Token
router.post('/generateToken', auth, (req, res) => {
    User.findUserByEmail(req.body.email)
        .then(() => {
            newUser = new User(_.pick(req.body, ['name', 'email', 'password', 'contact_no', 'role', 'department', 'team']));
            return User.encryptPassword(newUser.password);
        })
        .then((data) => {
            newUser.salt = data.salt;
            newUser.password = data.hash;
            return User.generateToken(_.pick(newUser, ['_id', 'name', 'email', 'role', 'department', 'team']));
        })
        .then((data) => {
            res.status(200).json('User created successfully.');
        })
        .catch((err) => {
            if (err instanceof ReferenceError) {
                return res.status(400).json('User not created.');
            }
            res.status(400).send(err);
        });
});

// Register new user
router.post('/new', auth, (req, res) => {
    if (req.user.role != 'Admin') return res.status(403).json('Only admin can create user.');
    User.findUserByEmail(req.body.email)
        .then(() => {
            newUser = new User(_.pick(req.body, ['name', 'email', 'password', 'contact_no', 'role', 'department', 'team']));
            return User.encryptPassword(newUser.password);
        })
        .then((data) => {
            newUser.salt = data.salt;
            newUser.password = data.hash;
            return User.generateToken(_.pick(newUser, ['_id', 'name', 'email', 'role', 'department', 'team']));
        })
        .then((token) => {
            newUser.token = token;
            return newUser.save();
        })
        // .then((user) => {
        //     return Department.updateOne({ _id: req.body.department }, { $push: { users: user._id } });
        // })
        .then((user) => {
            if (user.role == 'Manager') {
                return Team.updateOne({ _id: req.body.team }, { $set: { manager: user._id } }, { new: true });
            }

            return Team.updateOne({ _id: req.body.team }, { $push: { users: user._id } }, { new: true });
        })
        .then((data) => {
            res.status(200).json('User created successfully.');
        })
        .catch((err) => {
            if (err instanceof ReferenceError) {
                return res.status(400).json('User not created.');
            }
            res.status(400).send(err);
        });
});


// Login
router.post('/login', (req, res) => {
    User.findUserByCredentials(req.body.email, req.body.password)
        .then((token) => {
            res.status(200).json(token);
        })
        .catch((err) => {
            res.status(400).send(err)
        });
});

router.get('/usersOfDepartment/:departmentId', auth, (req, res) => {
    Department.findById(req.params.departmentId)
        .select('users')
        .then((users) => {
            if (users.length == 0) return res.status(200).json('No users found.');
            res.status(200).send(users);
        })
        .catch((err) => res.status(400).send(err));
});



// Get all users
router.get('/all', auth, (req, res) => {
    User.find({})
        .select('name email contact_no role isActive')
        .populate('team', 'name')
        .populate('department', 'name')
        .sort({ 'name': 1 })
        .lean()
        .then(users => {
            res.status(200).send(users);
        })
        .catch((err) => res.status(400).send(err));
});


// Get user/manager of a department
router.get('/ofDepartment/:departmentId', auth, (req, res) => {
    usersService.getUsersInADepartment(req.params.departmentId)
        .then((users) => {
            if (users.length == 0) return res.status(404).json('No user found.');
            res.status(200).send(users);
        })
        .catch((err) => res.status(400).send(err));
});

router.get('/usersOfTeam/:teamId', auth, (req, res) => {
    let teamId = req.params.teamId;
    usersService.getUsersInATeam(teamId)
        .then((users) => {
            if (users.length == 0) return res.status(404).json('No user found.');
            res.status(200).send(users);
        })
        .catch((err) => res.status(400).send(err));
});

router.get('/managerOfSales', (req, res) => {
    Department.findOne({ name: 'Sales' })
        .then((dept) => {
            return dept._id;
        })
        .then((deptId) => {
            return Team.find({ departmentId: deptId })

                .select('manager name departmentId')
                .populate('manager', 'name');
        })
        .then((teamManagers) => {
            if (teamManagers.length == 0) return res.status(404).json('No manager found.');
            res.status(200).send(teamManagers);
        })
        .catch((err) => res.status(400).send(err));
})


router.get('/managerOfDepartment/:id', (req, res) => {
    // Department.findOne({ name: 'Sales' })
    Team.find({ departmentId: req.params.id })
        .select('users departmentId')
        .populate('users', 'name roles')
        .populate('roles', 'name')
        .then((managers) => {
            if (managers.length == 0) return res.status(400).json('No manager found.');
            let tempArr = [];
            // managers.forEach(manager => {
            //     if (manager.manager) {
            //         tempArr.push(manager);
            //     }
            // })
            res.status(200).json(managers);
        })

        .catch((err) => res.status(400).json(err));
})

router.get('/designManagerForLead/:id', async (req, res) => {
    let dManagerMail = ""
    let obj = { managerId: "", teamId: "", depttId: "" }

    let query = { roles: { $in: req.params.id }, isActive: true, locationId: req.query.city, experienceCenterId: req.query.expId }
    const dManagers = await User.find(query).sort({ name: 1 })

    //round robin algorithm
    let assignedLeadFound = false
    for (let i = 0; i < dManagers.length; i++) {
        if (dManagers[i].lastLeadAssigned === true) {
            assignedLeadFound = true
            if (i === dManagers.length - 1) {
                obj.managerId = dManagers[0]["_id"]
                obj.teamId = dManagers[0]["teamId"]
                obj.depttId = dManagers[0]["departmentId"]
                dManagerMail = dManagers[0]["email"]
            } else if (i !== dManagers.length) {
                obj.managerId = dManagers[i + 1]["_id"]
                obj.teamId = dManagers[i + 1]["teamId"]
                obj.depttId = dManagers[i + 1]["departmentId"]
                dManagerMail = dManagers[i + 1]["email"]
            }
        }
    }

    if (!assignedLeadFound) {
        obj.managerId = dManagers[0]["_id"]
        obj.teamId = dManagers[0]["teamId"]
        obj.depttId = dManagers[0]["departmentId"]
        dManagerMail = dManagers[0]["email"]
    }

    await User.updateMany({ _id: { $nin: [obj.managerId] } }, { $set: { lastLeadAssigned: false } })
    try {
        const subject = 'ERP - New Lead Assigned';

        const text = `Dear Design Manager,
            We have assigned a new Lead to you. Kindly check your Dashboard for more details.`
            
        const html = `<p>Dear <strong>Design Manager</strong>,</p>
        <p>We have assigned a new Lead to you. Kindly check your Dashboard for more details.</p>`

        await emailService.sendEmail(dManagerMail, subject, text, html);
        res.status(200).json(obj);
    } catch (err) {
        console.log(err, "err");
    }


})

router.get('/managerOfTeam/:id', (req, res) => {
    // Department.findOne({ name: 'Sales' })
    Team.findById(req.params.id)
        .select('manager departmentId')
        .populate('manager', 'name')
        .then((managers) => {
            if (managers.length == 0) return res.status(400).json('No manager found.');
            res.status(200).json(managers);
        })

        .catch((err) => res.status(400).json(err));
})



router.get('/userOfTeamAndManager/:teamId', (req, res) => {
    let teamId = req.params.teamId;
    let userAndManager = [];
    usersService.getUsersInATeam(teamId)
        .then((users) => {
            userAndManager = users.users;
            return Department.findOne({ teams: teamId })
                .select('teams');
        })
        .then((teams) => {
            return new Promise((resolve, reject) => {
                async.forEach(teams.teams, function (team, callback) {
                    Team.findById(team).select('manager').populate('manager', 'name').exec(function (err, resp) {
                        userAndManager.push(resp.manager);
                        callback();
                    })
                }, (err) => {
                    resolve();
                })
            })

        })
        .then(() => {
            if (userAndManager.length == 0) return res.status(404).json('No users found.');
            res.status(200).json(userAndManager);
        })
        .catch((err) => res.status(400).json(err));
})








// Edit user
router.put('/edit/:id', auth, (req, res) => {
    let query = req.params.id;
    let options = { new: true };
    let userDepartment = null;
    let userTeam = null;
    if (req.body.role != 'Admin')
        userDepartment = req.body.department;
    userTeam = req.body.team;
    return User.generateToken({
        _id: req.params.id,
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        department: req.body.department,
        team: req.body.team
    })
        .then((token) => {
            let update = {
                name: req.body.name,
                email: req.body.email,
                contact_no: req.body.contact_no,
                role: req.body.role,
                department: userDepartment,
                team: userTeam,
                token: token
            }
            return User.findByIdAndUpdate(query, update, options)
        })
        .then((user) => {
            if (!user) return res.status(400).json('User not found.');
            if (user.role == 'Manager') {
                // return Team.updateOne({ _id: req.body.team }, { manager : user._id },{new : true});
                // return Team.update({users : user._id },{$pull : {manager : user._id}});
                let removemanager = Team.update({ manager: user._id }, { $unset: { manager: user._id } });
                let addmanager = Team.updateOne({ _id: req.body.team }, { $set: { manager: user._id } }, { upsert: true });
                return Promise.all([removemanager, addmanager]);

            }
            if (user.role == 'User' || user.role == 'Supervisor') {
                let removeuser = Team.update({ users: user._id }, { $pull: { users: user._id } });
                let adduser = Team.updateOne({ _id: req.body.team }, { $push: { users: user._id } }, { upsert: true });
                return Promise.all([removeuser, adduser]);
            }
        })

        .then(() => {
            res.status(200).json("Edited Successfully");
        })
        .catch((err) => console.log(err));
});

// router.put('/edit/:id', auth, (req, res) => {
//     let query = req.params.id;
//     let options = { new: true };
//     let userDepartment = null;
//     if (req.body.role != 'Admin')
//         userDepartment = req.body.department;
//     return User.generateToken({
//         _id: req.params.id,
//         name: req.body.name,
//         email: req.body.email,
//         role: req.body.role,
//         department: req.body.department,
//     })
//         .then((token) => {
//             let update = {
//                 name: req.body.name,
//                 email: req.body.email,
//                 contact_no: req.body.contact_no,
//                 role: req.body.role,
//                 department: userDepartment,
//                 token: token
//             }
//             return User.findByIdAndUpdate(query, update, options)
//         })
//         .then((user) => {
//             if (!user) return res.status(400).json('User not found.');
//             res.status(200).send(user);
//         })
//         .catch((err) => console.log(err));
// });



// Deactivate a user
router.put('/deactivate/:id', (req, res) => {
    User.findById(req.params.id)
        .select('isActive')
        .then((user) => {
            if (user && user.isActive) {
                user.isActive = false;
            } else {
                user.isActive = true;
            }
            return user.save();
        })
        .then(() => {
            return Team.update({ users: req.params.id }, { $pull: { users: req.params.id } });
        })
        .then(() => {
            res.status(200).json('Successful');
        })
        .catch((err) => res.status(400).send(err));
});


// Delete a user
router.delete('/remove/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id)
        .then((user) => {
            if (!user) return res.status(400).json('User not found.');
            res.status(200).send('User deleted.');
        })
        .catch((err) => res.status(400).send(err));
})


// Change password
router.put('/changePassword/:id', auth, (req, res) => {
    User.findUserById(req.params.id)
        .then((user) => {
            return User.comparePassword(req.body.password, user.password);
        })
        .then(() => {
            return User.encryptPassword(req.body.new_password);
        })
        .then((data) => {
            return User.updateOne({ _id: req.params.id }, { $set: { password: data.hash } });
        })
        .then(() => {
            res.status(200).json('Password changed successfully.');
        })
        .catch((err) => res.status(400).send(err));
});

router.get('/getDesignManagers', auth, (req, res) => {
    Department.find({ name: { $in: ['Design 1', 'Design 2'] } }, { name: 1 })
        .then(
            (dept) => { return dept },
            (err) => {
                throw new Error("Department does not exist");
            }
        )
        .then(
            (deptList) => {
                let arr = [];
                async.each(deptList, function (dept, callback) {
                    let query = { department: dept._id, role: 'Manager' }
                    User.find(query, { name: 1 }).exec(function (err, users) {
                        if (users) {
                            arr.push(users[0]);
                            callback();
                        }
                    }, (er) => { }
                    )
                }, (err) => {
                    res.status(200).json(arr);
                });
            }
        )
        .catch(
            (err) => {
                res.status(500).json(err.error.message);
            }
        )
})

router.get('/getTeamUser', (req, res) => {
    User.find({teamId: req.query.teamId, isActive: true})
        .populate({ path: 'roles', select: 'name' })
        .lean()
        .then((users) => {
            if (users.length == 0) return res.status(200).json('No Data found.');
            res.status(200).send(users);
        })
        .catch((err) => res.status(400).send("err", err))
})

router.get('/leadData', (req, res) => {
    Lead.findById({ _id: req.query.leadId })
        .populate({ path: 'assignTo', populate: { path: 'teamId', select: 'name _id' }, select: '_id name email mobile' })
        .populate({ path: 'previouslyAssignedTo', populate: { path: 'roles', select: 'name' }, select: '_id name email mobile teamId departmentId' })
        .populate('customerId', '_id email address name contact_no')
        .lean()
        .then((leads) => {
            if (leads.length == 0) return res.status(200).json('No Data found.');
            res.status(200).send(leads);
        })
        .catch((err) => res.status(400).send(err))
})

router.put('/updateLead/:id', async (req, res) => {
    let query = req.params.id;
    let update = req.body;
    let options = { new: true };
    Lead.findByIdAndUpdate(query, update, options)
        .populate('assignTo')
        .populate('customerId', 'name email')
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');
            if (req.body.customerApproved[0].status === 'Rejected') {
                const subject = 'Customer Rejected Check List Items';

                const customerCheckListLink = `${IpAddress}customer-check-lists-item/${req.params.id}`;

                const text = `Dear ${lead.assignTo.name},
                    Click on this link: ${customerCheckListLink} and Recheck the check lists.`;

                const html = `<p>Dear <strong>${lead.assignTo.name}</strong>, </P>
                    <p>Click on this link: ${customerCheckListLink} and Recheck the check lists.</p>`

                await emailService.sendEmail(lead.assignTo.email, subject, text, html);

                res.status(200).json("Email send to sales executive Updated successfully");
            } else {
                try {
                    let salesChecklistSigned = await ModifiyPdf.modifyPdf(lead.customerId.name, lead.salesChecklistPdfFile)
                    let contractSingedDocument = await ModifiyPdf.modifyPdf(lead.customerId.name, lead.termsAndConditionsPdf)
                    await Lead.findByIdAndUpdate(query, { salesChecklistPdfFile: salesChecklistSigned.pdfUrl, termsAndConditionsPdf: contractSingedDocument.pdfUrl }, options)
    
                    leadLogs = new LeadLogs();
                    leadLogs.createdBy = req.body.leadOwner._id;
                    leadLogs.user = req.body.leadOwner._id;
                    leadLogs.leadId = req.body.leadOwner.leadId;
                    leadLogs.dealActivity = lead.customerId.name + ` has approved the check list, Please download the signed Check list file: ${salesChecklistSigned.pdfUrl} and contract sign file: ${contractSingedDocument.pdfUrl} Remarks: ${lead.customerApproved[0].checkListRemarkByCustomer}`;
                    await leadLogs.save();
    
                    let mailDocumentsData = {
                        customerId: {
                            email: lead.customerId.email,
                            name: lead.customerId.name
                        },
                        salesDigitalSignFiles: true,
                        salesChecklistPdfFile: salesChecklistSigned.pdfUrl,
                        contractSingedPdfFile: contractSingedDocument.pdfUrl
                    }
                    const subject = 'Digitally Signed Checklist and Contract file';
                    const text = `Dear ${lead.customerId.name};
                        We have shared the detailed attachments of your Digitally signed checklist and contract file. Please kindly check.`;
    
                    const html = `<p>Dear <strong>${lead.customerId.name}</strong>,</p>
                        <p>We have shared the detailed attachments of your Digitally signed checklist and contract file. Please kindly check.</p>
                        <p></p>
                        <p></p>
                        <p>Thanks & Regards,</p>
                        <p>Team Decorpot</p>`;
    
                    await emailService.sendEmailWithMultipleAttchement(mailDocumentsData, subject, text, html);
    
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
    
                    const customerSurvey = new CustomerSurvey({
                        leadId: req.params.id,
                        customerId: lead.customerId._id,
                        leadOwner: lead.assignTo._id,
                        surveyType: 'won',
                        surveyStatus: 'Sent'
                    })
                    await customerSurvey.save();
    
                    let getCHMManagerRoleId = await Roles.findOne({ name: 'CHM_Manager' }).select('name');
                    let getCHMUserRoleId = await Roles.findOne({ name: 'CHM_User' }).select('name');

                    let obj = { chmUserId: "", chmUserTeamId: "", chmUserDepttId: "", chmUserEmail: "", chmUserName: "" }
                    let chmUsersList = await User.find({ roles: { $in: getCHMUserRoleId._id }, isActive: true, experienceCenterId: { $in: lead.experienceCenterId } }).sort({ name: 1 })
                    let chmManagerDetails = await User.findOne({roles: { $in: getCHMManagerRoleId._id }, isActive: true, experienceCenterId: { $in: lead.experienceCenterId } }).sort({ name: 1 })
                    //round robin algorithm
                    let assignedLeadFound = false
                    for (let i = 0; i < chmUsersList.length; i++) {
                        if (chmUsersList[i].lastLeadAssigned === true) {
                            assignedLeadFound = true
                            if (i === chmUsersList.length - 1) {
                                obj.chmUserId = chmUsersList[0]["_id"]
                                obj.chmUserTeamId = chmUsersList[0]["teamId"]
                                obj.chmUserDepttId = chmUsersList[0]["departmentId"]
                                obj.chmUserEmail = chmUsersList[0]["email"]
                                obj.chmUserName = chmUsersList[0]["name"]
    
                            } else if (i !== chmUsersList.length) {
                                obj.chmUserId = chmUsersList[i + 1]["_id"]
                                obj.chmUserTeamId = chmUsersList[i + 1]["teamId"]
                                obj.chmUserDepttId = chmUsersList[i + 1]["departmentId"]
                                obj.chmUserEmail = chmUsersList[i + 1]["email"]
                                obj.chmUserName = chmUsersList[i + 1]["name"]
                            }
                        }
    
                        if (!assignedLeadFound) {
                            obj.chmUserId = chmUsersList[0]["_id"]
                            obj.chmUserTeamId = chmUsersList[0]["teamId"]
                            obj.chmUserDepttId = chmUsersList[0]["departmentId"]
                            obj.chmUserEmail = chmUsersList[0]["email"]
                            obj.chmUserName = chmUsersList[0]["name"]
                        }
    
                    }
                    await User.updateMany({ roles: { $in: getCHMUserRoleId._id }, _id: { $nin: [obj.chmUserId] } }, { $set: { lastLeadAssigned: false } })
                    await User.updateOne({ _id: obj.chmUserId }, { $set: { lastLeadAssigned: true } })
    
                    const CHMSLeads = new ChmLeads({
                        leadId: req.params.id,
                        assignTo: obj.chmUserId,
                        teamId: obj.chmUserTeamId,
                        departmentId: obj.chmUserDepttId,
                        experienceCenterId: lead.experienceCenterId
                    })
                    await CHMSLeads.save();

                    await Lead.updateOne({_id: req.params.id}, {$set: {chmUser: obj.chmUserId}})

                    
                    leadLogs = new LeadLogs();
                    leadLogs.createdBy = req.body.leadOwner._id;
                    leadLogs.user = req.body.leadOwner._id;
                    leadLogs.leadId = req.body.leadOwner.leadId;
                    leadLogs.dealActivity = `Lead details shared with Chm User ${obj.chmUserName}.`;
                    await leadLogs.save();

                    const subjectname = 'ERP - New Client Alert';
                    let emailListObj = {
                        to: obj.chmUserEmail,
                        bcc: chmManagerDetails.email
                    }
                    const textcontent = `Dear ${obj.chmUserName}
                        Customer Name : ${lead.customerId.name}
                        Customer email : ${lead.customerId.email}
                        is assigned Please check your crm tool`;
    
                    const htmlcontent = `<p>Dear <strong>${obj.chmUserName}</strong>,</p>
                        <p> Customer Name : ${lead.customerId.name}</p>
                        <p> Customer email : ${lead.customerId.email}</p>
                        <p> is assigned Please check your crm tool</p>`
    
                    await emailService.sendEmailWithBcc(emailListObj, subjectname, textcontent, htmlcontent);
    
                } catch (err) {
                    console.log(err)
                }
                res.status(200).json("Updated successfully");
            }
        })
        .catch(err => res.status(400).json(err));
})

router.post('/sendOtpMessage', async (req, res) => {
    Customer.find({ email: req.body.email })
        .then(async (cust) => {
            if (cust[0].email.toLowerCase() === req.body.email.toLowerCase()) {
                var otpNumber = Math.floor(100000 + Math.random() * 900000);
                // const message = `Dear ${cust[0].name},
                //     Kindly enter the following OTP code for verification
                //     Your OTP code for verification is: ${otpNumber}.`;

                //const otpRes = await messageService.sendMessage(message, req.body.mobile);
                const subject = 'Verification OTP';
                const text = `Dear ${cust[0].name},
                    Your OTP code for verification is: ${otpNumber}.`;
                const html = `<p>Dear <strong>${cust[0].name}</strong>, </P>
                    <p>Kindly enter the following OTP code for verification</p>
                    <p>Your OTP code for verification is: ${otpNumber}.</p>
                    <p></p>
                    <p></p>
                    <p>Thanks & Regards,</p>
                    <p>Team Decorpot</p>`;

                await emailService.sendEmail(req.body.email, subject, text, html);

                // Encryption of OTP
                let encrypted_otpNumber = CryptoJs.AES.encrypt(otpNumber.toString(), 'decorpot123').toString();
                res.status(200).json({ otp: encrypted_otpNumber });
            // } else if (cust[0].contact_no != req.body.mobile) {
            //     return res.status(404).json({ msg: 'Envalid Mobile Number.' });
            }
            else {
                return res.status(404).json({ msg: 'Please check your email id' });
            }
        })
        .catch(err => {
            console.log(err, 'err');
            res.status(400).json({ msg: "Please check your email id"})
        });
})


router.put('/updateCustomerContractSingedStatus/:id', async (req, res) => {
    let query = req.params.id;
    let update = {};
    let options = { new: true };
    let leadData = await Lead.findOne({ _id: req.params.id }).populate('customerId', "name email");

    if (req.body.contractCustomerApproved) {
        let presentDayDate = new Date();
        let quotation = await ModifiyPdf.modifyPdf(leadData.customerId.name, leadData.scanQuotationFile)
        let checklist = await ModifiyPdf.modifyPdf(leadData.customerId.name, leadData.scanCheckListFile)
        let workingdrawing = await ModifiyPdf.modifyPdf(leadData.customerId.name, leadData.workingDrawingFile)
        //let contractsinged = await ModifiyPdf.modifyPdf(leadData.customerId.name, leadData.scanContractFile)
        update.scanQuotationFile = quotation.pdfUrl
        update.scanCheckListFile = checklist.pdfUrl
        update.workingDrawingFile = workingdrawing.pdfUrl
        //update.scanContractFile = contractsinged.pdfUrl
        update.contractCustomerApproved = true;
        // update.assignTo = DocumentUploaderDetail.id;
        // update.teamId = DocumentUploaderDetail.team;
        // update.departmentId = DocumentUploaderDetail.department;
        // update.executionStage = DocumentUploaderDetail.stage;
        update.customerDesignSignOffDate = presentDayDate;
        let prevWithCurrentUser = [];
        let designUsers = [leadData.assignTo, designHeadId]
        prevWithCurrentUser.push(...leadData.previouslyAssignedTo, ...designUsers);
        update.previouslyAssignedTo = prevWithCurrentUser;
        let emailAndAttachements = {
            customerId: {
                email: leadData.customerId?.email,
                name: leadData.customerId?.name
            },
            workingDrawingFile: workingdrawing.pdfUrl,
            scanCheckListFile: checklist.pdfUrl,
            scanQuotationFile: quotation.pdfUrl,
            contractSignedPaymentReceviedAttachemnt: leadData.contractSignedPaymentReceviedAttachemnt,
            digitalSignFiles: true
        }
        const subject = 'Design Sign-off Documents';

        const text = `Dear ${leadData.customerId.name},
            We have attached your Design Sign-off document along with this mail. Please kindly check..
            The day the approval is done or the 60% payment is made, whichever is later that date will be considered as the contract date.`;

        const html = `<p>Dear <strong>${leadData.customerId.name}</strong>,</p>
            <p>We have attached your Design Sign-off document along with this mail. Please kindly check..</p>
            <p> </p>
            <p>The day the approval is done or the 60% payment is made, whichever is later that date will be considered as the contract date.</p>
            <p></p>
            <p></p>
            <p>Thanks & Regards,</p>
            <p>Team Decorpot</p>`

        await emailService.sendEmailWithMultipleAttchement(emailAndAttachements, subject, text, html);

        let userName = await User.findOne({ _id: leadData.assignTo });
        leadLogs = new LeadLogs();
        leadLogs.createdBy = userName._id
        leadLogs.user = userName._id;
        leadLogs.leadId = req.params.id;
        leadLogs.dealActivity = 'Customer has approved the Design Sign-off Documents, the lead has been sent for Finance approval now.';
        await leadLogs.save();

        let query = {}
        let data = {}
        let chm = await ChmLeads.find({ leadId: req.body.leadOwner.leadId }).lean()
        if(chm.length !== 0){
            data.chmId = chm[0]._id
        }
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

        const customerSurvey = new CustomerSurvey({
            leadId: req.params.id,
            customerId: leadData.customerId._id,
            leadOwner: leadData.assignTo,
            surveyType: 'design',
            surveyStatus: 'Sent'
        })
        await customerSurvey.save();

    } else {
        update.contractFinanceApproved = false
        update.contractDesignManagerApproved = false
        update.contractQualityControlApproved = false
        update.contractCustomerApproved = false
        update.contactLeadRejectedRole = 'Customer'
        const data = await CustomerTransactions.findOne({leadId:req.params.id,stage:"Design Sign-off"}).sort({createdAt:-1})
        data.finalApprovalStatus = "Not Approved"
        await data.save();
    }
    Lead.findByIdAndUpdate(query, update, options)
        .populate('assignTo')
        .populate('customerId', 'name email')
        .then(async (lead) => {
            if (!lead) return res.status(404).json('Lead not found.');

            res.status(200).json("Updated successfully");
        })
        .catch(err => res.status(400).json(err));
})

router.get('/getDesginManagersUserList/:desginManagerId', (req, res) => {
    User.find({ departmentId: req.params.desginManagerId, isActive: true })
        .select('roles name teamId departmentId locationId experienceCenterId')
        .then((designManagersUser) => {
            if (designManagersUser.length == 0) return res.status(400).json('No users found.');
            res.status(200).json(designManagersUser);
        })

        .catch((err) => res.status(400).json(err));
})

// router.put('/updatecustomerQuotationsActions/:id', async (req, res) => {
//     let query = req.params.id;
//     let update = req.body;
//     let options = { new: true };
//     try {
//         let lead = await Lead.findByIdAndUpdate(query, req.body, options)
//         res.status(200).json("Updated successfully");
//     } catch (error) {
//         res.status(400).send(error.message)
//     }
//     if (update.QuoteApprovedByCustomer[0].isApproved === true) {
//         try {
//             customerTransactions = new CustomerTransactions();
//             customerTransactions.leadId = query;
//             customerTransactions.amount = update.amount;
//             customerTransactions.paymentImageUrl = update.customerUploadedtranscation;
//             customerTransactions.stage = update.stage;
//             customerTransactions.uploadedBy = update.QuoteApprovedByCustomer[0].approvedBy;
//             customerTransactions.save();
//         } catch (error) {
//             console.log(error, ": erorr in save customerTransactions");
//         }
//     }
// })

router.get("/getallManagersData", async (req, res) => {
    try {
        const users = await User.find({})
            .select('roles name teamId')
            .populate('roles', 'name')
            .lean()
        res.status(200).json(users);
    } catch (error) {
        res.status(400).send(error)
    }
})

router.get('/getUserDetails/:_id',async(req,res)=>{
    try {
    let user = await User.findOne
        ({
            _id: req.params._id
        })
        .populate('roles locationId teamId')
        .populate({ path: 'teamId', populate: { path: 'manager', select: 'name' }, populate: { path: 'users', populate: { path: 'roles', select: 'name' }, select: 'name role' } })
        res.status(200).json(user);
    } catch (error) {
        res.status(400).send(error)
    }
})
module.exports = router;

const express = require('express')
const router = express.Router()
const LeadLog = require('../models/leadLog')
const User = require('../models/user');
const Lead = require('../models/lead');
const emailService = require('../services/email.service');

router.get('/:leadId', async (req, res) => {
  try {
    const leadLogs = await LeadLog.find({ leadId: req.params.leadId }).sort({ createdAt: -1 })
      .populate({ path: 'leadId', populate: { path: 'assignTo', select: '_id name email mobile' } })
      .populate({ path: 'leadId', populate: { path: 'departmentId', select: '_id name' } })
      .populate({ path: 'leadId', populate: { path: 'teamId', select: '_id name' } })
      .populate({ path: 'user', select: '_id name email mobile' })
      .populate({ path: 'taggedUser', select: '_id name email mobile' })
      .populate({ path: 'createdBy', select: '_id name email mobile' })

    if (leadLogs.length == 0) return res.status(404).json('No Logs Found')
    return res.status(200).json(leadLogs)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.post('/', async (req, res) => {
  try {
    req.body.createdBy = req.user
    let tagUsersList = await User.find({ _id: { $in: req.body.taggedUser } }).select('email mobile name')
    
    let customerData = await Lead.find({ _id: req.body.leadId })
      .select('lead_no')
      .populate('customerId', 'name email')
    
    if (tagUsersList.length !== 0) {
      for (let i = 0; i < tagUsersList.length; i++) {
        const subject = `Lead Notes Created For Lead Number ${customerData[0].lead_no}`;
        const text = `Dear ${tagUsersList[i].name}, Please check the notes which is created for lead Number: ${customerData[0].lead_no} and customer name: ${customerData[0].customerId.name}. Please check the note: ${req.body.notes}`;
        const html = `<p>Dear ${tagUsersList[i].name},</p>
          <p> Please check the notes which is created for <strong>lead Number: ${customerData[0].lead_no}</strong> and <strong>customer name: ${customerData[0].customerId.name}<strong>.</p>
          <p> Please check the note: <strong>${req.body.notes} </strong></p>`;

        await emailService.sendEmail(tagUsersList[i].email, subject, text, html);
      }
    }
    const leadLog = new LeadLog(req.body)
    await leadLog.save()
    return res.status(200).json('Note Added successfully')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/remindersOfDate', (req, res) => {
  let queryObj = {};

  let todayDate = new Date()

  if (req.body.flag === true) {
    var date = new Date(req.body.equalDate);
    start = date.setHours(date.getHours() + 0, 0, 0, 0);
    end = date.setHours(date.getHours() + 23, 59, 59, 999);
    var startd = new Date(start)
    var endd = new Date(end)
    startd.toString()
    endd.toString()
    queryObj.reminderDate = { $gte: startd, $lte: endd };
  } else if (req.body.flag === false) {
    let previousDate = new Date(req.body.dateBetween[0])
    todayDate = new Date(req.body.dateBetween[1])
    todayDate.setDate(todayDate.getDate() + 1);
    queryObj.reminderDate = { $gte: new Date(previousDate.setHours(0, 0, 0, 0)), $lte: new Date(todayDate.setHours(0, 0, 0, 0)) }
  }
  queryObj.createdBy = req.user._id;
  queryObj.taggedUser = req.user._id;
  LeadLog.find({ $and: [{ reminderDate: queryObj.reminderDate }, { $or: [{ createdBy: queryObj.createdBy }, { taggedUser: queryObj.taggedUser }] }] })
    .populate({ path: 'leadId', populate: { path: 'customerId', select: '_id name email mobile' } })
    .populate('createdBy')
    .sort({ createdAt: -1 })
    .lean()
    .then((logs) => {
      if (logs.length == 0) return res.status(400).json('No reminder found');
      else {
        return res.status(200).json(logs);
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(400).json('Error occurred');
    })
})

module.exports = router
const express = require('express');
const router = express.Router();
const RateCardMaster = require('../models/rateCardMaster')
const Organisation = require('../models/organisation')
const Lead = require('../models/lead');
const OrgRateCard = require('../models/orgRateCard')
const ProjectRateCard = require('../models/projectRateCard');
const ProjectRateCardMaster = require('../models/projectRateCardMaster');

router.post('/', async (req, res) => {
  try {
    // const org = await Organisation.findOne({ name: "decorpot" })
    req.body.orgId = req.user.orgId
    req.body.locationId = '61e7faac331230532d894dbf' //Bangalore
    // req.body.locationId = '61f22f30b2e70b55eca2c127' // Hyderbad
    // req.body.rateCardCode = `DPB001`
    req.body.rateCardCode = `DPBH001`
    req.body.isDefault = true
    req.body.createdBy = req.user._id
    const rateCardMaster = new RateCardMaster(req.body)
    await rateCardMaster.save()
    return res.status(201).json('Rate card master created successfully')
  } catch (error) {
    console.log(error)
    return res.status(400).json('Bad Request')
  }
})

router.get('/', async (req, res) => {
  try {
    const org = await Organisation.findOne({ name: "decorpot" })
    const rateCardMaster = await RateCardMaster.find({ orgId: org._id, locationId: req.user.locationId._id })
    return res.status(200).json(rateCardMaster)
  } catch (error) {
    console.log(error)
    return res.status(400).json('Bad Request')
  }
})

router.put('/', async (req, res) => {
  try {
    let query = { $and: [{ isDefault: true }, { orgId: req.body.orgId }, { locationId: req.user.locationId._id }] };
    const rateCardMaster = await RateCardMaster.findOne({});
    if (rateCardMaster.length == 0) {
      return res.status(404).json('No default rate card master found')
    }
    return res.status(200).json(rateCardMaster);
  } catch (error) {
    console.log(error)
    return res.status(400).send("Something went wrong!")
  }
})

router.get('/masterRateCardData', async (req, res) => {
  try {
    const rateCardMasterList = await RateCardMaster.find().select('rateCardCode locationId').populate('locationId', 'name').lean()
    if (rateCardMasterList.length == 0) {
      return res.status(200).json([])
    }
    return res.status(200).json(rateCardMasterList);
  } catch (error) {
    console.log(error)
    return res.status(400).send("Something went wrong!")
  }
})

router.get('/update_project_rate_card', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.query.leadId })
    const deleteCurrentRC = await ProjectRateCardMaster.deleteOne({ leadId: lead._id })
    const oldRateCard = await RateCardMaster.findOne({ _id: req.query.rateCardId })
    const defaultOrgRateCards = await OrgRateCard.find({ rateCardMasterId: oldRateCard._id })
    let obj = {
      leadId: lead._id,
      rateCardId: oldRateCard._id,
      markUp: 0,
      projectRateCardCode: `${oldRateCard.rateCardCode}.1.1`
    }
    const projectRateCardMaster = new ProjectRateCardMaster(obj)
    await projectRateCardMaster.save()
    const projectRateCards = []
    for (let i = 0; i < defaultOrgRateCards.length;i++){
      let obj = {
        itemId: defaultOrgRateCards[i].itemId,
        rate: defaultOrgRateCards[i].rate,
        projectRCMasterId: projectRateCardMaster._id,
        docType: defaultOrgRateCards[i].docType
      }
      projectRateCards.push(obj)
    } 
      const data = await ProjectRateCard.insertMany(projectRateCards)
    return res.status(200).json("successfully updated");
  } catch (error) {
    return new Error(error)
  }
})


router.get('/:locationId', async (req, res) => {
  try {
    const rateCardMasterList = await RateCardMaster.find({ locationId: req.params.locationId })
    if (rateCardMasterList.length == 0) {
      return res.status(200).json([])
    }
    return res.status(200).json(rateCardMasterList);
  } catch (error) {
    console.log(error)
    return res.status(400).send("Something went wrong!")
  }
})

module.exports = router
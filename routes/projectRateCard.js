const express = require('express')
const router = express.Router()
const ProjectRateCard = require('../models/projectRateCard')
const RateCardMaster = require('../models/rateCardMaster')
const OrgRateCard = require('../models/orgRateCard')
const ProjectRateCardMaster = require('../models/projectRateCardMaster')
const async = require('async')
const projectTypeMaster = require('../models/projectTypeMaster')

router.post('/', async (req, res) => {
  try {
    const rateCardMaster = await RateCardMaster.findOne({ isDefault: true, locationId: req.user.locationId._id })
    const projectRateCardMaster = await ProjectRateCardMaster.findOne({ rateCardId: rateCardMaster._id })
    const orgRateCard = await OrgRateCard.find({ rateCardMasterId: rateCardMaster._id })

    async.forEach(orgRateCard, async (orgRate) => {
      let obj = {
        itemId: orgRate.itemId,
        rate: orgRate.rate,
        projectRCMasterId: projectRateCardMaster._id,
        docType: orgRate.docType
      }
      const projectRateCard = new ProjectRateCard(obj)
      await projectRateCard.save()
    }, (err) => {
      if (err) return console.log(err)
      // console.log('done')
    })
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})


router.get('/default-rate-card/:leadId', async (req, res) => {
  try {

    const projectRateCardMaster = await ProjectRateCardMaster.findOne({ leadId: req.params.leadId })
    const projectRateCards = await ProjectRateCard.find({ projectRCMasterId: projectRateCardMaster._id })
      .populate('itemId')
      // .populate({ path: 'itemId', populate: { path: 'unit', select: 'name _id' } })
    // const finalArray = []
    // projectRateCards.forEach(rateCards => {
    //   if (rateCards.itemId !== null)
    //     finalArray.push(rateCards)
    // })
    return res.status(200).json(projectRateCards)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/:projectId', async (req, res) => {
  try {
    let projectRateDict = {}
    const projectRateCardMaster = await ProjectRateCardMaster.findOne({ leadId: req.params.projectId })
    const projectRateCards = await ProjectRateCard.find({ projectRCMasterId: projectRateCardMaster._id })
    for (let i = 0; i < req.body.length; i++) {
      projectRateDict[req.body[i].itemId._id] = {};
      projectRateDict[req.body[i].itemId._id].rate = req.body[i].rate
    }

    async.forEach(projectRateCards, async (projectRate) => {
      projectRate.rate = projectRateDict[projectRate.itemId].rate
      await projectRate.save()
    }, err => {
      if (err) return res.status(400).json(err)
    })
    return res.status(200).json('Project Rate Card Updated')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})
module.exports = router
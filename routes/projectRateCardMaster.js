const express = require('express')
const router = express.Router()
const RateCardMaster = require('../models/rateCardMaster')
const ProjectRateCardMaster = require('../models/projectRateCardMaster')

router.post('/', async (req, res) => {
  try {
    const rateCardMaster = await RateCardMaster.findOne({ isDefault: true })
    let obj = {
      projectId: '6154501b13b518292f34a969',
      rateCardId: rateCardMaster._id,
      markUp: 0,
      projectRateCardCode: `${rateCardMaster.rateCardCode}_1.1`
    }
    const projectRateCardMaster = new ProjectRateCardMaster(obj)
    await projectRateCardMaster.save()
    return res.status(200).json('Created')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.get('/getDefaultProjectRateCardMaster',async(req,res) =>{
  try {
    const projectRateCardMaster = await ProjectRateCardMaster.findOne({ leadId: req.query.leadId })
    return res.status(200).json(projectRateCardMaster)
  } catch (error) {
    return res.status(400).json(error)
  }
})

module.exports = router
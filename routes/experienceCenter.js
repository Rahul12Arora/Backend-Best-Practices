const express = require('express')
const router = express.Router()
const ExperienceCenter = require('../models/experienceCenter')

router.post('/', async (req, res) => {
  try {
    req.body.orgId = req.user.orgId
    const experienceCenter = new ExperienceCenter(req.body)
    await experienceCenter.save()
    return res.status(201).json('Experience Added Successfully')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.get('/', async (req, res) => {
  try {
    const experienceCenter = await ExperienceCenter.find({})
      .populate('locationId')
    if (experienceCenter.length == 0) return res.status(404).json({ message: "No Experience center found" })
    return res.status(200).json(experienceCenter)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.get('/:locationId', async (req, res) => {
  try {
    const experienceCenter = await ExperienceCenter.find({locationId: req.params.locationId})
      .populate('locationId')
    if (experienceCenter.length == 0) return res.status(404).json({ message: "No Experience center found" })
    return res.status(200).json(experienceCenter)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/:id', async (req, res) => {
  try {
    await ExperienceCenter.findByIdAndUpdate(req.params.id, { $set: req.body })
    return res.status(200).json('Experience Center Updated')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await ExperienceCenter.findByIdAndDelete(req.params.id)
    return res.status(200).json('Experience Center Deleted')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

module.exports = router
const express = require('express');
const router = express.Router();
const RateCardMaster = require('../models/rateCardMaster')
const OrgRateCard = require('../models/orgRateCard')
const ProductMaster = require('../models/productMaster')
const PlyTypeMaster = require('../models/plyTypeMaster')
const FinishTypeMaster = require('../models/finishTypeMaster')
const async = require('async')
const _ = require('lodash');

router.post('/', async (req, res) => {
  try {
    const rateCardMaster = await RateCardMaster.findOne({ isDefault: true, locationId: '61f22f30b2e70b55eca2c127' })
    const materials = await ProductMaster.find({ isActive: true })
    let orgRateCardArr = materials.map(material => {
      return {
        itemId: material._id,
        rateCardMasterId: rateCardMaster._id,
        docType: "ProductMaster",
        rate: material.newpricePerUnit ? material.newpricePerUnit : 0
      }
    })
    // console.log(orgRateCardArr)
    await OrgRateCard.insertMany(orgRateCardArr)
    return res.status(200).json('Done')
    // const plyTypeMaster = await PlyTypeMaster.find()
    // const finishTypeMaster = await FinishTypeMaster.find()
    // async.forEach(finishTypeMaster, async (finish) => {
    //   let obj = {
    //     itemId: finish._id,
    //     rateCardMasterId: rateCardMaster._id,
    //     docType: "FinishTypeMaster",
    //     rate: finish.newpricePerUnit
    //   }
    //   const orgRateCard = new OrgRateCard(obj)
    //   await orgRateCard.save()
    // }, err => {
    //   if (err) return err
    //   async.forEach(plyTypeMaster, async (ply) => {
    //     let obj = {
    //       itemId: ply._id,
    //       rateCardMasterId: rateCardMaster._id,
    //       docType: "PlyTypeMaster",
    //       rate: ply.pricePerUnit
    //     }
    //     const orgRateCard = new OrgRateCard(obj)
    //     await orgRateCard.save()
    //   }, err => {
    //     if (err) return err
    //     return res.status(200).json('done')
    //     // async.forEach(materials, async (material) => {
    //     //   let obj = {
    //     //     itemId: material._id,
    //     //     rateCardMasterId: rateCardMaster._id,
    //     //     docType: "ProductMaster",
    //     //     rate: material.pricePerUnit
    //     //   }
    //     //   const orgRateCard = new OrgRateCard(obj)
    //     //   await orgRateCard.save()
    //     // }, err => {
    //     //   if (err) return err
    //     //   return res.status(200).json('done')
    //     // })
    //   })
    // })
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.get('/:rateCardMasterId', async (req, res) => {
  try {
    const orgRateCard = await OrgRateCard.find({ rateCardMasterId: req.params.rateCardMasterId })
      .populate('itemId')
    if (orgRateCard.length === 0) return res.status(404).json('No Rate Cards Found')
    return res.status(200).json(orgRateCard)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.get('/getDeafult/rate-card', async (req, res) => {
  try {
    const rateCardMaster = await RateCardMaster.findOne({ isDefault: true, locationId: req.user.locationId._id })
    // console.log(rateCardMaster, "rateCardMaster")
    const orgRateCard = await OrgRateCard.find({ rateCardMasterId: rateCardMaster._id })
      .populate('itemId')
    if (orgRateCard.length === 0) return res.status(404).json('No Rate Cards Found')
    return res.status(200).json(orgRateCard)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/:rateCardMasterId', async (req, res) => {
  try {
    let orgRateDict = {}
    const orgRateCard = await OrgRateCard.find({ rateCardMasterId: req.params.rateCardMasterId })
    for (let i = 0; i < req.body.length; i++) {
      orgRateDict[req.body[i].itemId._id] = {};
      orgRateDict[req.body[i].itemId._id].rate = req.body[i].rate
    }

    async.forEach(orgRateCard, async (orgRate) => {
      orgRate.rate = orgRateDict[orgRate.itemId].rate
      await orgRate.save()
    }, err => {
      if (err) return res.status(400).json(err)
    })
    return res.status(200).json('Org Rate Card Updated')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.post('/clone-rate-card/:rateCardMasterId', async (req, res) => {
  try {
    const orgRateCard = await OrgRateCard.find({ rateCardMasterId: req.params.rateCardMasterId })
    const rateCardMasterId = await RateCardMaster.find({ locationId: req.user.locationId._id }).sort({ createdAt: -1 })
    let arr = rateCardMasterId[0].rateCardCode.split('0')
    let code = ++arr[arr.length - 1]
    let rateCardCode = `${arr[0]}00${code}`
    // console.log(rateCardCode)
    await RateCardMaster.findByIdAndUpdate(req.params.rateCardMasterId, { $set: { isDefault: false } })

    const newRateCardMasterId = new RateCardMaster({
      isDefault: true,
      rateCardCode,
      markUp: req.body.markUp,
      createdBy: req.user._id,
      orgId: rateCardMasterId[0].orgId,
      locationId: req.user.locationId._id
    })
    console.log(newRateCardMasterId)
    await newRateCardMasterId.save()
    let orgRateCardArr = orgRateCard.map(orgRate => {
      return {
        itemId: orgRate.itemId,
        rate: +orgRate.rate - (+orgRate.rate * (+req.body.markUp / 100)),
        rateCardMasterId: newRateCardMasterId._id,
        docType: orgRate.docType
      }
    })
    // console.log(orgRateCardArr)
    await OrgRateCard.insertMany(orgRateCardArr)
    return res.status(201).json(newRateCardMasterId)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/makeDefault/:rateCardMasterId', async (req, res) => {
  try {
    await RateCardMaster.findOneAndUpdate({ isDefault: true, locationId: req.user.locationId._id }, { $set: { isDefault: false } })
    const rateCardMasterId = await RateCardMaster.findByIdAndUpdate(req.params.rateCardMasterId, { $set: { isDefault: true } }, { new: true })
    await res.status(200).json(rateCardMasterId)
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

// To update the orgratecard price and material in product master collection
router.put('/editProductInOrgRateCard/:rateCardMasterId', async (req, res) => {
  try {
    let findQury = { itemId: req.body._id, rateCardMasterId: req.params.rateCardMasterId }
    await OrgRateCard.findOneAndUpdate(findQury, { $set: { rate: Number(req.body.pricePerUnit) } }, { new: true })

    let productId = req.body._id;
    let update = req.body;
    let options = { new: true };
    if (req.body.docType === 'ProductMaster') {
      await ProductMaster.findByIdAndUpdate(productId, update, options)
    } else if (req.body.docType === 'FinishTypeMaster') {
      await FinishTypeMaster.findByIdAndUpdate(productId, update, options)
    } else {
      await PlyTypeMaster.findByIdAndUpdate(productId, update, options)
    }

    return res.status(200).json('Product edited.')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

router.put('/addProductInOrgRateCard/:rateCardMasterId', async (req, res) => {
  try {
    let newMaterialData = [];
    if (req.body.docType === 'ProductMaster') {
      const productMaster = new ProductMaster({
        name: req.body.name,
        description: req.body.description,
        pricePerUnit: Number(req.body.pricePerUnit),
        priority: req.body.priority,
        unitId: req.body.unitId,
        subUnitType: req.body.subUnitType,
        scopeId: req.body.scopeId,
        plyInclude: req.body.plyInclude,
        finishInclude: req.body.finishInclude,
        isActive: true,
        code: req.body.code
      })
      newMaterialData = await productMaster.save()
    } else if (req.body.docType === 'FinishTypeMaster') {
      const finishTypeMaster = new FinishTypeMaster({
        name: req.body.name,
        description: req.body.description,
        pricePerUnit: Number(req.body.pricePerUnit),
        unitId: req.body.unitId,
        isActive: true
      })
      newMaterialData = await finishTypeMaster.save()
    } else {
      const plyTypeMaster = new PlyTypeMaster({
        name: req.body.name,
        description: req.body.description,
        pricePerUnit: Number(req.body.pricePerUnit),
        isActive: true
      })
      newMaterialData = await plyTypeMaster.save()
    }

    const orgRateCard = new OrgRateCard({
      docType: req.body.docType,
      itemId: newMaterialData._id,
      rate: Number(req.body.pricePerUnit),
      rateCardMasterId: req.params.rateCardMasterId,
      isActive: true
    })
    await orgRateCard.save()

    return res.status(200).json('Product added successfully.')
  } catch (error) {
    console.log(error)
    return res.status(400).json(error)
  }
})

// Org Rate Card Items Active and InActive
router.put('/deactivate/:id', (req, res) => {
  OrgRateCard.findOne({itemId: req.params.id, rateCardMasterId: req.body.rateCardMasterId})
      .select('isActive')
      .then((product) => {
        if (product.isActive) {
          product.isActive = false;
          // ProjectComponentMaster.findOneAndUpdate({ products: { $in: req.params.id } }, { $pull: { products: req.params.id } });
        } else {
          product.isActive = true;
        }
        return product.save();
      })
      .then(() => {
        res.status(200).json('Successful');
      })
      .catch((err) => res.status(400).send(err));
});

module.exports = router
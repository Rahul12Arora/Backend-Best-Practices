const express = require('express');
const router = express.Router();
const _ = require('lodash');
const request = require('request');
const fs = require('fs');
const path = require('path');
const async = require('async');
const uuidv4 = require('uuid/v4');


const auth = require('../middlewares/authentication');
const Quotation = require('../models/quotation');
const Project = require('../models/project');
const quotationService = require('../services/quotation.service');
const Pdf = require('../services/generatePdf.service');
const Image = require('../models/image');
const Lead = require('../models/lead')
const ProjectComponent = require('../models/projectComponent');
const { populate } = require('../models/lead');


router.post('/new', auth, (req, res) => {
    let projectDate;
    Lead.findOne({ _id: req.body.leadId })
        .then((pro) => {
            projectDate = pro.createdAt;
            let quotation = new Quotation({
                // projectId: req.body.projectId,
                leadId: req.body.leadId,
                createdBy: req.user._id,
                discountOnAllScopes: req.body.discountOnAllScopes,
                eligibleDiscountScopes: req.body.eligibleDiscountScopes,
                eligibleNonDiscountScopes: req.body.eligibleNonDiscountScopes,
                totalDiscPrAmnt: req.body.totalDiscPrAmnt,
                discItemsSubTotal: req.body.discItemsSubTotal,
                totalNonDiscPrAmnt: req.body.totalNonDiscPrAmnt,
                totalAmount: req.body.totalAmount,
                miscTotal: req.body.miscTotal,
                discountPercent: req.body.discountPercent,
                taxPercent: req.body.taxPercent,
                version: req.body.version,
                components: req.body.components,
                grandTotal: req.body.grandTotal,
                materialProcured: req.body.materialProcured
            });
            return quotation.save();
        })
        .then((quotation) => {
            // return res.status(200).json(quotation);
            return quotationService.findQuotation(quotation._id)
        })
        .then((quotationDetails) => {
            let flag = false
            return Pdf.generatePdf(quotationDetails, projectDate,flag);
        })
        .then((quotationObj) => {
            // console.log(quotationObj,"aaya hai");
            return Quotation.findOneAndUpdate({ version: req.body.version, leadId: req.body.leadId }, { $set: { s3Location: quotationObj.pdfUrl, totalCustomerOutflow: quotationObj.customerOutFlow } }, { new: true });
        })
        .then(async(quotation) => {
            let flag = true
          let quotationDetails = await quotationService.findQuotation(quotation._id)
           let maskedQuotation = await Pdf.generatePdf(quotationDetails, projectDate,flag);
            await Quotation.findOneAndUpdate({ version: req.body.version, leadId: req.body.leadId }, { $set: { maskedQuotationS3: maskedQuotation.pdfUrl }});

            let grandTotal = 0;
            let subTotal = 0;
            let taxAmount = 0;
            let discountAmount = 0;
            let tempSubtotal = 0;

            if (quotation.discountPercent) {
                tempSubtotal = ((quotation.totalAmount * (100 - quotation.discountPercent)) / 100);

                if (quotation.miscellaneousComponent) {
                    // quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
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
            quotation.tempSt = parseInt(tempSubtotal.toFixed(0));
            quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
            quotation.subTotal = parseInt(subTotal.toFixed(0));
            quotation.customerToBeProcured = parseInt((tempSubtotal * quotation.materialProcured) / 100);
            quotation.decorpotScope = parseInt(quotation.tempSt - quotation.totalCustomerOutflow);
            quotation.grandTotal = parseInt(grandTotal.toFixed(0));
            quotation.taxAmount = parseInt(taxAmount.toFixed(0));
            quotation.gstValue = parseInt(quotation.decorpotScope * 0.18);
            let mainTotal = 0;
            quotation.finalTotal = parseInt(quotation.grandTotal + quotation.totalCustomerOutflow);
            if (quotation.miscellaneousComponent) {
                quotation.mainTotal = quotation.decorpotScope + quotation.gstValue + quotation.miscellaneousComponent.componentPrice;
            } else {
                quotation.mainTotal = quotation.decorpotScope + quotation.gstValue;
            }
            quotation.customerOutFlow = quotation.mainTotal + quotation.totalCustomerOutflow;
            return Lead.findByIdAndUpdate(req.body.leadId, { $set: { grandTotal: req.body.grandTotal, discountPercent: req.body.discountPercent, taxPercent: req.body.taxPercent, totalCustomerOutflow: quotation.customerOutFlow, materialProcuredPercent: quotation.materialProcured } });
        })
        .then(() => {
            res.status(200).json('Quotation saved and uploaded.');
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send(err)
        });
});

router.get('/getMaskedQuotation/:quotationId', async (req, res) => {
    try {
        let flag = true
        let quotationDetails = await quotationService.findQuotation(req.params.quotationId)
        let maskedQuotation = await Pdf.generatePdf(quotationDetails, quotationDetails.createdAt, flag);
        await Quotation.findOneAndUpdate({ _id: req.params.quotationId }, { $set: { maskedQuotationS3: maskedQuotation.pdfUrl }});
        res.status(200).json({ message: 'Quotation generated successfully.', link: maskedQuotation.pdfUrl });
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
})

// Get quotations of a project
router.get('/all/:leadId', auth, (req, res) => {
    Quotation.find({ leadId: req.params.leadId })
        .select('version s3Location maskedQuotationS3 createdAt updatedAt grandTotal totalCustomerOutflow')
        .populate({ path: 'createdBy', select: 'name' })
        .then((quotations) => {
            if (quotations.length == 0) return res.status(200).send([]);
            res.status(200).send(quotations);
        })
        .catch((err) => res.status(400).send(err))
});

// Clone quotations of a Lead
router.get('/cloneSelectedQuotation', auth, (req, res) => {
    Quotation.find({ _id: req.query.versionId, leadId: req.query.leadId })
        .then( async (quotations) => {
            if (quotations.length == 0) return res.status(200).send([]);
            let removeExistingComponent = await ProjectComponent.deleteMany({ leadId: req.query.leadId });
            let leadComponents = quotations[0].components
            for (let i = 0; i < leadComponents.length; i++) {
                let projectComp = new ProjectComponent({
                    leadId: req.query.leadId,
                    categoryId: leadComponents[i].categoryId,
                    priority: i + 1,
                    plyType: leadComponents[i].plyType,
                    products: leadComponents[i].products
                })
                await projectComp.save();
            }
            res.status(200).json('Quotation clone successfully.');
        })
        .catch((err) => res.status(400).send(err))
});


//only for testing purpose
// router.get('/:id', (req, res) => {
//     let quotationDetails = {};
//     quotationService.findQuotation(req.params.id)
//         .then((quotation) => {
//             if (!quotation) return res.status(404).send('Quotation not found.');
//             quotationDetails = quotation;
//             return Pdf.generatePdf(quotation, new Date());
//         })
//         .then(() => {
//             res.status(200).send(quotationDetails);
//         })
//         .catch((err) => res.status(400).send(err))
// });

router.get('/:id', (req, res) => {
    quotationService.findQuotation(req.params.id)
        .then((quotation) => {
            res.status(200).send(quotation);
        })
        .catch((err) => res.status(400).send(err))
})


router.get('/excel/:id', auth, (req, res) => {

    quotationService.findQuotation(req.params.id)
        .then((quotation) => {
            try {
                quotation = quotation.toJSON();
                let componentPrice = 0;
                quotation.components.forEach(component => {
                    component.products.forEach(product => {
                        product.productPrice = parseInt(product.productPrice);
                        if (product.product.subUnitType == 'Area') {
                            componentPrice += product.productPrice;
                        } else {
                            // calculating product Custom Price
                            if (product.productCustomPrice != 0) {
                                componentPrice += (product.productCustomPrice * product.area);
                            } else {
                                componentPrice += product.productPrice;
                            }
                        }
                    });
                    component.componentPrice = 0;
                    component.componentPrice = componentPrice;
                    componentPrice = 0;
                });
                // creating miscellaneous component
                quotation.components.forEach(component => {
                    if (component.categoryId.name.toLowerCase() == 'miscellaneous') {
                        quotation.miscellaneousComponent = component;
                        _.pull(quotation.components, component);
                    }
                });
                date = new Date(quotation.createdAt);
                quotation.createdAt = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
                quotation.createdAtForfilename = date.getDate() + '' + (date.getMonth() + 1) + '' + date.getFullYear();
                // quotation.date = date;
                // let grandTotal = 0;
                // let subTotal = 0;
                // let taxAmount = 0;
                // let discountAmount = 0;
                // if (quotation.discountPercent) {
                //     if (quotation.miscellaneousComponent) {
                //         quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
                //         discountAmount = (quotation.totalAmount * ((quotation.discountPercent)) / 100);
                //         taxAmount = (quotation.totalAmount - discountAmount) * (quotation.taxPercent / 100);
                //         subTotal = quotation.totalAmount + taxAmount - discountAmount;
                //         grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                //     } else {
                //         discountAmount = (quotation.totalAmount * ((quotation.discountPercent)) / 100);
                //         taxAmount = (quotation.totalAmount - discountAmount) * (quotation.taxPercent / 100);
                //         grandTotal = quotation.totalAmount + taxAmount - discountAmount;
                //     }
                //     quotation.discountAmount = parseInt(discountAmount);
                // } else {
                //     if (quotation.miscellaneousComponent) {
                //         quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
                //         taxAmount = quotation.totalAmount * (quotation.taxPercent / 100);
                //         subTotal = quotation.totalAmount + taxAmount;
                //         grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                //     } else {
                //         taxAmount = quotation.totalAmount * (quotation.taxPercent / 100);
                //         grandTotal = quotation.totalAmount + taxAmount;
                //     }
                // }
                // quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
                // quotation.subTotal = parseInt(subTotal.toFixed(0));
                // quotation.grandTotal = parseInt(grandTotal.toFixed(0));
                // quotation.taxAmount = parseInt(taxAmount.toFixed(0));
                quotation.date = date;
                let grandTotal = 0;
                let subTotal = 0;
                let taxAmount = 0;
                let discountAmount = 0;
                let tempSubtotal = 0;


                if (quotation.discountOnAllScopes == true) {
                    if (quotation.discountPercent) {
                        tempSubtotal = ((quotation.totalAmount * (100 - quotation.discountPercent)) / 100);

                        if (quotation.miscellaneousComponent) {
                            // quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
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
                        quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
                        quotation.subTotal = parseInt(subTotal.toFixed(0));
                        quotation.grandTotal = parseInt(grandTotal.toFixed(0));
                        quotation.taxAmount = parseInt(taxAmount.toFixed(0));
                        // tempSubtotal = quotation.totalAmount;
                    }
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

                } else {
                    let totalAmount = 0;
                    if (quotation.totalDiscPrAmnt || quotation.totalNonDiscPrAmnt) {
                        totalAmount = quotation.totalDiscPrAmnt + quotation.totalNonDiscPrAmnt;
                    } else {
                        totalAmount = quotation.totalAmount;
                    }
                    if (quotation.discountPercent) {
                        tempSubtotal = ((totalAmount * (100 - quotation.discountPercent)) / 100);

                        if (quotation.totalDiscPrAmnt || quotation.totalNonDiscPrAmnt) {
                            discountAmount = (quotation.totalDiscPrAmnt * ((quotation.discountPercent)) / 100);
                        } else {
                            discountAmount = (totalAmount * ((quotation.discountPercent)) / 100);
                        }

                        if (quotation.miscellaneousComponent) {

                            taxAmount = (totalAmount - discountAmount) * (quotation.taxPercent / 100);
                            subTotal = totalAmount + taxAmount - discountAmount;
                            grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                        } else {
                            taxAmount = (totalAmount - discountAmount) * (quotation.taxPercent / 100);
                            grandTotal = totalAmount + taxAmount - discountAmount;
                        }
                        quotation.discountAmount = parseInt(discountAmount);
                    } else {
                        tempSubtotal = totalAmount;
                        if (quotation.miscellaneousComponent) {
                            quotation.totalAmount = totalAmount - quotation.miscellaneousComponent.componentPrice;
                            taxAmount = totalAmount * (quotation.taxPercent / 100);
                            subTotal = totalAmount + taxAmount;
                            grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                        } else {
                            taxAmount = totalAmount * (quotation.taxPercent / 100);
                            grandTotal = totalAmount + taxAmount;
                        }
                    }
                    //quotation.discItemsSubTotal = parseInt(quotation.discItemsSubTotal.toFixed(0))
                    quotation.tempSt = parseInt(tempSubtotal.toFixed(0));
                    quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
                    quotation.subTotal = parseInt(subTotal.toFixed(0));
                    //quotation.customerToBeProcured = parseInt((tempSubtotal * quotation.materialProcured) / 100);
                    //quotation.decorpotScope = parseInt(quotation.tempSt - quotation.customerToBeProcured);
                    quotation.grandTotal = parseInt(grandTotal.toFixed(0));
                    quotation.taxAmount = parseInt(taxAmount.toFixed(0));
                    quotation.gstValue = parseInt((quotation.tempSt) * 0.18);
                    let mainTotal = 0;
                    quotation.finalTotal = parseInt(quotation.grandTotal);
                    if (quotation.miscellaneousComponent) {
                        quotation.mainTotal = quotation.tempSt + quotation.gstValue + quotation.miscellaneousComponent.componentPrice;
                    } else {
                        quotation.mainTotal = quotation.gstValue + quotation.tempSt;
                    }
                    quotation.customerOutFlow = quotation.mainTotal;
                    // quotation.procuredAmount = parseInt(((quotation.grandTotal)*quotation.materialProcured)/100);
                    quotation.netPayable = parseInt(quotation.grandTotal);
                }

                res.status(200).send(quotation);
            }
            catch (err) {
                console.log('err: ', err)
            }
        })
        .catch((err) => res.status(400).send(err))
});

// Delete a quotation
router.delete('/remove/:id', auth, (req, res) => {
    Quotation.findQuoteById(req.params.id)
        .then((quotation) => {
            if (quotation.finalized) return res.status(400).send('Quotation finalized.');
            return Quotation.deleteOne({ _id: req.params.id });
        })
        .then(() => {
            res.status(200).send('Quotation deleted.');
        })
        .catch((err) => res.status(400).send(err));
});


router.get('/discount/:id', auth, (req, res) => {
    Quotation.find({ projectId: req.params.id }).limit(1).sort({ $natural: -1 })
        .select('discountPercent')
        .then((quotes) => {
            if (!quotes) return res.status(404).send('Discount not found.');
            res.status(200).send({ discountPerc: quotes[0].discountPercent });
        })
        .catch((err) => res.status(400).send(err));

});

router.get('/materialToBeProcured/:id', auth, (req, res) => {
    Quotation.find({ projectId: req.params.id }).limit(1).sort({ $natural: -1 })
        .select('materialProcured')
        .then((quotes) => {
            // console.log("ppppppp", quotes)
            if (!quotes) return res.status(404).send('materialProcured not found.');
            res.status(200).send({ materialProcured: quotes[0].materialProcured });
        })
        .catch((err) => res.status(400).send(err));

});


router.get('/lastQuotationOfProject/:id', auth, (req, res) => {
    Quotation.findOne({ leadId: req.params.id })
        .sort({ createdAt: -1 }).limit(1)
        .populate({ path: 'createdBy', select: 'name contact_no email -_id' })
        .populate({ path: 'leadId', populate: { path: 'customerId', select: 'name email -_id' }, select: 'lead_no status -_id discountOnAllScopes' })
        .populate({ path: 'components.plyType', select: 'name pricePerUnit -_id' })
        .populate({ path: 'components.categoryId', select: 'name -_id' })
        .populate({ path: 'components.products.product', populate: { path: 'scopeId', select: 'name' }, select: 'name code description pricePerUnit subUnitType plyInclude finishInclude -_id' })
        .populate({ path: 'components.products.finishType', select: 'name pricePerUnit -_id' })
        .populate({ path: 'components.products.unitType', select: 'name description pricePerUnit -_id' })
        .populate({ path: 'components.products.images', populate: { path: 'uploadedBy', select: 'name' }, select: 's3Location createdAt uploadedBy -_id' })
        // .sort({ 'components.products.priority': 1 })
        .sort({ 'components.products.priority': 1 })
        .then(
            (quotation) => {
                // console.log(quotation);
                if (quotation.length == 0) return res.status(400).send('Quotation not found.');
                quotation = quotation.toJSON();
                let componentPrice = 0;
                quotation.components.forEach(component => {
                    component.products.forEach(product => {
                        product.productPrice = parseInt(product.productPrice);
                        if (product.product.subUnitType == 'Area') {
                            componentPrice += product.productPrice;
                        } else {
                            // calculating product Custom Price
                            if (product.productCustomPrice != 0) {
                                componentPrice += (product.productCustomPrice * product.area);
                            } else {
                                componentPrice += product.productPrice;
                            }
                        }
                    });
                    component.componentPrice = 0;
                    component.componentPrice = componentPrice;
                    componentPrice = 0;
                });
                // creating miscellaneous component
                quotation.components.forEach(component => {
                    if (component.categoryId.name.toLowerCase() == 'miscellaneous') {
                        quotation.miscellaneousComponent = component;
                        _.pull(quotation.components, component);
                    }
                });
                date = new Date(quotation.createdAt);
                quotation.createdAt = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
                quotation.createdAtForfilename = date.getDate() + '' + (date.getMonth() + 1) + '' + date.getFullYear();
                // quotation.date = date;
                // let grandTotal = 0;
                // let subTotal = 0;
                // let taxAmount = 0;
                // let discountAmount = 0;
                // if (quotation.discountPercent) {
                //     if (quotation.miscellaneousComponent) {
                //         quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
                //         discountAmount = (quotation.totalAmount * ((quotation.discountPercent)) / 100);
                //         taxAmount = (quotation.totalAmount - discountAmount) * (quotation.taxPercent / 100);
                //         subTotal = quotation.totalAmount + taxAmount - discountAmount;
                //         grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                //     } else {
                //         discountAmount = (quotation.totalAmount * ((quotation.discountPercent)) / 100);
                //         taxAmount = (quotation.totalAmount - discountAmount) * (quotation.taxPercent / 100);
                //         grandTotal = quotation.totalAmount + taxAmount - discountAmount;
                //     }
                //     quotation.discountAmount = parseInt(discountAmount);
                // } else {
                //     if (quotation.miscellaneousComponent) {
                //         quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
                //         taxAmount = quotation.totalAmount * (quotation.taxPercent / 100);
                //         subTotal = quotation.totalAmount + taxAmount;
                //         grandTotal = subTotal + quotation.miscellaneousComponent.componentPrice;
                //     } else {
                //         taxAmount = quotation.totalAmount * (quotation.taxPercent / 100);
                //         grandTotal = quotation.totalAmount + taxAmount;
                //     }
                // }
                // quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
                // quotation.subTotal = parseInt(subTotal.toFixed(0));
                // quotation.grandTotal = parseInt(grandTotal.toFixed(0));
                // quotation.taxAmount = parseInt(taxAmount.toFixed(0));
                quotation.date = date;
                let grandTotal = 0;
                let subTotal = 0;
                let taxAmount = 0;
                let discountAmount = 0;
                let tempSubtotal = 0;

                if (quotation.discountPercent) {
                    tempSubtotal = ((quotation.totalAmount * (100 - quotation.discountPercent)) / 100);

                    if (quotation.miscellaneousComponent) {
                        // quotation.totalAmount = quotation.totalAmount - quotation.miscellaneousComponent.componentPrice;
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
                    quotation.totalAmount = parseInt(quotation.totalAmount.toFixed(0));
                    quotation.subTotal = parseInt(subTotal.toFixed(0));
                    quotation.grandTotal = parseInt(grandTotal.toFixed(0));
                    quotation.taxAmount = parseInt(taxAmount.toFixed(0));
                    // tempSubtotal = quotation.totalAmount;
                }
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
                res.status(200).json(quotation);
            }
        )
        .catch(
            (error) => {
                console.log(error);
                res.status(400).send("Quoation does not exist");
            }
        )
})



router.put('/editQuotation/:id', auth, (req, res) => {
    let sendUrls = [];
    let idsOfImages = [];
    let quotDetails = {};
    let qtObj = {};
    Quotation.findById(req.params.id)
        .then((quots) => {
            return new Promise((resolve, reject) => {
                let arr = [];
                async.forEach(req.body.images, function (image, callback) {
                    var filename = uuidv4();
                    var base64Data = image.split(';base64,').pop();
                    assetsPath = path.join(__dirname, `../imageUploads/`);
                    let imagePath = path.join(`${assetsPath}image${filename}.jpeg`);
                    fs.writeFile(imagePath, base64Data, { encoding: 'base64' }, function (err) {
                        arr.push(imagePath);
                        callback();
                    });
                }, (err) => {
                    resolve(arr);
                })

            })
        })
        .then((locations) => {
            let imageUrl = new Array();
            return new Promise((resolve, reject) => {
                async.forEach(locations, function (loc, callback) {
                    formData = {
                        // customerName: quotation.projectId.customerId.name,
                        file: fs.createReadStream(loc)
                    }
                    let apiUrl = '';
                    if (process.env.NODE_ENV == 'production') {
                        apiUrl = 'http://13.233.26.162:5003/api/file/upload?';
                    } else {
                        apiUrl = 'http://localhost:5003/api/file/upload?';
                    }
                    request.post({ url: apiUrl + 'type=images', formData: formData }, function (err, res) {
                        if (err) return console.log(err);
                        str = res.body.slice(1, -1);
                        imageUrl.push(str);
                        callback();
                    });
                }, (err) => {
                    resolve(imageUrl);
                })
            })

        })

        .then((urls) => {
            sendUrls = urls;
            let imageId = [];
            return new Promise((resolve, reject) => {
                async.forEach(urls, function (url, callback) {
                    let image = new Image({ s3Location: url });
                    image.uploadedBy = req.user._id;
                    image.save(function (err, res) {
                        imageId.push(res._id);
                        callback();
                    });
                }, (err) => {
                    resolve(imageId);
                })
            })

        })
        .then((ids) => {
            idsOfImages = ids;
            return Quotation.findById(req.params.id);
        })
        .then((quotation) => {
            let component = quotation.components.id(req.body.componentId);
            let product = component.products.id(req.body.productId);
            product.images.push(...idsOfImages);
            quotation.noOfImages = quotation.noOfImages + idsOfImages.length;
            return quotation.save();
        })
        .then((savedQuotation) => {
            let componentofSaved = savedQuotation.components.id(req.body.componentId);
            let products = componentofSaved.products;
            if (componentofSaved.projCompId) {
                return ProjectComponent.findByIdAndUpdate(componentofSaved.projCompId, { $set: { products: products } });
            } else {
                return;
            }
        })
        .then((upd) => {
            res.status(200).json(sendUrls);

        })
        .catch(
            (error) => {
                res.status(400).json("Quoation does not exist");
            }
        )

})


router.put('/editQuotationOnCompleted/:id', auth, (req, res) => {
    Quotation.findById(req.params.id)
        .then((quotation) => {
            let component = quotation.components.id(req.body.componentId);
            let product = component.products.id(req.body.productId);
            product.isCompleted = req.body.isCompleted;

            return quotation.save();
        })
        .then((savedQuotation) => {
            let componentofSaved = savedQuotation.components.id(req.body.componentId);
            let products = componentofSaved.products;
            if (componentofSaved.projCompId) {
                return ProjectComponent.findByIdAndUpdate(componentofSaved.projCompId, { $set: { products: products } });
            } else {
                return;
            }

        })
        .then((upd) => {
            res.status(200).json('Updated');

        })
        .catch(
            (error) => {
                res.status(400).json("Quoation does not exist");
            }
        )

})



// router.put('/testing', (req, res) => {
//     Quotation.update(
//         {
//             //   "components._id" : req.body.componentId,
//             "components.products._id": "5c713b3567e0e00ef4733b38",
//             "comonents.products._id": { $elemMatch: { _id: "5c713b3567e0e00ef4733b38" } }
//         },
//         { "$push": { "components.products.$.images": ["5d31728a1b4f900d64dfecc1"] } },
//         { upsert: true }
//         // { arrayFilters: [ { "inner._id": "5c713b3567e0e00ef4733b38" } ],upsert : true }
//     )
//         // Quotation.command({
//         //     update: <YourModel>.collection.name,
//         //     updates: [
//         //       {
//         //         q: { 'field1.field2._id': mongoose.Types.ObjectId(<someObjectid>) },
//         //         u: {
//         //           $set: { 'field1.$.field2.$[field].fieldToUpdate': "updated!" },
//         //         },
//         //         arrayFilters: [
//         //           { 'field._id': mongoose.Types.ObjectId(<someObjectid>) },
//         //         ],
//         //       },
//         //     ],
//         //   })  
//         .then((updated) => {
//             console.log("updated");
//         })

// })

// router.put('/testing', (req, res) => {
//     let productId = '5c713b3567e0e00ef4733b39';
//     let imageId = "5d3548edb9b07b56e2820bea";
//     Quotation.updateOne(
//         {
//             "components.products._id": productId,
//         },
//         {
//             $push: {
//                 "components.0.products.0.images.$": imageId
//             }
//         }
//     )
//         .then((updated) => {
//             console.log(updated, "updated");
//         })
//         .catch((err) => {
//             console.log(err);
//         })

// })



router.get('/customerquote/:quotationId', (req, res) => {
    Quotation.find({ _id: req.params.quotationId })
        .populate({ path: 'leadId' })
        .populate({ path: 'components' })
        .populate({ path: 'components.categoryId', populate: { path: 'products', select: 'name code priority pricePerUnit subUnitType unitId isActive plyInclude finishInclude' }, select: 'name priority' })
        .populate({ path: 'components.products.product', populate: { path: 'scopeId', select: 'name eligibleForDiscount' }, select: 'name code pricePerUnit subUnitType isActive plyInclude finishInclude newpricePerUnit' })
        .populate({ path: 'components.products.finishType' })
        .populate({ path: 'components.products.unitType' })
        .sort({ 'createdAt': 1 })
        .then((components) => {
            if (components.length == 0) return res.status(200).json([]);
            
            res.status(200).send(components);
        })
        .catch((err) => res.status(400).send(err));
});

module.exports = router;


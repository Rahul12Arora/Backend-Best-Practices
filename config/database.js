module.exports = {
  // database: process.env.database || 'mongodb+srv://quotationToolProdUser:quotationToolProdUser@quotationtoolprodcluste.mxyru.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', // PROD
  // database: process.env.database || 'mongodb+srv://erpProdUser:erpProdUser@erp-inventoryproduction.vbhrq.mongodb.net/inventory_tool?retryWrites=true&w=majority', // prod
  database: process.env.database || 'mongodb+srv://erpProdUser:erpProdUser@erptest.vbhrq.mongodb.net/inventory_tool?retryWrites=true&w=majority', // test
  //database: process.env.database || 'mongodb://13.232.135.17:27017/quotation_tool',
  secret: 'secret'
}
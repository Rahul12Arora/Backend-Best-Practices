const lead = require('../routes/lead');
const user = require('../routes/user');
const customer = require('../routes/customer');
const project = require('../routes/project');
const quotation = require('../routes/quotation');
const projectComponentMaster = require('../routes/projectComponentMaster');
const projectComponent = require('../routes/projectComponent');
const productMaster = require('../routes/productMaster');
const projectTypeMaster = require('../routes/projectTypeMaster');
const plyTypeMaster = require('../routes/plyTypeMaster');
const finishTypeMaster = require('../routes/finishTypeMaster');
const unitTypeMaster = require('../routes/unitTypeMaster');
const assign = require('../routes/assign');
const dashboard = require('../routes/dashboard');
const department = require('../routes/department');
const projectLog = require('../routes/projectLog');
const file = require('../routes/file');
const taxMaster = require('../routes/taxMaster');
const discount = require('../routes/discount');
const snag = require('../routes/snag');
const scopeMaster = require('../routes/scopeMaster');
const team = require('../routes/team');
const query = require('../routes/query');
const ratio = require('../routes/ratio');
const customerProcurementMaster = require('../routes/customerProcurementMaster');
const sourceOfLead = require('../routes/sourceOfLead');
const leadMaster = require('../routes/sourceOfLeadMaster');
const report = require('../routes/report');
const target = require('../routes/target');
const scopeStage = require('../routes/scopeStage');
const auth = require('../middlewares/authentication');
const rateCardMaster = require('../routes/rateCardMaster')
const orgRateCard = require('../routes/orgRateCard')
const projectRateCardMaster = require('../routes/projectRateCardMaster')
const projectRateCard = require('../routes/projectRateCard')
const leadLog = require('../routes/leadLog')
const location = require('../routes/location')
const experienceCenter = require('../routes/experienceCenter')
const checklist = require("../routes/checklist")
const erpProject = require("../routes/erpProject");
const customerServey = require("../routes/customerServey");
const siteBomProject = require("../routes/siteBomProject");
const imosProjects = require("../routes/imosProject");
const chmleads = require("../routes/chmleads");
const vendorAssignmentLeads = require('../routes/vendorAssignment')

module.exports = function (app) {
    app.use('/api/location', auth, location)
    app.use('/api/experience-center', auth, experienceCenter)
    app.use('/api/leadLog', auth, leadLog)
    app.use('/api/project-rate-card', projectRateCard)
    app.use('/api/project-rate-card-master', projectRateCardMaster)
    app.use('/api/org-rate-card', auth, orgRateCard)
    app.use('/api/rate-card-master', auth, rateCardMaster)
    app.use('/api/user', user);
    app.use('/api/customer', customer);
    app.use('/api/project',auth, project);
    app.use('/api/projectComponentMaster', projectComponentMaster);
    app.use('/api/projectComponent', projectComponent);
    app.use('/api/productMaster', productMaster);
    app.use('/api/quotation', quotation);
    app.use('/api/projectTypeMaster', projectTypeMaster);
    app.use('/api/plyTypeMaster', plyTypeMaster);
    app.use('/api/finishTypeMaster', finishTypeMaster);
    app.use('/api/unitTypeMaster', unitTypeMaster);
    app.use('/api/assignTo', assign);
    app.use('/api/dashboard', dashboard);
    app.use('/api/department', department);
    app.use('/api/projectLog', projectLog);
    app.use('/api/file', file);
    app.use('/api/tax', taxMaster);
    app.use('/api/discount', discount);
    app.use('/api/snag', snag);
    app.use('/api/scopeMaster', scopeMaster);
    app.use('/api/lead', auth, lead);
    app.use('/api/team', team);
    app.use('/api/query', query);
    app.use('/api/ratio', ratio);
    app.use('/api/customerProcurementMaster', customerProcurementMaster);
    app.use('/api/sourceOfLead', sourceOfLead);
    app.use('/api/scopeStage', scopeStage);
    app.use('/api/leadMaster', leadMaster);
    app.use('/api/report', report);
    app.use('/api/target', target);
    app.use('/api/checklist', checklist);
    app.use('/api/erpProject', erpProject)
    app.use('/api/customerServey', auth, customerServey);
    app.use('/api/siteBomProject',auth,siteBomProject);
    app.use('/api/imosProjects', auth, imosProjects);
    app.use('/api/chmleads', auth, chmleads);
    app.use('/api/vendorAssignmentLeads', vendorAssignmentLeads);
}

var express = require('express');


const publicController = require('../controllers/publicController')


var router = express.Router();

// TESTERS ============================
// ====================================

router.get(['/'],publicController.index);

router.get(['/commenter'],publicController.indexCommenter);

router.get(['/add-videos'],publicController.addVideos);
router.post(['/add-videos'],publicController.addVideosSubmit);


module.exports = router;

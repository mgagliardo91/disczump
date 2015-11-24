var mongoose = require('mongoose');
var shortId = require('shortid');
var _ = require('underscore');

var discSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: String,
    brand: String,
    name: String,
    type: String,
    weight: String,
    material: String,
    color: String,
    speed: String,
    glide: String,
    turn: String,
    fade: String,
    notes: String,
    primaryImage: String,
    imageList: [{
        _id: {
    	    type: String,
    	    unique: true,
    	    default: shortId.generate
    	},
        fileId: String,
        thumbnailId: String
    }],
    tagList: [String],
    visible: {type:Boolean, default: false},
    condition: String,
    createDate: {type: Date, default: Date.now}
    
});

discSchema.methods.getImage = function() {
    if (this.primaryImage) {
        return _.findWhere(this.imageList, {_id:this.primaryImage});
    } else {
        return undefined;
    }
}

discSchema.methods.toDescString = function() {
    var retString = '';
    
    if (this.condition) {
        retString = 'Condition: ' + this.condition + '/10';
    }
    
    if (this.material) {
        retString = (retString.length ? retString + ' | ' : '') + 'Material: ' + this.material;
    }
    
    if (this.weight) {
        retString = (retString.length ? retString + ' | ' : '') + 'Weight: ' + this.weight + 'g';
    }
    
    return retString;
}


module.exports = mongoose.model('Disc', discSchema);
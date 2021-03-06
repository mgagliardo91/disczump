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
    weight: Number,
    material: String,
    color: String,
    speed: Number,
    glide: Number,
    turn: Number,
    fade: Number,
    notes: String,
    primaryImage: String,
    imageList: { type : Array , default : [], unique: false },
    tagList: [String],
    visible: {type:Boolean, default: false},
    condition: Number,
    createDate: {type: Date},
	modifiedDate: {type: Date},
	value: Number,
    marketplace: {
        forSale: {type: Boolean, default: false},
        forTrade: {type: Boolean, default: false},
		postedDate: {type: Date}
    }
});

discSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
		this.modifiedDate = new Date();
    } else {
		this.modifiedDate = new Date();
	}
	
    next();
});

discSchema.methods.getImage = function() {
    if (this.primaryImage) {
        return _.findWhere(this.imageList, {_id:this.primaryImage});
    } else {
        return undefined;
    }
}

discSchema.methods.marketplaceActive = function() {
	return this.marketplace.forSale || this.marketplace.forTrade;
}

discSchema.methods.toDescString = function() {
    var retString = '';
    
    if (typeof(this.condition) !== 'undefined') {
        retString = 'Condition: ' + this.condition + '/10';
    }
    
    if (typeof(this.material) !== 'undefined') {
        retString = (retString.length ? retString + ' | ' : '') + 'Material: ' + this.material;
    }
    
    if (typeof(this.weight) !== 'undefined') {
        retString = (retString.length ? retString + ' | ' : '') + 'Weight: ' + this.weight + 'g';
    }
    
    return retString;
}

discSchema.index({ userId: 1 });

module.exports = mongoose.model('Disc', discSchema);
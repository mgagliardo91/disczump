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
    createDate: {type: Date, default: Date.now},
	modifiedDate: {type: Date, default: Date.now},
    marketplace: {
        forSale: {type: Boolean, default: false},
        forTrade: {type: Boolean, default: false},
        value: Number,
		modifiedDate: {type: Date, default: Date.now}
    }
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

module.exports = mongoose.model('Disc', discSchema);
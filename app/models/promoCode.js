var mongoose = require('mongoose');
var shortId = require('shortid');
var _ = require('underscore');

var MembershipConfig = require('../../config/config').membership;
var Error = require('../utils/error');

var promoCodeSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    code: {
        type: String,
        unique: true,
		lowercase: true,
		trim: true
    },
	description: {
		type: String
	},
    preReq: {
        newUser: {type: Boolean, default: false},
        accountType: {type: String},
        singleUse: {type: Boolean, default: true},
		newAccountType: {type: String}
    },
    config: {
        promoMonthsBefore: {type: Number},
        promoMonthsAfter: {type: Number},
        alternateCost: {type: Number}
    },
	isUnique: {
		type: Boolean,
		default: false
	},
	useCount: {
		type: Number,
		default: 0
	},
	active: {
		type: Boolean,
		default: true
	},
    startDate: {
		type: Date
	},
    endDate: {
		type: Date
	}
});

promoCodeSchema.methods.authorize = function(account, newAccount) {
	if (this.preReq.newUser && account.profile.id) 
		return Error.createError('The promo code is only available to new users.', Error.unauthorizedError);

	if (this.preReq.accountType && this.preReq.accountType !== account.profile.type)
		return Error.createError('Account not authorized to use the promo code.', Error.unauthorizedError);
	
	if (this.preReq.singleUse && account.profile.promoCodes.indexOf(this._id) > -1)
		return Error.createError('The promo code is already active for this account.', Error.unauthorizedError);
	
	if (typeof(newAccount) !== 'undefined' && account.type !== MembershipConfig.TypeBasic)
		return Error.createError('Account not authorized to use the promo code.', Error.unauthorizedError);
	
	if (typeof(newAccount) !== 'undefined' && typeof(this.newAccountType) !== 'undefined' && newAccount.type !== this.newAccountType)
		return Error.createError('The promo code is invalid for the desired account type.', Error.unauthorizedError);
	
	if (typeof(newAccount) === 'undefined' && this.config.alternateCost)
		return Error.createError('This promo code cannot be used without upgrading an account.', Error.unauthorizedError);

	return undefined;
}

promoCodeSchema.methods.setUsed = function() {
	this.useCount++;
	if (this.isUnique) {
		this.active = false;
	}
	
	this.save();
}

promoCodeSchema.methods.runAgainst = function(immedCharge) {
	var delayMonths = 0;
	
	if (typeof(this.config.alternateCost) !== 'undefined') {
		immedCharge = this.config.alternateCost;
	}
	
	if (typeof(this.config.promoMonthsAfter) !== 'undefined') {
		delayMonths = 1 + this.config.promoMonthsAfter;
	}
	
	if (typeof(this.config.promoMonthsBefore) !== 'undefined') {
		delayMonths = this.config.promoMonthsBefore;
		immedCharge = 0;
	}
	return {
		immedCharge: immedCharge,
		delayMonths: delayMonths
	}
}

module.exports = mongoose.model('PromoCode', promoCodeSchema);
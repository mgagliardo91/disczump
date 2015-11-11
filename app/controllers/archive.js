var DiscArchive = require('../models/discArchive');
var UserArchive = require('../models/userArchive');
var Error = require('../utils/error');

module.exports = {
    archiveDisc: archiveDisc,
    archiveUser: archiveUser
}

function archiveDisc(disc) {
    var archive = new DiscArchive({
    	discId: disc._id,
        userId: disc.userId,
        brand: disc.brand,
        name: disc.name,
        type: disc.type,
        weight: disc.weight,
        material: disc.material,
        color: disc.color,
        createDate: disc.createDate
    });
    
    archive.save();
}

function archiveUser(user) {
    var archive = new UserArchive({
    	userId: user._id,
        local: {
            username: user.local.username,
            firstName: user.local.firstName,
            lastName: user.local.lastName,
            email: user.local.email,
            dateJoined: user.local.dateJoined,
            lastAccess: user.local.lastAccess,
            zipCode: user.local.zipCode,
            pdgaNumber: user.local.pdgaNumber,
            location: {
                lat: user.local.location.lat,
                lng: user.local.location.lng,
                city: user.local.location.city,
                state: user.local.location.state,
                stateAcr: user.local.location.stateAcr,
                country: user.local.location.country,
                countryCode: user.local.location.countryCode,
            },
            accessCount: {
                desktop: user.local.accessCount.desktop,
                mobile: user.local.accessCount.mobile,
            }
        },
        internal: {
            eventLog: user.internal.eventLog
        }
    });
    
    archive.save();
}
var DiscArchive = require('../models/discArchive');
var UserArchive = require('../models/userArchive');
var UserInternal = require('../models/userInternal');
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
    UserInternal.find({userId: user._id}, function(err, intUser) {
        var archive = new UserArchive({
            userId: user._id,
            local: {
                username: user.local.username,
                firstName: user.local.firstName,
                lastName: user.local.lastName,
                email: user.local.email,
                dateJoined: user.local.dateJoined,
                lastAccess: user.local.lastAccess,
                pdgaNumber: user.local.pdgaNumber,
                location: {
                    geo: user.local.location.geo,
                    geoLat : user.local.location.geoLat,
                    geoLng : user.local.location.geoLng,
                    city : user.local.location.city,
                    administrationArea : user.local.location.administrationArea,
                    administrationAreaShort : user.local.location.administrationAreaShort,
                    country : user.local.location.country,
                    countryCode : user.local.location.countryCode,
                    postalCode: user.local.location.postalCode
                },
                accessCount: {
                    desktop: user.local.accessCount.desktop,
                    mobile: user.local.accessCount.mobile,
                }
            },
            internal: {
                eventLog: intUser? intUser.eventLog : []
            }
        });

        archive.save();
    });
}
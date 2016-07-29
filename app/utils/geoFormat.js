module.exports = {
    getFormattedLoc: function(location) {
        switch (location.countryCode) {
            case 'US':
            case 'CAN':
                {
                    return {
                        shortLocation: location.city + ', ' + location.administrationAreaShort,
                        longLocation: location.city + ', ' + location.administrationArea + ', ' + location.countryCode
                    }
                    break;
                }
            default:
                {
                    return {
                        shortLocation: location.city + ', ' + location.countryCode,
                        longLocation: location.city + ', ' + location.country
                    }
                }
        }
    }
}


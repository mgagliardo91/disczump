var membershipConfig = require('../../config/config').membership;

module.exports = {
    checkType: function(type) {
        if (typeof(type) === 'undefined') return undefined;
        
        switch(type.toLowerCase()) {
            case membershipConfig.TypeBasic.toLowerCase(): {
                return membershipConfig.TypeBasic;
            }
            case membershipConfig.TypeEntry.toLowerCase(): {
                return membershipConfig.TypeEntry;
            }
            case membershipConfig.TypePro.toLowerCase(): {
                return membershipConfig.TypePro;
            }
            default: return '';
        }
    },
    
    getTypeName: function(type) {
        if (typeof(type) === 'undefined') return '';
        
        switch(type.toLowerCase()) {
            case membershipConfig.TypeBasic.toLowerCase(): {
                return 'The Freeloader';
            }
            case membershipConfig.TypeEntry.toLowerCase(): {
                return 'The Entrepreneur';
            }
            case membershipConfig.TypePro.toLowerCase(): {
                return 'The Chief Executive';
            }
            default: return '';
        }
    },
    
    getTypeCost: function(type) {
        if (typeof(type) === 'undefined') return 0;
        
        switch(type.toLowerCase()) {
            case membershipConfig.TypeBasic.toLowerCase(): {
                return membershipConfig.CostBasic;
            }
            case membershipConfig.TypeEntry.toLowerCase(): {
                return membershipConfig.CostEntry;
            }
            case membershipConfig.TypePro.toLowerCase(): {
                return membershipConfig.CostPro;
            }
            default: return 0;
        }
    },
    
    getMarketCap: function(type) {
        if (typeof(type) === 'undefined') return membershipConfig.CapBasic;
        
        switch(type.toLowerCase()) {
            case membershipConfig.TypeBasic.toLowerCase(): {
                return membershipConfig.CapBasic;
            }
            case membershipConfig.TypeEntry.toLowerCase(): {
                return membershipConfig.CapEntry;
            }
            case membershipConfig.TypePro.toLowerCase(): {
                return membershipConfig.CapPro;
            }
            default: return membershipConfig.CapBasic;
        }
    }
}


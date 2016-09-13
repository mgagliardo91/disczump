var _ = require('underscore');

module.exports = {
    parsePDGA: parsePDGA
}

function parsePDGA(data) {
    var retData = {
        sessid: data.sessid,
        token: data.token
    }

    if (data.user && data.user.field_member_reference && data.user.field_member_reference.und && data.user.field_member_reference.und.length) {
        retData.pdgaNumber = data.user.field_member_reference.und[0].target_id;
    }

    return retData;
}
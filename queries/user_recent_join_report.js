db.users.aggregate([
    {
        $sort: {
            'local.dateJoined': -1
        }
    },
    {
        $limit: 20
    },
    {
        $project: {
            _u: '$local.username',
            _l: {$concat: ['$local.location.city', ' ', '$local.location.administrationAreaShort']},
            _dJ: {$dateToString: {format: '%m/%d/%Y', date:'$local.dateJoined'}},
        }
    }
])
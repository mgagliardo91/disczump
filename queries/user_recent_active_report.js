db.users.aggregate([
    {
        $sort: {
            'local.lastAccess': -1
        }
    },
    {
        $limit: 20
    },
    {
        $project: {
            _u: '$local.username',
            _l: {$concat: ['$local.location.city', ' ', '$local.location.administrationAreaShort']},
            _dA: {$dateToString: {format: '%m/%d/%Y', date:'$local.lastAccess'}},
        }
    }
])
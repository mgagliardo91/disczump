db.discs.aggregate([
  {
    $group: {
      _id: null,
      totalCount: { $sum: 1},
      data: {$push: '$$ROOT'}
    }
  },
  {
    $unwind: '$data'
  },
  {
    $group: {
      _id: '$data.brand',
      count: {$sum: 1},
      total: {$first: '$totalCount'}
    }
  },
  {
    $project: {
      count: '$count',
      percent: { $divide: [
          {
            $subtract: [ 
              {
                $multiply: [
                   { $divide: ['$count','$total'] },
                   10000
                ]
              }, 
              {
                $mod: [
                   { 
                     $multiply: [{ $divide: ['$count','$total'] }, 10000 ] },1]
                   }
                ]
              }, 
           100
        ] }
    }
  },
  {
    $sort: {
      count: -1
    }
  },
  {
    $limit: 10
  }
])
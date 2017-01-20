db.users.aggregate([
  {
    $lookup: {
      from: 'discs',
      localField: '_id',
      foreignField: 'userId',
      as: 'discItem'
    }
  },
  {
    $project: {
      _id: '$_id',
      discItem: '$discItem',
      totalCount: {
        $size: '$discItem'
      }
    }
  },
  {
    $unwind: '$discItem'
  },
  {
    $group: {
      _id: {_id: '$_id', brand: '$discItem.brand', totalCount: '$totalCount'},
      count: {$sum: 1}
    }
  },
  {
    $project: {
      _id: '$_id._id',
      brand: '$_id.brand',
      percentage: {
        $divide: [ '$count', '$_id.totalCount' ]
      }
    }
  },
  {
    $group: {
      _id: '$brand',
      count: {
        $sum: 1
      },
      totalPercentage: {
        $sum: '$percentage'
      }
    }
  },
  {
    $sort: {count: -1}
  },
  {
    $project: {
      likelyhood: {
        $divide: [
          {
            $subtract: [ 
              {
                $multiply: [
                   { $divide: ['$totalPercentage','$count'] },
                   10000
                ]
              }, 
              {
                $mod: [
                   { 
                     $multiply: [{ $divide: ['$totalPercentage','$count'] }, 10000 ] },1]
                   }
                ]
              }, 
           100
        ]
      }
    }
  },
  {
    $limit: 10
  }
])
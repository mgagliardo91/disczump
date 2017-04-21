db.users.aggregate([
  {
    $lookup: {
      from: 'discs',
      localField: '_id',
      foreignField: 'userId',
      as: 'discItems'
    }
  }, 
  {
    $project: {
      username: '$local.username',
      count: {
        $size: '$discItems'
      }
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
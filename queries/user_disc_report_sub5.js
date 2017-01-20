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
    $match: {
      count: {$lte: 5}
    }
  },
  {
    $group: {
      _id: null,
      count: { $sum: 1}
    }
  }
])
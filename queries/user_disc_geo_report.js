var query = db.users.aggregate([
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
      username: '$local.username',
      adminArea: '$local.location.administrationArea',
      countryCode: '$local.location.countryCode',
      discItem: '$discItem'
    }
  },
  {
    $match: {countryCode: 'US'}
  },
  {
    $unwind: '$discItem'
  },
  {
    $group: {
        _id: { countryCode: '$countryCode', adminArea: '$adminArea', brand: '$discItem.brand'},
        count: {$sum: 1}
    }
  },
  {
    $project: {
      _id: null,
      adminArea: '$_id.adminArea',
      countryCode: '$_id.countryCode',
      brand: '$_id.brand',
      count: '$count'
    }
  },
  {
    $group: {
        _id: '$brand',
        locations: { $addToSet: {countryCode: '$countryCode', adminArea: '$adminArea', count: '$count'}}
    }
  },
  {
    $sort: {
      '_id': 1
    }
  }
]);

query.forEach(function(item) {
    var toPrint = item._id + ',';
    item.locations.sort(function(a,b) {
        return a.adminArea > b.adminArea;
    });
    for (var i = 0; i < item.locations.length; i++) {
        toPrint += item.locations[i].adminArea + ',' + item.locations[i].count;
        if (i < item.locations.length - 1) {
            toPrint += ',';
        }
    }
    print(toPrint);
});

// query.forEach(function(item) {
//     var toPrint = item._id.countryCode + ',' + item._id.adminArea + ',';
//     for (var i = 0; i < item.brands.length; i++) {
//         toPrint += item.brands[i].brand + ',' + item.brands[i].count;
//         if (i < item.brands.length - 1) {
//             toPrint += ',';
//         }
//     }
//     print(toPrint);
// });

var compressor = require('node-minify');
var path = require('path');
var fs = require('fs');

// new compressor.minify({
//   type: 'uglifyjs',
//   fileIn: ['public/js/dropzone.js',
//             'public/js/bootstrap-slider.js',
//             'public/js/validation.js',
//             'public/js/dashboard.js',
//             ],
//   fileOut: 'public/js-dist/dz-dashboard.min.js',
//   callback: function(err, min){
//      if (err)
//         return console.log(err);
        
//     new compressor.minify({
//         type: 'no-compress',
//         fileIn: ['public/js-dist/jquery-ui.min.js',
//                 'public/js-dist/bootstrap-switch.min.js',
//                 'public/js-dist/dz-dashboard.min.js',
//             ],
//         fileOut: 'public/js-dist/dz-dashboard.min.js',
//         callback: function(err, min){
//           if (err)
//             return console.log(err);
            
//             console.log('JS Minification Complete.');
//         }
//     });
//   }
// });

// new compressor.minify({
//   type: 'yui-css',
//   fileIn: ['public/css/dashboard.css',
//             'public/css/bootstrap-slider.css',
//             ],
//   fileOut: 'public/css-dist/dz-dashboard.min.css',
//   callback: function(err, min){
//     if (err)
//         return console.log(err);
        
//     new compressor.minify({
//         type: 'no-compress',
//         fileIn: ['public/css-dist/dz-dashboard.min.css',
//                 'public/css-dist/bootstrap-switch.min.css',
//             ],
//         fileOut: 'public/css-dist/dz-dashboard.min.css',
//         callback: function(err, min){
//           if (err)
//             return console.log(err);
            
//             console.log('CSS Minification Complete.');
//         }
//     });
//   }
// });

fs.readdir(path.join(__dirname, "../public/js"), function(err, list) {
    if (err)
        return console.log(err);
    
    list.forEach(function(file) {
        if (file.indexOf('.js') > 0) {
            new compressor.minify({
              type: 'uglifyjs',
              fileIn: 'public/js/' + file,
              fileOut: 'public/js-dist/' + file.replace('.js', '.min.js'),
              callback: function(err, min){
                if (err)
                    return console.log(err);
                    
                console.log('Minified: ' + file);
              }
            });
        }
    });
});

fs.readdir(path.join(__dirname, "../public/css"), function(err, list) {
    if (err)
        return console.log(err);
    
    list.forEach(function(file) {
        if (file.indexOf('.css') > 0) {
            new compressor.minify({
              type: 'yui-css',
              fileIn: 'public/css/' + file,
              fileOut: 'public/css-dist/' + file.replace('.css', '.min.css'),
              callback: function(err, min){
                if (err)
                    return console.log(err);
                    
                console.log('Minified: ' + file);
              }
            });
        }
    });
});

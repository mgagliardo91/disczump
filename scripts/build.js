var DZ_HOME = process.env.DZ_HOME;
var compressor = require('node-minify');
var path = require('path');
var fs = require('fs');
var async = require('async');

fs.readdir(path.join(DZ_HOME, "/public/src/js"), function(err, list) {
    if (err)
        return console.log(err);
    
    list.forEach(function(file) {
        if (file.indexOf('.js') > 0) {
            compressor.minify({
              compressor: 'uglifyjs',
              input: 'public/src/js/' + file,
              output: 'public/src/js-dist/' + file.replace('.js', '.min.js'),
              options: {
                  mangle: true,
                  drop_console: true
              },
              callback: function(err, min){
                if (err)
                    return console.log(err);
                    
                console.log('Minified: ' + file);
              }
            });
        }
    });
});

// fs.readdir(path.join(__dirname, "../public/js/mobile"), function(err, list) {
//     if (err)
//         return console.log(err);
    
//     list.forEach(function(file) {
//         if (file.indexOf('.js') > 0) {
//             new compressor.minify({
//               type: 'uglifyjs',
//               fileIn: 'public/js/mobile/' + file,
//               fileOut: 'public/js-dist/mobile/' + file.replace('.js', '.min.js'),
//               callback: function(err, min){
//                 if (err)
//                     return console.log(err);
                    
//                 console.log('Minified: ' + file);
//               }
//             });
//         }
//     });
// });

// fs.readdir(path.join(__dirname, "../public/mobile/js"), function(err, list) {
//     if (err)
//         return console.log(err);
        
//     async.each(list, function(file, cb) {
//         if (file.indexOf('.js') > 0) {
//             new compressor.minify({
//               type: 'uglifyjs',
//               fileIn: 'public/mobile/js/' + file,
//               fileOut: 'public/mobile/js-dist/' + file.replace('.js', '.min.js'),
//               callback: function(err, min){
//                 if (err)
//                     return console.log(err);
                
//                 console.log('Minified: ' + file);
//                 return cb();
//               }
//             });
//         } else cb();
//     }, function(err) {
//         new compressor.minify({
//            type: 'no-compress',
//            fileIn: [
//                'public/mobile/js-dist/mobile-angular-ui.min.js',
//                'public/mobile/js-dist/mobile-angular-ui.gestures.min.js',
//                'public/mobile/js-dist/ng-sortable.min.js',
//                'public/mobile/js-dist/ngclipboard.min.js',
//                'public/mobile/js-dist/mobile.min.js',
//                'public/mobile/js-dist/controllers.min.js',
//                'public/mobile/js-dist/services.min.js'
//                ],
//             fileOut: 'public/mobile/js-dist/dashboard-concat.min.js',
//             callback: function(err, min) {
//                 if (err)
//                     return console.log(err);
                    
//                 console.log('Concatenated mobile js files.');
//             }
//         });
//     });
    
// });


fs.readdir(path.join(DZ_HOME, "/public/src/css"), function(err, list) {
    if (err)
        return console.log(err);
    
    list.forEach(function(file) {
        if (file.indexOf('.css') > 0) {
            compressor.minify({
              compressor: 'yui-css',
              input: 'public/src/css/' + file,
              output: 'public/src/css-dist/' + file.replace('.css', '.min.css'),
              callback: function(err, min){
                if (err)
                    return console.log(err);
                    
                console.log('Minified: ' + file);
              }
            });
        }
    });
});

// fs.readdir(path.join(__dirname, "../public/css/mobile"), function(err, list) {
//     if (err)
//         return console.log(err);
    
//     list.forEach(function(file) {
//         if (file.indexOf('.css') > 0) {
//             new compressor.minify({
//               type: 'yui-css',
//               fileIn: 'public/css/mobile/' + file,
//               fileOut: 'public/css-dist/mobile/' + file.replace('.css', '.min.css'),
//               callback: function(err, min){
//                 if (err)
//                     return console.log(err);
                    
//                 console.log('Minified: ' + file);
//               }
//             });
//         }
//     });
// });

// fs.readdir(path.join(__dirname, "../public/mobile/css"), function(err, list) {
//     if (err)
//         return console.log(err);
    
//      async.each(list, function(file, cb) {
//         if (file.indexOf('.css') > 0) {
//             new compressor.minify({
//               type: 'yui-css',
//               fileIn: 'public/mobile/css/' + file,
//               fileOut: 'public/mobile/css-dist/' + file.replace('.css', '.min.css'),
//               callback: function(err, min){
//                 if (err)
//                     return console.log(err);
                    
//                 console.log('Minified: ' + file);
//                 return cb();
//               }
//             });
//         } else cb();
//     }, function(err) {
//         new compressor.minify({
//            type: 'no-compress',
//            fileIn: [
//                'public/mobile/css-dist/mobile-angular-ui-base.min.css',
//                'public/mobile/css-dist/ng-sortable.min.css',
//                'public/mobile/css-dist/mobile.min.css',
//                ],
//             fileOut: 'public/mobile/css-dist/dashboard-concat.min.css',
//             callback: function(err, min) {
//                 if (err)
//                     return console.log(err);
                    
//                 console.log('Concatenated mobile css files.');
//             }
//         });
//     });
// });


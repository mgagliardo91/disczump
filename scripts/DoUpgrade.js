var childProcess = require('child_process');
var async = require('async');

function runScript(path, callback) {
    var invoked  = false;
    
    var process = childProcess.fork(path);
    
    process.on('error', function(err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });
    
    process.on('exit', function(code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });
}

var scripts = [
    'UpgradeUsers', 
    'UpgradeDiscs', 
    'UpgradeUserArchives', 
    'UpgradeDiscArchives',
    'UpgradeAdmins',
    'UpgradeEvents',
    'UpgradeFeedback',
    'UpgradeMessages',
    'UpgradeThreadLocals',
    'UpgradeThreads',
    'UpgradeClients',
    'UpgradeImageCaches',
    'UpgradeRefreshTokens',
    'UpgradeTemporaryLinks',
    'SyncUserEvents'
//     'UpdateThumbnailSize'
];

console.log('Execution started');
async.eachSeries(scripts, function(script, cb) {
    console.log('Executing script: ' + script);
    runScript('/disczump/scripts/upgrade/' + script + '.js', function(err) {
        if (err) {
            console.log('Error running script: ' + script);
        }
        
        return cb();
    });
}, function(err, results) {
    console.log('Execution complete.');
});
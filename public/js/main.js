
/*
* Name: getSafe
* Date: 01/07/2015
*/
function getSafe(obj, backup) {
    return isDef(obj) ? obj : backup;
}

/*
* Name: isDef
* Date: 01/07/2015
*/
function isDef(obj) {
	return typeof obj !== 'undefined';
}
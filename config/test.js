module.exports = {
    'Client' : {
         'name': 'disczump.test',
         'clientId': 'disczump.test',
         'clientSecret': 'password!'
    },
    'User' : {
        'Create' : {
            'email': 'disczump.test@disczump.com',
            'username': 'disczumptest',
            'firstName': 'disczump',
            'lastName': 'test',
            'password': 'password!'
        },
        'Update' : {
            'username': 'disczumptest2',
            'firstName': 'disczump2',
            'lastName': 'test2'
        },
        'Fail' : {
            'username': 'disc'
        },
        'UpdatePwFailByWrongCurrent' : {
            'currentPw': 'password',
            'newPw': 'password1!'
        },
        'UpdatePwFailByInvalid' : {
            'currentPw': 'password!',
            'newPw': 'pass'
        },
        'UpdatePwSuccess' : {
            'currentPw': 'password!',
            'newPw': 'password1!'
        }
    },
    'User2' : {
        'Create' : {
            'email': 'disczump.test2@disczump.com',
            'username': 'disczumptest_backup',
            'firstName': 'disczump',
            'lastName': 'test',
            'password': 'password!'
        },
        'Fail' : {
            'username': 'disczumptest_backup',
        }
    },
    'Preferences' : {
        'Default': {
            'colorize': {
                'putter': 'rgb(255, 161, 66)',
                'mid': 'rgb(109, 109, 255)',
                'fairway': 'rgb(255, 109, 109)',
                'distance': 'rgb(66, 255, 66)',
                'mini': 'rgb(255, 66, 255)',
            },
            'colorizeVisibility': true,
            'displayCount': '20',
            'defaultSort': [
    	    	{'property': 'brand', 'sortAsc': true},
    	    	{'property': 'name', 'sortAsc': true}
        	],
        	'defaultView': 'inventory',
        	'galleryCount': '6',
        	'notifications': {
        	    'newMessage': true
        	}
        },
        'Update': {
            'colorize': {
                'putter': 'rgb(0, 161, 66)',
                'mid': 'rgb(109, 109, 255)',
                'fairway': 'rgb(255, 109, 109)',
                'distance': 'rgb(66, 255, 66)',
                'mini': 'rgb(255, 66, 255)',
            },
            'colorizeVisibility': false,
            'displayCount': '40',
            'defaultSort': [
    	    	{property: 'name',sortAsc: true},
    	    	{property: 'brand',sortAsc: true}
        	],
        	'defaultView': 'gallery',
        	'galleryCount': '6',
        	'notifications': {
        	    'newMessage': false
        	}
        },
        'Fail': {
            'colorize': {
                'putter': '1'
            },
            'colorizeVisibility': 'test',
            'displayCount': '-120',
            'defaultSort': [],
        	'defaultView': 'shoebox',
        	'galleryCount': '100',
        	'notifications': {
        	    'newMessage': 'unknown'
        	}
        }
    },
    'Disc' : {
        'Create' : {
            brand : 'MVP',
            name : 'Resistor',
            type : 'Fairway Driver',
            weight : '160',
            material : 'Neutron',
            color : 'Orange',
            speed : '6',
            glide : '4',
            turn : '0',
            fade : '3',
            notes : 'Chains for Brains - 2013 Disc Nation Halloween Collection',
            tagList : ['Demo Disc', 'Hanger', 'Halloween Collection'],
            condition : '10'
        },
        'Update' : {
            brand : 'Innova',
            name : 'Destroyer',
            type : 'Distance Driver',
            weight : '175',
            material : 'Star',
            color : 'Orange',
            speed : '12',
            glide : '5',
            turn : '-1',
            fade : '-10',
            notes : '2010 Disc Nation Halloween Collection - Bottom Stamped S/DS',
            tagList : ['Demo Disc', 'Hanger', 'Halloween Collection'],
            condition : '10',
            visible: true
        },
        'Fail' : {
            brand : '',
            name : '',
            visible: 'wrong',
            weight : 'seven',
            speed : '11g',
            glide : 'test23',
            turn : 'eighteen',
            fade : 'eleven',
            condition : 'twelve'
        }
    }
}
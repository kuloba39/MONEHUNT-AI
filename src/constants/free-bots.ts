import freeEvenxml from './free-even.xml';
import oreshnicxml from './ORESHNIC.xml';
import manager5xml from './MANAGER 5.xml';
import manager1xml from './MANAGER 1.xml';
import lastDefenderxml from './last-defender.xml';


export const FREE_BOTS = [

    // EXISTING - DO NOT CHANGE
    {
        id: 'free-even',
        name: '🔵 Even Digit Bot',
        description: 'Digit Even strategy',
        xml: freeEvenxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },


    {
        id: 'oreshnic',
        name: '⚡ ORESHNIC',
        description: 'ORESHNIC entry strategy',
        xml: oreshnicxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },


    {
        id: 'manager-5',
        name: '⚡ MANAGER 5',
        description: 'Manager 5 entry strategy',
        xml: manager5xml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },


    {
        id: 'manager-1',
        name: '⚡ MANAGER 1',
        description: 'Manager 1 entry strategy',
        xml: manager1xml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },


    {
        id: 'last-defender',
        name: '🛡️ LAST DEFENDER',
        description: 'Last Defender recovery strategy',
        xml: lastDefenderxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

];
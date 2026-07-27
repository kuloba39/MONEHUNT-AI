import freeEvenxml from './free-even.xml';


const oreshnicxml = `
<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true">
</xml>
`;

const manager5xml = `
<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true">
</xml>
`;

const manager1xml = `
<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true">
</xml>
`;

const lastDefenderxml = `
<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true">
</xml>
`;


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


    // NEW BOTS

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
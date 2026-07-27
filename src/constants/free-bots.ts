import freeEvenxml from './free-even.xml';

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
        id:'oreshnic',
        name:'⚡ ORESHNIC',
        description:'ORESHNIC entry strategy',
        xml:oreshnicXML,
        timestamp:Date.now(),
        save_type:'local',
        free:true,
    },

    {
        id:'manager-5',
        name:'⚡ MANAGER 5',
        description:'Manager 5 entry strategy',
        xml:manager5XML,
        timestamp:Date.now(),
        save_type:'local',
        free:true,
    },

    {
        id:'manager-1',
        name:'⚡ MANAGER 1',
        description:'Manager 1 entry strategy',
        xml:manager1XML,
        timestamp:Date.now(),
        save_type:'local',
        free:true,
    },

    {
        id:'last-defender',
        name:'🛡️ LAST DEFENDER',
        description:'Last Defender recovery strategy',
        xml:lastDefenderXML,
        timestamp:Date.now(),
        save_type:'local',
        free:true,
    },

];
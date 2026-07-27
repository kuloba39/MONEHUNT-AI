import freeEvenxml from './free-even.xml';
import oreshnicxml from './ORESHNIC.xml';
import manager5xml from './MANAGER 5.xml';
import manager1xml from './MANAGER 1.xml';
import lastDefenderxml from './last-defender.xml';


export const FREE_BOTS = [

{
    id:'free-even',
    name:'🔵 Even Digit Bot',
    description:'Digit Even probability strategy',
    xml:freeEvenxml,
    icon:'🔵',
    tag:'DIGIT AI',
    color:'even',
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},


{
    id:'oreshnic',
    name:'⚡ ORESHNIC',
    description:'Fast entry momentum strategy',
    xml:'/bots/ORESHNIC.xml',
    icon:'⚡',
    tag:'MOMENTUM',
    color:'oreshnic',
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},


{
    id:'manager-5',
    name:'🔥 MANAGER 5',
    description:'Advanced 5-step trade management',
    xml:'/bots/MANAGER 5.xml',
    icon:'🔥',
    tag:'SMART MANAGEMENT',
    color:'manager5',
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},


{
    id:'manager-1',
    name:'🧠 MANAGER 1',
    description:'Precision entry management system',
    xml:'/bots/MANAGER 1.xml',
    icon:'🧠',
    tag:'PRECISION AI',
    color:'manager1',
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},


{
    id:'last-defender',
    name:'🛡️ LAST DEFENDER',
    description:'Recovery and protection strategy',
    xml:'/bots/last-defender.xml',
    icon:'🛡️',
    tag:'RECOVERY',
    color:'defender',
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},

];
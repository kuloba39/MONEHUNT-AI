import freeEvenxml from './free-even.xml';
import oreshnicxml from './ORESHNIC.xml';
import manager5xml from './MANAGER 5.xml';
import manager1xml from './MANAGER 1.xml';
import lastDefenderxml from './last-defender.xml';


export const FREE_BOTS = [

{
    id:'free-even',
    name:'🔵 Even Digit Bot',
    description:'Digit Even strategy',
    icon:'🔵',
    color:'#2196F3',
    tag:'SAFE',
    xml:freeEvenxml,
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},

{
    id:'oreshnic',
    name:'⚡ ORESHNIC',
    description:'ORESHNIC entry strategy',
    icon:'⚡',
    color:'#FF9800',
    tag:'ADVANCED',
    xml:oreshnicxml,
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},

{
    id:'manager-5',
    name:'🔥 MANAGER 5',
    description:'Manager 5 entry strategy',
    icon:'🔥',
    color:'#F44336',
    tag:'POPULAR',
    xml:manager5xml,
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},

{
    id:'manager-1',
    name:'🚀 MANAGER 1',
    description:'Manager 1 entry strategy',
    icon:'🚀',
    color:'#9C27B0',
    tag:'PRO',
    xml:manager1xml,
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},

{
    id:'last-defender',
    name:'🛡️ LAST DEFENDER',
    description:'Last Defender recovery strategy',
    icon:'🛡️',
    color:'#4CAF50',
    tag:'RECOVERY',
    xml:lastDefenderxml,
    timestamp:Date.now(),
    save_type:'local',
    free:true,
},

];
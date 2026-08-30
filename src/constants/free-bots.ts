import freeEvenxml from './free-even.xml';
import oreshnicxml from './ORESHNIC.xml';
import manager5xml from './MANAGER 5.xml';
import manager1xml from './MANAGER 1.xml';
import lastDefenderxml from './last-defender.xml';
import matchesSignalxml from './Matches_Signal_Bot.xml';
import overUnderSignalxml from './OverUnder_Signal_Bot.xml';
import over6RecoveryOver3xml from './Over6_Recovery_Over3.xml';

export const FREE_BOTS = [
    {
        id: 'free-even',
        name: '🔵 Even Digit Bot',
        description: 'Digit Even strategy',
        icon: '🔵',
        color: '#2196F3',
        tag: 'SAFE',
        xml: freeEvenxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

    {
        id: 'oreshnic',
        name: '⚡ ORESHNIC',
        description: 'ORESHNIC entry strategy',
        icon: '⚡',
        color: '#FF9800',
        tag: 'ADVANCED',
        xml: oreshnicxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

    {
        id: 'manager-5',
        name: '🔥 MANAGER 5',
        description: 'Manager 5 entry strategy',
        icon: '🔥',
        color: '#F44336',
        tag: 'POPULAR',
        xml: manager5xml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

    {
        id: 'manager-1',
        name: '🚀 MANAGER 1',
        description: 'Manager 1 entry strategy',
        icon: '🚀',
        color: '#9C27B0',
        tag: 'PRO',
        xml: manager1xml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

    {
        id: 'last-defender',
        name: '🛡️ LAST DEFENDER',
        description: 'Last Defender recovery strategy',
        icon: '🛡️',
        color: '#4CAF50',
        tag: 'RECOVERY',
        xml: lastDefenderxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

    {
        id: 'matches-signal',
        name: '🎯 MATCHES SIGNAL BOT',
        description: 'Matches/Differs signal strategy',
        icon: '🎯',
        color: '#00BCD4',
        tag: 'SIGNAL',
        xml: matchesSignalxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },

    {
        id: 'over-under-signal',
        name: '📊 OVER/UNDER SIGNAL BOT',
        description: 'Over/Under signal strategy',
        icon: '📊',
        color: '#FF5722',
        tag: 'SIGNAL',
        xml: overUnderSignalxml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },
    {
        id: 'over6-recovery-over3',
        name: '🔥 OVER 6 → RECOVERY OVER 3',
        description: 'Over 6 strategy with 2x martingale recovery on Over 3',
        icon: '🔥',
        color: '#E91E63',
        tag: 'RECOVERY',
        xml: over6RecoveryOver3xml,
        timestamp: Date.now(),
        save_type: 'local',
        free: true,
    },
];
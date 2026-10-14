import freeEvenxml from './free-even.xml';
import matchesSignalxml from './Matches_Signal_Bot.xml';
import over2Signalxml from './Over2_Signal_Bot.xml';
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
        id: 'over2-signal',
        name: '🚀 OVER 2 SIGNAL BOT',
        description: 'Over 2 signal strategy with least-digit confirmation',
        icon: '🚀',
        color: '#00C853',
        tag: 'SIGNAL',
        xml: over2Signalxml,
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
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { FREE_BOTS } from '@/constants/free-bots';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

const FREE_BOT_LOAD_KEY = 'monehunt_free_bot_to_load';

const FreeBots = observer(() => {
    const { load_modal } = useStore();
    const navigate = useNavigate();

    const { setSelectedStrategyId } = load_modal;

    const loadFreeBot = (bot: any) => {
        console.log('[MONEHUNT FREE BOT] SELECTED:', bot.id);

        if (!bot.xml) {
            console.warn('[MONEHUNT FREE BOT] XML EMPTY:', bot.id);
            return;
        }

        setSelectedStrategyId(bot.id);

        sessionStorage.setItem(
            FREE_BOT_LOAD_KEY,
            JSON.stringify({
                id: bot.id,
                name: bot.name,
                xml: bot.xml,
            })
        );

        console.log('[MONEHUNT FREE BOT] OPENING TRADING WORKSPACE:', bot.id);

        navigate('/preview');
    };

    return (
        <div className="free-bots">
            <div className="free-bots-header">
                <h2>🚀 Premium Free Bots</h2>

                <p>
                    Select a ready-made strategy and customize it in Bot Builder
                </p>
            </div>

            <div className="free-bots-grid">
                {FREE_BOTS.map(bot => (
                    <div
                        key={bot.id}
                        className="free-bot-card"
                        style={{ borderColor: bot.color }}
                    >
                        <div className="free-bot-top">
                            <span className="bot-status">
                                FREE
                            </span>

                            <span className="bot-icon">
                                {bot.icon}
                            </span>
                        </div>

                        <span
                            className="bot-tag"
                            style={{
                                backgroundColor: bot.color,
                            }}
                        >
                            {bot.tag}
                        </span>

                        <h3>{bot.name}</h3>

                        <p>
                            {bot.description}
                        </p>

                        <button onClick={() => loadFreeBot(bot)}>
                            Load Strategy
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default FreeBots;

import React from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { FREE_BOTS } from '@/constants/free-bots';
import { selectMonehuntBot, editMonehuntBot } from '@/utils/monehunt-selected-bot';
import './free-bots.scss';

const FreeBots = observer(() => {
    const navigate = useNavigate();

    const selectBot = (bot: any) => {
        console.log('[MONEHUNT FREE BOT] SELECT:', bot.id);

        if (!bot.xml) {
            console.warn('[MONEHUNT FREE BOT] XML EMPTY:', bot.id);
            return;
        }

        selectMonehuntBot(bot);

        console.log(
            '[MONEHUNT FREE BOT] OPENING TRADING WORKSPACE:',
            bot.id
        );

        navigate('/preview');
    };

    const editBot = (bot: any) => {
        console.log('[MONEHUNT FREE BOT] EDIT:', bot.id);

        if (!bot.xml) {
            console.warn('[MONEHUNT FREE BOT] XML EMPTY:', bot.id);
            return;
        }

        editMonehuntBot(bot);

        console.log(
            '[MONEHUNT FREE BOT] OPENING BOT BUILDER:',
            bot.id
        );

        navigate('/bot-builder');
    };

    return (
        <div className="free-bots">
            <div className="free-bots-header">
                <h2>🚀 Premium Free Bots</h2>

                <p>
                    Select a bot to trade, or edit its strategy in Bot Builder.
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

                        <div className="free-bot-actions">
                            <button
                                type="button"
                                className="free-bot-action free-bot-action--select"
                                onClick={() => selectBot(bot)}
                            >
                                SELECT
                            </button>

                            <button
                                type="button"
                                className="free-bot-action free-bot-action--edit"
                                onClick={() => editBot(bot)}
                            >
                                EDIT
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default FreeBots;

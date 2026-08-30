import React from 'react';
import { observer } from 'mobx-react-lite';
import { FREE_BOTS } from '@/constants/free-bots';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton';
import './free-bots.scss';

const FreeBots = observer(() => {
    const { load_modal, blockly_store, dashboard } = useStore();

    const { setSelectedStrategyId } = load_modal;
    const { setLoading } = blockly_store;

    const loadFreeBot = async (bot: any) => {
        console.log('FREE BOT SELECTED:', bot);

        setSelectedStrategyId(bot.id);
        setLoading(true);

        try {
            if (!bot.xml) {
                console.warn('FREE BOT XML EMPTY:', bot.id);
                return;
            }

            await load({
                block_string: bot.xml,
                file_name: bot.name,
                strategy_id: bot.id,
                from: save_types.LOCAL,
                workspace: window.Blockly.derivWorkspace,
                drop_event: null,
                showIncompatibleStrategyDialog: null,
                show_snackbar: true,
            });

            dashboard.setActiveTab(DBOT_TABS.BOT_BUILDER);

            console.log('FREE BOT LOADED SUCCESSFULLY:', bot.id);
        } catch (error) {
            console.error('FREE BOT LOAD ERROR:', error);
        } finally {
            setLoading(false);
        }
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

                        <button
                            onClick={() => loadFreeBot(bot)}
                        >
                            Load Strategy
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default FreeBots;

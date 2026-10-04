// @ts-nocheck — vendored bot code with known upstream type gaps; see AGENTS.md
import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { botNotification } from '@/components/bot-notification/bot-notification';
import { notification_message } from '@/components/bot-notification/bot-notification-utils';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import { TBlocklyEvents } from 'Types';
import { updateXmlValues } from '@/external/bot-skeleton/scratch/utils';
import { MONEHUNT_BOT_BUILDER_EDIT_KEY } from '@/utils/monehunt-selected-bot';
import LoadModal from '../../components/load-modal';
import SaveModal from '../dashboard/bot-list/save-modal';
import QuickStrategy1 from './quick-strategy';
import WorkspaceWrapper from './workspace-wrapper';

const BotBuilder = observer(() => {
    const { dashboard, app, run_panel, toolbar, quick_strategy, blockly_store, load_modal, save_modal } = useStore();
    const { active_tab, active_tour, is_preview_on_popup } = dashboard;
    const { is_open } = quick_strategy;
    const { is_running } = run_panel;
    const { is_loading } = blockly_store;
    const is_blockly_listener_registered = React.useRef(false);
    const is_blockly_delete_listener_registered = React.useRef(false);
    const { isDesktop } = useDevice();
    const { onMount, onUnmount } = app;
    const el_ref = React.useRef<HTMLInputElement | null>(null);

    // TODO: fix
    // const isMounted = useIsMounted();
    // const { data: remote_config_data } = useRemoteConfig(isMounted());
    React.useEffect(() => {
        const raw_edit_bot = sessionStorage.getItem(
            MONEHUNT_BOT_BUILDER_EDIT_KEY
        );

        if (!raw_edit_bot) {
            return;
        }

        let edit_bot;

        try {
            edit_bot = JSON.parse(raw_edit_bot);
        } catch (error) {
            console.error(
                '[MONEHUNT BOT BUILDER] Invalid EDIT handoff:',
                error
            );

            sessionStorage.removeItem(
                MONEHUNT_BOT_BUILDER_EDIT_KEY
            );

            return;
        }

        if (!edit_bot?.xml) {
            console.warn(
                '[MONEHUNT BOT BUILDER] EDIT handoff has no XML:',
                edit_bot
            );

            sessionStorage.removeItem(
                MONEHUNT_BOT_BUILDER_EDIT_KEY
            );

            return;
        }

        let cancelled = false;
        let attempts = 0;
        const max_attempts = 100;

        const consume_edit_handoff = async () => {
            while (!cancelled && attempts < max_attempts) {
                const workspace = window.Blockly?.derivWorkspace;

                if (workspace) {
                    try {
                        // FREE BOT IDs must never become editable
                        // user-bot IDs.
                        const new_strategy_id =
                            window.Blockly.utils.idGenerator.genUid();

                        const converted_dom =
                            window.Blockly.utils.xml.textToDom(
                                edit_bot.xml
                            );

                        updateXmlValues({
                            strategy_id: new_strategy_id,
                            convertedDom: converted_dom,
                            file_name:
                                edit_bot.name || 'Untitled Strategy',
                            from: undefined,
                        });

                        await load_modal.loadStrategyOnBotBuilder();

                        if (cancelled) {
                            return;
                        }

                        workspace.current_strategy_id =
                            new_strategy_id;

                        save_modal.updateBotName(
                            edit_bot.name || 'Untitled Strategy'
                        );

                        sessionStorage.removeItem(
                            MONEHUNT_BOT_BUILDER_EDIT_KEY
                        );

                        console.log(
                            '[MONEHUNT BOT BUILDER] EDIT HANDOFF LOADED:',
                            {
                                source_bot_id: edit_bot.id,
                                new_strategy_id,
                                name: edit_bot.name,
                            }
                        );
                    } catch (error) {
                        console.error(
                            '[MONEHUNT BOT BUILDER] EDIT HANDOFF LOAD FAILED:',
                            error
                        );
                    }

                    return;
                }

                attempts += 1;

                await new Promise(resolve =>
                    setTimeout(resolve, 100)
                );
            }

            if (!cancelled) {
                console.warn(
                    '[MONEHUNT BOT BUILDER] EDIT HANDOFF TIMEOUT: Blockly workspace not ready.'
                );
            }
        };

        void consume_edit_handoff();

        return () => {
            cancelled = true;
        };
    }, [load_modal, save_modal]);
    let deleted_block_id: null | string = null;

    React.useEffect(() => {
        onMount();
        return () => onUnmount();
    }, [onMount, onUnmount]);

    React.useEffect(() => {
        const workspace = window.Blockly?.derivWorkspace;
        if (workspace && is_running && !is_blockly_listener_registered.current) {
            is_blockly_listener_registered.current = true;
            workspace.addChangeListener(handleBlockChangeOnBotRun);
        } else {
            removeBlockChangeListener();
        }

        return () => {
            if (workspace && is_blockly_listener_registered.current) {
                removeBlockChangeListener();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_running]);

    const handleBlockChangeOnBotRun = (e: Event) => {
        const { is_reset_button_clicked } = toolbar;
        if (e.type !== 'selected' && !is_reset_button_clicked) {
            botNotification(notification_message().workspace_change);
            removeBlockChangeListener();
        } else if (is_reset_button_clicked) {
            removeBlockChangeListener();
        }
    };

    const removeBlockChangeListener = () => {
        is_blockly_listener_registered.current = false;
        window.Blockly?.derivWorkspace?.removeChangeListener(handleBlockChangeOnBotRun);
    };
    React.useEffect(() => {
        const workspace = window.Blockly?.derivWorkspace;
        if (workspace && !is_blockly_delete_listener_registered.current) {
            is_blockly_delete_listener_registered.current = true;
            workspace.addChangeListener(handleBlockDelete);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is_loading]);

    const handleBlockDelete = (e: TBlocklyEvents) => {
        const { is_reset_button_clicked, setResetButtonState } = toolbar;
        if (e.type === 'undo') {
            deleted_block_id = null;
            return;
        }
        if (e.type === 'delete' && !is_reset_button_clicked) {
            deleted_block_id = e.blockId;
        }
        if (e.type === 'selected' && deleted_block_id === e.oldElementId) {
            handleBlockDeleteNotification();
            deleted_block_id = null;
        }
        if (
            e.type === 'change' &&
            e.name === 'AMOUNT_LIMITS' &&
            e.newValue === '(min: 0.35 - max: 50000)' &&
            is_reset_button_clicked
        ) {
            setResetButtonState(false);
        }
    };

    const handleBlockDeleteNotification = () => {
        botNotification(notification_message().block_delete, {
            label: localize('Undo'),
            onClick: closeToast => {
                window.Blockly.derivWorkspace.undo();
                closeToast?.();
            },
        });
    };

    return (
        <>
            <div
                className={classNames('bot-builder', {
                    'bot-builder--active': active_tab === 1 && !is_preview_on_popup,
                    'bot-builder--inactive': is_preview_on_popup,
                    'bot-builder--tour-active': active_tour,
                })}
            >
                <div id='scratch_div' ref={el_ref}>
                    <WorkspaceWrapper />
                </div>
            </div>
            {/* removed this outside from toolbar becuase it needs to loaded seperately without dependency */}
            <LoadModal />
            <SaveModal />
            {is_open && <QuickStrategy1 />}
        </>
    );
});

export default BotBuilder;

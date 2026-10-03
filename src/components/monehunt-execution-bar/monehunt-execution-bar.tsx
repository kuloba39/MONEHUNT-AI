import React from 'react';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import { LabelPairedPlayLgFillIcon, LabelPairedSquareLgFillIcon } from '@deriv/quill-icons/LabelPaired';
import Button from '@/components/shared_ui/button';
import ContractStageText from '@/components/trade-animation/contract-stage-text';
import { contract_stages } from '@/constants/contract-stage';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import './monehunt-execution-bar.scss';

const MonehuntExecutionBar = observer(() => {
    const { run_panel, blockly_store } = useStore();

    const {
        contract_stage,
        is_running,
        has_open_contract,
        is_stop_button_visible,
        is_stop_button_disabled,
        error_type,
        onRunButtonClick,
        onStopBotClick,
    } = run_panel;

    const { has_active_bot, has_saved_bots } = blockly_store;

    const has_bot = has_active_bot || has_saved_bots;
    const is_running_state = is_running || has_open_contract || is_stop_button_visible;
    const is_error = !!error_type;

    let status_label = localize('READY');
    let status_class = 'ready';

    if (is_error) {
        status_label = localize('ERROR');
        status_class = 'error';
    } else if (contract_stage === contract_stages.STARTING) {
        status_label = localize('STARTING');
        status_class = 'starting';
    } else if (contract_stage === contract_stages.PURCHASE_SENT) {
        status_label = localize('PURCHASE SENT');
        status_class = 'buying';
    } else if (contract_stage === contract_stages.PURCHASE_RECEIVED) {
        status_label = localize('CONTRACT OPEN');
        status_class = 'running';
    } else if (contract_stage === contract_stages.CONTRACT_CLOSED) {
        status_label = localize('COMPLETED');
        status_class = 'completed';
    } else if (is_running_state) {
        status_label = localize('RUNNING');
        status_class = 'running';
    } else if (!has_bot) {
        status_label = localize('NO BOT');
        status_class = 'idle';
    }

    const is_run_disabled =
        is_running_state ||
        !has_bot ||
        contract_stage === contract_stages.STARTING ||
        contract_stage === contract_stages.PURCHASE_SENT;

    const handleRun = () => {
        if (is_run_disabled) return;
        onRunButtonClick();
    };

    const handleStop = () => {
        if (!is_running_state || is_stop_button_disabled) return;
        onStopBotClick();
    };

    return (
        <section className='monehunt-execution-bar' aria-label={localize('MONEHUNT execution controls')}>
            <div className='monehunt-execution-bar__inner'>
                <div className='monehunt-execution-bar__identity'>
                    <div className='monehunt-execution-bar__brand'>
                        <span className='monehunt-execution-bar__dot' />
                        <span>MONEHUNT</span>
                    </div>

                    <div className='monehunt-execution-bar__engine'>
                        <span>{localize('EXECUTION')}</span>
                    </div>
                </div>

                <div className='monehunt-execution-bar__status'>
                    <span className={classNames('monehunt-execution-bar__status-dot', status_class)} />
                    <div className='monehunt-execution-bar__status-content'>
                        <span className='monehunt-execution-bar__status-label'>{status_label}</span>
                        <span className='monehunt-execution-bar__stage'>
                            {contract_stage > 0 ? (
                                <ContractStageText contract_stage={contract_stage} />
                            ) : (
                                localize('No active contract')
                            )}
                        </span>
                    </div>
                </div>

                <div className='monehunt-execution-bar__controls'>
                    <Button
                        id='monehunt-global-run-button'
                        className='monehunt-execution-bar__run'
                        primary
                        has_effect
                        is_disabled={is_run_disabled}
                        icon={<LabelPairedPlayLgFillIcon fill='#fff' />}
                        onClick={handleRun}
                    >
                        {localize('RUN')}
                    </Button>

                    <Button
                        id='monehunt-global-stop-button'
                        className='monehunt-execution-bar__stop'
                        secondary
                        has_effect
                        is_disabled={!is_running_state || is_stop_button_disabled}
                        icon={<LabelPairedSquareLgFillIcon />}
                        onClick={handleStop}
                    >
                        {localize('STOP')}
                    </Button>
                </div>
            </div>
        </section>
    );
});

export default MonehuntExecutionBar;

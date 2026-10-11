export const EXECUTION_STATUS = Object.freeze({
    IDLE: 'IDLE',
    WAITING_FOR_PROPOSAL: 'WAITING_FOR_PROPOSAL',
    READY_TO_BUY: 'READY_TO_BUY',
    BUYING: 'BUYING',
    CONTRACT_OPEN: 'CONTRACT_OPEN',
    SETTLING: 'SETTLING',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR',
});

export const EXECUTION_EVENT = Object.freeze({
    START: 'START',
    PROPOSAL_READY: 'PROPOSAL_READY',
    PURCHASE_REQUESTED: 'PURCHASE_REQUESTED',
    PURCHASE_CONFIRMED: 'PURCHASE_CONFIRMED',
    SETTLEMENT_RECEIVED: 'SETTLEMENT_RECEIVED',
    SETTLEMENT_CONFIRMED: 'SETTLEMENT_CONFIRMED',
    STOP: 'STOP',
    FAILURE: 'FAILURE',
    RESET: 'RESET',
});

export const createInitialExecutionState = (settledContractIds = []) => ({
    status: EXECUTION_STATUS.IDLE,
    sessionId: null,
    purchaseId: null,
    contractId: null,
    settledContractIds: [...settledContractIds],
    settlement: null,
    stopRequested: false,
    lastError: null,
});

const hasActiveContract = state =>
    Boolean(state.contractId) &&
    [
        EXECUTION_STATUS.CONTRACT_OPEN,
        EXECUTION_STATUS.SETTLING,
    ].includes(state.status);

export const transitionExecutionState = (state, event) => {
    if (!state || !event || typeof event.type !== 'string') {
        return state;
    }

    switch (event.type) {
        case EXECUTION_EVENT.START:
            if (
                ![
                    EXECUTION_STATUS.IDLE,
                    EXECUTION_STATUS.STOPPED,
                    EXECUTION_STATUS.ERROR,
                ].includes(state.status) ||
                hasActiveContract(state)
            ) {
                return state;
            }

            return {
                ...createInitialExecutionState(state.settledContractIds),
                status: EXECUTION_STATUS.WAITING_FOR_PROPOSAL,
                sessionId: event.sessionId ?? null,
            };

        case EXECUTION_EVENT.PROPOSAL_READY:
            if (state.status !== EXECUTION_STATUS.WAITING_FOR_PROPOSAL) {
                return state;
            }

            return {
                ...state,
                status: EXECUTION_STATUS.READY_TO_BUY,
                lastError: null,
            };

        case EXECUTION_EVENT.PURCHASE_REQUESTED:
            if (state.status !== EXECUTION_STATUS.READY_TO_BUY) {
                return state;
            }

            return {
                ...state,
                status: EXECUTION_STATUS.BUYING,
                purchaseId: event.purchaseId ?? null,
                lastError: null,
            };

        case EXECUTION_EVENT.PURCHASE_CONFIRMED:
            if (
                state.status !== EXECUTION_STATUS.BUYING ||
                event.contractId === undefined ||
                event.contractId === null ||
                String(event.contractId).length === 0
            ) {
                return state;
            }

            return {
                ...state,
                status: EXECUTION_STATUS.CONTRACT_OPEN,
                contractId: String(event.contractId),
            };

        case EXECUTION_EVENT.SETTLEMENT_RECEIVED: {
            const contractId = String(event.contractId ?? '');

            if (
                state.status !== EXECUTION_STATUS.CONTRACT_OPEN ||
                !contractId ||
                contractId !== state.contractId ||
                state.settledContractIds.includes(contractId)
            ) {
                return state;
            }

            return {
                ...state,
                status: EXECUTION_STATUS.SETTLING,
                settledContractIds: [
                    ...state.settledContractIds,
                    contractId,
                ],
                settlement: {
                    contractId,
                    status: event.status ?? 'unknown',
                },
            };
        }

        case EXECUTION_EVENT.SETTLEMENT_CONFIRMED:
            if (
                state.status !== EXECUTION_STATUS.SETTLING ||
                !state.settlement ||
                String(event.contractId ?? '') !== state.settlement.contractId
            ) {
                return state;
            }

            return {
                ...state,
                status: state.stopRequested
                    ? EXECUTION_STATUS.STOPPED
                    : EXECUTION_STATUS.WAITING_FOR_PROPOSAL,
                contractId: null,
                purchaseId: null,
                settlement: null,
                lastError: null,
            };

        case EXECUTION_EVENT.STOP:
            if (hasActiveContract(state)) {
                // Keep tracking the active contract until settlement.
                return {
                    ...state,
                    stopRequested: true,
                };
            }

            if (state.status === EXECUTION_STATUS.BUYING) {
                // A purchase may already be in flight; do not pretend
                // that it was cancelled or that no contract can result.
                return {
                    ...state,
                    stopRequested: true,
                };
            }

            return {
                ...state,
                status: EXECUTION_STATUS.STOPPED,
                stopRequested: true,
            };

        case EXECUTION_EVENT.FAILURE:
            if (hasActiveContract(state)) {
                // Retain the contract-tracking state during recovery.
                return {
                    ...state,
                    lastError: String(event.message ?? 'Execution error'),
                };
            }

            return {
                ...state,
                status: EXECUTION_STATUS.ERROR,
                lastError: String(event.message ?? 'Execution error'),
            };

        case EXECUTION_EVENT.RESET:
            if (
                hasActiveContract(state) ||
                state.status === EXECUTION_STATUS.BUYING
            ) {
                return state;
            }

            return createInitialExecutionState(state.settledContractIds);

        default:
            return state;
    }
};


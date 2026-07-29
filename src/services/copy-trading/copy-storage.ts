import type {
    DerivAccount,
    MasterTrader,
    CopyRelationship
} from "@/types/copy-trading";


const STORAGE_KEYS = {

    ACCOUNTS: "mh_accounts",

    MASTERS: "mh_masters",

    RELATIONSHIPS: "mh_copy_relationships"

};



export function saveAccount(
    account: DerivAccount
) {

    const accounts: DerivAccount[] =
        JSON.parse(
            localStorage.getItem(
                STORAGE_KEYS.ACCOUNTS
            ) || "[]"
        );


    const exists =
        accounts.some(
            item => item.id === account.id
        );


    if (!exists) {

        accounts.push(account);

    }


    localStorage.setItem(
        STORAGE_KEYS.ACCOUNTS,
        JSON.stringify(accounts)
    );

}



export function getAccounts(): DerivAccount[] {

    return JSON.parse(
        localStorage.getItem(
            STORAGE_KEYS.ACCOUNTS
        ) || "[]"
    );

}



export function saveMaster(
    master: MasterTrader
) {

    const masters: MasterTrader[] =
        JSON.parse(
            localStorage.getItem(
                STORAGE_KEYS.MASTERS
            ) || "[]"
        );


    const exists =
        masters.some(
            item => item.id === master.id
        );


    if (!exists) {

        masters.push(master);

    }


    localStorage.setItem(
        STORAGE_KEYS.MASTERS,
        JSON.stringify(masters)
    );

}



export function getMasters(): MasterTrader[] {

    return JSON.parse(
        localStorage.getItem(
            STORAGE_KEYS.MASTERS
        ) || "[]"
    );

}



export function createRelationship(
    relationship: CopyRelationship
) {

    const relationships: CopyRelationship[] =
        JSON.parse(
            localStorage.getItem(
                STORAGE_KEYS.RELATIONSHIPS
            ) || "[]"
        );


    relationships.push(
        relationship
    );


    localStorage.setItem(
        STORAGE_KEYS.RELATIONSHIPS,
        JSON.stringify(relationships)
    );

}



export function getRelationships(): CopyRelationship[] {

    return JSON.parse(
        localStorage.getItem(
            STORAGE_KEYS.RELATIONSHIPS
        ) || "[]"
    );

}
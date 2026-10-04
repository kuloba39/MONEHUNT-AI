export const MONEHUNT_SELECTED_BOT_KEY = 'monehunt_selected_bot';
export const MONEHUNT_BOT_BUILDER_EDIT_KEY =
    'monehunt_bot_builder_edit';

export type MonehuntSelectedBot = {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    tag?: string;
    xml: string;
    free?: boolean;
};

const writeSessionValue = (key: string, value: unknown): void => {
    sessionStorage.setItem(key, JSON.stringify(value));
};

export const selectMonehuntBot = (bot: MonehuntSelectedBot): void => {
    writeSessionValue(MONEHUNT_SELECTED_BOT_KEY, {
        id: bot.id,
        name: bot.name,
        description: bot.description,
        icon: bot.icon,
        color: bot.color,
        tag: bot.tag,
        xml: bot.xml,
        free: bot.free,
    });
};

export const editMonehuntBot = (bot: MonehuntSelectedBot): void => {
    writeSessionValue(MONEHUNT_BOT_BUILDER_EDIT_KEY, {
        id: bot.id,
        name: bot.name,
        description: bot.description,
        icon: bot.icon,
        color: bot.color,
        tag: bot.tag,
        xml: bot.xml,
        free: bot.free,
    });
};

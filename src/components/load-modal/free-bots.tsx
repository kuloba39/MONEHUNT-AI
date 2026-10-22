
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FREE_BOTS } from '@/constants/free-bots';
import {
    selectMonehuntBot,
    editMonehuntBot,
} from '@/utils/monehunt-selected-bot';
import './free-bots.scss';

const BOT_ARTWORK: Record<string, { eyebrow: string; model: string }> = {
    'free-even': {
        eyebrow: 'EVEN DIGITS',
        model: 'EV',
    },
    'matches-signal': {
        eyebrow: 'MATCHES / DIFFERS',
        model: 'MS',
    },
    'over2-signal-v2': {
        eyebrow: 'OVER 2 SIGNAL V2',
        model: 'O2',
    },
    'over6-recovery-over3': {
        eyebrow: 'RECOVERY SYSTEM',
        model: 'R3',
    },
};

const RobotArtwork: React.FC<{ model: string }> = ({ model }) => {
    const safeModel = model.replace(/[^a-zA-Z0-9_-]/g, '');
    const metalId = `mh-metal-${safeModel}`;
    const darkId = `mh-dark-${safeModel}`;
    const glowId = `mh-glow-${safeModel}`;
    const shadowId = `mh-shadow-${safeModel}`;

    return (
        <div className="free-bot-artwork">
            <svg
                className="mh-modern-robot"
                viewBox="0 0 320 320"
                role="img"
                aria-label={`${model} modern AI trading robot`}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient
                        id={metalId}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                    >
                        <stop offset="0%" stopColor="#f0f5f9" />
                        <stop offset="16%" stopColor="#a7b4c0" />
                        <stop offset="36%" stopColor="#4b5968" />
                        <stop offset="58%" stopColor="#1b2530" />
                        <stop offset="78%" stopColor="#748392" />
                        <stop offset="100%" stopColor="#26313d" />
                    </linearGradient>

                    <linearGradient
                        id={darkId}
                        x1="0"
                        y1="0"
                        x2="0.9"
                        y2="1"
                    >
                        <stop offset="0%" stopColor="#465565" />
                        <stop offset="45%" stopColor="#202b38" />
                        <stop offset="100%" stopColor="#080d14" />
                    </linearGradient>

                    <linearGradient
                        id={glowId}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--bot-accent)"
                            stopOpacity=".45"
                        />
                        <stop
                            offset="50%"
                            stopColor="var(--bot-accent)"
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--bot-accent)"
                            stopOpacity=".55"
                        />
                    </linearGradient>

                    <filter
                        id={shadowId}
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feGaussianBlur stdDeviation="5" />
                    </filter>
                </defs>

                {/* Ground illumination and holographic platform */}
                <ellipse
                    cx="160"
                    cy="285"
                    rx="83"
                    ry="11"
                    fill="var(--bot-accent)"
                    opacity=".16"
                    filter={`url(#${shadowId})`}
                />

                <ellipse
                    cx="160"
                    cy="285"
                    rx="82"
                    ry="8"
                    fill="none"
                    stroke="var(--bot-accent)"
                    strokeWidth="1.5"
                    opacity=".75"
                />

                <ellipse
                    cx="160"
                    cy="285"
                    rx="56"
                    ry="4"
                    fill="none"
                    stroke="#8b9cab"
                    opacity=".6"
                />

                {/* Rear neck assembly */}
                <path
                    d="M130 172 L128 201 L145 222 L175 222 L192 201 L190 172 Z"
                    fill={`url(#${darkId})`}
                    stroke="#8797a7"
                    strokeWidth="1.5"
                />

                <path
                    d="M139 184 L181 184 L176 211 L144 211 Z"
                    fill="#101721"
                    stroke="#485767"
                />

                <path
                    d="M149 191 L171 191 L168 204 L152 204 Z"
                    fill={`url(#${glowId})`}
                />

                {/* Left shoulder armor */}
                <path
                    d="M123 187 L83 177 L51 200 L61 239 L103 250 L130 224 Z"
                    fill={`url(#${metalId})`}
                    stroke="#a8b5c1"
                    strokeWidth="1.5"
                />

                <path
                    d="M82 194 L111 201 L102 230 L71 222 Z"
                    fill="#121a24"
                    stroke="#637383"
                />

                <path
                    d="M69 207 L91 213 L87 219 L67 213 Z"
                    fill={`url(#${glowId})`}
                />

                {/* Right shoulder armor */}
                <path
                    d="M197 187 L237 177 L269 200 L259 239 L217 250 L190 224 Z"
                    fill={`url(#${metalId})`}
                    stroke="#a8b5c1"
                    strokeWidth="1.5"
                />

                <path
                    d="M238 194 L209 201 L218 230 L249 222 Z"
                    fill="#121a24"
                    stroke="#637383"
                />

                <path
                    d="M251 207 L229 213 L233 219 L253 213 Z"
                    fill={`url(#${glowId})`}
                />

                {/* Armored torso */}
                <path
                    d="M113 201 L137 214 L183 214 L207 201 L220 247 L196 273 L124 273 L100 247 Z"
                    fill={`url(#${darkId})`}
                    stroke="#8494a4"
                    strokeWidth="2"
                />

                <path
                    d="M125 218 L147 225 L173 225 L195 218 L202 245 L184 260 L136 260 L118 245 Z"
                    fill={`url(#${metalId})`}
                    stroke="#aebbc7"
                    strokeWidth="1"
                />

                {/* Reactor housing */}
                <path
                    d="M139 226 L181 226 L191 244 L180 258 L140 258 L129 244 Z"
                    fill="#0b131c"
                    stroke="var(--bot-accent)"
                    strokeWidth="1.5"
                />

                <path
                    d="M151 232 L169 232 L178 243 L169 252 L151 252 L142 243 Z"
                    fill={`url(#${glowId})`}
                />

                <path
                    d="M155 237 L165 237 L171 243 L165 249 L155 249 L149 243 Z"
                    fill="#effffb"
                    opacity=".95"
                />

                {/* Mechanical chest details */}
                <path
                    d="M111 237 L126 241 M209 237 L194 241"
                    stroke="#aebbc7"
                    strokeWidth="2"
                />

                <path
                    d="M124 264 L137 268 M196 264 L183 268"
                    stroke="var(--bot-accent)"
                    strokeWidth="2"
                />

                {/* Head side connectors */}
                <path
                    d="M105 84 L84 96 L84 129 L106 140 Z"
                    fill={`url(#${darkId})`}
                    stroke="#8b9aaa"
                    strokeWidth="2"
                />

                <path
                    d="M215 84 L236 96 L236 129 L214 140 Z"
                    fill={`url(#${darkId})`}
                    stroke="#8b9aaa"
                    strokeWidth="2"
                />

                <path
                    d="M88 105 L99 109 L99 123 L88 119 Z"
                    fill="var(--bot-accent)"
                />

                <path
                    d="M232 105 L221 109 L221 123 L232 119 Z"
                    fill="var(--bot-accent)"
                />

                {/* Angular metallic helmet */}
                <path
                    d="M117 47 L142 32 L178 32 L203 47 L219 73 L214 126 L194 151 L174 163 L146 163 L126 151 L106 126 L101 73 Z"
                    fill={`url(#${metalId})`}
                    stroke="#c5d0d9"
                    strokeWidth="2"
                />

                {/* Crown armor panels */}
                <path
                    d="M142 36 L160 51 L178 36 L172 64 L148 64 Z"
                    fill="#17222e"
                    stroke="#7e8e9e"
                    strokeWidth="1.2"
                />

                <path
                    d="M160 51 L160 62"
                    stroke="var(--bot-accent)"
                    strokeWidth="2"
                />

                {/* Side helmet plating */}
                <path
                    d="M112 74 L132 63 L126 94 L112 106 Z"
                    fill="#202b37"
                    stroke="#8998a7"
                />

                <path
                    d="M208 74 L188 63 L194 94 L208 106 Z"
                    fill="#202b37"
                    stroke="#8998a7"
                />

                {/* Dark faceplate */}
                <path
                    d="M124 76 L145 67 L175 67 L196 76 L202 111 L183 139 L160 149 L137 139 L118 111 Z"
                    fill="#080e16"
                    stroke="#728292"
                    strokeWidth="1.5"
                />

                {/* Glowing sensor visor */}
                <path
                    d="M124 91 L143 84 L177 84 L196 91 L190 108 L173 113 L147 113 L130 108 Z"
                    fill={`url(#${glowId})`}
                />

                <path
                    d="M133 95 L148 91 L172 91 L187 95 L180 102 L170 105 L150 105 L140 102 Z"
                    fill="#eaffff"
                    opacity=".96"
                />

                <path
                    d="M139 97 L151 96 M169 96 L181 97"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    opacity=".9"
                />

                {/* Mechanical lower face plate */}
                <path
                    d="M141 121 L151 117 L169 117 L179 121 L173 135 L160 141 L147 135 Z"
                    fill="#202c39"
                    stroke="#8191a0"
                    strokeWidth="1.2"
                />

                <path
                    d="M151 126 L169 126 M154 131 L166 131"
                    stroke="var(--bot-accent)"
                    strokeWidth="2"
                />

                {/* Jaw armor */}
                <path
                    d="M120 114 L133 119 L138 137 L127 130 Z"
                    fill="#8795a3"
                    stroke="#c7d0d8"
                    strokeWidth=".8"
                />

                <path
                    d="M200 114 L187 119 L182 137 L193 130 Z"
                    fill="#8795a3"
                    stroke="#c7d0d8"
                    strokeWidth=".8"
                />

                {/* Technical details */}
                <path
                    d="M116 79 L123 76 M204 79 L197 76"
                    stroke="var(--bot-accent)"
                    strokeWidth="2.5"
                />

                <circle cx="115" cy="123" r="2" fill="#d6e0e8" />
                <circle cx="205" cy="123" r="2" fill="#d6e0e8" />

                {/* Model identifier */}
                <text
                    x="160"
                    y="278"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    letterSpacing="3"
                    fill="#c1ccd6"
                >
                    {model}
                </text>
            </svg>
        </div>
    );
};

const FreeBotsComponent: React.FC = () => {
    const navigate = useNavigate();

    const handleSelect = (bot: (typeof FREE_BOTS)[number]) => {
        selectMonehuntBot(bot);
        navigate('/preview');
    };

    const handleEdit = (bot: (typeof FREE_BOTS)[number]) => {
        editMonehuntBot(bot);
        navigate('/bot-builder');
    };

    return (
        <section className="free-bots">
            <header className="free-bots-header">
                <div>
                    <p className="free-bots-kicker">
                        MONEHUNT AI // ROBOTICS DIVISION
                    </p>

                    <h2>Free Trading Bots</h2>

                    <p className="free-bots-subtitle">
                        Choose your AI trading robot or customize its strategy
                        in the Bot Builder.
                    </p>
                </div>

                <span className="free-bots-count">
                    {FREE_BOTS.length} STRATEGIES
                </span>
            </header>

            <div className="free-bots-grid">
                {FREE_BOTS.map(bot => {
                    const artwork = BOT_ARTWORK[bot.id] ?? {
                        eyebrow: 'TRADING STRATEGY',
                        model: bot.icon ?? 'AI',
                    };

                    return (
                        <article
                            className="free-bot-card"
                            key={bot.id}
                            style={
                                {
                                    '--bot-accent': bot.color ?? '#08a86b',
                                } as React.CSSProperties
                            }
                        >
                            <div className="free-bot-card-header">
                                <RobotArtwork model={artwork.model} />

                                <span className="free-bot-status">
                                    <span className="free-bot-status-dot" />
                                    FREE ACCESS
                                </span>
                            </div>

                            <div className="free-bot-content">
                                <p className="free-bot-eyebrow">
                                    {artwork.eyebrow}
                                </p>

                                <h3 className="free-bot-title">
                                    {bot.name}
                                </h3>

                                <p className="free-bot-description">
                                    {bot.description}
                                </p>

                                <span className="free-bot-tag">
                                    {bot.tag}
                                </span>
                            </div>

                            <footer className="free-bot-footer">
                                <button
                                    type="button"
                                    className="free-bot-button free-bot-button-primary"
                                    onClick={() => handleSelect(bot)}
                                >
                                    <span>Select Bot</span>
                                    <span aria-hidden="true">→</span>
                                </button>

                                <button
                                    type="button"
                                    className="free-bot-button free-bot-button-secondary"
                                    onClick={() => handleEdit(bot)}
                                >
                                    Customize
                                </button>
                            </footer>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default FreeBotsComponent;

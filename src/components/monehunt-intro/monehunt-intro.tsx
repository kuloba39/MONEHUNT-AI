import { useEffect, useState } from 'react';
import './monehunt-intro.scss';

type MonehuntIntroProps = {
    onComplete?: () => void;
};

const MonehuntIntro = ({ onComplete }: MonehuntIntroProps) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const exitTimer = window.setTimeout(() => {
            setExiting(true);
        }, 2600);

        const completeTimer = window.setTimeout(() => {
            onComplete?.();
        }, 3200);

        return () => {
            window.clearTimeout(exitTimer);
            window.clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`monehunt-intro ${exiting ? 'monehunt-intro--exit' : ''}`}>
            <div className='monehunt-intro__ambient monehunt-intro__ambient--one' />
            <div className='monehunt-intro__ambient monehunt-intro__ambient--two' />

            <div className='monehunt-intro__content'>
                <div className='monehunt-intro__logo-wrap'>
                    <div className='monehunt-intro__logo-glow' />
                    <img
                        className='monehunt-intro__logo'
                        src='/logo.png'
                        alt='MONEHUNT'
                    />
                </div>

                <div className='monehunt-intro__brand'>
                    <div className='monehunt-intro__name'>MONEHUNT</div>
                    <div className='monehunt-intro__tagline'>
                        AI-POWERED TRADING COMMAND CENTER
                    </div>
                </div>

                <div className='monehunt-intro__systems'>
                    <div className='monehunt-intro__system'>
                        <span className='monehunt-intro__dot' />
                        <span>MARKET ENGINE</span>
                    </div>

                    <div className='monehunt-intro__system'>
                        <span className='monehunt-intro__dot' />
                        <span>AI SIGNAL ENGINE</span>
                    </div>

                    <div className='monehunt-intro__system'>
                        <span className='monehunt-intro__dot' />
                        <span>BOT EXECUTION</span>
                    </div>

                    <div className='monehunt-intro__system'>
                        <span className='monehunt-intro__dot' />
                        <span>LIVE CONNECTION</span>
                    </div>
                </div>

                <div className='monehunt-intro__status'>
                    <span className='monehunt-intro__loader' />
                    <span>INITIALIZING MONEHUNT</span>
                </div>

                <div className='monehunt-intro__progress'>
                    <span />
                </div>
            </div>

            <div className='monehunt-intro__footer'>
                MONEHUNT AI
            </div>
        </div>
    );
};

export default MonehuntIntro;

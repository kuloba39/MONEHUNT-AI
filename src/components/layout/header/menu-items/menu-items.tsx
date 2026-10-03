import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './menu-items.scss';

type MenuGroup = 'AI COMMAND CENTER' | 'TRADING';

const aiItems = [
    { label: 'AI Lab', path: '/ai-lab' },
    { label: 'Only Ups / Downs', path: '/only-ups-downs' },
];

const tradingItems = [
    { label: 'Bot Builder', path: '/bot-builder' },
    { label: 'Charts', path: '/chart' },
    { label: 'Free Bots', path: '/free-bots' },
    { label: 'D Circles', path: '/d-circles' },
];

const directItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Copy Trading', path: '/copy-trading' },
    { label: 'Trading Workspace', path: '/preview' },
];

export const MenuItems = () => {
    const [openGroup, setOpenGroup] = useState<MenuGroup | null>(null);
    const menuRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setOpenGroup(null);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const toggleGroup = (group: MenuGroup) => {
        setOpenGroup(current => (current === group ? null : group));
    };

    const dashboardItem = directItems.find(item => item.path === '/')!;
    const secondaryItems = directItems.filter(item => item.path !== '/');

    return (
        <nav
            ref={menuRef}
            className='dc-menu'
            aria-label='MONEHUNT navigation'
        >
            <NavLink
                to={dashboardItem.path}
                end
                className={({ isActive }) =>
                    [
                        'dc-menu__item',
                        'dc-menu__item--primary',
                        isActive ? 'dc-menu__item--active' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')
                }
            >
                {dashboardItem.label}
            </NavLink>

            <div className='dc-menu__dropdown'>
                <button
                    type='button'
                    className={`dc-menu__item dc-menu__trigger ${
                        openGroup === 'AI COMMAND CENTER'
                            ? 'dc-menu__item--open'
                            : ''
                    }`}
                    aria-expanded={openGroup === 'AI COMMAND CENTER'}
                    onClick={() => toggleGroup('AI COMMAND CENTER')}
                >
                    AI COMMAND CENTER
                    <span className='dc-menu__chevron'>▾</span>
                </button>

                {openGroup === 'AI COMMAND CENTER' && (
                    <div className='dc-menu__panel'>
                        {aiItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `dc-menu__dropdown-item ${
                                        isActive ? 'dc-menu__dropdown-item--active' : ''
                                    }`
                                }
                                onClick={() => setOpenGroup(null)}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>

            <div className='dc-menu__dropdown'>
                <button
                    type='button'
                    className={`dc-menu__item dc-menu__trigger ${
                        openGroup === 'TRADING'
                            ? 'dc-menu__item--open'
                            : ''
                    }`}
                    aria-expanded={openGroup === 'TRADING'}
                    onClick={() => toggleGroup('TRADING')}
                >
                    TRADING
                    <span className='dc-menu__chevron'>▾</span>
                </button>

                {openGroup === 'TRADING' && (
                    <div className='dc-menu__panel'>
                        {tradingItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `dc-menu__dropdown-item ${
                                        isActive ? 'dc-menu__dropdown-item--active' : ''
                                    }`
                                }
                                onClick={() => setOpenGroup(null)}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>

            {secondaryItems.map(item => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        [
                            'dc-menu__item',
                            isActive ? 'dc-menu__item--active' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')
                    }
                >
                    {item.label}
                </NavLink>
            ))}
        </nav>
    );
};

export const TradershubLink = () => null;

type MenuItemsType = typeof MenuItems & {
    TradershubLink: typeof TradershubLink;
};

(MenuItems as MenuItemsType).TradershubLink = TradershubLink;

export default MenuItems as MenuItemsType;


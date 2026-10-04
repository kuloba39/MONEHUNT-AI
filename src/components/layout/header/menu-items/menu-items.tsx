import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import './menu-items.scss';

type MenuGroup = 'AI COMMAND CENTER' | 'TRADING';

type MenuPosition = {
    top: number;
    left: number;
};

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
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

    const menuRef = useRef<HTMLElement | null>(null);
    const triggerRefs = useRef<Partial<Record<MenuGroup, HTMLButtonElement | null>>>({});
    const panelRef = useRef<HTMLDivElement | null>(null);

    const updateMenuPosition = () => {
        if (!openGroup) return;

        const trigger = triggerRefs.current[openGroup];
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const panelWidth = 320;
        const viewportPadding = 8;

        const left = Math.min(
            Math.max(rect.left, viewportPadding),
            Math.max(
                viewportPadding,
                window.innerWidth - panelWidth - viewportPadding
            )
        );

        setMenuPosition({
            top: rect.bottom + 2,
            left,
        });
    };

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                menuRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }

            setOpenGroup(null);
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        if (!openGroup) {
            setMenuPosition(null);
            return;
        }

        updateMenuPosition();

        const handleViewportChange = () => {
            updateMenuPosition();
        };

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [openGroup]);

    const toggleGroup = (group: MenuGroup) => {
        setOpenGroup(current => (current === group ? null : group));
    };

    const dashboardItem = directItems.find(item => item.path === '/')!;
    const secondaryItems = directItems.filter(item => item.path !== '/');

    const dropdownItems =
        openGroup === 'AI COMMAND CENTER'
            ? aiItems
            : openGroup === 'TRADING'
              ? tradingItems
              : [];

    const dropdownPanel =
        openGroup && menuPosition
            ? createPortal(
                  <div
                      ref={panelRef}
                      className='dc-menu__portal-panel'
                      style={{
                          top: `${menuPosition.top}px`,
                          left: `${menuPosition.left}px`,
                      }}
                  >
                      {dropdownItems.map(item => (
                          <NavLink
                              key={item.path}
                              to={item.path}
                              className={({ isActive }) =>
                                  `dc-menu__dropdown-item ${
                                      isActive
                                          ? 'dc-menu__dropdown-item--active'
                                          : ''
                                  }`
                              }
                              onClick={() => setOpenGroup(null)}
                          >
                              {item.label}
                          </NavLink>
                      ))}
                  </div>,
                  document.body
              )
            : null;

    return (
        <>
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
                        ref={element => {
                            triggerRefs.current['AI COMMAND CENTER'] = element;
                        }}
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
                </div>

                <div className='dc-menu__dropdown'>
                    <button
                        ref={element => {
                            triggerRefs.current.TRADING = element;
                        }}
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

            {dropdownPanel}
        </>
    );
};

export const TradershubLink = () => null;

type MenuItemsType = typeof MenuItems & {
    TradershubLink: typeof TradershubLink;
};

(MenuItems as MenuItemsType).TradershubLink = TradershubLink;

export default MenuItems as MenuItemsType;

import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import './menu-items.scss';

const menuItems = [
    {
        label: 'Dashboard',
        path: '/',
    },
    {
        label: 'Analysis',
        path: '/analysis',
    },
    {
        label: 'Copy Trading',
        path: '/copy-trading',
    },
    {
        label: 'Bot Builder',
        path: '/bot-builder',
    },
    {
        label: 'Charts',
        path: '/chart',
    },
];


export const MenuItems = observer(() => {
    return (
        <nav className="dc-menu">

            {menuItems.map((item) => (
                <Link
                    key={item.path}
                    to={item.path}
                    className="dc-menu__item"
                >
                    {item.label}
                </Link>
            ))}

        </nav>
    );
});


export const TradershubLink = observer(() => {
    return null;
});


type MenuItemsType = typeof MenuItems & {
    TradershubLink: typeof TradershubLink;
};


(MenuItems as MenuItemsType).TradershubLink = TradershubLink;


export default MenuItems as MenuItemsType;
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function DemoLocations({ onSelect }) {
    const locations = [
        {
            name: 'Wicker Park, Chicago',
            address: '1574 N Milwaukee Ave, Chicago, IL 60622',
            description: 'Urban creative district • 10/10 backtest accuracy',
            badge: 'Perfect Match',
        },
        {
            name: 'Sevierville, Tennessee',
            address: '125 Collier Dr, Sevierville, TN 37862',
            description: 'Tourist destination • Different brand profile',
            badge: 'Contrast Example',
        },
        {
            name: 'Boulder, Colorado',
            address: '1125 Pearl St, Boulder, CO 80302',
            description: 'Active lifestyle hub • High accuracy',
            badge: 'Outdoor Focus',
        },
    ];
    return (_jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h3", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Try these demo locations" }), _jsx("div", { className: "grid md:grid-cols-3 gap-4", children: locations.map((location) => (_jsxs("button", { onClick: () => onSelect(location.address), className: "text-left bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("h4", { className: "font-semibold text-gray-900", children: location.name }), _jsx("span", { className: "text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded", children: location.badge })] }), _jsx("p", { className: "text-sm text-gray-600 mb-3", children: location.description }), _jsx("p", { className: "text-xs text-gray-500 truncate", children: location.address })] }, location.address))) })] }));
}
//# sourceMappingURL=DemoLocations.js.map
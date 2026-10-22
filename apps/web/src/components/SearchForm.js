import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function SearchForm({ onSubmit, isLoading }) {
    const [address, setAddress] = useState('');
    const [radius, setRadius] = useState(10);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (address.trim()) {
            onSubmit({ address: address.trim(), radius });
        }
    };
    return (_jsx("form", { onSubmit: handleSubmit, className: "bg-white rounded-lg shadow-md p-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "address", className: "block text-sm font-medium text-gray-700 mb-2", children: "Vacant Storefront Address" }), _jsx("input", { type: "text", id: "address", value: address, onChange: (e) => setAddress(e.target.value), placeholder: "e.g., 1574 N Milwaukee Ave, Chicago, IL 60622", className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent", required: true, disabled: isLoading })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "radius", className: "block text-sm font-medium text-gray-700 mb-2", children: ["Search Radius: ", radius, " km"] }), _jsx("input", { type: "range", id: "radius", min: "1", max: "20", value: radius, onChange: (e) => setRadius(Number(e.target.value)), className: "w-full", disabled: isLoading }), _jsxs("div", { className: "flex justify-between text-xs text-gray-500 mt-1", children: [_jsx("span", { children: "1 km" }), _jsx("span", { children: "20 km" })] })] }), _jsx("button", { type: "submit", disabled: isLoading || !address.trim(), className: "w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: isLoading ? 'Analyzing...' : 'Find Tenants' })] }) }));
}
//# sourceMappingURL=SearchForm.js.map
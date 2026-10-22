import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { ResultsView } from './components/ResultsView';
import { DemoLocations } from './components/DemoLocations';
function App() {
    const [results, setResults] = useState(null);
    const analyzeMutation = useMutation({
        mutationFn: async (request) => {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Analysis failed');
            }
            return response.json();
        },
        onSuccess: (data) => {
            setResults(data);
        },
    });
    const handleAnalyze = (request) => {
        analyzeMutation.mutate(request);
    };
    const handleDemoSelect = (address) => {
        handleAnalyze({ address, radius: 10 });
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, {}), _jsxs("main", { className: "container mx-auto px-4 py-8", children: [_jsxs("div", { className: "max-w-4xl mx-auto mb-8", children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900 mb-4", children: "Find Your Perfect Tenant" }), _jsx("p", { className: "text-lg text-gray-600 mb-6", children: "Drop a pin or enter an address for a vacant storefront. LeaseUp will show you which brands have high local affinity but aren't there yet\u2014backed by data and proven with backtests." }), _jsx(SearchForm, { onSubmit: handleAnalyze, isLoading: analyzeMutation.isPending }), analyzeMutation.error && (_jsx("div", { className: "mt-4 p-4 bg-red-50 border border-red-200 rounded-lg", children: _jsx("p", { className: "text-red-800", children: analyzeMutation.error.message }) }))] }), !results && !analyzeMutation.isPending && (_jsx(DemoLocations, { onSelect: handleDemoSelect })), results && (_jsx(ResultsView, { results: results })), analyzeMutation.isPending && (_jsx("div", { className: "max-w-4xl mx-auto", children: _jsx("div", { className: "bg-white rounded-lg shadow-lg p-8", children: _jsxs("div", { className: "flex items-center justify-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" }), _jsx("p", { className: "ml-4 text-lg text-gray-600", children: "Analyzing location with Qloo Taste AI..." })] }) }) }))] }), _jsx("footer", { className: "bg-gray-900 text-white py-8 mt-16", children: _jsxs("div", { className: "container mx-auto px-4 text-center", children: [_jsx("p", { className: "text-gray-400", children: "Powered by Qloo Taste AI | Built for Qloo Agentic Hackathon 2026" }), _jsx("p", { className: "text-gray-500 text-sm mt-2", children: "Aggregate data only \u2022 No personal information \u2022 Privacy-first" })] }) })] }));
}
export default App;
//# sourceMappingURL=App.js.map
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AnalysisRequest, AnalysisResponse } from '@leaseup/contracts';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { ResultsView } from './components/ResultsView';
import { DemoLocations } from './components/DemoLocations';

function App() {
  const [results, setResults] = useState<AnalysisResponse | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (request: AnalysisRequest) => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      return response.json() as Promise<AnalysisResponse>;
    },
    onSuccess: (data) => {
      setResults(data);
    },
  });

  const handleAnalyze = (request: AnalysisRequest) => {
    analyzeMutation.mutate(request);
  };

  const handleDemoSelect = (address: string) => {
    handleAnalyze({ address, radius: 10 });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Find Your Perfect Tenant
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Drop a pin or enter an address for a vacant storefront. LeaseUp will show you which brands
            have high local affinity but aren't there yet—backed by data and proven with backtests.
          </p>

          <SearchForm
            onSubmit={handleAnalyze}
            isLoading={analyzeMutation.isPending}
          />

          {analyzeMutation.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                {(analyzeMutation.error as Error).message}
              </p>
            </div>
          )}
        </div>

        {!results && !analyzeMutation.isPending && (
          <DemoLocations onSelect={handleDemoSelect} />
        )}

        {results && (
          <ResultsView results={results} />
        )}

        {analyzeMutation.isPending && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                <p className="ml-4 text-lg text-gray-600">
                  Analyzing location with Qloo Taste AI...
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Powered by Qloo Taste AI | Built for Qloo Agentic Hackathon 2026
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Aggregate data only • No personal information • Privacy-first
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

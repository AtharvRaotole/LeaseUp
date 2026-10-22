interface DemoLocationsProps {
  onSelect: (address: string) => void;
}

export function DemoLocations({ onSelect }: DemoLocationsProps) {
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

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Try these demo locations
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {locations.map((location) => (
          <button
            key={location.address}
            onClick={() => onSelect(location.address)}
            className="text-left bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{location.name}</h4>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded">
                {location.badge}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{location.description}</p>
            <p className="text-xs text-gray-500 truncate">{location.address}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// /app/components/Passenger/RouteSelector.tsx
"use client";

interface RouteSelectorProps {
  selectedRoute: string | null;
  setSelectedRoute: (routeId: string) => void;
}

const routes = [
  { id: "el-nido-puerto-princesa", name: "El Nido → Puerto Princesa" },
  { id: "puerto-princesa-el-nido", name: "Puerto Princesa → El Nido" },
];

export default function RouteSelector({
  selectedRoute,
  setSelectedRoute,
}: RouteSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="font-semibold text-black">Select a Route:</label>

      {routes.map((r) => {
        const isSelected = selectedRoute === r.id;

        return (
          <button
            key={r.id}
            onClick={() => setSelectedRoute(r.id)}
            className={`w-full px-4 py-2 rounded border transition
              ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-black border-gray-300 hover:bg-gray-100"
              }
            `}
          >
            {r.name}
          </button>
        );
      })}
    </div>
  );
}

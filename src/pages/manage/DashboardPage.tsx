import { Home, CheckCircle2, AlertCircle, Car } from 'lucide-react';
import { MasterProperty, Unit, Carpark, AssetStatus } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { formatDate } from '../../utils';

interface DashboardPageProps {
  units: Unit[];
  carparks: Carpark[];
  masterProperties: MasterProperty[];
}

export function DashboardPage({ units, carparks, masterProperties }: DashboardPageProps) {
  const totalAssets = units.length + carparks.length;
  const occupiedUnits = units.filter(u => u.status === AssetStatus.OCCUPIED).length;
  const occupiedCarparks = carparks.filter(c => c.status === AssetStatus.OCCUPIED).length;
  const occupied = occupiedUnits + occupiedCarparks;
  const vacant = totalAssets - occupied - units.filter(u => u.status === AssetStatus.MAINTENANCE).length - carparks.filter(c => c.status === AssetStatus.MAINTENANCE).length;
  const maintenance = units.filter(u => u.status === AssetStatus.MAINTENANCE).length + carparks.filter(c => c.status === AssetStatus.MAINTENANCE).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 w-full sm:w-auto text-center">
          {formatDate(new Date().toISOString())}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Assets"
          value={totalAssets}
          icon={<Home className="text-blue-600" />}
          bgColor="bg-blue-50"
          subValue={`${units.length} units, ${carparks.length} carparks`}
        />
        <StatCard
          title="Occupied"
          value={occupied}
          icon={<CheckCircle2 className="text-rose-600" />}
          bgColor="bg-rose-50"
          subValue={`${totalAssets > 0 ? Math.round((occupied / totalAssets) * 100) : 0}% Occupancy`}
        />
        <StatCard
          title="Vacant"
          value={vacant}
          icon={<AlertCircle className="text-emerald-600" />}
          bgColor="bg-emerald-50"
          subValue={`${vacant} assets ready`}
        />
        <StatCard
          title="Maintenance"
          value={maintenance}
          icon={<AlertCircle className="text-amber-600" />}
          bgColor="bg-amber-50"
          subValue={`${maintenance} under maintenance`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unit Status Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Unit Status</h2>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Vacant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Maintenance</span>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {masterProperties.map(prop => {
              const propUnits = units.filter(u => u.propertyId === prop.id);
              if (propUnits.length === 0) return null;
              return (
                <div key={prop.id}>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">{prop.name}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {propUnits.map(unit => (
                      <div
                        key={unit.id}
                        className={`p-3 rounded-xl border text-left ${
                          unit.status === AssetStatus.OCCUPIED
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : unit.status === AssetStatus.MAINTENANCE
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">{unit.unitNumber}</div>
                        <div className="text-xs font-medium">{unit.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {units.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic">
                No units added yet.
              </div>
            )}
          </div>
        </div>

        {/* Carpark Status */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Car size={18} />
              Carpark Status
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              {carparks.map(cp => (
                <div
                  key={cp.id}
                  className={`p-3 rounded-xl border text-left ${
                    cp.status === AssetStatus.OCCUPIED
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : cp.status === AssetStatus.MAINTENANCE
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">{cp.carparkNumber}</div>
                  <div className="text-xs font-medium">{cp.status}</div>
                </div>
              ))}
            </div>
            {carparks.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic">
                No carparks added yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useStep } from '../context/stepContextValue';
import StarfieldBackground from '../components/StarfieldBackground';
import {
  glassPanel,
  glassCard,
  glassInput,
  glassButton,
  glassPrimaryButton,
  glassPill,
  glassCardInteractive,
} from '../utils/glass';
import { API_URL } from '../api/creatorApi';

const TABS = [
  { id: 'identity', label: 'Identidad' },
  { id: 'model', label: 'Modelo' },
  { id: 'skills', label: 'Skills' },
  { id: 'mcps', label: 'MCPs' },
  { id: 'personality', label: 'Personalidad' },
  { id: 'targets', label: 'Targets' },
];

const PROVIDERS = ['openai', 'anthropic', 'local'];
const TONES = ['formal', 'casual', 'technical'];
const TARGET_OPTIONS = [
  { id: 'huascar', label: 'Huascar', description: 'Motor nativo con steering, governance y security.' },
  { id: 'kiro', label: 'Kiro', description: 'Steering, hooks y skills en formato .kiro.' },
  { id: 'portable', label: 'Portable', description: 'AGENTS.md y skills genéricos.' },
];

export default function FineTuningDashboard() {
  const { generate, loading, error } = useStep();

  const [activeTab, setActiveTab] = useState('identity');
  const [skills, setSkills] = useState([]);
  const [mcps, setMcps] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [mcpsLoading, setMcpsLoading] = useState(true);
  const [skillSearch, setSkillSearch] = useState('');
  const [mcpSearch, setMcpSearch] = useState('');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('');
  const [mcpCategoryFilter, setMcpCategoryFilter] = useState('');

  // Form state
  const [agentName, setAgentName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [objective, setObjective] = useState('');
  const [provider, setProvider] = useState('anthropic');
  const [temperature, setTemperature] = useState(0.7);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedMcps, setSelectedMcps] = useState([]);
  const [tone, setTone] = useState('technical');
  const [restrictions, setRestrictions] = useState('');
  const [styleNotes, setStyleNotes] = useState('');
  const [targets, setTargets] = useState(['huascar']);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/creator/skills`)
      .then((res) => res.json())
      .then((data) => setSkills(data.items || []))
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false));

    fetch(`${API_URL}/api/v1/creator/mcps`)
      .then((res) => res.json())
      .then((data) => setMcps(data.items || []))
      .catch(() => setMcps([]))
      .finally(() => setMcpsLoading(false));
  }, []);

  const skillCategories = useMemo(() => {
    const tags = new Set();
    skills.forEach((s) => s.tags?.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [skills]);

  const mcpCategories = useMemo(() => {
    const cats = new Set();
    mcps.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return [...cats].sort();
  }, [mcps]);

  const filteredSkills = useMemo(() => {
    const q = skillSearch.toLowerCase();
    return skills.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)) &&
        (!skillCategoryFilter || s.tags?.includes(skillCategoryFilter)),
    );
  }, [skills, skillSearch, skillCategoryFilter]);

  const filteredMcps = useMemo(() => {
    const q = mcpSearch.toLowerCase();
    return mcps.filter(
      (m) =>
        (!q || m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)) &&
        (!mcpCategoryFilter || m.category === mcpCategoryFilter),
    );
  }, [mcps, mcpSearch, mcpCategoryFilter]);

  const toggleSkill = (id) => {
    setSelectedSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleMcp = (id) => {
    setSelectedMcps((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleTarget = (id) => {
    setTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleGenerate = () => {
    generate();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'identity':
        return (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Nombre del agente</label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Mi Agente"
                className={glassInput()}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Propósito</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="development, pr-review, ops..."
                className={glassInput()}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Objetivo</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                placeholder="Describe el objetivo principal del agente..."
                className={glassInput()}
              />
            </div>
          </div>
        );

      case 'model':
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-300">Proveedor</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`rounded-xl p-4 text-center font-medium capitalize transition-all ${provider === p ? 'bg-emerald-950/40 border border-emerald-500 text-emerald-300' : glassCardInteractive('rounded-xl')}`}
                  >
                    {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Local'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Temperatura: <span className="text-emerald-400">{temperature.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="mt-1 flex justify-between text-xs text-zinc-600">
                <span>Preciso (0)</span>
                <span>Creativo (2)</span>
              </div>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Buscar skills..."
                className={glassInput('flex-1 min-w-[200px] text-sm px-3 py-2')}
              />
              <select
                value={skillCategoryFilter}
                onChange={(e) => setSkillCategoryFilter(e.target.value)}
                className={glassInput('w-auto text-sm px-3 py-2')}
              >
                <option value="">Todas las categorías</option>
                {skillCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((id) => {
                  const s = skills.find((x) => x.id === id);
                  return (
                    <span key={id} className={glassPill('text-xs text-emerald-300')}>
                      {s?.name || id}{' '}
                      <button onClick={() => toggleSkill(id)} className="ml-1">
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {skillsLoading ? (
              <p className="py-8 text-center text-sm text-zinc-500">Cargando skills...</p>
            ) : (
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className={`text-left rounded-xl p-4 transition-all ${selectedSkills.includes(skill.id) ? 'bg-emerald-950/40 border border-emerald-500' : glassCardInteractive('rounded-xl')}`}
                  >
                    <span className="block font-medium text-zinc-100 text-sm">{skill.name}</span>
                    {skill.description && (
                      <span className="mt-1 block text-xs text-zinc-400 line-clamp-2">{skill.description}</span>
                    )}
                    {skill.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-zinc-800/50 px-2 py-0.5 text-[10px] text-zinc-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
                {filteredSkills.length === 0 && (
                  <p className="col-span-2 py-8 text-center text-sm text-zinc-500">No se encontraron skills.</p>
                )}
              </div>
            )}
          </div>
        );

      case 'mcps':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                value={mcpSearch}
                onChange={(e) => setMcpSearch(e.target.value)}
                placeholder="Buscar MCPs..."
                className={glassInput('flex-1 min-w-[200px] text-sm px-3 py-2')}
              />
              <select
                value={mcpCategoryFilter}
                onChange={(e) => setMcpCategoryFilter(e.target.value)}
                className={glassInput('w-auto text-sm px-3 py-2')}
              >
                <option value="">Todas las categorías</option>
                {mcpCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {selectedMcps.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMcps.map((id) => {
                  const m = mcps.find((x) => x.id === id);
                  return (
                    <span key={id} className={glassPill('text-xs text-violet-300')}>
                      {m?.name || id}{' '}
                      <button onClick={() => toggleMcp(id)} className="ml-1">
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {mcpsLoading ? (
              <p className="py-8 text-center text-sm text-zinc-500">Cargando MCPs...</p>
            ) : (
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredMcps.map((mcp) => (
                  <button
                    key={mcp.id}
                    onClick={() => toggleMcp(mcp.id)}
                    className={`text-left rounded-xl p-4 transition-all ${selectedMcps.includes(mcp.id) ? 'bg-violet-950/40 border border-violet-500' : glassCardInteractive('rounded-xl')}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="block font-medium text-zinc-100 text-sm">{mcp.name}</span>
                      {mcp.official && (
                        <span className="rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-900/50">
                          oficial
                        </span>
                      )}
                    </div>
                    {mcp.description && (
                      <span className="mt-1 block text-xs text-zinc-400 line-clamp-2">{mcp.description}</span>
                    )}
                    {mcp.category && (
                      <span className="mt-2 inline-block rounded-full bg-zinc-800/50 px-2 py-0.5 text-[10px] text-zinc-500">
                        {mcp.category}
                      </span>
                    )}
                  </button>
                ))}
                {filteredMcps.length === 0 && (
                  <p className="col-span-2 py-8 text-center text-sm text-zinc-500">No se encontraron MCPs.</p>
                )}
              </div>
            )}
          </div>
        );

      case 'personality':
        return (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-300">Tono</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`rounded-xl p-4 text-center font-medium capitalize transition-all ${tone === t ? 'bg-emerald-950/40 border border-emerald-500 text-emerald-300' : glassCardInteractive('rounded-xl')}`}
                  >
                    {t === 'formal' ? 'Formal' : t === 'casual' ? 'Casual' : 'Técnico'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Restricciones</label>
              <textarea
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                rows={4}
                placeholder="Describe restricciones o límites del agente..."
                className={glassInput()}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Notas de estilo</label>
              <textarea
                value={styleNotes}
                onChange={(e) => setStyleNotes(e.target.value)}
                rows={3}
                placeholder="Preferencias de estilo de comunicación..."
                className={glassInput()}
              />
            </div>
          </div>
        );

      case 'targets':
        return (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Selecciona los formatos de salida para el bundle generado.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleTarget(opt.id)}
                  className={`text-left rounded-xl p-5 transition-all ${targets.includes(opt.id) ? 'bg-emerald-950/40 border border-emerald-500' : glassCardInteractive('rounded-xl')}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border ${targets.includes(opt.id) ? 'border-emerald-400 bg-emerald-500 text-zinc-950 text-xs' : 'border-zinc-600'}`}
                    >
                      {targets.includes(opt.id) ? '✓' : ''}
                    </span>
                    <span className="font-medium text-zinc-100">{opt.label}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <StarfieldBackground />

      <header className="border-b border-zinc-800/50 bg-zinc-950/60 px-5 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-violet-400">Fine-tuning Dashboard</h1>
            <p className="text-xs text-zinc-500">Configura tu agente manualmente · todos los paneles disponibles</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !agentName.trim()}
            className={`${glassPrimaryButton('px-5 py-2.5 font-semibold')} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Generando...' : 'Generar Bundle →'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
          {/* Sidebar tabs */}
          <aside className={`rounded-2xl p-4 ${glassPanel()}`}>
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${activeTab === tab.id ? 'bg-emerald-950/60 text-emerald-300 font-medium' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}
                >
                  {tab.label}
                  {tab.id === 'skills' && selectedSkills.length > 0 && (
                    <span className="ml-auto rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400">
                      {selectedSkills.length}
                    </span>
                  )}
                  {tab.id === 'mcps' && selectedMcps.length > 0 && (
                    <span className="ml-auto rounded-full bg-violet-900/40 px-2 py-0.5 text-[10px] text-violet-400">
                      {selectedMcps.length}
                    </span>
                  )}
                  {tab.id === 'targets' && targets.length > 0 && (
                    <span className="ml-auto rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400">
                      {targets.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Summary */}
            <div className="mt-6 space-y-2 border-t border-zinc-800/50 pt-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Resumen</p>
              {agentName && <p className="text-xs text-zinc-300 truncate">📛 {agentName}</p>}
              <p className="text-xs text-zinc-400">
                🎯 {provider} · t={temperature.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-400">
                🔧 {selectedSkills.length} skills · {selectedMcps.length} MCPs
              </p>
              <p className="text-xs text-zinc-400">📦 {targets.join(', ') || 'ninguno'}</p>
            </div>
          </aside>

          {/* Main content */}
          <main className={`rounded-2xl p-6 sm:p-8 ${glassPanel()}`}>
            <h2 className="mb-6 text-lg font-semibold text-zinc-100">{TABS.find((t) => t.id === activeTab)?.label}</h2>
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

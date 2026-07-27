'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { LuArrowLeft, LuGithub, LuLinkedin } from 'react-icons/lu';
import { useTranslations } from '@/i18n';

const SpaceSimulation = dynamic(
  () => import('@/features/landing/components/space-simulation').then((m) => m.SpaceSimulation),
  { ssr: false },
);

interface Developer {
  name: string;
  role: string;
  github: string;
  githubUsername: string;
  linkedin: string;
  avatarUrl: string;
}

const developers: Developer[] = [
  {
    name: 'Axel Moraga',
    role: 'AWS Student Builder | Open-Source Community Builder',
    github: 'https://github.com/Axel-DaMage',
    githubUsername: 'Axel-DaMage',
    linkedin: 'https://www.linkedin.com/in/axel-moraga/',
    avatarUrl: 'https://github.com/Axel-DaMage.png',
  },
  {
    name: 'Diego Hernandez',
    role: 'Computer Engineering student with a mention in Artificial Intelligence | Software Developer | Open Source Contributor',
    github: 'https://github.com/VECTORG99',
    githubUsername: 'VECTORG99',
    linkedin: 'https://www.linkedin.com/in/vectorg99/',
    avatarUrl: 'https://github.com/VECTORG99.png',
  },
  {
    name: 'Renata Parada',
    role: 'Computer Engineering and Informatics Student | Software Developer | Open Source Contributor',
    github: 'https://github.com/ranto-dev05',
    githubUsername: 'ranto-dev05',
    linkedin: 'https://www.linkedin.com/in/rantodev/',
    avatarUrl: 'https://github.com/ranto-dev05.png',
  },
];

const glassCard: React.CSSProperties = {
  backdropFilter: 'blur(9px) saturate(140%)',
  WebkitBackdropFilter: 'blur(9px) saturate(140%)',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

export default function DevelopersPage() {
  const t = useTranslations('developers');
  const common = useTranslations('common');

  return (
    <div className="relative min-h-screen bg-black text-zinc-100">
      {/* Space background */}
      <div className="fixed inset-0 z-0">
        <SpaceSimulation showBlackHole={false} maxMeteors={6} meteorSpawnRate={0.3} intensity={0.6} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        {/* Back button */}
        <div className="absolute left-6 top-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-400 backdrop-blur-md transition-colors hover:border-white/20 hover:text-white"
          >
            <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {common.back}
          </Link>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-4xl font-bold text-white sm:text-5xl">{t.title}</h1>
        <p className="mb-12 max-w-md text-center text-zinc-400">{t.subtitle}</p>

        {/* Developer cards */}
        <div className="grid w-full max-w-4xl gap-8 sm:grid-cols-3">
          {developers.map((dev) => (
            <div
              key={dev.name}
              className="flex flex-col items-center rounded-3xl p-8 text-center transition-transform duration-300 hover:-translate-y-1"
              style={glassCard}
            >
              {/* Avatar */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dev.avatarUrl}
                alt={dev.name}
                width={96}
                height={96}
                className="mb-5 h-24 w-24 rounded-full border-2 border-white/10 shadow-lg"
              />

              {/* Info */}
              <h2 className="text-lg font-semibold text-white">{dev.name}</h2>
              <p className="mt-1 w-full grow text-sm text-zinc-400">{dev.role}</p>

              {/* Links */}
              <div className="mt-5 flex items-center gap-4">
                <a
                  href={dev.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.githubAria.replace('{name}', dev.name)}
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  <LuGithub className="h-3.5 w-3.5" aria-hidden="true" />
                  {dev.githubUsername}
                </a>
                <a
                  href={dev.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.linkedinAria.replace('{name}', dev.name)}
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-zinc-300 transition-colors hover:border-blue-400/30 hover:text-blue-300"
                >
                  <LuLinkedin className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.linkedinLabel}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

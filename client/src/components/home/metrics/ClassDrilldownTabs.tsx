import { useState } from 'react'
import { ClassHomeMetrics } from './ClassHomeMetrics'
import { ClassGamesManagement } from './ClassGamesManagement'
import { ClassStudentsManagement } from './ClassStudentsManagement'

type ClassTab = 'home' | 'games' | 'students'

const TABS: { id: ClassTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'games', label: 'Juegos' },
  { id: 'students', label: 'Estudiantes' },
]

/**
 * Sub-menú del drill-down de clase (issue #226): Home / Juegos / Estudiantes.
 * Única responsabilidad: la navegación entre las tres secciones — cada
 * sección es su propio componente con su propio hook de datos.
 */
export function ClassDrilldownTabs({ classId, className }: { classId: string; className: string }) {
  const [activeTab, setActiveTab] = useState<ClassTab>('home')

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-[18px] font-semibold text-text">{className}</h2>
        <nav className="mt-2 flex gap-2 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-[14px] ${
                activeTab === tab.id
                  ? 'border-b-2 border-text-h font-semibold text-text-h'
                  : 'text-text/70 hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'home' && <ClassHomeMetrics classId={classId} />}
      {activeTab === 'games' && <ClassGamesManagement classId={classId} />}
      {activeTab === 'students' && (
        <ClassStudentsManagement classId={classId} className={className} />
      )}
    </div>
  )
}

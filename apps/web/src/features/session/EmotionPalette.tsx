import { emotions, type EmotionCategory, type EmotionId } from '@emote/contracts'

interface EmotionPaletteProps { selectedEmotion: EmotionId; disabled: boolean; onSelect: (emotion: EmotionId) => void }
const categories: { id: EmotionCategory; label: string }[] = [
  { id: 'uplifted', label: 'Uplifted' }, { id: 'steady', label: 'Steady' }, { id: 'uncertain', label: 'Uncertain' },
  { id: 'low', label: 'Low energy' }, { id: 'intense', label: 'Intense' },
]

export function EmotionPalette({ selectedEmotion, disabled, onSelect }: EmotionPaletteProps) {
  return (
    <section className="emotion-dock" aria-labelledby="emotion-heading">
      <div className="dock-heading"><div><span className="eyebrow">Your turn</span><h2 id="emotion-heading">What are you feeling?</h2></div><span>Choose what feels closest right now</span></div>
      <div className="emotion-groups">
        {categories.map((category) => (
          <div className="emotion-group" key={category.id}><h3>{category.label}</h3><div className="emotion-buttons">
            {emotions.filter((emotion) => emotion.category === category.id).map((emotion) => (
              <button key={emotion.id} className={`emotion-button emotion-button--${emotion.category}`} type="button" disabled={disabled} aria-pressed={selectedEmotion === emotion.id} title={emotion.description} onClick={() => onSelect(emotion.id)}>
                <span aria-hidden="true">{emotion.symbol}</span>{emotion.label}
              </button>
            ))}
          </div></div>
        ))}
      </div>
    </section>
  )
}
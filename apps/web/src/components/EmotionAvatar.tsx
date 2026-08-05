import { emotionById, type EmotionId, type Participant } from '@emote/contracts'

const emotionSpeech: Record<EmotionId, string> = {
  neutral: 'I am here with you.',
  joy: 'I am happy!',
  excitement: 'I cannot wait!',
  appreciation: 'I am so grateful.',
  calm: 'I feel peaceful.',
  pride: 'I did it!',
  surprise: 'Oh! I did not expect that!',
  confusion: 'I am trying to understand.',
  embarrassment: 'I feel a little awkward.',
  sadness: 'I am feeling sad.',
  loneliness: 'I could use some company.',
  tiredness: 'I need to recharge.',
  anxiety: 'My mind is racing.',
  fear: 'I feel afraid.',
  frustration: 'I feel stuck right now.',
  anger: 'I am really angry!',
}

export function EmotionAvatar({ participant }: { participant: Participant }) {
  const emotion = emotionById[participant.emotion]
  return (
    <div className="emotion-avatar" data-emotion={participant.emotion} data-style={participant.avatarStyle} role="img" aria-label={`${participant.displayName} is feeling ${emotion.label.toLowerCase()}. ${emotionSpeech[participant.emotion]}`}>
      <div className="emotion-speech" key={participant.emotion}><strong>{emotion.label}</strong><span>{emotionSpeech[participant.emotion]}</span></div>
      <div className="emotion-effects" aria-hidden="true">
        <span>{emotion.symbol}</span><span>{emotion.symbol}</span><span>{emotion.symbol}</span>
      </div>
      <div className="avatar-character" aria-hidden="true">
        <div className="avatar-head">
          <span className="avatar-ear avatar-ear--left" /><span className="avatar-ear avatar-ear--right" />
          <span className="avatar-hair" /><span className="avatar-brow avatar-brow--left" /><span className="avatar-brow avatar-brow--right" />
          <span className="avatar-eye avatar-eye--left" /><span className="avatar-eye avatar-eye--right" />
          <span className="avatar-blush avatar-blush--left" /><span className="avatar-blush avatar-blush--right" /><span className="avatar-mouth" />
          <span className="avatar-tear" />
        </div>
        <span className="avatar-neck" />
        <div className="avatar-torso"><span className="avatar-heart">{emotion.symbol}</span></div>
        <span className="avatar-arm avatar-arm--left"><span className="avatar-hand" /></span>
        <span className="avatar-arm avatar-arm--right"><span className="avatar-hand" /></span>
        <span className="avatar-leg avatar-leg--left"><span className="avatar-shoe" /></span>
        <span className="avatar-leg avatar-leg--right"><span className="avatar-shoe" /></span>
      </div>
      <span className="avatar-shadow" aria-hidden="true" />
    </div>
  )
}
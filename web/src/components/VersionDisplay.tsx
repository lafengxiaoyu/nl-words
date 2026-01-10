import { VERSION } from '../lib/version'

interface VersionDisplayProps {
  languageMode?: 'chinese' | 'english'
  position?: 'header' | 'footer'
}

export default function VersionDisplay({ position = 'footer' }: VersionDisplayProps) {
  return (
    <div className={`version-display version-display--${position}`}>
      <span className="version-text">
        © 2026 DutchLex · v{VERSION.version}
      </span>
    </div>
  )
}

// Route-level hata yakalama — bir sayfa render hatası tüm uygulamayı çökerttirmesin.
// Çoğu UI hatası burada durur, operatöre "DEVAM ET" ile yenileme imkanı verir.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className={styles.box}>
        <div className={styles.icon}>!</div>
        <h2 className={styles.title}>BİR HATA OLUŞTU</h2>
        <p className={styles.message}>{this.state.error.message}</p>
        <button className={styles.retry} onClick={this.handleReset}>
          DEVAM ET
        </button>
      </div>
    )
  }
}

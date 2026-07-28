import { Component } from 'react';
import { LanguageContext } from '../context/LanguageContext';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    console.error('ErrorBoundary caught:', err, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <LanguageContext.Consumer>
          {({ t }) => (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
              <h2 className="text-lg font-bold text-on-surface mb-2">{t('errorBoundary.title')}</h2>
              <p className="text-sm text-secondary mb-4">{t('errorBoundary.message')}</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
              >
                {t('errorBoundary.retry')}
              </button>
            </div>
          )}
        </LanguageContext.Consumer>
      );
    }
    return this.props.children;
  }
}

import { useState } from 'react';
import { useEditorSession } from './useEditorSession';
import { Hero } from './Hero';
import { Editor } from './Editor';
import { PlaneCursor } from '../components/PlaneCursor';
import { SiteFooter } from '../components/SiteFooter';

export function App() {
  const [view, setView] = useState<'hero' | 'editor'>('hero');
  const session = useEditorSession(null);
  const { clearTemplate, clearMedia, setMedia, setCustomTemplate, error, clearError } = session;

  const handleSelectCustomTemplate = (file: File) => {
    clearError();
    void setCustomTemplate(file);
  };

  const handleClearTemplate = () => {
    clearError();
    clearTemplate();
  };

  const handleSelectMediaFile = (file: File) => {
    clearError();
    void setMedia(file);
  };

  const handleClearMedia = () => {
    clearError();
    clearMedia();
  };
  const handleProceedToEditor = () => {
    if (session.manifest && session.media) {
      setView('editor');
    }
  };

  const handleBack = () => {
    clearError();
    setView('hero');
  };

  return (
    <>
      <PlaneCursor />
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {view === 'hero' ? (
          <Hero
            manifest={session.manifest}
            media={session.media}
            errorMessage={error}
            onClearError={clearError}
            onSelectCustomTemplate={handleSelectCustomTemplate}
            onClearTemplate={handleClearTemplate}
            onSelectMediaFile={handleSelectMediaFile}
            onClearMedia={handleClearMedia}
            onProceedToEditor={handleProceedToEditor}
          />
        ) : (
          <Editor session={session} onBack={handleBack} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

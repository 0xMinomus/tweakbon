import { useState, useEffect } from 'react';
import type { TemplateManifest } from '../types/template';
import { loadTemplateIndex } from '../features/template/manifest';
import { useEditorSession } from './useEditorSession';
import { Hero } from './Hero';
import { Editor } from './Editor';
import { PlaneCursor } from '../components/PlaneCursor';

export function App() {
  const [view, setView] = useState<'hero' | 'editor'>('hero');
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateManifest | null>(null);

  const session = useEditorSession(selectedTemplate);
  const { setTemplate, clearTemplate, clearMedia, setMedia, setCustomTemplate } = session;

  // Effect A: load template index on mount (NO auto-select)
  useEffect(() => {
    let isMounted = true;

    void loadTemplateIndex().then((res) => {
      if (!isMounted) return;
      if (res.ok && res.value.templates.length > 0) {
        setTemplates(res.value.templates);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Effect B: load template into session when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate) {
      void setTemplate(selectedTemplate);
    }
  }, [selectedTemplate, setTemplate]);

  const handleSelectTemplate = (tpl: TemplateManifest) => {
    setSelectedTemplate(tpl);
  };

  const handleSelectCustomTemplate = (file: File) => {
    setSelectedTemplate(null);
    void setCustomTemplate(file);
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    clearTemplate();
  };

  const handleSelectMediaFile = (file: File) => {
    void setMedia(file);
  };

  const handleClearMedia = () => {
    clearMedia();
  };

  const handleProceedToEditor = () => {
    if (session.manifest && session.media) {
      setView('editor');
    }
  };

  const handleBack = () => {
    setView('hero');
  };

  return (
    <>
      <PlaneCursor />
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {view === 'hero' ? (
          <Hero
            templates={templates}
            manifest={session.manifest}
            media={session.media}
            onSelectTemplate={handleSelectTemplate}
            onSelectCustomTemplate={handleSelectCustomTemplate}
            onClearTemplate={handleClearTemplate}
            onSelectMediaFile={handleSelectMediaFile}
            onClearMedia={handleClearMedia}
            onProceedToEditor={handleProceedToEditor}
          />
        ) : (
          <Editor session={session} templates={templates} onBack={handleBack} />
        )}
      </main>
    </>
  );
}

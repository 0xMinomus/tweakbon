import { useState, useEffect } from 'react';
import type { TemplateManifest } from '../types/template';
import { loadTemplateIndex } from '../features/template/manifest';
import { useEditorSession } from './useEditorSession';
import { Hero } from './Hero';
import { Editor } from './Editor';

export function App() {
  const [view, setView] = useState<'hero' | 'editor'>('hero');
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateManifest | null>(null);

  const session = useEditorSession(selectedTemplate);
  const { setTemplate } = session;

  // Effect A: load template index on mount
  useEffect(() => {
    let isMounted = true;

    void loadTemplateIndex().then((res) => {
      if (!isMounted) return;
      if (res.ok && res.value.templates.length > 0) {
        setTemplates(res.value.templates);
        setSelectedTemplate(res.value.templates[0]);
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
    void session.setCustomTemplate(file);
  };

  const handleSelectMediaFile = async (file: File) => {
    // If template not yet loaded, load selected or first template
    const tpl = selectedTemplate || templates[0];
    if (tpl && !session.template) {
      await session.setTemplate(tpl);
    }
    await session.setMedia(file);
    setView('editor');
  };

  const handleBack = () => {
    setView('hero');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {view === 'hero' ? (
        <Hero
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={handleSelectTemplate}
          onSelectCustomTemplate={handleSelectCustomTemplate}
          onSelectMediaFile={handleSelectMediaFile}
        />
      ) : (
        <Editor
          session={session}
          templates={templates}
          onBack={handleBack}
        />
      )}
    </main>
  );
}

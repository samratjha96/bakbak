import * as React from 'react';
import { Layout } from '~/components/layout';
import { ActionBar } from '~/components/layout';
import { BackIcon, SaveIcon } from '~/components/ui/Icons';

interface VocabularyItemProps {
  word: string;
  meaning: string;
}

const VocabularyItem: React.FC<VocabularyItemProps> = ({ word, meaning }) => (
  <div className="flex justify-between mb-2">
    <div className="font-medium">{word}</div>
    <div>{meaning}</div>
  </div>
);

export const NotesScreen: React.FC = () => {
  // In a real application, we'd fetch these notes for the current recording
  const [notes, setNotes] = React.useState(
`- "こんにちは" (Konnichiwa) = Hello/Good afternoon
- "私の名前は" (Watashi no namae wa) = My name is
- "勉強しています" (Benkyou shiteimasu) = I am studying
- "よろしくお願いします" (Yoroshiku onegaishimasu) = Please treat me well / Nice to meet you

Remember to practice the proper intonation for "よろしくお願いします" - rising on "shi" and falling on "masu".`
  );
  
  const vocabularyItems = [
    { word: 'こんにちは', meaning: 'Hello/Good afternoon' },
    { word: '私', meaning: 'I/me' },
    { word: '名前', meaning: 'Name' },
    { word: '勉強', meaning: 'Study' },
    { word: 'よろしくお願いします', meaning: 'Nice to meet you' },
  ];
  
  return (
    <Layout>
      <div className="container">
        <h2 className="section-title">Notes for "Daily Conversation Practice"</h2>
        <textarea
          className="w-full min-h-[100px] p-4 border border-gray-200 dark:border-gray-800 rounded text-base text-gray-900 dark:text-gray-200 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)] mb-6 resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        
        <div className="mb-6">
          <h2 className="section-title">Vocabulary</h2>
          <div className="bg-gray-100 dark:bg-gray-800 rounded p-4">
            {vocabularyItems.map((item, index) => (
              <VocabularyItem 
                key={index}
                word={item.word}
                meaning={item.meaning}
              />
            ))}
          </div>
        </div>
      </div>
      
      <ActionBar
        secondaryAction={{
          label: 'Back',
          icon: <BackIcon className="w-4 h-4" />,
          to: '/transcribe',
        }}
        primaryAction={{
          label: 'Save Notes',
          icon: <SaveIcon className="w-4 h-4" />,
          to: '/dashboard',
          primary: true,
        }}
      />
    </Layout>
  );
};
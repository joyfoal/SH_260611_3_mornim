import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/themeContext'
import { AlarmInit } from '@/components/ui/AlarmInit'

export const metadata: Metadata = {
  title: '모님 - Mornim',
  description: '말하면, 이루어진다.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var themes={
    warm:{bg:{primary:'#FFFAF5',card:'#FAEEDA',dark:'#1A0E05',surface:'#412402'},text:{primary:'#412402',secondary:'#854F0B',muted:'#888780',onDark:'#FAEEDA'},accent:{primary:'#BA7517',secondary:'#EF9F27',light:'#FAC775',highlight:'#BA7517'},border:'#D3D1C7',tab:{active:'#854F0B',inactive:'#888780'}},
    dark:{bg:{primary:'#16152A',card:'#252060',dark:'#0D0D1F',surface:'#1E1B4B'},text:{primary:'#EEEDFE',secondary:'#C4C0F0',muted:'#9794C4',onDark:'#EEEDFE'},accent:{primary:'#8B84E8',secondary:'#A99FF0',light:'#CECBF6',highlight:'#A99FF0'},border:'#4E49A0',tab:{active:'#C4C0F0',inactive:'#9794C4'}},
    green:{bg:{primary:'#F4F9F0',card:'#EAF3DE',dark:'#0F2010',surface:'#162E18'},text:{primary:'#173404',secondary:'#3B6D11',muted:'#888780',onDark:'#EAF3DE'},accent:{primary:'#639922',secondary:'#97C459',light:'#C0DD97',highlight:'#3B6D11'},border:'#C0DD97',tab:{active:'#3B6D11',inactive:'#888780'}}
  };
  var name=localStorage.getItem('mornim-theme');
  var t=themes[name]||themes.warm;
  var r=document.documentElement;
  r.style.setProperty('--color-bg-primary',t.bg.primary);
  r.style.setProperty('--color-bg-card',t.bg.card);
  r.style.setProperty('--color-bg-dark',t.bg.dark);
  r.style.setProperty('--color-bg-surface',t.bg.surface);
  r.style.setProperty('--color-text-primary',t.text.primary);
  r.style.setProperty('--color-text-secondary',t.text.secondary);
  r.style.setProperty('--color-text-muted',t.text.muted);
  r.style.setProperty('--color-text-onDark',t.text.onDark);
  r.style.setProperty('--color-accent-primary',t.accent.primary);
  r.style.setProperty('--color-accent-secondary',t.accent.secondary);
  r.style.setProperty('--color-accent-light',t.accent.light);
  r.style.setProperty('--color-accent-highlight',t.accent.highlight);
  r.style.setProperty('--color-border',t.border);
  r.style.setProperty('--color-tab-active',t.tab.active);
  r.style.setProperty('--color-tab-inactive',t.tab.inactive);
})();
        `}} />
        <ThemeProvider>{children}</ThemeProvider>
        <AlarmInit />
      </body>
    </html>
  )
}

export const metadata = {
  title: 'NutriFit',
  description: 'Tu nutrición y fitness inteligente',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NutriFit',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" style={{ backgroundColor: '#0B0D12', height: '100%' }}>
      <body style={{ backgroundColor: '#0B0D12', color: '#FFFFFF', margin: 0, padding: 0, height: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}

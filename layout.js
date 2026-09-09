export const metadata = {
  title: 'Luminaxe Dashboard',
  description: 'Dashboard de inmobiliarias',
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="es">
      <body style={{margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif'}}>
        {children}
      </body>
    </html>
  )
}

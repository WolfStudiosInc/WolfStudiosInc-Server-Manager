import './globals.css'

export const metadata = {
  title: 'WolfStudiosInc Server Manager',
  description: 'A modern, intuitive server manager for Minecraft. Manage plugins, install mods, and configure your server over FTP seamlessly.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

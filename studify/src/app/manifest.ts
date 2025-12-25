import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Studify',
    short_name: 'Studify',
    description: 'Focus, Plan, Achieve',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDFBF7',
    theme_color: '#2D3436',
    icons: [
      {
        src: '/icon.png',
        sizes: '1429x1429',
        type: 'image/png',
      },
    
    ],
  }
}
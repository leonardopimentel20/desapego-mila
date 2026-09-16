import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/login.html',
        destination: '/admin/login',
        permanent: false,
      },
    ];
  },
  allowedDevOrigins: [
    'kosher-runaround-tactical.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
  ],
  experimental: {
    // O Proxy também armazena o corpo da requisição e possui limite próprio.
    proxyClientMaxBodySize: '85mb',
    serverActions: {
      // Seis imagens de 10 MB crescem cerca de 33% durante a conversão para Base64.
      bodySizeLimit: '85mb',
      allowedOrigins: [
        'kosher-runaround-tactical.ngrok-free.dev',
      ],
    },
  },
};

export default nextConfig;

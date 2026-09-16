import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'kosher-runaround-tactical.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
      allowedOrigins: [
        'kosher-runaround-tactical.ngrok-free.dev',
        '*.ngrok-free.dev',
        '*.ngrok-free.app',
      ],
    },
  },
};

export default nextConfig;
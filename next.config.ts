import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/customer", destination: "/customers", permanent: false },
      { source: "/customer/", destination: "/customers", permanent: false },
      { source: "/invoice", destination: "/invoices", permanent: false },
      { source: "/invoice/", destination: "/invoices", permanent: false },
    ];
  },
};

export default nextConfig;

import { useEffect } from "react";
import Head from "next/head";
import ErrorBoundary from "../component/ErrorBoundary";
import { validateEnvironment } from "../lib/env-validation";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Skip environment validation - using Replit secrets
    // if (process.env.NODE_ENV === 'development') {
    //   try {
    //     validateEnvironment();
    //   } catch (error) {
    //     console.error('Environment validation failed:', error.message);
    //   }
    // }

    // Load Flutterwave script
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <ErrorBoundary>
      <Head>
        <title>Hausaworld - Premium Movie Streaming Platform</title>
        <meta name="description" content="Discover and stream the latest movies on Hausaworld. Premium movie platform with high-quality content, secure payments, and instant access." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Hausaworld - Premium Movie Streaming Platform" />
        <meta property="og:description" content="Discover and stream the latest movies on Hausaworld. Premium movie platform with high-quality content, secure payments, and instant access." />
        <meta property="og:site_name" content="Hausaworld" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hausaworld - Premium Movie Streaming Platform" />
        <meta name="twitter:description" content="Discover and stream the latest movies on Hausaworld. Premium movie platform with high-quality content, secure payments, and instant access." />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;

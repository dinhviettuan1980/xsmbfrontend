
import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import "./index.css";
import App from "./App";

// Client ID công khai (an toàn để nhúng vào FE); có thể override qua REACT_APP_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  '497702857343-k73ttatervnf5moeuho5i3arnfvlrnjo.apps.googleusercontent.com';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </GoogleOAuthProvider>
);

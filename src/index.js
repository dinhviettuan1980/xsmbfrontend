
import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import "./index.css";
import App from "./App";

// 497702857343-k73ttatervnf5moeuho5i3arnfvlrnjo.apps.googleusercontent.com
// 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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GoogleOAuthProvider clientId="497702857343-k73ttatervnf5moeuho5i3arnfvlrnjo.apps.googleusercontent.com">
  <App />
</GoogleOAuthProvider>);

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Context from "./context/Usercontext";
import { Lamp } from "./components/Lamp";
import Signup from "./components/Signup";
import Login from "./components/Login";
import { HoverEffect } from "./components/project-page/projects";
import DocumentationPage from "./components/documentation";
import Editor from "./components/Editor";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { Developers } from "./components/Developers";

const App = () => {

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID} >
      
    <Context>
      <Router>
        <Routes>
          <Route path="/" element={<Lamp />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/projects" element={<HoverEffect />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/editor" element={<Editor/>} />
          {/* <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />  */}
        </Routes>
      </Router>
    </Context>
    
    </GoogleOAuthProvider>

  );
};

export default App;
{
  /* <div>
<div className="bg-black min-h-screen w-full select-none font-serif">
  <Lamp />

  <FloatingDockDesktop className="fixed bottom-20 left-1/2 -translate-x-1/2" />
</div>
</div> */
}

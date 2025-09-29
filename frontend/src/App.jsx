// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import các trang (bạn đã có sẵn trong canvas trước đó)
import HomePage from "./page/home/homepage";        // from: HomePage.jsx
import CoursesPage from "./page/course/course";  // from: CoursesPage.jsx
import IC3Dashboard from "./home_level/level1"; // file hiện tại của bạn

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/courses" element={<CoursesPage/>} />
        <Route path="/practice" element={<IC3Dashboard/>} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

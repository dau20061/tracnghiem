// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import các trang (bạn đã có sẵn trong canvas trước đó)
import HomePage from "./page/home/homepage";        // from: HomePage.jsx
import CoursesPage from "./page/course/course";  // from: CoursesPage.jsx
import IC3Dashboard from "./home_level/level1"; // file hiện tại của bạn
import LoginPage from "./page/loginquiz/loginquiz"; // from: LoginPage.jsx
import QuizPage from "./page/quizz/QuizPage"; 
import RequireAuth from "./shared/RequireAuth"; // from: RequireAuth.jsx
import QuizComplete from "./page/quizz/QuizComplete"; // from: QuizComplete.jsx
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/courses" element={<CoursesPage/>} />
        <Route path="/practice" element={<IC3Dashboard/>} />
        <Route path="/login" element={<LoginPage />} />
        {/* fallback */}

             {/* Trang làm bài – cần đăng nhập */}
        <Route
          path="/quiz/:quizId"
          element={
            <RequireAuth>
              <QuizPage/>
            </RequireAuth>
          }
        />

              {/* 👇 Trang hoàn thành */}
        <Route
          path="/quiz/:quizId/complete"
          element={
            <RequireAuth>
              <QuizComplete/>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

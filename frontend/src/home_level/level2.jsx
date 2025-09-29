import React from "react";
import "./level1.css";

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <div className="brand-logo" aria-label="IC3 Logo"><span>IC3</span></div>
        <nav className="main-nav">
          <button className="nav-btn">Trang chủ</button>
          <button className="nav-btn">Khóa học</button>
          <button className="nav-btn">Luyện tập</button>
        </nav>
      </div>
    </header>
  );
}

export default function Level2() {
  return (
    <div className="page">
      <Header />
      <main className="main">
        <section className="hero">
          <div className="hero-inner container">
            <div className="hero-content">
              <h1 className="hero-title">IC3 GS6 – Luyện tập Level 2</h1>
              <p className="hero-desc">Bắt đầu hành trình chinh phục IC3 GS6 với các bài luyện tập nâng cao, tập trung vào kỹ năng chuyên sâu.</p>
            </div>
            <div className="hero-media" aria-hidden>
              <div className="media-box">📗</div>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Luyện tập: Level 2</h2>
            <p className="section-sub">Gồm 5 bài – mỗi bài gồm trắc nghiệm chọn đáp án.</p>
          </div>
          <div className="card-grid">
            {[1,2,3,4,5].map(i => (
              <article className="card" key={i}>
                <div className="card-badge">{i}</div>
                <div className="card-body">
                  <h3 className="card-title">IC3 GS6 Level 2 - Bài {i}</h3>
                  <p className="card-text">Bài luyện tập nâng cao – thời lượng ~15 phút</p>
                  <div className="card-actions">
                    <span className="card-meta">~15 câu hỏi</span>
                    <button className="btn-primary">Vào bài</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-inner container">
          <div className="footer-brand">
            <div className="brand-logo" aria-label="IC3 Logo"><span>IC3</span></div>
            <div className="footer-brand-name">Thực Tập Trắc Nghiệm</div>
          </div>
          <div>
            <div className="footer-title">Liên hệ</div>
            <ul className="footer-list">
              <li>✉️ contact@ic3.edu.vn</li>
              <li>📞 0123 456 789</li>
              <li>📍 123 Trần Phú, Hà Nội</li>
            </ul>
          </div>
          <div>
            <div className="footer-title">Về chúng tôi</div>
            <p className="footer-text">Hệ thống hỗ trợ luyện tập nhiều cấp độ, thống kê kết quả và lộ trình học rõ ràng.</p>
          </div>
        </div>
        <div className="footer-copy">© {new Date().getFullYear()} Thực Tập Trắc Nghiệm</div>
      </footer>
    </div>
  );
}

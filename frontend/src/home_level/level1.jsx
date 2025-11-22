import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./level1.css";

export default function IC3Dashboard() {
  const [tab, setTab] = useState("lv1");
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Lấy thông tin user
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Parse user error:", e);
      }
    }
  }, []);

  // Hàm kiểm tra và navigate vào bài
  const handleStartQuiz = (quizId) => {
    const token = localStorage.getItem("token");
    
    // Kiểm tra đăng nhập
    if (!token) {
      alert("Bạn cần đăng nhập để làm bài.");
      navigate("/login", { state: { from: `/quiz/${quizId}` } });
      return;
    }

    // Kiểm tra lượt làm bài
    if (!user || user.remainingAttempts <= 0) {
      alert("Bạn đã hết lượt làm bài. Vui lòng nâng cấp để tiếp tục.");
      navigate("/upgrade");
      return;
    }

    // Có lượt → cho vào làm bài
    navigate(`/quiz/${quizId}`);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const hero = document.querySelector(".hero-title");
    console.assert(hero && hero.textContent?.includes("IC3 GS6"), "Hero title missing or incorrect");
    const navButtons = document.querySelectorAll(".main-nav .nav-btn");
    console.assert(navButtons.length >= 3, `Expected >= 3 nav buttons, got ${navButtons.length}`);
    if (tab === "lv1") {
      const cards = document.querySelectorAll('[data-testid="lv1-card"]');
      console.assert(cards.length === 5, `Expected 5 Level 1 items, got ${cards.length}`);
    }
    const footer = document.querySelector(".site-footer");
    console.assert(!!footer, "Footer should render");
  }, [tab]);

  const items = [1, 2, 3, 4, 5].map((i) => ({
    id: i,
    title: `IC3 GS6 Level 1 - Bài ${i}`,
    description: "Bài luyện tập cơ bản",
    timeInfo: "Có thể chọn Training (không giới hạn) hoặc Testing (tùy cấu hình bài)"
  }));

  return (
    <div className="page">
      {/* Header + Nav */}
      <header className="site-header" data-testid="header">
  <div className="header-inner container">
    <div
      className="brand-logo"
      aria-label="IC3 Logo"
      style={{ cursor: "pointer" }}
      onClick={() => navigate("/")}
    >
      <span>IC3</span>
    </div>

    <nav className="main-nav">
      <button className="nav-btn" onClick={() => navigate("/")} data-testid="nav-home">
        Trang chủ
      </button>
      <button className="nav-btn" onClick={() => navigate("/courses")} data-testid="nav-courses">
        Khóa học
      </button>

      <div className="nav-dropdown">
        <button
          className="nav-btn"
          type="button"
          data-testid="nav-practice"
          onClick={() => setOpen(!open)}
        >
          Luyện tập <span className="nav-caret">▾</span>
        </button>

        {open && (
          <div className="dropdown-panel" data-testid="dropdown">
            <button className="dropdown-item" onClick={() => setTab("lv1")}>
              IC3 Spark GS6 Level 1
            </button>
            <button className="dropdown-item" onClick={() => setTab("lv2")}>
              IC3 Spark GS6 Level 2
            </button>
            <button className="dropdown-item" onClick={() => setTab("lv3")}>
              IC3 Spark GS6 Level 3
            </button>
          </div>
        )}
      </div>
    </nav>
  </div>
</header>


      {/* Main */}
      <main className="main">
        {/* Hero + Content by tab */}
        {tab === "lv1" && (
          <>
            <section className="hero">
              <div className="hero-inner container">
                <div className="hero-content">
                  <h1 className="hero-title">IC3 GS6 – Luyện tập Level 1</h1>
                  <p className="hero-desc">Bắt đầu hành trình chinh phục IC3 GS6 với 5 bài luyện tập ngắn, tập trung vào các kỹ năng trọng tâm.</p>
                  <div className="hero-actions">
                    <button className="btn-primary" onClick={() => setTab("lv1")}>Bắt đầu Level 1</button>
                    <button className="btn-outline" onClick={() => navigate("/courses")}>Khóa học</button>
                  </div>
                </div>
                <div className="hero-media" aria-hidden>
                  <div className="media-box">📘</div>
                </div>
              </div>
            </section>

            <section className="section" data-testid="lv1">
              <div className="section-head">
                <h2 className="section-title">Luyện tập: Level 1</h2>
                <p className="section-sub">Gồm 5 bài – mỗi bài gồm trắc nghiệm chọn đáp án.</p>
              </div>
              <div className="card-grid">
                {items.map((item) => (
                  <article className="card" key={item.id} data-testid="lv1-card">
                    <div className="card-badge">{item.id}</div>
                    <div className="card-body">
                      <h3 className="card-title">{item.title}</h3>
                      <p className="card-text">{item.description}</p>
                      <p className="card-text" style={{fontSize: '13px', color: '#64748b', marginTop: '4px'}}>⏱ {item.timeInfo}</p>
                      <div className="card-actions">
                        <span className="card-meta">~15 câu hỏi</span>
                                        <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleStartQuiz(`ic3-lv1-${item.id}`)}
                        >
                        Vào bài
                        </button>
                     </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "lv2" && (
          <>
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
            <section className="section" data-testid="lv2">
              <div className="section-head">
                <h2 className="section-title">Luyện tập: Level 2</h2>
                <p className="section-sub">Gồm 5 bài – mỗi bài gồm trắc nghiệm chọn đáp án.</p>
              </div>
              <div className="card-grid">
                {[1,2,3,4,5].map(i => (
  <article className="card" key={i} data-testid={`lv2-card-${i}`}>
    <div className="card-badge">{i}</div>
    <div className="card-body">
      <h3 className="card-title">{`IC3 GS6 Level 2 - Bài ${i}`}</h3>
      <p className="card-text">Bài luyện tập nâng cao – thời lượng ~15 phút</p>
      <div className="card-actions">
        <span className="card-meta">~15 câu hỏi</span>
                    <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleStartQuiz(`ic3-lv2-${i}`)}
                    >
                    Vào bài
                    </button>
                </div>
                </div>
            </article>
            ))}

                    </div>
                    </section>
                </>
                )}
        {tab === "lv3" && (
          <>
            <section className="hero">
              <div className="hero-inner container">
                <div className="hero-content">
                  <h1 className="hero-title">IC3 GS6 – Luyện tập Level 3</h1>
                  <p className="hero-desc">Luyện tập các bài kiểm tra tổng hợp, đánh giá toàn diện kỹ năng IC3 GS6.</p>
                </div>
                <div className="hero-media" aria-hidden>
                  <div className="media-box">📙</div>
                </div>
              </div>
            </section>
            <section className="section" data-testid="lv3">
              <div className="section-head">
                <h2 className="section-title">Luyện tập: Level 3</h2>
                <p className="section-sub">Gồm 5 bài – mỗi bài gồm trắc nghiệm chọn đáp án.</p>
              </div>
              <div className="card-grid">
                {[1,2,3,4,5].map(i => (
  <article className="card" key={i} data-testid={`lv3-card-${i}`}>
    <div className="card-badge">{i}</div>
    <div className="card-body">
      <h3 className="card-title">{`IC3 GS6 Level 3 - Bài ${i}`}</h3>
      <p className="card-text">Bài luyện tập nâng cao – thời lượng ~15 phút</p>
      <div className="card-actions"></div>
      <div className="card-actions">
        <span className="card-meta">~15 câu hỏi</span>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleStartQuiz(`ic3-lv3-${i}`)}
        >
          Vào bài
        </button>
      </div>
    </div>
  </article>
))}

              </div>
            </section>
          </>
        )}

        {tab === "courses" && (
          <section className="section">
            <div className="placeholder">Danh sách khóa học sẽ hiển thị ở đây…</div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="site-footer" data-testid="footer">
        <div className="footer-inner container">
          <div className="footer-brand">
            <div className="brand-logo" aria-label="IC3 Logo"><span>IC3</span></div>
            <div className="footer-brand-name">Thực Tập Trắc Nghiệm</div>
          </div>
          <div>
            <div className="footer-title">Liên hệ</div>
            <ul className="footer-list">
              <li>✉️ tuyensinh@huflit.edu.vn</li>
              <li>📞 1900 2800</li>
              <li>📍 806 Quốc lộ 22, Ấp Mỹ Hòa 3, Xã Tân Xuân, Huyện Hóc Môn, Thành phố Hồ Chí Minh.</li>
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

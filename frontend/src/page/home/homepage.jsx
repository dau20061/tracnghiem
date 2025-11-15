import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./homepage.css";

const PLAN_LABEL = {
  day: "Gói 1 ngày",
  month: "Gói 1 tháng", 
  year: "Gói 1 năm",
};

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const programs = [
    { id: "IC3", title: "IC3 GS6", desc: "Luyện thi IC3 GS6 theo lộ trình 3 cấp độ, bài tập bám sát đề thi.", meta: "3 cấp • 150+ bài", cta: "Vào lộ trình" },
    { id: "ICDL", title: "ICDL", desc: "Ôn tập ICDL theo modules, demo test và mẹo làm bài hiệu quả.", meta: "8 module • Demo test", cta: "Khám phá" },
    { id: "MOS", title: "MOS", desc: "Microsoft Office Specialist – luyện thực hành Word/Excel/PowerPoint.", meta: "Beginner → Expert", cta: "Bắt đầu học" },
  ];

  const stats = [
    { big: "10k+", small: "Học viên" },
    { big: "95%", small: "Tỷ lệ đậu" },
    { big: "300+", small: "Bài luyện" },
    { big: "24/7", small: "Hỗ trợ" },
  ];

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("token");
  });

  useEffect(() => {
    const sync = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", sync);
    window.addEventListener("auth-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-changed", sync);
    };
  }, []);

  // Check payment success from URL params
  useEffect(() => {
    const appTransId = searchParams.get("appTransId");
    const status = searchParams.get("status"); 
    const plan = searchParams.get("plan");

    if (appTransId && status === "paid" && plan) {
      setPaymentSuccess({
        plan: PLAN_LABEL[plan] || plan,
        appTransId,
      });
      
      // Clear URL params after 5 seconds
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setPaymentSuccess(null);
      }, 5000);

      // Refresh user data
      const token = localStorage.getItem("token");
      if (token) {
        fetch("http://localhost:4000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            window.dispatchEvent(new Event("auth-changed"));
          }
        })
        .catch(console.warn);
      }
    }
  }, [searchParams]);

  return (
    <div className="page">
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <div className="logo">IC</div>
            <div className="brand-name">IC3 · ICDL · MOS</div>
          </div>
          <nav className="nav">
            <a href="#programs">Chương trình</a>
            <a href="#how">Cách học</a>
            <a href="#courses">Khoá nổi bật</a>
            <a href="#contact">Liên hệ</a>
          </nav>
          {!isLoggedIn && (
            <div className="cta">
              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = "/login?signup=1")}
              >
                Đăng ký ngay
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Success Notification */}
        {paymentSuccess && (
          <div className="payment-success-banner">
            <div className="container">
              <div className="success-content">
                <div className="success-icon">✅</div>
                <div className="success-text">
                  <h3>Thanh toán thành công!</h3>
                  <p>Bạn đã đăng ký thành công <strong>{paymentSuccess.plan}</strong>. Tài khoản của bạn đã được nâng cấp.</p>
                  <p className="transaction-id">Mã giao dịch: {paymentSuccess.appTransId}</p>
                </div>
                <button 
                  className="close-btn"
                  onClick={() => setPaymentSuccess(null)}
                  title="Đóng"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <section className="hero">
          <div className="container hero-card">
            <div className="hero-grid">
              <div className="hero-left">
                <div className="kicker">Học trực tuyến · Kèm 1-1</div>
                <h1 className="h1">Luyện thi IC3, ICDL, MOS<br/>nhanh hơn – đẹp điểm hơn</h1>
                <p className="p">Bài học ngắn, demo test theo chuẩn, lộ trình rõ ràng cho từng cấp độ. Theo dõi tiến độ và nhận góp ý trực tiếp từ giáo viên.</p>
                <div className="hero-actions">
                  <button className="btn btn-primary" onClick={() => (window.location.href = "/practice")}>Bắt đầu miễn phí</button>
                  <button className="btn" onClick={() => (window.location.href = "/courses")}>Xem khoá học</button>
                </div>
                <div className="badges">
                  <span className="badge">✔ Chứng chỉ quốc tế</span>
                  <span className="badge">✔ Luyện đề cập nhật</span>
                  <span className="badge">✔ Hỗ trợ 24/7</span>
                </div>
              </div>
              <div className="hero-right" aria-hidden>
                <div className="mockup">
                  <div className="mockup-top">
                    <div className="dot"/><div className="dot"/><div className="dot"/>
                  </div>
                  <div className="mockup-body">
                    <div className="mockup-sidebar">
                      <div className="mockup-item"/><div className="mockup-item"/><div className="mockup-item"/><div className="mockup-item"/>
                    </div>
                    <div className="mockup-content">
                      <div className="mockup-line" style={{width:'80%'}}/>
                      <div className="mockup-line" style={{width:'60%'}}/>
                      <div className="mockup-line" style={{width:'90%'}}/>
                      <div className="mockup-cta"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="trust">
          <div className="container trust-row">
            <span>Được tin dùng bởi học viên từ</span>
            <img alt="badge1" src="https://dummyimage.com/120x24/ffffff/000000.png&text=IIG"/>
            <img alt="badge2" src="https://dummyimage.com/120x24/ffffff/000000.png&text=Certiport"/>
            <img alt="badge3" src="https://dummyimage.com/120x24/ffffff/000000.png&text=ICDL"/>
          </div>
        </section>

        {/* Programs */}
        <section id="programs" className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Chương trình luyện thi</h2>
            </div>
            <div className="grid-3">
              {programs.map((p, i) => (
                <article className="card" key={p.id}>
                  <div className="card-badge">{i+1}</div>
                  <h3 className="card-title">{p.title}</h3>
                  <p className="card-text">{p.desc}</p>
                  <div className="card-actions">
                    <span className="meta">{p.meta}</span>
                    <button className="btn btn-primary" onClick={() => (window.location.href = "/courses")}>{p.cta}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Học như thế nào?</h2>
              <p className="section-sub">3 bước đơn giản để đạt chứng chỉ</p>
            </div>
            <div className="steps">
              <div className="step">
                <h3>Chẩn đoán trình độ</h3>
                <p className="p">Làm bài test ngắn để hệ thống gợi ý lộ trình phù hợp.</p>
              </div>
              <div className="step">
                <h3>Lộ trình + bài tập</h3>
                <p className="p">Học video ngắn, luyện tập bám sát mục tiêu từng cấp độ.</p>
              </div>
              <div className="step">
                <h3>Thi thử & góp ý</h3>
                <p className="p">Thi thử định kỳ, giáo viên góp ý chi tiết để cải thiện điểm.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="section">
          <div className="container stats">
            {stats.map(s => (
              <div className="stat" key={s.small}>
                <div className="big">{s.big}</div>
                <div className="small">{s.small}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured courses */}
        <section id="courses" className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Khoá học nổi bật</h2>
              <p className="section-sub">Bắt đầu với các khoá được học viên chọn nhiều nhất</p>
            </div>
            <div className="grid-3">
              {[1,2,3].map(i => (
                <article className="card" key={i}>
                  <h3 className="card-title">IC3 GS6 Level {i}</h3>
                  <p className="card-text">Bài luyện tập trọng tâm · hướng dẫn chi tiết · demo test.</p>
                  <div className="card-actions">
                    <span className="meta">~15 bài/buổi</span>
                    <button className="btn" onClick={() => (window.location.href = "/courses")}>Xem chi tiết</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="footer">
        <div className="container footer-inner">
          <div>
            <div className="brand" style={{marginBottom:8}}>
              <div className="logo">IC</div>
              <div className="brand-name">IC3 · ICDL · MOS</div>
            </div>
            <p className="p">Nền tảng luyện thi chứng chỉ Tin học quốc tế – học nhanh, hiệu quả, hỗ trợ tận tâm.</p>
          </div>
          <div>
            <div className="section-title" style={{fontSize:18}}>Liên hệ</div>
            <p className="p" style={{margin:"6px 0"}}>✉️ tuyensinh@huflit.edu.vn</p>
            <p className="p" style={{margin:"6px 0"}}>📞 1900 2800</p>
            <p className="p" style={{margin:"6px 0"}}>📍 806 Quốc lộ 22, Ấp Mỹ Hòa 3, Xã Tân Xuân, Huyện Hóc Môn, Thành phố Hồ Chí Minh.</p>
          </div>
          <div>
            <div className="section-title" style={{fontSize:18}}>Tài nguyên</div>
            <ul style={{margin:0,padding:0,listStyle:"none",display:"grid",gap:6}}>
              <li><a href="/courses" style={{textDecoration:"none", color:"inherit"}}>Demo test IC3 GS6</a></li>
              <li><a href="/courses" style={{textDecoration:"none", color:"inherit"}}>Hướng dẫn ICDL</a></li>
              <li><a href="/courses" style={{textDecoration:"none", color:"inherit"}}>Mẹo thi MOS</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-note">© {new Date().getFullYear()} IC3 · ICDL · MOS — All rights reserved.</div>
      </footer>
    </div>
  );
}

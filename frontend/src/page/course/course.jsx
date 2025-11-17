import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./course.css";

const ALL = "Tất cả";
const CATS = [ALL, "IC3", "ICDL", "MOS"];

const RAW = [
  { id:"ic3-lv1", cat:"IC3", title:"IC3 GS6 – Level 1", desc:"Kiến thức nền tảng: phần cứng, HĐH, kết nối, an toàn.", lessons: 24, duration:"~15h", badge:"Cơ bản" },
  { id:"ic3-lv2", cat:"IC3", title:"IC3 GS6 – Level 2", desc:"Key Applications: Word/Excel/PowerPoint, tính năng chung.", lessons: 28, duration:"~18h", badge:"Trung cấp" },
  { id:"ic3-lv3", cat:"IC3", title:"IC3 GS6 – Level 3", desc:"Living Online: Internet, bảo mật, cộng tác số.", lessons: 26, duration:"~16h", badge:"Nâng cao" },
  { id:"icdl-essentials", cat:"ICDL", title:"ICDL Essentials", desc:"Computer Essentials, Online Essentials.", lessons: 30, duration:"~20h", badge:"Module" },
  { id:"icdl-office", cat:"ICDL", title:"ICDL Office", desc:"Word Processing, Spreadsheets, Presentations.", lessons: 36, duration:"~24h", badge:"Office" },
  { id:"mos-starter", cat:"MOS", title:"MOS Starter", desc:"Thực hành Word/Excel/PowerPoint theo đề thi.", lessons: 32, duration:"~22h", badge:"Thực hành" },
];

export default function CoursesPage(){
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(ALL);
  const [sort, setSort] = useState("phuhop");
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

  const filtered = useMemo(() => {
    let out = RAW.filter(c => (cat===ALL || c.cat===cat) && (c.title+" "+c.desc).toLowerCase().includes(q.toLowerCase()));
    if (sort === "az") out.sort((a,b)=>a.title.localeCompare(b.title));
    if (sort === "lessons") out.sort((a,b)=>b.lessons-a.lessons);
    return out;
  }, [q, cat, sort]);

  return (
    <div className="page">
      <header className="header">
        <div className="container header-inner">
          <div className="brand"><div className="logo">IC</div><strong>IC3 · ICDL · MOS</strong></div>
          <nav className="nav">
            <a href="/">Trang chủ</a>
            <a href="/practice">Luyện tập</a>
            <a href="#!">Tài nguyên</a>
          </nav>
          {!isLoggedIn && (
            <div style={{display:'flex',gap:8}}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login', { state: { mode: 'register' } })}
              >
                Đăng nhập
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="head">
          <div className="container">
            <div className="breadcrumbs">Trang chủ / Khóa học</div>
            <h1 className="h1">Khóa học tin học quốc tế</h1>
            <p className="p">Danh sách khóa học IC3, ICDL, MOS – lộ trình rõ ràng, demo test, hỗ trợ 1-1.</p>
            <div className="toolbar">
              <input className="input" placeholder="Tìm khóa học (ví dụ: IC3, ICDL, MOS)" value={q} onChange={e=>setQ(e.target.value)} />
              <select className="select" value={cat} onChange={e=>setCat(e.target.value)}>
                {CATS.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="select" value={sort} onChange={e=>setSort(e.target.value)}>
                <option value="phuhop">Sắp xếp: Phù hợp</option>
                <option value="az">A → Z</option>
                <option value="lessons">Nhiều bài học</option>
              </select>
            </div>
          </div>
        </section>

        {/* IC3 */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Khóa học IC3</h2>
              <p className="section-sub">Bám sát cấu trúc GS6 (Level 1→3)</p>
            </div>
            <div className="grid">
              {filtered.filter(c=>c.cat==="IC3").map(c=>(
                <article key={c.id} className="card">
                  <div className="card-top">
                    <span className="badge">{c.badge}</span>
                    <span className="meta">{c.lessons} bài · {c.duration}</span>
                  </div>
                  <h3 className="title">{c.title}</h3>
                  <p className="text">{c.desc}</p>
                  <div className="actions">
                    <button className="btn" onClick={() => navigate(`/practice?course=${c.id}`)}>
                      Xem chi tiết
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(isLoggedIn ? `/quiz/${c.id}` : '/login', { state: { from: `/quiz/${c.id}` } })}
                    >
                      Vào học
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ICDL */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Khóa học ICDL</h2>
              <p className="section-sub">Modules thiết yếu & Office</p>
            </div>
            <div className="grid">
              {filtered.filter(c=>c.cat==="ICDL").map(c=>(
                <article key={c.id} className="card">
                  <div className="card-top">
                    <span className="badge">{c.badge}</span>
                    <span className="meta">{c.lessons} bài · {c.duration}</span>
                  </div>
                  <h3 className="title">{c.title}</h3>
                  <p className="text">{c.desc}</p>
                  <div className="actions">
                    <button className="btn" onClick={() => navigate(`/practice?course=${c.id}`)}>
                      Xem chi tiết
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(isLoggedIn ? `/quiz/${c.id}` : '/login', { state: { from: `/quiz/${c.id}` } })}
                    >
                      Ghi danh
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* MOS */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Khóa học MOS</h2>
              <p className="section-sub">Thực hành Word/Excel/PowerPoint</p>
            </div>
            <div className="grid">
              {filtered.filter(c=>c.cat==="MOS").map(c=>(
                <article key={c.id} className="card">
                  <div className="card-top">
                    <span className="badge">{c.badge}</span>
                    <span className="meta">{c.lessons} bài · {c.duration}</span>
                  </div>
                  <h3 className="title">{c.title}</h3>
                  <p className="text">{c.desc}</p>
                  <div className="actions">
                    <button className="btn" onClick={() => navigate(`/practice?course=${c.id}`)}>
                      Xem chi tiết
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(isLoggedIn ? `/quiz/${c.id}` : '/login', { state: { from: `/quiz/${c.id}` } })}
                    >
                      Bắt đầu
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Stats & testimonial */}
        <section className="section">
          <div className="container strip">
            <div className="stat"><div className="big">150+</div><div className="small">Bài luyện</div></div>
            <div className="stat"><div className="big">95%</div><div className="small">Tỷ lệ đậu</div></div>
            <div className="stat"><div className="big">10k+</div><div className="small">Học viên</div></div>
            <div className="stat"><div className="big">24/7</div><div className="small">Hỗ trợ</div></div>
            <div className="quote">“Khóa học rất hữu ích, giáo viên tận tình, giúp tôi nắm vững kiến thức và tự tin thi IC3.” — Nguyễn Anh</div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">© {new Date().getFullYear()} IC3 · ICDL · MOS — Courses</div>
      </footer>
    </div>
  );
}

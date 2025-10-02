// quizData.js (có thể nằm trên FE hoặc seed vào DB)
export const quiz = {
  _id: "quiz-ic3-gs6-demo",
  title: "IC3 GS6 – Demo 5 loại câu hỏi",
  settings: { immediateFeedback: true }, // hiển thị đáp án đúng khi sai
  questions: [
    // 1) Loại 1: 1 đáp án đúng, 4 lựa chọn
    {
      id: "q1",
      type: "single", // chọn 1
      prompt: "Hệ điều hành là gì?",
      options: [
        { id: "A", text: "Phần mềm điều khiển phần cứng & ứng dụng" },
        { id: "B", text: "Một thiết bị ngoại vi" },
        { id: "C", text: "Trình duyệt web" },
        { id: "D", text: "Cáp mạng LAN" }
      ],
      correct: "A"
    },

    // 2) Loại 2: chọn nhiều đáp án, 2 đáp án đúng (3–4 câu con cũng được)
    {
      id: "q2",
      type: "multi", // chọn nhiều
      prompt: "Câu nào là trình duyệt web? (chọn 2)",
      options: [
        { id: "A", text: "Chrome" },
        { id: "B", text: "PowerPoint" },
        { id: "C", text: "Firefox" },
        { id: "D", text: "Notepad" }
      ],
      correct: ["A", "C"], // 2 đáp án đúng
      minCorrect: 2,
      maxCorrect: 2
    },

    // 3) Loại 3: Chia 2 cột "Có" và "Không"
    {
      id: "q3",
      type: "binary", // phân loại Có/Không
      prompt: "Kéo/thả hoặc phân loại các phát biểu vào 2 cột: Có / Không",
      columns: ["Có", "Không"],
      items: [
        { id: "i1", text: "Có thể gửi email kèm tệp đính kèm", correctColumn: "Có" },
        { id: "i2", text: "Không cần mật khẩu khi truy cập email", correctColumn: "Không" },
        { id: "i3", text: "Có thể CC cho nhiều người", correctColumn: "Có" },
        { id: "i4", text: "Email không thể có tiêu đề", correctColumn: "Không" }
      ]
    },

    // 4) Loại 4: Kéo/thả đáp án vào ô
    {
      id: "q4",
      type: "dragdrop", // ghép đáp án
      prompt: "Kéo đáp án đúng vào mỗi ô tương ứng",
      targets: [
        { id: "t1", label: "Hệ điều hành" },
        { id: "t2", label: "Bộ nhớ tạm (RAM)" }
      ],
      bank: [
        { id: "o1", text: "Windows / macOS / Linux" },
        { id: "o2", text: "Lưu tạm dữ liệu khi ứng dụng chạy" },
        { id: "o3", text: "Cáp truyền dữ liệu" }
      ],
      // mapping đúng: targetId -> optionId
      correctMapping: { t1: "o1", t2: "o2" }
    },

    // 5) Loại 5: Câu hỏi có hình và chọn đáp án
    {
      id: "q5",
      type: "image_single",
      prompt: "Nhìn ảnh và chọn biểu tượng của Wi-Fi:",
      image: "https://dummyimage.com/600x220/eff6ff/0f172a&text=H%C3%ACnh+minh+h%E1%BB%8Da",
      options: [
        { id: "A", text: "Biểu tượng Bluetooth" },
        { id: "B", text: "Biểu tượng Wi-Fi" },
        { id: "C", text: "Biểu tượng USB" },
        { id: "D", text: "Biểu tượng Pin" }
      ],
      correct: "B"
    }
  ]
};

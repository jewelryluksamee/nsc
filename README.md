# HisTalk — แถบเลื่อนข้ามเวลา

แอปเว็บสำหรับเรียนรู้ประวัติศาสตร์ไทยผ่านการสนทนากับบุคคลสำคัญในแต่ละยุคสมัย ขับเคลื่อนด้วย Gemini AI

## ฟีเจอร์

- **Timeline Slider** — เลื่อนแถบเวลาผ่าน 4 ยุคสมัย (สุโขทัย → อยุธยา → ธนบุรี → รัตนโกสินทร์)
- **สนทนากับบุคคลสำคัญ** — คุยกับกษัตริย์ นักรบ กวี และชาวบ้านในแต่ละยุค ตอบด้วย Gemini AI ที่รับบทบาทสมจริง
- **แผนที่ประวัติศาสตร์** — แสดงอาณาจักรและเมืองสำคัญในแต่ละยุคด้วย Leaflet.js
- **พิพิธภัณฑ์โบราณวัตถุ** — สะสมและซื้อขายของล้ำค่าจากแต่ละยุค
- **ระบบ XP / Achievement** — ติดตามความคืบหน้าการสำรวจ

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | HTML / CSS / Vanilla JS |
| แผนที่ | Leaflet.js |
| AI | Google Gemini API (`gemini-flash-latest`) |
| Server | Node.js HTTP (built-in) |

## วิธีรัน

### 1. ติดตั้ง
```bash
git clone <repo-url>
cd nsc
```

### 2. ตั้งค่า API Key
สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์:
```
GEMINI_API_KEY=your_gemini_api_key_here
```
> รับ API key ได้ที่ [Google AI Studio](https://aistudio.google.com/)

### 3. รัน
```bash
node server.js
```

### 4. เปิดเว็บ
```
http://localhost:3000
```

## โครงสร้างไฟล์

```
nsc/
├── index.html      # หน้าหลัก
├── app.js          # logic หลักทั้งหมด + Gemini integration
├── data.js         # ข้อมูลประวัติศาสตร์ (กษัตริย์ เหตุการณ์ ตัวละคร)
├── style.css       # สไตล์ทั้งหมด
├── server.js       # local server (อ่าน .env แล้วเสิร์ฟ config.js)
├── .env            # API key (gitignored)
└── .gitignore
```

## หมายเหตุ

- `.env` และ `config.js` ถูก gitignore ไว้ ไม่ติดไปกับ commit
- `server.js` เสิร์ฟ `config.js` จาก `.env` แบบ on-the-fly โดยไม่สร้างไฟล์จริง

# คู่มือการใช้งาน Docker สำหรับ Approval Hub (Docker Guide)

เอกสารนี้อธิบายสถาปัตยกรรม Containerization ของระบบ Approval Hub รวมถึงขั้นตอนการทดสอบและนำไปใช้งานจริงบน Server

---

## 🏗️ สถาปัตยกรรม Container

ระบบถูกแบ่งออกเป็น 2 Services หลักผ่าน Docker Compose:

```
[ Client Browser ]
        │
        ▼ (Port 81)
┌──────────────────────────────────────────────┐
│  approval-hub-frontend (Nginx Alpine)        │
│  - เสิร์ฟ Static Files ที่ /approval_hub/     │
│  - Reverse Proxy /approval_hub/api/ ─────────┼──────┐
└──────────────────────────────────────────────┘      │
                                                      │ (Internal Network)
┌──────────────────────────────────────────────┐      │
│  approval-hub-backend (Node.js 20 Alpine)    │◄─────┘
│  - Express 5 + TypeScript (Port 3002)        │
│  - Non-root user `node` ปลอดภัย              │
│  - Health Check /health                      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ (Port 1433 - TCP)
┌──────────────────────────────────────────────┐
│  External Database (Host / Production)       │
│  - Microsoft SQL Server (AGT_SMART_SY)       │
└──────────────────────────────────────────────┘
```

---

## 📁 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
| :--- | :--- |
| [`backend/Dockerfile`](file:///c:/Projects/Approval_Hub/backend/Dockerfile) | Multi-stage build สำหรับ TypeScript API (Image เล็ก ปลอดภัย ไร้ devDependencies) |
| [`backend/.dockerignore`](file:///c:/Projects/Approval_Hub/backend/.dockerignore) | ละเว้น node_modules, dist, .env ไม่ให้หลุดเข้าไปใน Image |
| [`frontend/Dockerfile`](file:///c:/Projects/Approval_Hub/frontend/Dockerfile) | Multi-stage build สำหรับ Vite React + Nginx Alpine |
| [`frontend/nginx.conf`](file:///c:/Projects/Approval_Hub/frontend/nginx.conf) | จัดการ Routing `/approval_hub/`, SPA Fallback, Gzip, และ Reverse Proxy ไป Backend |
| [`frontend/.dockerignore`](file:///c:/Projects/Approval_Hub/frontend/.dockerignore) | ละเว้น node_modules และ dist ของ frontend |
| [`docker-compose.yml`](file:///c:/Projects/Approval_Hub/docker-compose.yml) | Orchestration ควบคุมการรันทั้ง 2 Services พร้อมกัน |
| [`.env.docker.example`](file:///c:/Projects/Approval_Hub/.env.docker.example) | ตัวอย่าง Environment variables สำหรับ Docker |

---

## 🚀 ขั้นตอนการทดสอบและรัน (How to Run)

### ขั้นตอนที่ 1: เตรียม Environment File
คัดลอกไฟล์ `.env.docker.example` ไปเป็น `.env` ที่ root directory:
```powershell
Copy-Item .env.docker.example .env
```
เปิดไฟล์ `.env` แล้วแก้ไขรหัสผ่านฐานข้อมูล SQL Server:
```ini
DB_SERVER=192.168.1.237
DB_DATABASE=AGT_SMART_SY
DB_USER=sa
DB_PASSWORD=<รหัสผ่าน_SQL_Server_จริง>
DB_PORT=1433
```

> **⚠️ ข้อสำคัญ:** Docker Container ทำงานบนระบบปฏิบัติการ Linux จึง**ไม่สามารถใช้ Windows Authentication ได้** ต้องใช้ SQL Server Authentication (`DB_USER` + `DB_PASSWORD`) เท่านั้น

---

### ขั้นตอนที่ 2: สั่ง Build และรัน Containers

รันคำสั่ง Docker Compose ที่ Root directory:
```powershell
docker compose up -d --build
```

---

### ขั้นตอนที่ 3: ตรวจสอบสถานะการทำงาน

1. **ดูสถานะ Container และ Health Check:**
   ```powershell
   docker compose ps
   ```
   *(Backend จะต้องขึ้นสถานะ `healthy`)*

2. **ดู Logs:**
   ```powershell
   # ดู Logs ทั้งหมด
   docker compose logs -f

   # ดูเฉพาะ Backend
   docker compose logs -f backend
   ```

3. **ทดสอบผ่าน Browser:**
   * **Frontend:** เปิด URL `http://localhost:81/approval_hub/` (หรือ IP ของเครื่อง)
   * **Backend Health Check:** เปิด URL `http://localhost:3002/health`

---

## 🛑 คำสั่งหยุดและลบ Container

```powershell
# หยุดการทำงาน
docker compose stop

# หยุดและลบ Container ทั้งหมด
docker compose down
```

---

## 🔄 ขั้นตอนการ Update โค้ดใหม่เมื่อขึ้น Production

เมื่อมีการแก้ไขโค้ดใหม่ ให้รันคำสั่งเดียว:
```powershell
docker compose up -d --build
```
Docker จะทำการ Build โค้ดใหม่เฉพาะส่วนที่มีการเปลี่ยนแปลง และ Re-create container ใหม่อย่างราบรื่นโดยไม่ต้องก๊อปปี้ไฟล์ข้ามโฟลเดอร์ด้วยมืออีกต่อไป


# คู่มือการอัปเดตระบบขึ้น Server (Approval Hub Update Guide)

เอกสารนี้สรุปขั้นตอนจริงสำหรับ **นักพัฒนา (Developer)** ในการนำโค้ดที่แก้ไขใหม่จากเครื่องคอมพิวเตอร์ของคุณ ไปอัปเดตบน Server จริง **`192.168.1.237` (Windows Server 2025)**

---

## 📌 ข้อมูลระบบบน Server 192.168.1.237

| หัวข้อ | รายละเอียด |
| :--- | :--- |
| **URL ใช้งานจริง** | `http://192.168.1.237:81/approval_hub/` |
| **พอร์ต Web Server** | Apache (XAMPP) พอร์ต **81** |
| **พอร์ต Backend API** | Node.js พอร์ต **3002** (ควบคุมด้วย PM2) |
| **ฐานข้อมูล** | SQL Server `AGT_SMART_SY` บนเครื่องเดียวกัน (`192.168.1.237:1433`) |
| **ตำแหน่งไฟล์บน Server** | `D:\Projects\Approval_Hub\` |

---

## 🚀 กรณีที่ 1: มีการแก้ไข Frontend (หน้าจอ Approval Matrix / Simulator)

### ขั้นตอนที่ 1.1: Build ไฟล์ที่เครื่องของคุณ
เปิด PowerShell ในเครื่องคุณ แล้วรัน:
```powershell
cd C:\Projects\Approval_Hub\frontend
npm run build
```
*(ระบบจะสร้างไฟล์ชุดใหม่ไว้ในโฟลเดอร์ `C:\Projects\Approval_Hub\frontend\dist\`)*

### ขั้นตอนที่ 1.2: ก๊อปปี้ไปวางบน Server
ก๊อปปี้ไฟล์ทั้งหมดใน:
👉 `C:\Projects\Approval_Hub\frontend\dist\`
ไปวางทับที่ Server:
👉 **`D:\Projects\Approval_Hub\dist\`**

> **✅ เสร็จสิ้นทันที!** ไม่ต้อง Restart ใดๆ ทั้งสิ้น

---

## ⚙️ กรณีที่ 2: มีการแก้ไข Backend (TypeScript Logic / Engine)

เนื่องจาก Backend ของ Approval Hub เขียนด้วย TypeScript ต้องทำการ Build ให้เป็น JavaScript ก่อน:

### ขั้นตอนที่ 2.1: Build ที่เครื่องของคุณ
เปิด PowerShell ในเครื่องคุณ แล้วรัน:
```powershell
cd C:\Projects\Approval_Hub\backend
npm run build
```
*(คำสั่ง `tsc` จะแปลงโค้ดไปเป็นไฟล์ JavaScript อยู่ในโฟลเดอร์ `dist/app.js`)*

### ขั้นตอนที่ 2.2: ก๊อปปี้ไปวางบน Server
ก๊อปปี้โฟลเดอร์ `dist` (และไฟล์ที่แก้) ไปวางทับที่ Server:
👉 **`D:\Projects\Approval_Hub\backend\dist\`**

### ขั้นตอนที่ 2.3: สั่ง Restart แอปบน Server
เปิด Command Prompt บน Server 237 แล้วรัน:
```cmd
pm2 restart approval-hub-backend
```

> **✅ เสร็จสิ้นทันที!** API ทำงานด้วย logic ใหม่อย่างต่อเนื่อง

---

## 🔍 คำสั่งตรวจสอบและดู Logs

```cmd
pm2 status
pm2 logs approval-hub-backend
```

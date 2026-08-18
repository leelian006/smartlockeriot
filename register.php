<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PetalLock — สมัครสมาชิก</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="login-panel" style="min-height:100vh; width:100%;">
    <div class="login-card">
      <h2>สมัครสมาชิก</h2>
      <p class="login-sub">กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้งาน PetalLock</p>

      <div class="row2">
        <div class="field"><label>ชื่อ</label><input type="text" id="reg-firstname" placeholder="ชื่อจริง"></div>
        <div class="field"><label>นามสกุล</label><input type="text" id="reg-lastname" placeholder="นามสกุล"></div>
      </div>
      <div class="field"><label>เบอร์โทรศัพท์</label><input type="text" id="reg-phone" placeholder="0XX-XXX-XXXX"></div>
      <div class="field"><label>อีเมล</label><input type="text" id="reg-email" placeholder="you@example.com"></div>
      <div class="field"><label>รหัสผ่าน</label><input type="password" id="reg-password" placeholder="อย่างน้อย 6 ตัวอักษร"></div>
      <div class="field"><label>ยืนยันรหัสผ่าน</label><input type="password" id="reg-password-confirm" placeholder="กรอกรหัสผ่านอีกครั้ง"></div>
      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12.5px; color:var(--muted); margin:6px 0 14px; cursor:pointer;">
        <input type="checkbox" id="reg-terms-check" style="margin-top:2px;">
        <span>ฉันยอมรับ <span style="color:var(--pink-deep); font-weight:600; text-decoration:underline;" onclick="event.preventDefault(); openTermsModal();">ข้อตกลงการใช้บริการ</span></span>
      </label>
      <div id="register-error" class="form-error hidden">กรุณากรอกข้อมูลให้ครบ ตรวจสอบรหัสผ่าน และยอมรับข้อตกลงการใช้บริการ</div>

      <button class="btn-primary" onclick="doRegister()">สมัครสมาชิก</button>
      <p class="login-foot">มีบัญชีอยู่แล้ว? <a href="index.html" style="color: var(--pink-deep); font-weight:600; text-decoration:underline; cursor:pointer;">เข้าสู่ระบบ</a></p>
    </div>
  </div>
<div class="modal-overlay hidden" id="terms-modal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeTermsModal()">×</button>
    <h3 style="margin-bottom:14px;">ข้อตกลงการใช้บริการ</h3>
    <div style="font-size:13px; color:var(--plum); line-height:1.8; max-height:50vh; overflow-y:auto; padding-right:6px;">
      <p style="margin-bottom:10px;">1. ห้ามฝากสิ่งของผิดกฎหมาย วัตถุอันตราย ของเน่าเสียง่าย หรือสัตว์มีชีวิตในตู้ล็อกเกอร์โดยเด็ดขาด</p>
      <p style="margin-bottom:10px;">2. ผู้ใช้บริการต้องเก็บรหัสผ่าน 4 หลักเป็นความลับ ทางร้านจะไม่รับผิดชอบหากรหัสผ่านรั่วไหลจากความประมาทของผู้ใช้</p>
      <p style="margin-bottom:10px;">3. หากไม่นำของออกภายในเวลาที่กำหนด ผู้ใช้ต้องชำระเงินเพิ่มตามระยะเวลาที่ใช้งานจริงก่อนนำของออก</p>
      <p style="margin-bottom:10px;">4. ทางร้านขอสงวนสิทธิ์ในการเปิดตู้ฉุกเฉินหากพบเหตุผิดปกติ เพื่อความปลอดภัยของทรัพย์สินและระบบ</p>
      <p style="margin-bottom:0;">5. ทางร้านไม่รับผิดชอบต่อความเสียหายที่เกิดจากเหตุสุดวิสัย เช่น ไฟฟ้าดับ หรือภัยธรรมชาติ</p>
    </div>
    <button class="btn-primary" style="margin-top:18px;" onclick="closeTermsModal()">รับทราบ</button>
  </div>
</div>


<script src="common.js"></script>
<script>
async function doRegister() {
  const fields = ["reg-firstname", "reg-lastname", "reg-phone", "reg-email", "reg-password", "reg-password-confirm"];
  const values = fields.map(id => document.getElementById(id).value.trim());
  const errorEl = document.getElementById("register-error");
  const allFilled = values.every(v => v.length > 0);
  const pwMatch = values[4] === values[5] && values[4].length >= 6;
  const termsOk = document.getElementById("reg-terms-check").checked;

  if (!allFilled || !pwMatch || !termsOk) {
    errorEl.textContent = "กรุณากรอกข้อมูลให้ครบ ตรวจสอบรหัสผ่าน และยอมรับข้อตกลงการใช้บริการ";
    errorEl.classList.remove("hidden");
    return;
  }
  const res = await apiPost("/auth/register.php", {
    first_name: values[0], last_name: values[1], phone: values[2], email: values[3], password: values[4]
  });
  if (!res.ok) { errorEl.textContent = res.error; errorEl.classList.remove("hidden"); return; }
  alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
  window.location.href = "index.html";
}
</script>
</body>
</html>

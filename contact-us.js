function showContactUsModal() {
  const accounts = [
    { name: "محمود عادل", username: "@io_620", link: "https://t.me/io_620", visible: true },
    { name: "محمد قاسم", username: "@m1_qc", link: "https://t.me/m1_qc", visible: true },
    { name: "حيدر ساجد", username: "@itishaider", link: "https://t.me/khalid_2", visible: false },
    { name: "سعيد عمر", username: "@saeed_3", link: "https://t.me/saeed_3", visible: false },
    { name: "ليلى حسن", username: "@layla_4", link: "https://t.me/layla_4", visible: false },
    { name: "محمد جاسم", username: "@mohammed_5", link: "https://t.me/mohammed_5", visible: false },
    { name: "نور عبد", username: "@noor_6", link: "https://t.me/noor_6", visible: false },
    { name: "فاطمة كريم", username: "@fatima_7", link: "https://t.me/fatima_7", visible: false },
    { name: "علي رضا", username: "@ali_8", link: "https://t.me/ali_8", visible: false },
    { name: "سمر محمود", username: "@samar_9", link: "https://t.me/samar_9", visible: false }
  ];

  if (document.getElementById('contactUsModal')) return;

  const modal = document.createElement('div');
  modal.id = 'contactUsModal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  let accountsHTML = "";
  accounts.forEach(acc => {
    if (acc.visible) {
      accountsHTML += `
        <div style="
          background: rgba(255, 255, 255, 0.15);
          padding: 15px 20px;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          gap: 15px;
          width: 100%;
        " onclick="window.open('${acc.link}', '_blank', 'noopener,noreferrer')">

          <!-- أيقونة التليجرام -->
          <div style="
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="22" height="22" fill="white">
              <path d="M120 0C53.73 0 0 53.73 0 120c0 66.27 53.73 120 120 120s120-53.73 120-120C240 53.73 186.27 0 120 0zm58.53 80.61l-21.26 100.3c-1.6 7.18-5.8 8.94-11.72 5.58l-32.42-23.91-15.63 15.07c-1.73 1.73-3.18 3.18-6.51 3.18l2.33-33.02 60.12-54.26c2.61-2.33-0.57-3.63-4.04-1.3l-74.21 46.77-31.94-10.01c-6.94-2.18-7.18-6.94 1.45-10.26l124.78-48.14c5.8-2.18 10.89 1.3 9.02 9.03z"/>
            </svg>
          </div>

          <!-- نص الحساب -->
          <div style="flex: 1; text-align: right;">
            <h4 style="margin: 0 0 3px 0; color: #ffffff; font-size: 16px; font-weight: 600;">${acc.name}</h4>
            <p style="margin: 0; font-size: 13px; opacity: 0.8;">${acc.username}</p>
          </div>
        </div>
      `;
    }
  });

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      width: 90%; max-width: 600px; max-height: 85vh;
      overflow-y: auto; animation: slideIn 0.5s ease-out; position: relative;
    ">
      <div style="
        background: rgba(255, 255, 255, 0.1);
        color: white; padding: 20px; border-radius: 20px 20px 0 0;
        text-align: center; position: relative;
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
      ">
        <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 24px; font-weight: 700;">📞 اتصل بنا</h2>
        <button onclick="closeContactUsModal()" style="
          position: absolute; top: 15px; left: 20px;
          background: rgba(255, 255, 255, 0.2); border: none; color: white;
          border-radius: 50%; width: 35px; height: 35px;
          cursor: pointer; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s ease;
        ">✕</button>
      </div>
      <div style="padding: 25px; color: white; font-family: 'Tajawal', sans-serif; line-height: 1.6;">

        <!-- اسم المطور -->
        <div style="
          text-align: center;
          margin-bottom: 25px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
        ">
          <h3 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">dentisitlogy</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">تواصل مع احد المانجرز لتفعيل الVIP</p>
        </div>

        <!-- قائمة الحسابات -->
        <div style="display: flex; flex-direction: column; gap: 12px; margin: 25px 0;">
          ${accountsHTML}
        </div>

        <!-- رسالة تشجيعية -->
        <div style="
          background: rgba(40, 167, 69, 0.2);
          padding: 20px;
          border-radius: 12px;
          border-left: 4px solid #28a745;
          margin-bottom: 20px;
          text-align: center;
        ">
          <h4 style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 700;">
            💬 نحن هنا لمساعدتك
          </h4>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.95); line-height: 1.5;">
            لا تتردد في التواصل معنا لأي استفسارات حول المنصة، تفعيل VIP، أو أي مساعدة تقنية. فريقنا جاهز لخدمتك!
          </p>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-50px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
    #contactUsModal [style*="cursor: pointer"]:hover {
      transform: translateX(5px) !important;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
      background: rgba(255, 255, 255, 0.25) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(modal);
}

function closeContactUsModal() {
  const modal = document.getElementById('contactUsModal');
  if (modal) modal.remove();
}

document.addEventListener('click', function(e) {
  if (e.target.id === 'contactUsModal') closeContactUsModal();
});

window.showContactUsModal = showContactUsModal;
window.closeContactUsModal = closeContactUsModal;

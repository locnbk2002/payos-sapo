const showUI = (message, imgUrl, isError = false) => {
  return `
  <div style="display:flex; flex-direction: column; justify-content: center; align-items: center; height: 100%">
    <div style="text-align: center; padding: 20px; ">
      <img src="${imgUrl}" style="width: 50px; height: 50px; margin-bottom: 10px"/>
      <p style="color:${isError ? "#D32F2F" : "#6655ff"}; font-size:20px">${message}</p>
    </div>
  </div>
  `;
};
const LOADING_UI = `
  <style>
  .loader-payos {
    border: 10px solid #f3f3f3; 
    border-top: 10px solid #6655ff; 
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin-payos 2s linear infinite;
  }

  @keyframes spin-payos {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  </style>
  <div style="display:flex; flex-direction: column; justify-content: center; align-items: center; height: 100%">
    <div style="text-align: center; padding: 20px; ">
      <div class="loader-payos"></div>
      <p>Vui lòng chờ ...</p>
    </div>
  </div>
`;
const ERROR_UI = showUI(
  "Không thể hiển thị link thanh toán",
  "https://img.payos.vn/static/img/payos_hara/failed.png",
  true
);
const SUCCESS_UI = showUI(
  "Đơn hàng đã thanh toán thành công",
  "https://img.payos.vn/static/img/payos_hara/success.png"
);

const isMobileScreen = () =>
  Boolean(
    navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/webOS/i) ||
      navigator.userAgent.match(/iPhone/i) ||
      navigator.userAgent.match(/iPad/i) ||
      navigator.userAgent.match(/iPod/i) ||
      navigator.userAgent.match(/BlackBerry/i) ||
      navigator.userAgent.match(/Windows Phone/i)
  );

const isJsonString = (str) => {
  if (!str) {
    return false;
  }
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const methodPayment = document.querySelector(".section__content--bordered").innerHTML;
  if (!methodPayment.toLowerCase().includes("vietqr")) return;

  const Bizweb = window.Bizweb.checkout;
  if (!Bizweb) return;

  let paymentLinkOrigin = null;
  const orderId = Bizweb.order_id;
  // all flow UI in this div
  const contentImporter = document.createElement("div");
  contentImporter.style.border = "1px solid #d9d9d9 ";
  contentImporter.style.backgroundColor = "white";
  contentImporter.style.width = "100%";
  contentImporter.style.height = isMobileScreen() ? "620px" : "340px";
  // add loading default
  contentImporter.innerHTML = LOADING_UI;

  const additionalContent = document.querySelector(".thankyou-message-container");
  additionalContent.appendChild(contentImporter);
  additionalContent.style.width = "100%";
  additionalContent.style.maxWidth = "100%";

  document.querySelector(".section--icon-heading").style.padding = isMobileScreen()
    ? "0px"
    : "13px";
  // remove icon check
  document.querySelector(".section__icon").remove();
  // change message default
  document.querySelector(".thankyou-message-container > .section__title").innerHTML =
    "Cảm ơn bạn đã đặt hàng. Vui lòng thanh toán.";

  const handleFetchData = async (path, method = "get", body = null) => {
    const config = {
      method,
    };
    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_SERVER}/${path}`, config);
    if (!response.ok) {
      throw new Error(response.status);
    }
    const data = await response.json();
    return data;
  };

  const handlePostMessage = async (event) => {
    if (event.origin !== new URL(paymentLinkOrigin).origin) {
      return;
    }
    const eventData = isJsonString(event.data) ? JSON.parse(event.data) : undefined;
    if (!eventData) {
      return;
    }
    if (eventData.type !== "payment_response") return;
    const responseData = eventData.data;
    if (responseData?.status === "PAID") {
      contentImporter.innerHTML = SUCCESS_UI;
    }
  };

  try {
    const paymentLinkResponse = await handleFetchData(
      `get-payment-link/${orderId}?redirect_uri=${window.location.origin}`
    );
    if (paymentLinkResponse?.financial_status === "paid") {
      contentImporter.innerHTML = SUCCESS_UI;
      return;
    }
    if (!paymentLinkResponse?.checkout_url) {
      contentImporter.innerHTML = ERROR_UI;
      return;
    }

    paymentLinkOrigin = paymentLinkResponse?.checkout_url;
    const paymentLinkDialogUrl = `${paymentLinkResponse?.checkout_url}?iframe=true&redirect_uri=${window.location.origin}&embedded=true`;

    contentImporter.innerHTML = `
        <iframe src="${paymentLinkDialogUrl}" style="height: 100%; width: 100%; border: none"  allow="clipboard-read; clipboard-write"/>
      `;
    window.addEventListener("message", handlePostMessage);
  } catch (error) {
    contentImporter.innerHTML = ERROR_UI;
  }
});

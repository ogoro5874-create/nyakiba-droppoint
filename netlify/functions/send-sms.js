exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { phone, message } = JSON.parse(event.body);

    if (!phone || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: "Phone and message required" }) };
    }

    // Format phone for Kenya
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.slice(1);
    if (!formattedPhone.startsWith("254")) formattedPhone = "254" + formattedPhone;
    formattedPhone = "+" + formattedPhone;

    const params = new URLSearchParams();
    params.append("username", "Nyakiba");
    params.append("to", formattedPhone);
    params.append("message", message);

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "apiKey": "atsk_b17b6053583e0b0d5ae0a0a910f56d708a295832e088b583413fa4913cfe327685dd9b1c",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params.toString()
    });

    const text = await response.text();
    console.log("AT Response:", text);

    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    if (data.SMSMessageData) {
      const recipients = data.SMSMessageData.Recipients || [];
      const success = recipients.some(r => r.status === "Success" || r.statusCode === 101);
      if (success) {
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
    }

    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: "SMS failed", details: data }) 
    };

  } catch (e) {
    console.error("Error:", e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

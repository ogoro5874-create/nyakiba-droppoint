exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { phone, message } = JSON.parse(event.body);

    if (!phone || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: "Phone and message required" }) };
    }

    const params = new URLSearchParams({
      username: "Nyakiba",
      to: phone,
      message: message,
      from: ""
    });

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "apiKey": "atsk_b17b6053583e0b0d5ae0a0a910f56d708a295832e088b583413fa4913cfe327685dd9b1c",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.SMSMessageData && data.SMSMessageData.Recipients && data.SMSMessageData.Recipients.length > 0) {
      const recipient = data.SMSMessageData.Recipients[0];
      if (recipient.status === "Success") {
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: "SMS failed", details: data }) };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

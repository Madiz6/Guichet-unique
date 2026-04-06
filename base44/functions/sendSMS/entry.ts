import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message } = await req.json();
    
    console.log('SMS Request:', { to, messageLength: message?.length });
    
    if (!to || !message) {
      return Response.json({ 
        error: 'Missing required fields: to, message' 
      }, { status: 400 });
    }
    
    // Match the actual secret names you added
    const TWILIO_ACCOUNT_SID = Deno.env.get('Account_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('Twilio_Auth_Token');
    const TWILIO_PHONE_NUMBER = Deno.env.get('My_Twilio_phone_number');
    
    console.log('Twilio Config:', { 
      hasSID: !!TWILIO_ACCOUNT_SID, 
      hasToken: !!TWILIO_AUTH_TOKEN, 
      hasPhoneNumber: !!TWILIO_PHONE_NUMBER,
      phoneNumber: TWILIO_PHONE_NUMBER
    });
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return Response.json({ 
        error: 'Twilio credentials not configured',
        details: {
          hasSID: !!TWILIO_ACCOUNT_SID,
          hasToken: !!TWILIO_AUTH_TOKEN,
          hasPhoneNumber: !!TWILIO_PHONE_NUMBER
        }
      }, { status: 500 });
    }
    
    // Twilio API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    // Create Basic Auth header
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    console.log('Sending SMS to Twilio...', { to, from: TWILIO_PHONE_NUMBER });
    
    // Send SMS via Twilio
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: message
      })
    });
    
    const data = await response.json();
    
    console.log('Twilio Response:', { status: response.status, data });
    
    if (!response.ok) {
      console.error('Twilio error:', data);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send SMS';
      if (data.code === 21211) {
        errorMessage = 'Invalid phone number format. Use international format: +253XXXXXXXX';
      } else if (data.code === 21606) {
        errorMessage = 'Phone number is not a valid mobile number';
      } else if (data.code === 21408) {
        errorMessage = 'Permission to send SMS to this country was denied';
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      return Response.json({ 
        error: errorMessage,
        twilio_error: data,
        code: data.code
      }, { status: 400 });
    }
    
    console.log('SMS sent successfully:', data.sid);
    
    return Response.json({ 
      success: true, 
      message: 'SMS envoyé avec succès',
      message_sid: data.sid,
      status: data.status,
      from: TWILIO_PHONE_NUMBER
    });
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.toString()
    }, { status: 500 });
  }
});
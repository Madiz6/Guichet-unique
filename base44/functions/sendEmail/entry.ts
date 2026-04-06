import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, from_name, from_email } = body;
    
    console.log('📧 Email request received:', { 
      to, 
      subject, 
      from_name, 
      from_email,
      hasHtml: !!html 
    });
    
    // Validate required fields
    if (!to || !subject || !html) {
      console.error('❌ Missing required fields');
      return Response.json({ 
        error: 'Missing required fields', 
        details: 'Required: to, subject, html',
        received: { to: !!to, subject: !!subject, html: !!html }
      }, { status: 400 });
    }
    
    // Get SendGrid API key
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    
    if (!SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not configured');
      return Response.json({ 
        error: 'Email service not configured',
        details: 'SENDGRID_API_KEY environment variable is missing. Please add it in Dashboard → Configuration → Environment Variables'
      }, { status: 500 });
    }
    
    console.log('✅ SendGrid API key found');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid recipient email:', to);
      return Response.json({ 
        error: 'Invalid recipient email format',
        details: `The email address "${to}" is not valid`
      }, { status: 400 });
    }
    
    const senderEmail = from_email || 'noreply@paie360.com';
    if (!emailRegex.test(senderEmail)) {
      console.error('❌ Invalid sender email:', senderEmail);
      return Response.json({ 
        error: 'Invalid sender email format',
        details: `The sender email "${senderEmail}" is not valid`
      }, { status: 400 });
    }
    
    // SendGrid payload
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: senderEmail,
        name: from_name || 'Paie360'
      },
      content: [
        {
          type: 'text/html',
          value: html
        }
      ]
    };
    
    console.log('📤 Sending email via SendGrid...', {
      to,
      from: senderEmail,
      subject
    });
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendgridPayload)
    });
    
    console.log('📬 SendGrid response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGrid error response:', errorText);
      
      let errorDetails = errorText;
      let errorMessage = 'Failed to send email';
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('SendGrid error JSON:', errorJson);
        
        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          errorDetails = errorJson.errors.map(e => e.message).join(', ');
          errorMessage = errorJson.errors[0]?.message || errorMessage;
        }
      } catch (e) {
        console.error('Could not parse error JSON:', e);
        // Keep original errorText
      }
      
      // Check for specific error codes
      if (response.status === 401) {
        return Response.json({ 
          error: 'Invalid SendGrid API Key',
          details: 'Your SendGrid API key is invalid or expired. Please generate a new one from: https://app.sendgrid.com/settings/api_keys',
          sendgrid_error: errorDetails
        }, { status: 500 });
      }
      
      if (response.status === 403) {
        return Response.json({ 
          error: 'Sender email not verified',
          details: `The sender email "${senderEmail}" is not verified in SendGrid. Please verify it at: https://app.sendgrid.com/settings/sender_auth/senders`,
          sendgrid_error: errorDetails
        }, { status: 500 });
      }
      
      return Response.json({ 
        error: errorMessage,
        details: errorDetails,
        status_code: response.status,
        sender_email: senderEmail,
        recipient_email: to
      }, { status: 500 });
    }
    
    console.log('✅ Email sent successfully to:', to);
    
    return Response.json({ 
      success: true, 
      message: 'Email envoyé avec succès',
      sent_to: to,
      from: senderEmail
    });
    
  } catch (error) {
    console.error('💥 Unexpected error in sendEmail function:', error);
    
    return Response.json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred',
      details: error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
});
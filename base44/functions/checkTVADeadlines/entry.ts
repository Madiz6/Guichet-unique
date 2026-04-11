import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all TVA declarations
    const declarations = await base44.asServiceRole.entities.TVADeclaration.list();
    
    const today = new Date();
    const sevenDaysAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const reminders = [];
    
    for (const decl of declarations) {
      // Check if declaration is not yet paid and deadline is within 7 days
      if (decl.statut !== 'Payé' && decl.date_limite) {
        const deadlineDate = new Date(decl.date_limite);
        
        if (deadlineDate <= sevenDaysAhead && deadlineDate >= today) {
          reminders.push({
            type: 'deadline_warning',
            declaration_id: decl.id,
            declaration_number: decl.numero_declaration,
            period: decl.periode,
            deadline: decl.date_limite,
            tva_amount: decl.tva_finale,
            days_remaining: Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }
    
    return Response.json({
      status: 'success',
      reminders_found: reminders.length,
      reminders: reminders
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
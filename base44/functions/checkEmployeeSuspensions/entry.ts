import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Checks all suspended employees and automatically reactivates those
 * whose date_reactivation has been reached.
 * Should be run daily via scheduled automation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toISOString().split('T')[0];

    const suspended = await base44.asServiceRole.entities.Employee.filter({ statut: 'Suspendu' });

    let reactivated = 0;
    const reactivatedNames = [];

    for (const emp of suspended) {
      if (!emp.date_reactivation) continue;
      if (emp.date_reactivation <= today) {
        await base44.asServiceRole.entities.Employee.update(emp.id, {
          statut: 'Actif',
          date_reactivation: emp.date_reactivation,
          raison_suspension: emp.raison_suspension,
          date_suspension: emp.date_suspension
        });
        reactivated++;
        reactivatedNames.push(`${emp.prenom} ${emp.nom}`);
      }
    }

    return Response.json({
      success: true,
      reactivated,
      employees: reactivatedNames,
      message: `${reactivated} employé(s) réactivé(s) automatiquement`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});